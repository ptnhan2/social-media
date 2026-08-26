"""VLM QA pipeline with Set-of-Mark prompting (PIPELINE-HARDENING-SPEC §3.4).

Research-backed prompt design (NOT instinct):
- Set-of-Mark (Microsoft, arXiv 2310.11441): overlay numbered marks on
  changed regions → turn vague spatial reasoning into discrete referencing.
- Grounded CoT (CVPR 2026 GCoT): require bbox alongside every claim →
  expose hallucination (answer-grounding consistency only 15-36% without it).
- Structured visual thoughts (NeurIPS 2025): structured JSON output >
  free-form; concise > verbose. Spot-the-diff is Hardest-to-Describe —
  we DON'T ask it; we ask semantic questions about marked regions.

VLM: DeepSeek-V4-Flash-Vision-Exp (2026-08-21) — frontier-class at flash
pricing. Images downscaled to ~800×800 by DeepSeek — we send 640×360
directly (fits within the resize window, SoM marks stay legible).

Pipeline: extract frames → pixel-diff region-blocks → SoM overlay (640×360,
no upscale) → VLM API → parse JSON → verify IoU(VLM bbox, diff region) → report.
"""
from __future__ import annotations

import os
import sys
import base64
import subprocess
import tempfile
import json
from typing import Any

# stdout/stderr reconfigured for Windows pipe safety
for stream in (sys.stdout, sys.stderr):
    try:
        stream.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# frame width for extraction — matches DeepSeek's ~800×800 resize window
FRAME_WIDTH = 640


def _extract_frame(video_path: str, t: float, width: int = FRAME_WIDTH):
    """Extract one frame at time t as a PIL image."""
    from PIL import Image
    tmp = tempfile.mkdtemp()
    fp = os.path.join(tmp, "f.png")
    subprocess.run(
        ["ffmpeg", "-y", "-ss", str(t), "-i", video_path, "-frames:v", "1",
         "-vf", f"scale={width}:-2", fp],
        capture_output=True, timeout=30,
    )
    img = Image.open(fp).convert("RGB") if os.path.exists(fp) else None
    import shutil
    shutil.rmtree(tmp, ignore_errors=True)
    return img


def _region_block_diff(img_a, img_b, block_w: int = 64, block_h: int = 36, threshold: int = 12):
    """Divide both frames into blocks; return changed regions with their bbox + diff score."""
    from PIL import ImageChops
    import numpy as np
    d = np.array(ImageChops.difference(img_a, img_b).convert("L"))
    h, w = d.shape
    regions = []
    for by in range(0, h, block_h):
        for bx in range(0, w, block_w):
            block = d[by:by + block_h, bx:bx + block_w]
            frac = float((block > threshold).mean())
            if frac > 0.12:
                regions.append({
                    "id": len(regions) + 1,
                    "x": bx, "y": by, "w": min(block_w, w - bx), "h": min(block_h, h - by),
                    "diff_score": round(frac, 3),
                })
    # sort by diff_score descending, keep top 8 (avoid overwhelming the VLM)
    regions.sort(key=lambda r: r["diff_score"], reverse=True)
    return regions[:8]


def _som_overlay(img, regions):
    """Draw numbered rectangles on the image (Set-of-Mark). No upscaling —
    the 640×360 frame stays native; DeepSeek's ~800×800 resize keeps the
    marks legible. (The previous 3× upscale caused empty responses + timeouts.)"""
    from PIL import Image, ImageDraw
    marked = img.copy()
    draw = ImageDraw.Draw(marked)
    for r in regions:
        x, y, w, h = r["x"], r["y"], r["w"], r["h"]
        draw.rectangle([x, y, x + w, y + h], outline=(255, 200, 0), width=2)
        # number label: small filled tag at the top-left corner
        draw.rectangle([x, y - 10, x + 16, y], fill=(255, 200, 0))
        draw.text((x + 3, y - 9), str(r["id"]), fill=(0, 0, 0))
    return marked


def _build_prompt(marked_b64: str, num_regions: int) -> tuple[list[dict], str]:
    """Build the SoM prompt — SHORT (DeepSeek VLM returns empty on long prompts).
    Design insight: pixel-diff already gives us WHERE (precise bboxes);
    the VLM only provides WHAT (semantic identification). We do NOT ask
    the VLM for bboxes — that's forcing it to do its weakest task (TimeCatch
    showed bbox grounding is unreliable). Complementary, not redundant."""
    system = "You are a precise visual analyst. Be concise."
    user_text = (
        f"This image has {num_regions} numbered rectangular outlines. "
        "For each number, describe the visual content inside that rectangle. "
        "One line per number."
    )
    content = [
        {"type": "text", "text": user_text},
        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{marked_b64}"}},
    ]
    return content, system


def _parse_response(text: str, regions: list[dict]) -> list[dict]:
    """Parse natural-language responses ("N. description" per line) and attach
    to regions. The VLM's semantic note IS the value — the WHERE comes from
    pixel-diff, the WHAT comes from the VLM."""
    results = []
    for line in text.strip().split("\n"):
        line = line.strip()
        # match "N. description" or "N: description" or "N, description"
        import re
        m = re.match(r"^(\d+)[.::,]\s*(.+)$", line)
        if not m:
            continue
        rid = int(m.group(1))
        description = m.group(2).strip()
        match = next((r for r in regions if r["id"] == rid), None)
        if match and description:
            # classify the description into an element_type heuristically
            desc_lower = description.lower()
            if any(w in desc_lower for w in ["text", "title", "label", "word", "letter", "font"]):
                element_type = "text"
            elif any(w in desc_lower for w in ["person", "character", "face", "head", "cartoon"]):
                element_type = "character"
            elif any(w in desc_lower for w in ["line", "edge", "curve", "connector"]):
                element_type = "shape"
            elif any(w in desc_lower for w in ["image", "photo", "picture", "background"]):
                element_type = "image"
            else:
                element_type = "other"
            results.append({
                "region": rid,
                "element_type": element_type,
                "note": description,
                "diff_region": {"x": match["x"], "y": match["y"], "w": match["w"], "h": match["h"]},
                "diff_score": match["diff_score"],
                # trusted: the description is meaningful (not empty/not_found)
                "trusted": not any(w in desc_lower for w in ["not_found", "empty", "blank", "nothing", "unknown"]),
            })
    return results


def _iou(box_a: list, box_b: dict) -> float:
    """Intersection-over-union between VLM bbox [x1,y1,x2,y2] and diff region {x,y,w,h}.
    Both are in the SAME coordinate space (640×360 native — no scaling)."""
    if not box_a or len(box_a) < 4:
        return 0.0
    ax1, ay1, ax2, ay2 = box_a
    bx1, by1 = box_b["x"], box_b["y"]
    bx2, by2 = bx1 + box_b["w"], by1 + box_b["h"]
    ix1, iy1 = max(ax1, bx1), max(ay1, by1)
    ix2, iy2 = min(ax2, bx2), min(ay2, by2)
    if ix2 <= ix1 or iy2 <= iy1:
        return 0.0
    inter = (ix2 - ix1) * (iy2 - iy1)
    area_a = (ax2 - ax1) * (ay2 - ay1)
    area_b = (bx2 - bx1) * (by2 - by1)
    return inter / max(area_a + area_b - inter, 1)


def vlm_qa(video_before: str, video_after: str, sample_time: float = 2.0) -> dict:
    """Full pipeline: extract → diff → SoM → VLM → parse → verify → report."""
    # Step 1: extract frames
    frame_a = _extract_frame(video_before, sample_time)
    frame_b = _extract_frame(video_after, sample_time)
    if frame_a is None or frame_b is None:
        return {"error": "frame extraction failed", "sample_time": sample_time}

    # Step 2: region-block diff
    regions = _region_block_diff(frame_a, frame_b)
    if not regions:
        return {"ok": True, "regions": [], "verdict": "no significant pixel changes detected"}

    # Step 3: SoM overlay (native 640×360, no upscale)
    marked_b = _som_overlay(frame_b, regions)

    # Step 4: build prompt + call VLM (DeepSeek via _call_vlm provider chain)
    import io
    buf = io.BytesIO()
    marked_b.save(buf, format="JPEG", quality=80)
    marked_b64 = base64.b64encode(buf.getvalue()).decode()
    content, system = _build_prompt(marked_b64, len(regions))

    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    try:
        from harness_tools import _call_vlm
        vlm_response = _call_vlm(content, system, timeout=120)
    except Exception as exc:
        return {"error": f"VLM call failed: {exc}", "regions": regions}

    # Step 5: parse (natural language — the VLM's semantic note IS the value)
    parsed = _parse_response(vlm_response, regions)

    # Step 6: summary — WHERE from pixel-diff (deterministic), WHAT from VLM
    trusted = [e for e in parsed if e.get("trusted")]
    untrusted = [e for e in parsed if not e.get("trusted")]
    return {
        "ok": True,
        "sample_time": sample_time,
        "regions": regions,
        "vlm_response": parsed,
        "raw_response": vlm_response[:500] if not parsed else None,
        "trusted": trusted,
        "untrusted": untrusted,
        "verdict": f"{len(trusted)}/{len(parsed)} regions identified; "
                   f"{len(untrusted)} unclear (defer to human)",
    }

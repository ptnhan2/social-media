"""VLM QA pipeline with Set-of-Mark prompting (PIPELINE-HARDENING-SPEC §3.4).

Research-backed prompt design (NOT instinct):
- Set-of-Mark (Microsoft, arXiv 2310.11441): overlay numbered marks on
  changed regions → turn vague spatial reasoning into discrete referencing.
  GPT-4V+SoM outperforms fine-tuned specialists on RefCOCOg in zero-shot.
- Grounded CoT (CVPR 2026 GCoT): require bbox alongside every claim →
  expose hallucination (answer-grounding consistency only 15-36% without it).
- Structured visual thoughts (NeurIPS 2025): structured JSON output >
  free-form; concise > verbose. Spot-the-diff is Hardest-to-Describe —
  we DON'T ask it; we ask semantic questions about marked regions.

Pipeline: extract frames → pixel-diff region-blocks → SoM overlay → VLM API
(frontier, NOT local) → parse JSON → verify IoU(VLM bbox, diff region) → report.
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


def _extract_frame(video_path: str, t: float, width: int = 640):
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


def _som_overlay(img, regions, scale: int = 3):
    """Draw numbered rectangles on the image for the marked regions (Set-of-Mark).
    Scale 3x maps 640x360 draft frames to 1920x1080 — matching the VLM's
    expected bbox coordinate space (prompt says 'bbox in 1920x1080'). The _iou
    function also multiplies by 3 to align diff regions to this space."""
    from PIL import Image, ImageDraw, ImageFont
    marked = img.copy()
    # upscale for clearer text rendering
    marked = marked.resize((marked.width * scale, marked.height * scale), Image.LANCZOS)
    draw = ImageDraw.Draw(marked)
    for r in regions:
        x, y, w, h = r["x"] * scale, r["y"] * scale, r["w"] * scale, r["h"] * scale
        draw.rectangle([x, y, x + w, y + h], outline=(255, 200, 0), width=3)
        label = str(r["id"])
        draw.rectangle([x, y - 22, x + 30, y], fill=(255, 200, 0))
        draw.text((x + 4, y - 20), label, fill=(0, 0, 0))
    return marked


def _build_prompt(marked_b64: str, num_regions: int) -> tuple[list[dict], str]:
    """Build the grounded structured prompt (system + user content blocks)."""
    system = (
        "You are a precise visual QA analyst. You MUST ground every claim in a "
        "bounding box. If you cannot locate an element, output 'not_found'. Never guess."
    )
    user_text = (
        f"I numbered the {num_regions} regions with the largest pixel differences "
        "between these two frames (LEFT = version A, RIGHT = version B). "
        "For EACH numbered region, output JSON on one line:\n"
        '{"region": <number>, "element_type": "text|image|shape|character|empty", '
        '"present_in": "left_only|right_only|both", '
        '"bbox": [x1, y1, x2, y2], '
        '"semantic_note": "<1 short sentence>"}\n'
        "Rules:\n"
        "- bbox in pixels of the frame (1920x1080)\n"
        "- If you cannot see the element in a region, bbox = null + semantic_note = 'not_found'\n"
        "- Do NOT describe regions that were not numbered\n"
    )
    content = [
        {"type": "text", "text": user_text},
        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{marked_b64}"}},
    ]
    return content, system


def _parse_response(text: str, regions: list[dict]) -> list[dict]:
    """Parse VLM JSON-per-line responses; attach to regions."""
    results = []
    for line in text.strip().split("\n"):
        line = line.strip()
        if not line.startswith("{"):
            continue
        try:
            entry = json.loads(line)
            rid = entry.get("region")
            match = next((r for r in regions if r["id"] == rid), None)
            if match:
                entry["diff_region"] = {"x": match["x"], "y": match["y"], "w": match["w"], "h": match["h"]}
                entry["diff_score"] = match["diff_score"]
                results.append(entry)
        except (json.JSONDecodeError, KeyError):
            continue
    return results


def _iou(box_a: list, box_b: dict) -> float:
    """Intersection-over-union between VLM bbox [x1,y1,x2,y2] and diff region {x,y,w,h}."""
    if not box_a or len(box_a) < 4:
        return 0.0
    ax1, ay1, ax2, ay2 = box_a
    bx1, by1 = box_b["x"] * 3, box_b["y"] * 3  # scale to marked image (×3)
    bx2, by2 = bx1 + box_b["w"] * 3, by1 + box_b["h"] * 3
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

    # Step 3: SoM overlay
    marked_a = _som_overlay(frame_a, regions)
    marked_b = _som_overlay(frame_b, regions)

    # Step 4: build prompt + call VLM (frontier API via _call_vlm)
    import io
    buf = io.BytesIO()
    marked_b.save(buf, format="JPEG", quality=70)
    marked_b64 = base64.b64encode(buf.getvalue()).decode()
    content, system = _build_prompt(marked_b64, len(regions))

    # import from harness_tools to reuse the provider chain
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    try:
        from harness_tools import _call_vlm
        vlm_response = _call_vlm(content, system, timeout=120)
    except Exception as exc:
        return {"error": f"VLM call failed: {exc}", "regions": regions}

    # Step 5: parse + verify IoU
    parsed = _parse_response(vlm_response, regions)
    for entry in parsed:
        bbox = entry.get("bbox")
        if isinstance(bbox, list) and len(bbox) == 4:
            entry["iou"] = round(_iou(bbox, entry["diff_region"]), 3)
            entry["trusted"] = entry["iou"] > 0.3
        else:
            entry["iou"] = 0.0
            entry["trusted"] = False

    # Step 6: summary
    trusted = [e for e in parsed if e.get("trusted")]
    untrusted = [e for e in parsed if not e.get("trusted")]
    return {
        "ok": True,
        "sample_time": sample_time,
        "regions": regions,
        "vlm_response": parsed,
        "trusted": trusted,
        "untrusted": untrusted,
        "verdict": f"{len(trusted)}/{len(parsed)} regions verified (IoU > 0.3); "
                   f"{len(untrusted)} unverified (defer to human)",
    }

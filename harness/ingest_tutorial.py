"""Tutorial ingestion — extract candidate principles from reference videos.

Design (TASTE-AND-LEARNING-ROADMAP.md P3 + review fix #10):
- Tutorials generate HYPOTHESES, never direct standards. Every candidate
  principle must pass the standard A/B verification loop before entering
  taste-standard.md.
- VLM descriptions confabulate like any VLM narration — which is why
  verification (step 6) is mandatory.
- Isaac-derived principles get provenance tags; their share of the standard
  is capped (the EVOLUTION doc requires the ability to DIVERGE from Isaac).

Pipeline:
  1. Input: reference video (default research/isaacverse/)
  2. ffmpeg fixed-interval segmentation -> per-beat montages
  3. Qwen3-VL describes VISUAL GRAMMAR per beat (not content)
  4. Output: candidates.json (principles with provenance) for human review
  5. Human approves -> taste-standard.md as CANDIDATE entries
  6. Each candidate is then verified via a standard protocol v4 cycle

Run:
    harness/.venv/Scripts/python.exe harness/ingest_tutorial.py [--video <path>] [--interval 8]
"""
from __future__ import annotations

import argparse
import base64
import json
import os
import subprocess
import sys
import tempfile
import shutil
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Load .env
env_file = Path(__file__).parent.parent / ".env"
if env_file.exists():
    for line in env_file.read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.strip()
        if "=" in line and not line.startswith("#"):
            k, _, v = line.partition("=")
            v = v.strip()
            if "#" in v and not (v.startswith('"') or v.startswith("'")):
                v = v.split("#")[0].strip()
            if v:
                os.environ.setdefault(k.strip(), v)

from harness_tools import _provider_config, _chat_completions, _duration_of

ROOT = Path(__file__).parent.parent
DEFAULT_VIDEO_DIR = ROOT / "research" / "isaacverse"
OUT_FILE = ROOT / "harness" / "memories" / "tutorial-candidates.json"

GRAMMAR_PROMPT = (
    "You are shown 3 snapshots from a reference video by an expert video editor "
    "(one moment in a tutorial). Describe ONLY the VISUAL GRAMMAR — the editing "
    "craft decisions — NOT the topic. Look at: typography (size hierarchy, "
    "weight, spacing), color palette (accent usage, contrast), motion (what "
    "animates, how fast, easing feel), composition (focal point, negative "
    "space, alignment), pacing (how much information per moment).\n"
    "End with 1-3 candidate principles in the format:\n"
    "PRINCIPLE: <a testable rule about the craft, e.g. 'accent color is used "
    "on <= 15% of the frame'>\n"
    "Be specific and measurable where possible. Do not invent details you "
    "cannot see in the frames."
)


def montage_b64(video: Path, t0: float, n: int = 3, span: float = 1.0) -> str | None:
    """n frames spanning [t0, t0+span] as one JPEG montage (base64)."""
    from PIL import Image
    tmp = tempfile.mkdtemp()
    outs = []
    for i in range(n):
        t = t0 + span * i / max(n - 1, 1)
        fp = os.path.join(tmp, f"f{i}.png")
        subprocess.run(["ffmpeg", "-y", "-ss", f"{t:.2f}", "-i", str(video),
                        "-frames:v", "1", "-vf", "scale=426:-1", fp],
                       capture_output=True, timeout=30)
        if os.path.exists(fp):
            outs.append(fp)
    if not outs:
        return None
    imgs = [Image.open(p).convert("RGB") for p in outs]
    w = sum(i.width for i in imgs)
    h = max(i.height for i in imgs)
    canvas = Image.new("RGB", (w, h), (0, 0, 0))
    x = 0
    for i in imgs:
        canvas.paste(i, (x, 0))
        x += i.width
    jpg = os.path.join(tmp, "m.jpg")
    canvas.save(jpg, "JPEG", quality=55)
    with open(jpg, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()
    shutil.rmtree(tmp, ignore_errors=True)
    return b64


def describe_moment(video: Path, t0: float) -> str:
    cfg = _provider_config("dashscope")
    cfg["model"] = os.environ.get("VLM_PAIRWISE_MODEL", "qwen3-vl-plus")
    b64 = montage_b64(video, t0)
    if not b64:
        return "(frame extraction failed)"
    content = [
        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}},
        {"type": "text", "text": GRAMMAR_PROMPT},
    ]
    return _chat_completions(cfg, content, "You are a careful video-editing craft analyst. You never invent details that are not present.", 180)


def find_default_video() -> Path | None:
    if not DEFAULT_VIDEO_DIR.exists():
        return None
    vids = sorted(DEFAULT_VIDEO_DIR.rglob("*.mp4"))
    return vids[0] if vids else None


def merge_into_store(new_run: dict) -> None:
    """Append this run into the multi-video tutorial-candidates.json."""
    existing = {"videos": [], "all_candidates": []}
    if OUT_FILE.exists():
        try:
            loaded = json.loads(OUT_FILE.read_text(encoding="utf-8-sig"))
            if "videos" in loaded:
                existing = loaded
            elif "candidates" in loaded:
                # legacy single-video format — wrap it
                existing = {"videos": [loaded], "all_candidates": loaded["candidates"],
                            "note": loaded.get("note")}
        except json.JSONDecodeError:
            pass
    existing["videos"] = [v for v in existing["videos"] if v.get("video") != new_run["video"]]
    existing["videos"].append(new_run)
    existing["all_candidates"] = [c for v in existing["videos"] for c in v["candidates"]]
    existing["note"] = ("Candidates are HYPOTHESES only — each must pass a standard "
                        "protocol v4 verification cycle before entering taste-standard.md. "
                        "Isaac-derived principles are one school, not gospel (divergence "
                        "is a goal). Human review required.")
    OUT_FILE.write_text(json.dumps(existing, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--video", default=None, help="Path to the reference video")
    ap.add_argument("--interval", type=float, default=8.0, help="Seconds between sampled moments")
    ap.add_argument("--moments", type=int, default=5, help="Number of moments to sample")
    args = ap.parse_args()

    video = Path(args.video) if args.video else find_default_video()
    if not video or not video.exists():
        print("No reference video found. Pass --video or place one under research/isaacverse/")
        sys.exit(1)

    dur = _duration_of(str(video))
    print(f"Video: {video} ({dur:.0f}s) — sampling {args.moments} moments every {args.interval}s")

    moments = []
    t = min(args.interval, dur / 2)
    for i in range(args.moments):
        if t >= dur:
            break
        print(f"[{i+1}/{args.moments}] analyzing t={t:.0f}s ...", flush=True)
        desc = describe_moment(video, t)
        print(desc[:400], flush=True)
        moments.append({"t_sec": round(t, 1), "description": desc})
        t += args.interval

    # extract PRINCIPLE lines for the candidates summary
    candidates = []
    for m in moments:
        for line in m["description"].splitlines():
            line = line.strip()
            if line.upper().startswith("PRINCIPLE:"):
                candidates.append({
                    "principle": line[len("PRINCIPLE:"):].strip(),
                    "provenance": f"tutorial:{video.name}@{m['t_sec']}s",
                    "status": "candidate",
                })

    out = {
        "video": str(video),
        "sampled": len(moments),
        "moments": moments,
        "candidates": candidates,
    }
    merge_into_store(out)
    print(f"\nMerged into {OUT_FILE}: {len(candidates)} new candidate principles.")
    if candidates:
        print("\nTop candidates (for human review):")
        for c in candidates[:8]:
            print(f"  - {c['principle']}  [{c['provenance']}]")


if __name__ == "__main__":
    main()

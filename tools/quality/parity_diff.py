#!/usr/bin/env python
"""Pixel-diff parity gate between the two render paths (GENERATOR-SPEC E2).

Pure PIL + ffmpeg — deliberately NO harness/langchain imports so it runs on
any python with Pillow installed. Invoked by
remotion-composer/scripts/parity-measure.mjs; also usable standalone:

    python tools/quality/parity_diff.py --a treatment.mp4 --b editor.mp4 \
        --times 1.0,2.5,3.0 --json

E2 gate (GENERATOR-SPEC §2.6): mean abs diff (0-255 scale) < 2.0 on window
interior frames => the editor path is a faithful mirror of the treatment path
and may become the default render flow.
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile

E2_GATE_MEAN = 2.0


def _duration_of(video_path: str) -> float:
    """Duration in seconds via ffprobe (0.0 on failure)."""
    try:
        out = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=nw=1:nk=1", video_path],
            capture_output=True, text=True, timeout=30,
        )
        return float(out.stdout.strip())
    except Exception:
        return 0.0


def _frame_image(video_path: str, t: float, width: int = 640):
    """Extract one frame at time t as a PIL RGB image (None on failure).

    Renders compared here are draft 640x360, so width=640 is 1:1 — no rescale
    blur, and both videos are scaled identically anyway.
    """
    from PIL import Image
    tmp = tempfile.mkdtemp()
    fp = os.path.join(tmp, "f.png")
    try:
        subprocess.run(
            ["ffmpeg", "-y", "-ss", str(t), "-i", video_path, "-frames:v", "1",
             "-vf", f"scale={width}:-2", fp],
            capture_output=True, timeout=30,
        )
        return Image.open(fp).convert("RGB") if os.path.exists(fp) else None
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def _diff_stats(ia, ib) -> tuple[float, float]:
    """Mean abs diff (0-255) and % of pixels differing by >8."""
    from PIL import ImageChops
    d = ImageChops.difference(ia, ib).convert("L")
    h = d.histogram()
    total = max(sum(h), 1)
    mean = sum(i * c for i, c in enumerate(h)) / total
    changed = sum(h[8:]) / total * 100
    return mean, changed


def diff_videos(video_a: str, video_b: str, times: list[float], width: int = 640) -> dict:
    """Per-time diff stats + aggregate; returns a JSON-serialisable report."""
    dur = min(_duration_of(video_a), _duration_of(video_b))
    frames = []
    for t in times:
        if dur and t > dur:
            continue
        ia, ib = _frame_image(video_a, t, width), _frame_image(video_b, t, width)
        if ia is None or ib is None:
            frames.append({"t": t, "error": "frame extraction failed"})
            continue
        mean, changed = _diff_stats(ia, ib)
        frames.append({"t": round(t, 3), "mean": round(mean, 3), "changedPct": round(changed, 3)})
    means = [f["mean"] for f in frames if "mean" in f]
    return {
        "videoA": video_a,
        "videoB": video_b,
        "durationSec": round(dur, 3),
        "frames": frames,
        "meanOfMeans": round(sum(means) / len(means), 3) if means else None,
        "maxMean": round(max(means), 3) if means else None,
        "gate": ("PASS" if means and max(means) < E2_GATE_MEAN else "FAIL") if means else "ERROR",
        "gateThreshold": E2_GATE_MEAN,
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--a", required=True, help="baseline video (treatment path)")
    ap.add_argument("--b", required=True, help="candidate video (editor path)")
    ap.add_argument("--times", default="", help="comma-separated seconds to sample; default = interior sweep")
    ap.add_argument("--json", action="store_true", help="JSON output")
    args = ap.parse_args()

    # stdout/stderr reconfigured for Windows pipe safety (lesson: cp1252
    # surrogates crash writes when parents capture output).
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

    dur = min(_duration_of(args.a), _duration_of(args.b))
    if args.times:
        times = [float(x) for x in args.times.split(",") if x.strip()]
    else:
        # interior sweep: skip 0.1s head/tail, sample every ~0.5s
        times = [round(0.1 + i * 0.5, 2) for i in range(int(max(0, (dur - 0.2) / 0.5)) + 1)]
    report = diff_videos(args.a, args.b, times)
    if args.json:
        print(json.dumps(report, indent=2))
    else:
        print(f"parity: gate={report['gate']} meanOfMeans={report['meanOfMeans']} maxMean={report['maxMean']} (threshold {E2_GATE_MEAN})")
        for f in report["frames"]:
            if "mean" in f:
                print(f"  t={f['t']}s mean={f['mean']} changed={f['changedPct']}%")
            else:
                print(f"  t={f['t']}s {f.get('error')}")
    return 0 if report["gate"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())

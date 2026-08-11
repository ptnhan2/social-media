"""Deterministic forensic audit for IsaacVerse reference videos.

This pass deliberately does not infer visual quality from filenames or transcripts.
It records measurable timeline, cut, and audio evidence for later manual review.
"""

from __future__ import annotations

import csv
import json
import math
import re
import statistics
import subprocess
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "source"
OUT = ROOT / "forensics"
OUT.mkdir(exist_ok=True)


def run(args: list[str]) -> str:
    proc = subprocess.run(args, capture_output=True, text=True, encoding="utf-8", errors="replace")
    return proc.stdout + "\n" + proc.stderr


def probe(path: Path) -> dict[str, Any]:
    raw = subprocess.check_output(
        [
            "ffprobe",
            "-v",
            "error",
            "-print_format",
            "json",
            "-show_format",
            "-show_streams",
            str(path),
        ],
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    return json.loads(raw)


def duration(probe_data: dict[str, Any]) -> float:
    return float(probe_data.get("format", {}).get("duration", 0.0))


def video_stream(probe_data: dict[str, Any]) -> dict[str, Any]:
    return next((s for s in probe_data.get("streams", []) if s.get("codec_type") == "video"), {})


def audio_stream(probe_data: dict[str, Any]) -> dict[str, Any]:
    return next((s for s in probe_data.get("streams", []) if s.get("codec_type") == "audio"), {})


def scene_times(path: Path, threshold: float = 0.25) -> list[float]:
    output = run(
        [
            "ffmpeg",
            "-hide_banner",
            "-i",
            str(path),
            "-vf",
            f"select='gt(scene,{threshold})',showinfo",
            "-an",
            "-f",
            "null",
            "NUL",
        ]
    )
    return sorted({float(x) for x in re.findall(r"pts_time:([0-9]+(?:\.[0-9]+)?)", output)})


def loudness(path: Path) -> dict[str, float | None]:
    output = run(
        [
            "ffmpeg",
            "-hide_banner",
            "-i",
            str(path),
            "-af",
            "ebur128=peak=true:framelog=verbose",
            "-f",
            "null",
            "NUL",
        ]
    )
    integrated = re.findall(r"\bI:\s*(-?[0-9]+(?:\.[0-9]+)?)\s*LUFS", output)
    lra = re.findall(r"\bLRA:\s*([0-9]+(?:\.[0-9]+)?)\s*LU", output)
    true_peak = re.findall(r"\b(?:Peak|True peak):\s*(-?[0-9]+(?:\.[0-9]+)?)\s*dBFS", output, re.I)
    return {
        "integrated_lufs": float(integrated[-1]) if integrated else None,
        "lra_lu": float(lra[-1]) if lra else None,
        "true_peak_dbfs": float(true_peak[-1]) if true_peak else None,
    }


def silence(path: Path) -> dict[str, Any]:
    output = run(
        [
            "ffmpeg",
            "-hide_banner",
            "-i",
            str(path),
            "-af",
            "silencedetect=noise=-35dB:d=0.25",
            "-f",
            "null",
            "NUL",
        ]
    )
    starts = [float(x) for x in re.findall(r"silence_start:\s*([0-9]+(?:\.[0-9]+)?)", output)]
    ends = [float(x) for x in re.findall(r"silence_end:\s*([0-9]+(?:\.[0-9]+)?)", output)]
    gaps: list[float] = []
    for start, end in zip(starts, ends):
        gaps.append(max(0.0, end - start))
    return {
        "threshold_db": -35,
        "min_duration_s": 0.25,
        "count": len(gaps),
        "total_s": round(sum(gaps), 3),
        "max_s": round(max(gaps), 3) if gaps else 0.0,
        "gaps_s": [round(x, 3) for x in gaps],
    }


def shot_stats(times: list[float], total_duration: float) -> dict[str, Any]:
    boundaries = [0.0, *times, total_duration]
    durations = [max(0.0, b - a) for a, b in zip(boundaries, boundaries[1:]) if b > a]
    if not durations:
        return {"cuts": 0, "shots": 0, "avg_shot_s": None, "median_shot_s": None, "p90_shot_s": None, "min_shot_s": None, "max_shot_s": None, "cuts_per_min": 0.0, "shot_durations_s": []}
    ordered = sorted(durations)
    p90_index = min(len(ordered) - 1, math.ceil(len(ordered) * 0.9) - 1)
    return {
        "cuts": len(times),
        "shots": len(durations),
        "avg_shot_s": round(statistics.mean(durations), 3),
        "median_shot_s": round(statistics.median(durations), 3),
        "p90_shot_s": round(ordered[p90_index], 3),
        "min_shot_s": round(min(durations), 3),
        "max_shot_s": round(max(durations), 3),
        "cuts_per_min": round(len(times) / max(total_duration / 60.0, 0.001), 3),
        "shot_durations_s": [round(x, 3) for x in durations],
    }


def audit_one(path: Path) -> dict[str, Any]:
    data = probe(path)
    total = duration(data)
    vs = video_stream(data)
    aus = audio_stream(data)
    cuts = scene_times(path)
    return {
        "file": path.name,
        "duration_s": round(total, 3),
        "size_mb": round(path.stat().st_size / (1024 * 1024), 3),
        "video": {
            "width": vs.get("width"),
            "height": vs.get("height"),
            "fps": vs.get("r_frame_rate"),
            "codec": vs.get("codec_name"),
        },
        "audio": {
            "codec": aus.get("codec_name"),
            "sample_rate": aus.get("sample_rate"),
            "channels": aus.get("channels"),
        },
        "shots": shot_stats(cuts, total),
        "cut_timestamps_s": [round(x, 3) for x in cuts],
        "loudness": loudness(path),
        "silence": silence(path),
    }


def main() -> None:
    records: list[dict[str, Any]] = []
    for path in sorted(SOURCE.glob("*.mp4")):
        print(f"AUDIT {path.name}", flush=True)
        records.append(audit_one(path))
    (OUT / "media_audit.json").write_text(json.dumps(records, indent=2), encoding="utf-8")
    with (OUT / "media_audit_summary.csv").open("w", newline="", encoding="utf-8") as f:
        fields = [
            "file", "duration_s", "width", "height", "fps", "cuts", "cuts_per_min",
            "avg_shot_s", "median_shot_s", "p90_shot_s", "min_shot_s", "max_shot_s",
            "integrated_lufs", "lra_lu", "true_peak_dbfs", "silence_count", "silence_total_s", "silence_max_s",
        ]
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        for r in records:
            writer.writerow({
                "file": r["file"], "duration_s": r["duration_s"],
                "width": r["video"]["width"], "height": r["video"]["height"], "fps": r["video"]["fps"],
                "cuts": r["shots"]["cuts"], "cuts_per_min": r["shots"]["cuts_per_min"],
                "avg_shot_s": r["shots"]["avg_shot_s"], "median_shot_s": r["shots"]["median_shot_s"],
                "p90_shot_s": r["shots"]["p90_shot_s"], "min_shot_s": r["shots"]["min_shot_s"], "max_shot_s": r["shots"]["max_shot_s"],
                "integrated_lufs": r["loudness"]["integrated_lufs"], "lra_lu": r["loudness"]["lra_lu"], "true_peak_dbfs": r["loudness"]["true_peak_dbfs"],
                "silence_count": r["silence"]["count"], "silence_total_s": r["silence"]["total_s"], "silence_max_s": r["silence"]["max_s"],
            })
    print(f"WROTE {OUT / 'media_audit.json'}")
    print(f"WROTE {OUT / 'media_audit_summary.csv'}")


if __name__ == "__main__":
    main()

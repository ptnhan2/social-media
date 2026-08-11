"""Deterministic media QA for IsaacVerse draft and master renders."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import tempfile
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image


def run(command: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(command, capture_output=True, text=True, check=False)


def probe(video: Path) -> dict[str, Any]:
    result = run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(video)])
    if result.returncode != 0: raise RuntimeError(result.stderr.strip() or "ffprobe failed")
    return json.loads(result.stdout)


def parse_freeze_events(stderr: str) -> list[dict[str, float]]:
    starts = [float(value) for value in re.findall(r"freeze_start:\s*([0-9.]+)", stderr)]
    ends = [float(value) for value in re.findall(r"freeze_end:\s*([0-9.]+)", stderr)]
    durations = [float(value) for value in re.findall(r"freeze_duration:\s*([0-9.]+)", stderr)]
    events: list[dict[str, float]] = []
    for index, duration in enumerate(durations):
        events.append({"startSec": starts[index] if index < len(starts) else 0.0, "endSec": ends[index] if index < len(ends) else duration, "durationSec": duration})
    return events


def audio_metrics(video: Path) -> dict[str, float | None]:
    result = run(["ffmpeg", "-hide_banner", "-i", str(video), "-af", "volumedetect", "-f", "null", "NUL"])
    mean = re.search(r"mean_volume:\s*(-?[0-9.]+) dB", result.stderr)
    peak = re.search(r"max_volume:\s*(-?[0-9.]+) dB", result.stderr)
    return {"meanVolumeDb": float(mean.group(1)) if mean else None, "maxVolumeDb": float(peak.group(1)) if peak else None}


def frame_metrics(video: Path, sample_fps: float = 2.0) -> tuple[dict[str, float], list[str]]:
    with tempfile.TemporaryDirectory(prefix="isaacverse-qa-") as directory:
        frame_dir = Path(directory) / "frames"
        frame_dir.mkdir()
        result = run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", str(video), "-vf", f"fps={sample_fps},scale=320:-1", "-q:v", "4", str(frame_dir / "frame-%04d.png")])
        if result.returncode != 0: raise RuntimeError(result.stderr.strip() or "frame extraction failed")
        files = sorted(frame_dir.glob("*.png"))
        if not files: return {"sampleCount": 0, "motionMean": 0.0, "sharpnessMean": 0.0, "saturationMean": 0.0, "edgeDensityMean": 0.0}, []
        motions: list[float] = []
        sharpness: list[float] = []
        saturation: list[float] = []
        edges: list[float] = []
        previous: np.ndarray | None = None
        for file in files:
            array = np.asarray(Image.open(file).convert("RGB"), dtype=np.float32) / 255.0
            gray = array.mean(axis=2)
            if previous is not None: motions.append(float(np.abs(gray - previous).mean()))
            previous = gray
            dx = np.diff(gray, axis=1)
            dy = np.diff(gray, axis=0)
            sharpness.append(float(np.var(dx) + np.var(dy)))
            saturation.append(float((array.max(axis=2) - array.min(axis=2)).mean()))
            edges.append(float(((np.abs(dx[:-1, :]) + np.abs(dy[:, :-1])) > 0.12).mean()))
        evidence = [str(file) for file in files[:8]]
        return {"sampleCount": float(len(files)), "motionMean": float(np.mean(motions or [0])), "sharpnessMean": float(np.mean(sharpness)), "saturationMean": float(np.mean(saturation)), "edgeDensityMean": float(np.mean(edges))}, evidence


def qa(video: Path, mode: str, output: Path | None = None) -> dict[str, Any]:
    media = probe(video)
    streams = media.get("streams", [])
    duration = float(media.get("format", {}).get("duration", 0))
    video_streams = [stream for stream in streams if stream.get("codec_type") == "video"]
    audio_streams = [stream for stream in streams if stream.get("codec_type") == "audio"]
    # -40dB is the calibrated threshold used in the IsaacVerse forensic pass;
    # -42dB treats sub-pixel camera drift as a freeze and overstates dead air.
    freeze_result = run(["ffmpeg", "-hide_banner", "-i", str(video), "-vf", "freezedetect=n=-40dB:d=0.5", "-an", "-f", "null", "NUL"])
    freeze_events = parse_freeze_events(freeze_result.stderr)
    frozen = sum(event["durationSec"] for event in freeze_events)
    frames, evidence = frame_metrics(video)
    audio = audio_metrics(video)
    failures: list[dict[str, Any]] = []
    warnings: list[dict[str, Any]] = []
    if not video_streams: failures.append({"id": "media-video", "message": "No video stream found", "evidencePaths": []})
    if not audio_streams: failures.append({"id": "media-audio", "message": "No audio stream found", "evidencePaths": []})
    if duration <= 0: failures.append({"id": "media-duration", "message": "Duration is not positive", "evidencePaths": []})
    freeze_ratio = frozen / duration if duration else 1.0
    if freeze_ratio > (0.8 if mode == "draft" else 0.6): failures.append({"id": "freeze-ratio", "message": f"Freeze ratio {freeze_ratio:.3f} exceeds {mode} threshold", "evidencePaths": evidence})
    if frames["motionMean"] < 0.001: warnings.append({"id": "motion-coverage", "message": "Sampled motion is low; vision review is required", "evidencePaths": evidence})
    if audio["maxVolumeDb"] is not None and audio["maxVolumeDb"] > -0.5: failures.append({"id": "true-peak-proxy", "message": f"Measured max volume {audio['maxVolumeDb']:.2f} dB exceeds -0.5 dB safety proxy", "evidencePaths": []})
    report = {
        "status": "fail" if failures else "pass_with_review",
        "mode": mode,
        "video": str(video),
        "media": {"durationSec": duration, "videoStreams": len(video_streams), "audioStreams": len(audio_streams), "width": video_streams[0].get("width") if video_streams else None, "height": video_streams[0].get("height") if video_streams else None},
        "audio": audio,
        "freeze": {"ratio": freeze_ratio, "maxDurationSec": max((event["durationSec"] for event in freeze_events), default=0.0), "events": freeze_events},
        "frames": frames,
        "failures": failures,
        "warnings": warnings,
        "evidencePaths": evidence,
        "visionReviewRequired": True,
    }
    if output:
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    return report


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", type=Path, required=True)
    parser.add_argument("--mode", choices=("draft", "master"), default="draft")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    report = qa(args.video, args.mode, args.output)
    print(json.dumps(report, indent=2))
    return 1 if report["status"] == "fail" else 0


if __name__ == "__main__":
    raise SystemExit(main())

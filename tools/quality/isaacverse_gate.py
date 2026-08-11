"""Deterministic IsaacVerse quality gate.

This gate validates structured production state and media technical health.
Visual taste/semantic treatment review remains an explicit vision-review gate.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
from pathlib import Path
from typing import Any


TREATMENTS = {
    "audience-demand-proof",
    "screen-proof-in-world",
    "semantic-diagram",
    "host-reflection-cinematic",
    "cinematic-metaphor",
    "chapter-card",
    "candidate-comparison",
    "process-timeline",
}


def add(report: dict[str, Any], level: str, code: str, message: str, path: str | None = None) -> None:
    report[level].append({"code": code, "message": message, "path": path})


def load(path: Path | None) -> Any:
    if not path:
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def validate_video_doc(doc: Any, report: dict[str, Any], draft: bool) -> None:
    if not isinstance(doc, dict):
        add(report, "failures", "video_doc_type", "VideoDoc must be an object")
        return
    for key in ("id", "idea", "surfaceProblem", "deeperProblem", "thumbnailPromise"):
        if not str(doc.get(key, "")).strip():
            add(report, "failures", "video_doc_required", f"Missing required VideoDoc field: {key}", f"$.{key}")
    if not isinstance(doc.get("commonGoal"), dict) or doc["commonGoal"].get("aligned") is not True:
        add(report, "failures", "common_goal", "Viewer and creator common goal is not explicitly aligned", "$.commonGoal")
    beats = doc.get("beats")
    if not isinstance(beats, list) or not beats:
        add(report, "failures", "beats_missing", "VideoDoc requires at least one beat", "$.beats")
        return
    if len(beats) < 12 and not draft:
        add(report, "warnings", "journey_incomplete", f"VideoDoc has {len(beats)} beats; full hero journey expects 12 slots", "$.beats")
    ids: set[str] = set()
    for i, beat in enumerate(beats):
        path = f"$.beats[{i}]"
        if not isinstance(beat, dict):
            add(report, "failures", "beat_type", "Beat must be an object", path)
            continue
        beat_id = beat.get("id")
        if not isinstance(beat_id, str) or not beat_id:
            add(report, "failures", "beat_id", "Beat requires a stable id", f"{path}.id")
        elif beat_id in ids:
            add(report, "failures", "duplicate_beat_id", f"Duplicate beat id: {beat_id}", f"{path}.id")
        else:
            ids.add(beat_id)
        if not str(beat.get("transcript", "")).strip():
            add(report, "failures", "beat_transcript", "Beat transcript is empty", f"{path}.transcript")
        treatment = beat.get("treatment")
        if not isinstance(treatment, dict) or treatment.get("id") not in TREATMENTS:
            add(report, "failures", "treatment_id", f"Unknown or missing treatment: {treatment.get('id') if isinstance(treatment, dict) else None}", f"{path}.treatment")
        if not isinstance(beat.get("audioCues"), list):
            add(report, "failures", "audio_cues", "audioCues must be an array", f"{path}.audioCues")


def validate_edit_doc(doc: Any, report: dict[str, Any]) -> None:
    if not isinstance(doc, dict):
        add(report, "failures", "edit_doc_type", "EditDoc must be an object")
        return
    for key in ("id", "width", "height", "fps", "beats"):
        if key not in doc:
            add(report, "failures", "edit_doc_required", f"Missing required EditDoc field: {key}", f"$.{key}")
    beats = doc.get("beats", [])
    if not isinstance(beats, list):
        add(report, "failures", "edit_beats_type", "EditDoc beats must be an array", "$.beats")
        return
    ids: set[str] = set()
    previous_end = 0.0
    for i, beat in enumerate(beats):
        path = f"$.beats[{i}]"
        if not isinstance(beat, dict):
            add(report, "failures", "edit_beat_type", "Edit beat must be an object", path)
            continue
        beat_id = beat.get("id")
        if not isinstance(beat_id, str) or not beat_id:
            add(report, "failures", "edit_beat_id", "Edit beat requires stable id", f"{path}.id")
        elif beat_id in ids:
            add(report, "failures", "duplicate_edit_beat_id", f"Duplicate edit beat id: {beat_id}", f"{path}.id")
        else:
            ids.add(beat_id)
        start = beat.get("startSec")
        duration = beat.get("durationSec")
        if not isinstance(start, (int, float)) or start < 0:
            add(report, "failures", "beat_start", "startSec must be non-negative", f"{path}.startSec")
        if not isinstance(duration, (int, float)) or duration <= 0:
            add(report, "failures", "beat_duration", "durationSec must be positive", f"{path}.durationSec")
        if isinstance(start, (int, float)) and isinstance(duration, (int, float)):
            if start < previous_end - 0.01:
                add(report, "failures", "beat_overlap", "Beat overlaps previous beat", path)
            previous_end = max(previous_end, start + duration)
    for i, transition in enumerate(doc.get("transitions", []) or []):
        if not isinstance(transition, dict):
            add(report, "failures", "transition_type", "Transition must be an object", f"$.transitions[{i}]")
            continue
        if transition.get("type") not in {"flash", "fade", "blur", "light-leak"}:
            add(report, "failures", "transition_id", "Unknown transition type", f"$.transitions[{i}].type")


def probe_media(path: Path, report: dict[str, Any]) -> None:
    try:
        raw = subprocess.check_output(["ffprobe", "-v", "error", "-print_format", "json", "-show_format", "-show_streams", str(path)], text=True, encoding="utf-8", errors="replace")
        data = json.loads(raw)
    except Exception as exc:
        add(report, "failures", "ffprobe", f"ffprobe failed: {exc}")
        return
    streams = data.get("streams", [])
    video = [s for s in streams if s.get("codec_type") == "video"]
    audio = [s for s in streams if s.get("codec_type") == "audio"]
    if not video:
        add(report, "failures", "video_stream", "Rendered output has no video stream")
    if not audio:
        add(report, "failures", "audio_stream", "Rendered output has no audio stream")
    duration = float(data.get("format", {}).get("duration", 0) or 0)
    if duration <= 0:
        add(report, "failures", "duration", "Rendered output has no positive duration")
    report["media"] = {"durationSec": duration, "videoStreams": len(video), "audioStreams": len(audio), "format": data.get("format", {}).get("format_name")}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--video-doc", type=Path)
    parser.add_argument("--edit-doc", type=Path)
    parser.add_argument("--video", type=Path)
    parser.add_argument("--draft", action="store_true")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    report: dict[str, Any] = {"failures": [], "warnings": [], "media": {}, "visionReviewRequired": True}
    if args.video_doc:
        validate_video_doc(load(args.video_doc), report, args.draft)
    if args.edit_doc:
        validate_edit_doc(load(args.edit_doc), report)
    if args.video:
        probe_media(args.video, report)
    report["status"] = "FAIL" if report["failures"] else "PASS_WITH_VISION_REVIEW"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 1 if report["failures"] else 0


if __name__ == "__main__":
    raise SystemExit(main())

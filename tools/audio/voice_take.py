"""Voice take switch (PIPELINE-PRODUCTION-SPEC v3, M1b stage F) — the UI/agent
take switcher backend. Regenerating new takes is voice_regen.py's job; this
script only re-applies the post-chain + QC to an EXISTING take mp3 and emits
the same result shape so the `voice_apply` bridge op works unchanged.

stdin JSON: { projectId, clipId, takeId, breathPadSec? }

stdout: single JSON { ok, projectId, clipId, src, stemPath,
stemDurationSec, takeId, takes, qc, providerText, settings, elapsedSec }.

The take is located via the clip's `metadata.takes` ledger in
projects/<slug>/editor/current.json (path recorded at generation time), with a
disk fallback to voice/takes/<takeId>.mp3. WER is reused from the take's
generation-time metrics — switching takes does not re-transcribe.
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools" / "audio"))

from voice_regen import (  # noqa: E402 — shared stages, no side effects on import
    ffprobe_duration,
    load_env,
    loudnorm_measure,
    post_chain,
    tail_silence,
    volumedetect,
)


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    load_env()
    job = json.loads(sys.stdin.buffer.read().decode("utf-8"))
    project_id = job["projectId"]
    clip_id = job["clipId"]
    take_id = str(job["takeId"])
    started = time.time()

    editor_path = ROOT / "projects" / project_id / "editor" / "current.json"
    if not editor_path.exists():
        print(json.dumps({"ok": False, "error": f"no editor doc: {editor_path}"}))
        return 1
    doc = json.loads(editor_path.read_text(encoding="utf-8"))
    clips = [c for track in doc.get("tracks", []) for c in track.get("clips", [])]
    clip = next((c for c in clips if c.get("id") == clip_id), None)
    if clip is None:
        print(json.dumps({"ok": False, "error": f"unknown clip: {clip_id}"}))
        return 1
    md = clip.get("metadata", {})
    takes = md.get("takes") if isinstance(md.get("takes"), list) else []

    take = next((t for t in takes if t.get("id") == take_id), None)
    take_path: Path | None = None
    if take and take.get("path"):
        candidate = Path(str(take["path"]))
        if candidate.exists():
            take_path = candidate
    if take_path is None:  # disk fallback: takes dir + takeId filename
        candidate = ROOT / "projects" / project_id / "voice" / "takes" / f"{take_id}.mp3"
        if candidate.exists():
            take_path = candidate
    if take_path is None:
        print(json.dumps({"ok": False, "error": f"take not found: {take_id}"}))
        return 1

    safe_clip = re.sub(r"[^a-zA-Z0-9._-]", "_", clip_id)
    stems_dir = ROOT / "projects" / project_id / "voice" / "stems"
    stems_dir.mkdir(parents=True, exist_ok=True)
    stem_path = stems_dir / f"{safe_clip}.wav"

    post_chain(take_path, stem_path)
    stem_duration = ffprobe_duration(stem_path)
    stem_mean, stem_peak = volumedetect(stem_path)
    stem_lufs_raw = loudnorm_measure(stem_path)
    stem_lufs = float(stem_lufs_raw["input_i"]) if stem_lufs_raw and stem_lufs_raw.get("input_i") is not None else None
    stem_tail = tail_silence(stem_path)

    # expected duration: keep the last QC's expectation (comparable verdicts),
    # fall back to the WPM heuristic on the spoken text.
    expected_sec = md.get("qc", {}).get("expectedSec")
    if not isinstance(expected_sec, (int, float)) or expected_sec <= 0:
        words = len(str(md.get("providerText") or md.get("sentenceText") or "").split())
        expected_sec = max(0.8, (words / 150.0) * 60)
    # WER is generation-time truth — the audio bytes did not change.
    take_metrics = (take or {}).get("metrics", {})
    wer = take_metrics.get("wer") if isinstance(take_metrics, dict) else None

    duration_pass = (wer is not None and wer <= 0.05) or abs(stem_duration - expected_sec) / max(0.5, expected_sec) <= 0.15
    qc = {
        "pass": stem_peak < -0.5 and stem_tail <= 1.5 and duration_pass,
        "checkedAt": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "durationSec": stem_duration,
        "expectedSec": expected_sec,
        "peakDb": stem_peak,
        "meanDb": stem_mean,
        "lufs": stem_lufs,
        "tailSilenceSec": stem_tail,
        "wer": wer,
        "checks": [
            {"id": "clip", "label": "Clipping", "pass": stem_peak < -0.5, "value": f"{stem_peak:.1f} dBFS peak", "threshold": "< -0.5 dBFS"},
            {"id": "duration", "label": "Duration", "pass": duration_pass, "value": f"{stem_duration:.2f}s vs {expected_sec:.2f}s", "threshold": "±15% or WER-verified"},
            {"id": "tail-silence", "label": "Tail silence", "pass": stem_tail <= 1.5, "value": f"{stem_tail:.2f}s", "threshold": "≤ 1.5s"},
            {"id": "lufs", "label": "Loudness (post)", "pass": stem_lufs is not None and abs(stem_lufs - (-16)) <= 1.5, "value": f"{stem_lufs if stem_lufs is not None else 'n/a'} LUFS", "threshold": "-16 ±1.5"},
        ],
    }

    result = {
        "ok": True,
        "projectId": project_id,
        "clipId": clip_id,
        "src": f"{project_id}/voice/stems/{safe_clip}.wav",
        "stemPath": str(stem_path),
        "stemDurationSec": round(stem_duration, 3),
        "takeId": take_id,
        "takes": takes,
        "qc": qc,
        "providerText": md.get("providerText") or md.get("sentenceText") or "",
        "settings": md.get("voiceSettings") or {},
        "elapsedSec": round(time.time() - started, 1),
    }
    print(json.dumps(result, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())

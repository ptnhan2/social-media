"""Voice QC pass — measure an EXISTING stem and print the QC verdict.

For stems generated before the QC pipeline existed, or for re-measuring
after chain changes. Does NOT regenerate; reads the stem only.

stdin JSON: { projectId, clipId, stemPath, providerText, expectedSec? }
stdout JSON: { ok, qc, stemDurationSec }
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def load_env() -> None:
    env_file = ROOT / ".env"
    if not env_file.exists():
        return
    for line in env_file.read_text(encoding="utf-8-sig").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def ffprobe_duration(path: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)],
        capture_output=True, text=True, check=True,
    ).stdout.strip()
    return float(out)


def volumedetect(path: Path) -> tuple[float, float]:
    proc = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", str(path), "-af", "volumedetect", "-f", "null", "NUL"],
        capture_output=True, text=True,
    )
    mean = re.search(r"mean_volume:\s*(-?[0-9.]+) dB", proc.stderr)
    peak = re.search(r"max_volume:\s*(-?[0-9.]+) dB", proc.stderr)
    return (float(mean.group(1)) if mean else -60.0, float(peak.group(1)) if peak else -60.0)


def loudnorm_measure(path: Path) -> dict | None:
    proc = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", str(path), "-af", "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json", "-f", "null", "NUL"],
        capture_output=True, text=True,
    )
    match = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", proc.stderr, re.S)
    return json.loads(match.group(0)) if match else None


def tail_silence(path: Path) -> float:
    duration = ffprobe_duration(path)
    proc = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", str(path), "-af", "silencedetect=noise=-45dB:d=0.3", "-f", "null", "NUL"],
        capture_output=True, text=True,
    )
    best = 0.0
    ends = list(re.finditer(r"silence_end:\s*(-?[0-9.]+)", proc.stderr))
    for start_match, end_match in zip(re.finditer(r"silence_start:\s*(-?[0-9.]+)", proc.stderr), ends + [None]):
        start = float(start_match.group(1))
        end = float(end_match.group(1)) if end_match else duration
        if end >= duration - 0.05:
            best = max(best, duration - start)
    return best


def scribe_wer(path: Path, script: str) -> float | None:
    api_key = os.environ.get("ELEVENLABS_API_KEY")
    if not api_key:
        return None
    try:
        import requests
        script_words = re.sub(r"<[^>]+>", " ", script)
        script_words = re.sub(r"[^\w\s']", " ", script_words).lower().split()
        with open(path, "rb") as handle:
            response = requests.post(
                "https://api.elevenlabs.io/v1/speech-to-text",
                headers={"xi-api-key": api_key},
                files={"file": (path.name, handle, "audio/wav")},
                data={"model_id": "scribe_v1", "language_code": "en"},
                timeout=120,
            )
        response.raise_for_status()
        hyp = response.json().get("text", "").lower()
        hyp_words = re.sub(r"[^\w\s']", " ", hyp).split()
        if not hyp_words and not script_words:
            return 0.0
        import difflib
        return round(max(0.0, 1.0 - difflib.SequenceMatcher(None, script_words, hyp_words).ratio()), 4)
    except Exception:
        return None


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    load_env()
    job = json.loads(sys.stdin.buffer.read().decode("utf-8"))
    stem = Path(job["stemPath"])
    if not stem.exists():
        print(json.dumps({"ok": False, "error": f"stem missing: {stem}"}))
        return 1
    duration = ffprobe_duration(stem)
    mean_db, peak_db = volumedetect(stem)
    lufs_raw = loudnorm_measure(stem)
    lufs = float(lufs_raw["input_i"]) if lufs_raw and lufs_raw.get("input_i") is not None else None
    tail = tail_silence(stem)
    script = job.get("providerText") or job.get("sentenceText") or ""
    wer = scribe_wer(stem, script) if script else None
    expected = float(job.get("expectedSec") or 0) or duration
    dur_delta = abs(duration - expected) / max(0.5, expected)
    wer_verified = wer is not None and wer <= 0.05
    checks = [
        {"id": "clip", "label": "Clipping", "pass": peak_db < -0.5, "value": f"{peak_db:.1f} dBFS peak", "threshold": "< -0.5 dBFS"},
        {"id": "duration", "label": "Duration", "pass": wer_verified or dur_delta <= 0.15, "value": f"{duration:.2f}s vs {expected:.2f}s", "threshold": "±15% or WER-verified"},
        {"id": "tail-silence", "label": "Tail silence", "pass": tail <= 1.5, "value": f"{tail:.2f}s", "threshold": "≤ 1.5s"},
        {"id": "lufs", "label": "Loudness", "pass": lufs is not None and abs(lufs - (-16)) <= 1.5, "value": f"{lufs if lufs is not None else 'n/a'} LUFS", "threshold": "-16 ±1.5"},
    ]
    qc = {
        "pass": all(check["pass"] for check in checks),
        "checkedAt": __import__("time").strftime("%Y-%m-%dT%H:%M:%S"),
        "durationSec": duration,
        "expectedSec": expected,
        "peakDb": peak_db,
        "meanDb": mean_db,
        "lufs": lufs,
        "tailSilenceSec": tail,
        "wer": wer,
        "checks": checks,
    }
    print(json.dumps({"ok": True, "qc": qc, "stemDurationSec": round(duration, 3)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())

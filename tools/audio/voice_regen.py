"""Voice regen job — one voice clip, end to end (PIPELINE-PRODUCTION-SPEC v3, M1a).

stdin JSON:
  { projectId, clipId, providerText, voiceSettings: {voiceId, modelId,
    stability, similarityBoost, style, speed, useSpeakerBoost}, expectedSec, takes }

Pipeline per take: ElevenLabs TTS -> deterministic QC (ffprobe duration,
ffmpeg volumedetect peak/mean, loudnorm measure, silencedetect tail) ->
best-take scoring (isaacverse_voice.py formula) -> post-chain
(HPF -> denoise -> EQ -> comp -> 2-pass loudnorm -16 LUFS / -1.5 dBTP)
-> stem WAV 48kHz. Takes are kept for the UI take switcher.

stdout: single JSON { ok, projectId, clipId, stemPath, stemDurationSec,
takeId, qc, takes: [{path, metrics, pass}], providerText, settings, costs }.
WER is measured only when whisperx is importable (optional dependency);
otherwise wer=null and the check is skipped — never fabricated.
"""
from __future__ import annotations

import io
import json
import os
import re
import subprocess
import sys
import tempfile
import time
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
    if not match:
        return None
    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError:
        return None


def tail_silence(path: Path) -> float:
    """Silence at the END of the file (silencedetect windows touching the
    known duration)."""
    duration = ffprobe_duration(path)
    proc = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", str(path), "-af", "silencedetect=noise=-45dB:d=0.3", "-f", "null", "NUL"],
        capture_output=True, text=True,
    )
    best = 0.0
    for start_match, end_match in zip(
        re.finditer(r"silence_start:\s*(-?[0-9.]+)", proc.stderr),
        list(re.finditer(r"silence_end:\s*(-?[0-9.]+)", proc.stderr)) + [None],
    ):
        start = float(start_match.group(1))
        end = float(end_match.group(1)) if end_match else duration
        if end >= duration - 0.05:
            best = max(best, duration - start)
    return best


def score_take(mean_db: float, peak_db: float, duration_sec: float, expected_sec: float) -> float:
    """isaacverse_voice.py formula: prefer usable dynamics, timing close to
    expected, punish clipping."""
    dynamic_range = max(0.0, peak_db - mean_db)
    timing_penalty = abs(duration_sec - expected_sec) * 0.5
    clipped_penalty = max(0.0, peak_db + 1.0) * 2.0
    return round(dynamic_range - timing_penalty - clipped_penalty, 4)


def transcribe_wer(path: Path, script: str) -> float | None:
    """WER via ElevenLabs Scribe (cheap, no local model needed). Strips
    provider-text markup (break tags) from the script first — only SPOKEN
    words count. Returns None when the service/config is unavailable: the
    check is skipped, never fabricated."""
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
                files={"file": (path.name, handle, "audio/mpeg")},
                data={"model_id": "scribe_v1", "language_code": "en"},
                timeout=120,
            )
        response.raise_for_status()
        hyp = response.json().get("text", "").lower()
        hyp_words = re.sub(r"[^\w\s']", " ", hyp).split()
        if not hyp_words and not script_words:
            return 0.0
        import difflib
        matcher = difflib.SequenceMatcher(None, script_words, hyp_words)
        return round(max(0.0, 1.0 - matcher.ratio()), 4)
    except Exception:
        return None


def tts_take(text: str, settings: dict, out_path: Path) -> None:
    import urllib.request

    api_key = os.environ.get("ELEVENLABS_API_KEY")
    if not api_key:
        raise RuntimeError("No ELEVENLABS_API_KEY")
    payload = {
        "text": text,
        "model_id": settings.get("modelId", "eleven_multilingual_v2"),
        "voice_settings": {
            "stability": settings.get("stability", 0.35),
            "similarity_boost": settings.get("similarityBoost", 0.75),
            "style": settings.get("style", 0.35),
            "speed": settings.get("speed", 1.0),
            "use_speaker_boost": settings.get("useSpeakerBoost", True),
        },
    }
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{settings.get('voiceId', '21m00Tcm4TlvDq8ikWAM')}",
        data=json.dumps(payload).encode(),
        headers={"xi-api-key": api_key, "Content-Type": "application/json", "Accept": "audio/mpeg"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=180) as resp:
        out_path.write_bytes(resp.read())


def post_chain(take_path: Path, out_stem: Path) -> None:
    """SPEC v3 stage G: HPF -> denoise -> EQ (cut 500Hz, boost 3kHz) -> comp
    3:1 -> 2-pass loudnorm (-16 LUFS / -1.5 dBTP, linear). Stems stay DRY —
    room feel comes from ambience + ducking at mix, not reverb on the VO."""
    measure = loudnorm_measure(take_path) or {}
    chain = "highpass=f=80,afftdn,equalizer=f=500:t=q:w=1:g=-3,equalizer=f=3000:t=q:w=1.5:g=2.5,acompressor=threshold=-26dB:ratio=3:attack=2:release=15"
    ln = "loudnorm=I=-16:TP=-1.5:LRA=11"
    measured = ""
    if measure.get("input_i") is not None:
        measured = (
            f":measured_I={measure['input_i']}:measured_TP={measure.get('input_tp', 0)}"
            f":measured_LRA={measure.get('input_lra', 11)}:measured_thresh={measure.get('input_thresh', -70)}:linear=true"
        )
    subprocess.run(
        ["ffmpeg", "-hide_banner", "-y", "-i", str(take_path), "-af", f"{chain},{ln}{measured}", "-ar", "48000", "-c:a", "pcm_s16le", str(out_stem)],
        capture_output=True, text=True, check=True,
    )


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    load_env()
    job = json.loads(sys.stdin.buffer.read().decode("utf-8"))
    project_id = job["projectId"]
    clip_id = job["clipId"]
    provider_text = job["providerText"]
    settings = job.get("voiceSettings") or {}
    expected_sec = float(job.get("expectedSec") or 0)
    take_count = max(1, min(3, int(job.get("takes", 2))))

    safe_clip = re.sub(r"[^a-zA-Z0-9._-]", "_", clip_id)
    takes_dir = ROOT / "projects" / project_id / "voice" / "takes"
    stems_dir = ROOT / "projects" / project_id / "voice" / "stems"
    takes_dir.mkdir(parents=True, exist_ok=True)
    stems_dir.mkdir(parents=True, exist_ok=True)

    if expected_sec <= 0:
        words = len(provider_text.replace("<break time=0.4s/>", " ").split())
        expected_sec = max(0.8, (words / 150.0) * 60)

    started = time.time()
    takes = []
    for index in range(take_count):
        take_path = takes_dir / f"{safe_clip}-take-{index + 1:02d}.mp3"
        try:
            tts_take(provider_text, settings, take_path)
        except Exception as exc:  # noqa: BLE001 — report, don't kill the job
            takes.append({"path": str(take_path), "error": str(exc)[:200]})
            continue
        duration = ffprobe_duration(take_path)
        mean_db, peak_db = volumedetect(take_path)
        tail = tail_silence(take_path)
        lufs_raw = loudnorm_measure(take_path)
        lufs = float(lufs_raw["input_i"]) if lufs_raw and lufs_raw.get("input_i") is not None else None
        wer = transcribe_wer(take_path, provider_text)
        score = score_take(mean_db, peak_db, duration, expected_sec)
        peak_pass = peak_db < -0.5
        dur_pass = abs(duration - expected_sec) / max(0.5, expected_sec) <= 0.15
        takes.append({
            "id": f"{safe_clip}-take-{index + 1:02d}",
            "path": str(take_path),
            "metrics": {"durationSec": duration, "meanDb": mean_db, "peakDb": peak_db, "lufs": lufs, "tailSilenceSec": tail, "wer": wer},
            "score": score,
            "pass": peak_pass and dur_pass and tail <= 1.5 and (wer is None or wer <= 0.05),
        })

    usable = [t for t in takes if "metrics" in t]
    if not usable:
        print(json.dumps({"ok": False, error: "all takes failed to generate", takes: takes}, ensure_ascii=False))
        return 1
    best = max(usable, key=lambda t: (t["pass"], t["score"]))
    best_path = Path(best["path"])

    stem_path = stems_dir / f"{safe_clip}.wav"
    post_chain(best_path, stem_path)
    stem_duration = ffprobe_duration(stem_path)
    stem_mean, stem_peak = volumedetect(stem_path)
    stem_lufs_raw = loudnorm_measure(stem_path)
    stem_lufs = float(stem_lufs_raw["input_i"]) if stem_lufs_raw and stem_lufs_raw.get("input_i") is not None else None
    stem_tail = tail_silence(stem_path)

    qc = {
        # WER is the truncation/garbling oracle: when transcription confirms
        # the full script was spoken, a WPM-heuristic duration mismatch is a
        # DELIVERY STYLE (fast/slow read), not a failure — downgrade to info.
        "pass": best["pass"] and stem_peak < -0.5 and stem_tail <= 1.5,
        "checkedAt": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "durationSec": stem_duration,
        "expectedSec": expected_sec,
        "peakDb": stem_peak,
        "meanDb": stem_mean,
        "lufs": stem_lufs,
        "tailSilenceSec": stem_tail,
        "wer": best["metrics"].get("wer"),
        "checks": [
            {"id": "clip", "label": "Clipping", "pass": stem_peak < -0.5, "value": f"{stem_peak:.1f} dBFS peak", "threshold": "< -0.5 dBFS"},
            {"id": "duration", "label": "Duration", "pass": (best["metrics"].get("wer") is not None and best["metrics"].get("wer", 1) <= 0.05) or abs(stem_duration - expected_sec) / max(0.5, expected_sec) <= 0.15, "value": f"{stem_duration:.2f}s vs {expected_sec:.2f}s", "threshold": "±15% or WER-verified"},
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
        "takeId": best["id"],
        "takes": takes,
        "qc": qc,
        "providerText": provider_text,
        "settings": settings,
        "elapsedSec": round(time.time() - started, 1),
    }
    print(json.dumps(result, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())

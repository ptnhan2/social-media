"""Generate a zero-cost local voice bed through Windows SAPI.

This is a deterministic fallback for local pilots. It never calls a paid provider.
"""

from __future__ import annotations

import argparse
import base64
import subprocess
import tempfile
from pathlib import Path


def powershell_speak(text: str, output: Path) -> None:
    script = f"""
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.Rate = 0
$synth.Volume = 90
$synth.SetOutputToWaveFile('{str(output).replace("'", "''")}')
$synth.Speak('{text.replace("'", "''")}')
$synth.Dispose()
"""
    encoded = base64.b64encode(script.encode("utf-16le")).decode("ascii")
    subprocess.run(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-EncodedCommand", encoded], check=True)


def normalize_to_duration(source: Path, output: Path, duration_sec: float) -> None:
    subprocess.run([
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(source),
        "-af", "loudnorm=I=-16:TP=-1:LRA=7,apad", "-t", str(duration_sec),
        "-ar", "48000", "-ac", "2", str(output),
    ], check=True)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--text", required=True)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--duration", type=float, default=30.0)
    args = parser.parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="isaacverse-sapi-") as directory:
        raw = Path(directory) / "voice.wav"
        powershell_speak(args.text, raw)
        normalize_to_duration(raw, args.output, args.duration)
    print(f"local_sapi_voice={args.output} duration={args.duration:.2f}s")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

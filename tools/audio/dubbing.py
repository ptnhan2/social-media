"""Local dubbing/stem packaging helpers.

External dubbing providers are optional. The local path splits and aligns the
existing voice/music stems and records an explicit unavailable-provider status.
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
from pathlib import Path


def audio_duration(path: Path) -> float:
    result = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)], capture_output=True, text=True, check=True)
    return float(result.stdout.strip())


def split_stems(voice: Path, music: Path, output_dir: Path) -> dict[str, str | float]:
    output_dir.mkdir(parents=True, exist_ok=True)
    voice_out = output_dir / "voice-stem.wav"
    music_out = output_dir / "music-sfx-stem.wav"
    shutil.copyfile(voice, voice_out)
    shutil.copyfile(music, music_out)
    return {"voiceSrc": str(voice_out), "musicSfxSrc": str(music_out), "durationSec": max(audio_duration(voice), audio_duration(music))}


def plan_dubs(stems: dict[str, str | float], languages: list[str]) -> list[dict[str, object]]:
    return [{"language": language, "voiceSrc": None, "mixSrc": str(stems["musicSfxSrc"]), "aligned": False, "status": "planned", "notes": ["External dubbing provider not invoked; voice stem is ready for an explicit provider call."]} for language in languages]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--voice", type=Path, required=True)
    parser.add_argument("--music", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--languages", nargs="+", default=["vi"])
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    stems = split_stems(args.voice, args.music, args.output_dir)
    result = {"stems": stems, "dubs": plan_dubs(stems, args.languages), "providerCalls": []}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

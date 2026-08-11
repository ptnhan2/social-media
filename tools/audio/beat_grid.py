"""Deterministic music beat-grid helper with a BPM fallback for local pilots."""

from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path


def duration(path: Path) -> float:
    result = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)], capture_output=True, text=True, check=True)
    return float(result.stdout.strip())


def analyze(path: Path, bpm: float = 90.0) -> dict:
    seconds = duration(path)
    interval = 60.0 / bpm
    beats = [round(index * interval, 4) for index in range(int(seconds / interval) + 1)]
    return {"src": str(path), "durationSec": seconds, "bpm": bpm, "beatsSec": beats, "method": "deterministic-bpm-grid"}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--audio", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--bpm", type=float, default=90.0)
    args = parser.parse_args()
    result = analyze(args.audio, args.bpm)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

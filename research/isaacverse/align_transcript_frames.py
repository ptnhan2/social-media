"""Align selected frame timestamps with VTT transcript cues.

Usage:
  python align_transcript_frames.py <vtt> <out.json> 0 5 10 ...
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path


TIME = re.compile(r"(\d{2}):(\d{2}):(\d{2})\.(\d{3})")


def seconds(value: str) -> float:
    m = TIME.search(value)
    if not m:
        return 0.0
    h, minute, sec, ms = map(int, m.groups())
    return h * 3600 + minute * 60 + sec + ms / 1000


def parse_vtt(path: Path):
    cues = []
    lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if "-->" not in line:
            i += 1
            continue
        left, right = [part.strip() for part in line.split("-->", 1)]
        start = seconds(left)
        end = seconds(right.split()[0])
        i += 1
        text = []
        while i < len(lines) and lines[i].strip():
            text.append(re.sub(r"<[^>]+>", "", lines[i]).strip())
            i += 1
        value = re.sub(r"\s+", " ", " ".join(text)).strip()
        if value:
            cues.append({"start": start, "end": end, "text": value})
        i += 1
    return cues


def main():
    if len(sys.argv) < 3:
        raise SystemExit("usage: align_transcript_frames.py <vtt> <out.json> [timestamps...]" )
    vtt = Path(sys.argv[1])
    out = Path(sys.argv[2])
    timestamps = [float(x) for x in sys.argv[3:]]
    cues = parse_vtt(vtt)
    rows = []
    for timestamp in timestamps:
        active = [c["text"] for c in cues if c["start"] <= timestamp < c["end"]]
        previous = max((c for c in cues if c["start"] <= timestamp), key=lambda c: c["start"], default=None)
        rows.append({
            "timestamp_s": timestamp,
            "active_text": " ".join(active),
            "nearest_text": previous["text"] if previous else "",
        })
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps({"vtt": str(vtt), "frames": rows}, indent=2, ensure_ascii=False), encoding="utf-8")
    print(out)


if __name__ == "__main__":
    main()

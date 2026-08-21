"""Overnight seeding: pre-compute VLM verdicts for the 1080p vote pairs,
retrying on flaky-endpoint errors. Seeds memories/vote_verdicts.json."""
import json
import re
import sys
import time
from pathlib import Path

sys.path.insert(0, "harness")
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

for line in Path(".env").read_text(encoding="utf-8", errors="replace").splitlines():
    line = line.strip()
    if "=" in line and not line.startswith("#"):
        k, _, v = line.partition("=")
        v = v.strip()
        if "#" in v and not (v.startswith('"') or v.startswith("'")):
            v = v.split("#")[0].strip()
        if v:
            import os
            os.environ.setdefault(k.strip(), v)

from harness_tools import pairwise_verdict

CACHE = Path("harness/memories/vote_verdicts.json")
PAIRS = [
    ("hr3color1080", "projects/isaacverse-final/renders/windows/hr3_1080_baseline.mp4",
     "projects/isaacverse-final/renders/windows/hr3_1080_color.mp4"),
    ("hr3push1080", "projects/isaacverse-final/renders/windows/hr3_1080_baseline.mp4",
     "projects/isaacverse-final/renders/windows/hr3_1080_push.mp4"),
]


def load_cache():
    if CACHE.exists():
        try:
            return json.loads(CACHE.read_text(encoding="utf-8-sig"))
        except json.JSONDecodeError:
            return {}
    return {}


deadline = time.time() + 6 * 3600
while time.time() < deadline:
    cache = load_cache()
    pending = [p for p in PAIRS
               if cache.get(p[0], {}).get("winner") in (None, "error", "unparsed", "")]
    if not pending:
        print("all 1080p verdicts cached — done", flush=True)
        break
    for pid, a, b in pending:
        print(f"verdict {pid} ...", flush=True)
        try:
            out = pairwise_verdict.invoke({"video_a": a, "video_b": b})
        except Exception as e:  # noqa: BLE001
            out = f"VERDICT ERROR: {e}"
        first = out.splitlines()[0] if out else ""
        m = re.search(r"Pairwise verdict: (\w+)", first)
        winner = m.group(1).lower() if m else "error"
        if "CONTROL FAILED" in out or "ORACLE UNAVAILABLE" in out or "VERDICT ERROR" in out:
            winner = "error"
        cache[pid] = {"winner": winner, "raw": first[:220],
                      "ts": time.strftime("%Y-%m-%dT%H:%M:%S")}
        CACHE.write_text(json.dumps(cache, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"  -> {winner}", flush=True)
    if all(load_cache().get(p[0], {}).get("winner") not in (None, "error", "unparsed", "") for p in PAIRS):
        print("all 1080p verdicts cached — done", flush=True)
        break
    time.sleep(1200)

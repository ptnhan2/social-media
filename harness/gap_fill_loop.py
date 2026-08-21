"""Overnight gap-fill loop: retry failed tutorial moments every 20 minutes,
up to 8 hours. Stops early when nothing is left to fill."""
import subprocess
import sys
import time
from pathlib import Path

script = Path(__file__).parent / "gap_fill_tutorial.py"
store = Path(__file__).parent / "memories" / "tutorial-candidates.json"


def failed_count() -> int:
    import json
    data = json.loads(store.read_text(encoding="utf-8-sig"))
    return sum(1 for v in data.get("videos", [])
               for m in v.get("moments", [])
               if "VLM API error" in str(m.get("description", "")))


deadline = time.time() + 8 * 3600
attempt = 0
while time.time() < deadline:
    attempt += 1
    n = failed_count()
    if n == 0:
        print(f"[attempt {attempt}] nothing left to fill — done", flush=True)
        break
    print(f"[attempt {attempt}] {n} failed moments — running gap-fill", flush=True)
    r = subprocess.run([sys.executable, "-u", str(script)], capture_output=True, text=True,
                       encoding="utf-8", errors="replace", timeout=3600)
    print((r.stdout or "")[-800:], flush=True)
    if failed_count() == 0:
        print("all filled — done", flush=True)
        break
    time.sleep(1200)

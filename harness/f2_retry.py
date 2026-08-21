"""Retry the F2 live test until the flaky evening endpoint cooperates.
Writes f2_live_result.txt only on a real verdict (not ORACLE UNAVAILABLE)."""
import sys
import time
from pathlib import Path

sys.path.insert(0, "harness")
result = Path(__file__).parent / "f2_live_result.txt"

for attempt in range(6):
    try:
        if result.exists():
            result.unlink()
        import subprocess
        r = subprocess.run([sys.executable, "-u", str(Path(__file__).parent / "f2_live_test.py")],
                           capture_output=True, text=True, timeout=900)
        if result.exists():
            text = result.read_text(encoding="utf-8")
            if not text.startswith("ORACLE UNAVAILABLE"):
                print(f"attempt {attempt + 1}: GOT VERDICT", flush=True)
                break
            print(f"attempt {attempt + 1}: unavailable, retrying...", flush=True)
    except Exception as e:
        print(f"attempt {attempt + 1} error: {e}", flush=True)
    time.sleep(600)
print("done", flush=True)

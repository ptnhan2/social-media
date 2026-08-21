"""Background-safe VLM probe on the titlelong pair."""
import sys
import os
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

for line in (Path(__file__).parent.parent / ".env").read_text(encoding="utf-8", errors="replace").splitlines():
    line = line.strip()
    if "=" in line and not line.startswith("#"):
        k, _, v = line.partition("=")
        v = v.strip()
        if "#" in v and not (v.startswith('"') or v.startswith("'")):
            v = v.split("#")[0].strip()
        if v:
            os.environ.setdefault(k.strip(), v)

from harness_tools import pairwise_verdict

out_path = Path(__file__).parent / "vlm_probe_result.txt"
try:
    v = pairwise_verdict.invoke({
        "video_a": "projects/isaacverse-final/renders/windows/vs_cc_A.mp4",
        "video_b": "projects/isaacverse-final/renders/windows/vs_cc_B.mp4",
    })
    out_path.write_text(v, encoding="utf-8")
    print("DONE", flush=True)
except Exception as e:
    out_path.write_text(f"ERROR: {e}", encoding="utf-8")
    print("ERROR", flush=True)

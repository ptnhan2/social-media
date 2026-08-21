"""Pairwise on the hr3 color pair — writes result to a file (background-safe)."""
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

out_path = Path(__file__).parent / "hr3_pairwise_result.txt"
try:
    v = pairwise_verdict.invoke({"video_a": "projects/isaacverse-final/renders/windows/hr3_baseline.mp4",
                                 "video_b": "projects/isaacverse-final/renders/windows/hr3_after_color.mp4"})
    out_path.write_text(v, encoding="utf-8")
    print("DONE", flush=True)
except Exception as e:
    out_path.write_text(f"ERROR: {e}", encoding="utf-8")
    print("ERROR", flush=True)

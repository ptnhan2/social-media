"""Finish the stranded C3 color cycle: compare + pairwise on existing renders."""
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

from harness_tools import compare_renders, pairwise_verdict

print("=== pixel-diff gate ===", flush=True)
r = compare_renders.invoke({"video_a": "projects/isaacverse-final/renders/windows/hr3_baseline.mp4",
                            "video_b": "projects/isaacverse-final/renders/windows/hr3_after_color.mp4"})
print(r, flush=True)
if "FAIL" not in r.splitlines()[0]:
    print("\n=== pairwise verdict ===", flush=True)
    v = pairwise_verdict.invoke({"video_a": "projects/isaacverse-final/renders/windows/hr3_baseline.mp4",
                                 "video_b": "projects/isaacverse-final/renders/windows/hr3_after_color.mp4"})
    print(v[:1100], flush=True)

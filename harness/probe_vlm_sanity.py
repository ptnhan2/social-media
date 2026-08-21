"""Re-run pairwise on the titlelong pair the VLM CAUGHT this morning (fontSize
82 vs 110, pixel mean 45). If it now says 'identical', the endpoint degraded."""
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

v = pairwise_verdict.invoke({
    "video_a": "projects/isaacverse-final/renders/windows/vs_cc_A.mp4",
    "video_b": "projects/isaacverse-final/renders/windows/vs_cc_B.mp4",
})
print(v[:800])

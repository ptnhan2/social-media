"""Live F2 verification: structured-output pairwise on the titlelong pair
(known verdict 'after' from the morning session)."""
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

out = pairwise_verdict.invoke({
    "video_a": "projects/isaacverse-final/renders/windows/vs_cc_A.mp4",
    "video_b": "projects/isaacverse-final/renders/windows/vs_cc_B.mp4",
})
Path(__file__).parent.joinpath("f2_live_result.txt").write_text(out, encoding="utf-8")
print("DONE", flush=True)

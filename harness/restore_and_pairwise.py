"""Restore polluted knobs + run pairwise on the sanity progressEndSec pair."""
import json
import shutil
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

from harness_tools import update_style, pairwise_verdict

# 1. restore the two polluted knobs to TRUE baseline
print(update_style.invoke({"style_path": "treatments.process-timeline.spring.damping", "new_value": "18"}))
print(update_style.invoke({"style_path": "colors.amber", "new_value": '"#f2b84b"'}))

# 2. pairwise on the existing sanity renders (progressEndSec 1.2 vs 3.5)
out = pairwise_verdict.invoke({
    "video_a": "projects/isaacverse-final/renders/windows/sanity_pt_base.mp4",
    "video_b": "projects/isaacverse-final/renders/windows/sanity_pt_after.mp4",
})
print("\n=== PAIRWISE (progressEndSec 1.2 vs 3.5) ===")
print(out[:900])

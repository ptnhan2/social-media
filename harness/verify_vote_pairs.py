"""Pixel-diff verify all candidate vote pairs — a pair only enters the vote
session if the two videos actually differ (max mean > 0.05)."""
import os
import sys
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

from harness_tools import compare_renders

WND = "projects/isaacverse-final/renders/windows/"

PAIRS = [
    ("motion  damping18/2      ", "ab_A_damping18.mp4", "ab_B_damping2.mp4"),
    ("motion  reveal before/af ", "cycle_before.mp4", "cycle_after.mp4"),
    ("motion  reveal basel/af  ", "cycle_baseline.mp4", "cycle_after.mp4"),
    ("color   fixtest A/B      ", "fixtest_A.mp4", "fixtest_B.mp4"),
    ("color   amber baseline/B ", "knob_baseline.mp4", "knob_colors_amber.mp4"),
    ("color   glow baseline/B  ", "knob_baseline.mp4", "knob_node_glow.mp4"),
    ("text    fontSizeLong A/B ", "vs_cc_A.mp4", "vs_cc_B.mp4"),
    ("text    subtitle A/B     ", "vs_hr_A.mp4", "vs_hr_B.mp4"),
    ("motion  pt-spring A/B    ", "vs_pt_A.mp4", "vs_pt_B.mp4"),
]

for label, a, b in PAIRS:
    r = compare_renders.invoke({"video_a": WND + a, "video_b": WND + b})
    print(f"{label} | {a} vs {b} -> {r.splitlines()[0]}")

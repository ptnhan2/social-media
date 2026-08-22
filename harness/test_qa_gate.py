"""Offline tests for the qa_gate tool (no render needed).

The full pipeline (build+render+diff) needs Remotion and is exercised live in
protocol runs; these tests verify the gate's guard rails and plumbing.
"""
import os
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from harness_tools import qa_gate, _pixel_diff_stats  # noqa: E402

passed = 0
failed = 0


def check(name, condition, detail=""):
    global passed, failed
    if condition:
        passed += 1
        print(f"PASS {name}")
    else:
        failed += 1
        print(f"FAIL {name} {detail}")


# 1. missing baseline -> GATE ERROR, no render attempted
result = qa_gate.invoke({"project_slug": "isaacverse-final", "start_sec": 3.5,
                         "end_sec": 7.0, "video_before": "Z:/does/not/exist.mp4"})
check("missing baseline returns GATE ERROR",
      result.startswith("QA GATE ERROR") and "not found" in result, result[:120])

# 2. pixel-diff plumbing: identical synthetic images -> mean 0
from PIL import Image
img = Image.new("RGB", (64, 64), (10, 10, 10))
mean, changed = _pixel_diff_stats(img, img.copy())
check("identical images diff to 0", mean == 0.0 and changed == 0.0, f"mean={mean} changed={changed}")

img2 = Image.new("RGB", (64, 64), (200, 200, 200))
mean2, changed2 = _pixel_diff_stats(img, img2)
check("different images diff high", mean2 > 100 and changed2 > 99, f"mean={mean2} changed={changed2}")

# 3. tool is exported with the expected name
check("tool name is qa_gate", qa_gate.name == "qa_gate")

print(f"\n{passed} passed, {failed} failed")
sys.exit(1 if failed else 0)

"""E-phase driver: render baselines, then QA gates. Usage:
  python harness/e_phase.py baseline    # render 4 windows + copy aside
  python harness/e_phase.py qa          # qa_gate all 4 windows vs baselines
  python harness/e_phase.py scores      # offline principle/code evaluator scores
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from harness_tools import render_window, copy_render, qa_gate  # noqa: E402
from eval import eval_principle_compliance, eval_code_quality  # noqa: E402

WINDOWS = [
    ("chapter-card", 0.0, 3.5),
    ("semantic-diagram", 3.5, 7.0),
    ("host-reflection", 7.0, 10.5),
    ("process-timeline", 10.5, 14.0),
]
PROJ = "isaacverse-final"
BASE_DIR = "projects/isaacverse-final/renders/windows"


def baseline():
    for name, start, end in WINDOWS:
        out = render_window.invoke({"project_slug": PROJ, "start_sec": start,
                                    "end_sec": end, "quality": "draft"})
        print(f"[{name}] render -> {out.strip().splitlines()[0]}")
        dst = f"{BASE_DIR}/e_base_{name}.mp4"
        res = copy_render.invoke({"source_path": out.strip().splitlines()[0],
                                  "destination_path": dst})
        print(f"[{name}] {res}")


def qa():
    results = {}
    for name, start, end in WINDOWS:
        before = f"/workspace/{BASE_DIR}/e_base_{name}.mp4"
        print(f"\n=== qa_gate [{name}] {start}-{end}s ===")
        res = qa_gate.invoke({"project_slug": PROJ, "start_sec": start,
                              "end_sec": end, "video_before": before})
        print(res)
        results[name] = "BUILD FAIL" if "BUILD/RENDER FAIL" in res else ("PASS" if "PASS" in res else "CHECK")
    print("\n=== summary ===")
    print(json.dumps(results, indent=2))


def scores():
    print(json.dumps(eval_principle_compliance({}, {}, {}), ensure_ascii=False, indent=2))
    print(json.dumps(eval_code_quality({}, {}, {}), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else ""
    if mode == "baseline":
        baseline()
    elif mode == "qa":
        qa()
    elif mode == "scores":
        scores()
    else:
        print(__doc__)
        sys.exit(1)

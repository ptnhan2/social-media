"""C3 cycle — deterministic protocol run on host-reflection (7-10.5s).

I (the harness orchestrator) drive the same tools the agent would, keeping
every gate honest: render baseline -> visual_critique (weakest aspect
decides the knob) -> update_style -> render -> pixel-diff gate -> pairwise.
The KEEP gate goes to the user via vote_session (real vote, no auto-accept).
"""
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

from harness_tools import render_window, visual_critique, compare_renders, _resolve_workspace_path

ROOT = Path(__file__).parent.parent
STYLE = ROOT / "libraries" / "04-visual" / "isaacverse-style.json"
WND = ROOT / "projects" / "isaacverse-final" / "renders" / "windows"

print("=== 1. baseline render (7-10.5s) ===")
p = render_window.invoke({"project_slug": "isaacverse-final", "start_sec": 7, "end_sec": 10.5, "quality": "draft"})
base = WND / "hr3_baseline.mp4"
shutil.copy2(_resolve_workspace_path(p), base)
print("  ->", base.name)

print("\n=== 2. critique baseline ===")
crit = visual_critique.invoke({"video_path": "projects/isaacverse-final/renders/windows/hr3_baseline.mp4"})
print(crit[:1200])
out = {"baseline": str(base.name), "critique": crit[:2000]}
(ROOT / "harness" / "hr3_state.json").write_text(json.dumps(out, indent=1, ensure_ascii=False), encoding="utf-8")
print("\n(state saved to harness/hr3_state.json)")

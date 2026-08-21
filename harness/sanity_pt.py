"""Sanity check: does a drastic process-timeline knob change reach the render?
Renders baseline + progressEndSec=3.5, compares, restores."""
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

from harness_tools import render_window, update_style, compare_renders, _resolve_workspace_path

ROOT = Path(__file__).parent.parent
STYLE = ROOT / "libraries" / "04-visual" / "isaacverse-style.json"
WND = ROOT / "projects" / "isaacverse-final" / "renders" / "windows"
original = STYLE.read_text(encoding="utf-8-sig")

try:
    p = render_window.invoke({"project_slug": "isaacverse-final", "start_sec": 10.5, "end_sec": 14, "quality": "draft"})
    base = WND / "sanity_pt_base.mp4"
    shutil.copy2(_resolve_workspace_path(p), base)
    update_style.invoke({"style_path": "treatments.process-timeline.progressEndSec", "new_value": "3.5"})
    p = render_window.invoke({"project_slug": "isaacverse-final", "start_sec": 10.5, "end_sec": 14, "quality": "draft"})
    after = WND / "sanity_pt_after.mp4"
    shutil.copy2(_resolve_workspace_path(p), after)
    r = compare_renders.invoke({"video_a": str(base), "video_b": str(after)})
    print(r)
finally:
    STYLE.write_text(original, encoding="utf-8")
    shutil.copy2(STYLE, ROOT / "remotion-composer" / "shared" / "isaacverse" / "isaacverse-style.json")
    shutil.copy2(STYLE, ROOT / "remotion-composer" / "public" / "isaacverse-style.json")
    print("style restored")

"""C3 cycle 2 — color-complaint knob: host-reflection filter (one string knob).
Critique flagged: 'low-contrast text feels washed out', color 3/5."""
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

from harness_tools import render_window, update_style, compare_renders, pairwise_verdict, _resolve_workspace_path

ROOT = Path(__file__).parent.parent
STYLE = ROOT / "libraries" / "04-visual" / "isaacverse-style.json"
WND = ROOT / "projects" / "isaacverse-final" / "renders" / "windows"
original = STYLE.read_text(encoding="utf-8-sig")

try:
    print("=== update_style host-reflection.filter (brighter + more saturated) ===")
    print(update_style.invoke({"style_path": "treatments.host-reflection.filter",
                               "new_value": '"saturate(.8) contrast(1.18) brightness(.88)"'}))
    print("\n=== render after ===")
    p = render_window.invoke({"project_slug": "isaacverse-final", "start_sec": 7, "end_sec": 10.5, "quality": "draft"})
    after = WND / "hr3_after_color.mp4"
    shutil.copy2(_resolve_workspace_path(p), after)
    print("  ->", after.name)
    print("\n=== pixel-diff gate ===")
    r = compare_renders.invoke({"video_a": "projects/isaacverse-final/renders/windows/hr3_baseline.mp4",
                                "video_b": "projects/isaacverse-final/renders/windows/hr3_after_color.mp4"})
    print(r)
    if "FAIL" not in r.splitlines()[0]:
        print("\n=== pairwise verdict ===")
        v = pairwise_verdict.invoke({"video_a": "projects/isaacverse-final/renders/windows/hr3_baseline.mp4",
                                     "video_b": "projects/isaacverse-final/renders/windows/hr3_after_color.mp4"})
        print(v[:1100])
finally:
    STYLE.write_text(original, encoding="utf-8")
    shutil.copy2(STYLE, ROOT / "remotion-composer" / "shared" / "isaacverse" / "isaacverse-style.json")
    shutil.copy2(STYLE, ROOT / "remotion-composer" / "public" / "isaacverse-style.json")
    print("\n(style restored — keep decision applies only on win)")

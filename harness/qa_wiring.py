"""QA for the knob-wiring change: identity renders + bump tests.

Identity: render with NEW code at baseline style, compare against pre-change
renders (old code, same style) — expect 0.0 (behavior-preserving).
Bump: raise a newly-wired knob drastically — expect > 0.05 (knob now live).
"""
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


def render(tag, start, end):
    p = render_window.invoke({"project_slug": "isaacverse-final", "start_sec": start, "end_sec": end, "quality": "draft"})
    assert not p.startswith("Render failed"), p[:300]
    out = WND / f"{tag}.mp4"
    shutil.copy2(_resolve_workspace_path(p), out)
    return str(out)


def diff(a, b):
    return compare_renders.invoke({"video_a": a, "video_b": b}).splitlines()[0]


print("=== identity: semantic-diagram 3.5-7s (new code vs pre-change render) ===")
new = render("wire_sd_new", 3.5, 7.0)
print("  ", diff("projects/isaacverse-final/renders/windows/knob_baseline.mp4", new))

print("\n=== identity: host-reflection 7-10.5s ===")
new = render("wire_hr_new", 7.0, 10.5)
print("  ", diff("projects/isaacverse-final/renders/windows/hr3_baseline.mp4", new))

print("\n=== bump: node.fontSize 20 -> 28 (3.5-7s) ===")
try:
    update_style.invoke({"style_path": "treatments.semantic-diagram.node.fontSize", "new_value": "28"})
    bumped = render("wire_sd_bump", 3.5, 7.0)
    print("  ", diff("projects/isaacverse-final/renders/windows/knob_baseline.mp4", bumped))
finally:
    STYLE.write_text(original, encoding="utf-8")
    shutil.copy2(STYLE, ROOT / "remotion-composer" / "shared" / "isaacverse" / "isaacverse-style.json")
    shutil.copy2(STYLE, ROOT / "remotion-composer" / "public" / "isaacverse-style.json")

print("\n=== bump: subtitle.fontSize 27 -> 36 (7-10.5s) ===")
try:
    update_style.invoke({"style_path": "treatments.host-reflection.subtitle.fontSize", "new_value": "36"})
    bumped = render("wire_hr_bump", 7.0, 10.5)
    print("  ", diff("projects/isaacverse-final/renders/windows/hr3_baseline.mp4", bumped))
finally:
    STYLE.write_text(original, encoding="utf-8")
    shutil.copy2(STYLE, ROOT / "remotion-composer" / "shared" / "isaacverse" / "isaacverse-style.json")
    shutil.copy2(STYLE, ROOT / "remotion-composer" / "public" / "isaacverse-style.json")

print("\nstyle restored to pre-QA state")

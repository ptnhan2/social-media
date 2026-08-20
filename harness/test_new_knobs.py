"""Verify the NEW knobs reach the render (P2.1 acceptance).

Each knob: set a DRASTIC value, render 3.5-7s (semantic-diagram), pixel-diff
against the baseline render. Must show mean > 0.05.
"""
import sys, os, json, shutil, subprocess, tempfile
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image, ImageChops
from pathlib import Path

for line in (Path(__file__).parent.parent / ".env").read_text(encoding="utf-8", errors="replace").splitlines():
    line = line.strip()
    if "=" in line and not line.startswith("#"):
        k, _, v = line.partition("=")
        v = v.strip()
        if "#" in v and not (v.startswith('"') or v.startswith("'")):
            v = v.split("#")[0].strip()
        if v:
            os.environ.setdefault(k.strip(), v)

from harness_tools import render_window, update_style, _resolve_workspace_path, compare_renders

ROOT = Path(__file__).parent.parent
STYLE = ROOT / "libraries" / "04-visual" / "isaacverse-style.json"
WND = ROOT / "projects" / "isaacverse-final" / "renders" / "windows"


def reset_style():
    s = json.loads(STYLE.read_text(encoding="utf-8-sig"))
    s["colors"]["amber"] = "#f2b84b"
    s["treatments"]["semantic-diagram"]["node"]["glow"] = 18
    STYLE.write_text(json.dumps(s, indent=2, ensure_ascii=False), encoding="utf-8")
    shutil.copy2(STYLE, ROOT / "remotion-composer" / "shared" / "isaacverse" / "isaacverse-style.json")
    shutil.copy2(STYLE, ROOT / "remotion-composer" / "public" / "isaacverse-style.json")


def render(tag):
    p = render_window.invoke({"project_slug": "isaacverse-final", "start_sec": 3.5, "end_sec": 7, "quality": "draft"})
    assert not p.startswith("Render failed"), p[:300]
    out = str(WND / f"knob_{tag}.mp4")
    shutil.copy2(_resolve_workspace_path(p), out)
    return out


TESTS = [
    ("colors.amber", "colors.amber", '"#ff4d6d"', "palette change"),
    ("node.glow", "treatments.semantic-diagram.node.glow", "60", "strong glow"),
]

print("=== baseline render ===")
reset_style()
fA = render("baseline")
for label, path, value, desc in TESTS:
    print(f"\n=== {label} -> {value} ({desc}) ===")
    update_style.invoke({"style_path": path, "new_value": value})
    fB = render(label.replace(".", "_"))
    result = compare_renders.invoke({"video_a": fA, "video_b": fB})
    first = result.splitlines()[0]
    print(f"  {first}")
reset_style()
print("\ndone (style reset to baseline)")

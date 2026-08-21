"""Render 2 replacement pairs: fresh damping pair (same pipeline era) +
chapter-card accentLine.maxWidth (composition aspect)."""
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

original_style = STYLE.read_text(encoding="utf-8-sig")


def render(tag, start, end):
    p = render_window.invoke({"project_slug": "isaacverse-final",
                              "start_sec": start, "end_sec": end, "quality": "draft"})
    assert not p.startswith("Render failed"), p[:300]
    out = WND / f"vs_{tag}.mp4"
    shutil.copy2(_resolve_workspace_path(p), out)
    return str(out)


try:
    print("=== damping pair (semantic-diagram 3.5-7s) ===")
    update_style.invoke({"style_path": "treatments.semantic-diagram.entrance.damping", "new_value": "18"})
    a = render("dm_A", 3.5, 7.0)
    update_style.invoke({"style_path": "treatments.semantic-diagram.entrance.damping", "new_value": "2"})
    b = render("dm_B", 3.5, 7.0)
    print("  ", compare_renders.invoke({"video_a": a, "video_b": b}).splitlines()[0])

    print("=== accentLine.maxWidth pair (chapter-card 0-3.5s) ===")
    update_style.invoke({"style_path": "treatments.chapter-card.accentLine.maxWidth", "new_value": "190"})
    a = render("cc2_A", 0.0, 3.5)
    update_style.invoke({"style_path": "treatments.chapter-card.accentLine.maxWidth", "new_value": "340"})
    b = render("cc2_B", 0.0, 3.5)
    print("  ", compare_renders.invoke({"video_a": a, "video_b": b}).splitlines()[0])
finally:
    STYLE.write_text(original_style, encoding="utf-8")
    shutil.copy2(STYLE, ROOT / "remotion-composer" / "shared" / "isaacverse" / "isaacverse-style.json")
    shutil.copy2(STYLE, ROOT / "remotion-composer" / "public" / "isaacverse-style.json")
    print("Style store restored byte-identical.")

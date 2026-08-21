"""Render 3 new A/B pairs for the taste-calibration vote session (Batch A1).

Pairs (each = one knob, drastic delta, own segment window):
  1. chapter-card    0-3.5s   treatments.chapter-card.title.fontSizeLong  82 -> 110
  2. process-timeline 10.5-14 treatments.process-timeline.spring.damping  18 -> 4
  3. host-reflection  7-10.5  treatments.host-reflection.subtitle.fontSize 27 -> 36

Renders A (baseline value) and B (variant), copies each aside to a named
file, then RESTORES the style store to its exact prior state.
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

from harness_tools import render_window, update_style, _resolve_workspace_path

ROOT = Path(__file__).parent.parent
STYLE = ROOT / "libraries" / "04-visual" / "isaacverse-style.json"
WND = ROOT / "projects" / "isaacverse-final" / "renders" / "windows"

original_style = STYLE.read_text(encoding="utf-8-sig")
print("Style store snapshotted (version:",
      json.loads(original_style)["version"], ")")

PAIRS = [
    ("cc", 0.0, 3.5, "treatments.chapter-card.title.fontSizeLong", "82", "110"),
    ("hr", 7.0, 10.5, "treatments.host-reflection.subtitle.fontSize", "27", "36"),
    ("pt", 10.5, 14.0, "treatments.process-timeline.spring.damping", "18", "4"),
]


def render(tag: str, start: float, end: float) -> Path:
    p = render_window.invoke({"project_slug": "isaacverse-final",
                              "start_sec": start, "end_sec": end, "quality": "draft"})
    assert not p.startswith("Render failed"), p[:300]
    out = WND / f"vs_{tag}.mp4"
    shutil.copy2(_resolve_workspace_path(p), out)
    print(f"  rendered {out.name} ({out.stat().st_size // 1024} KB)")
    return out


try:
    for tag, start, end, knob, va, vb in PAIRS:
        print(f"\n=== pair {tag}: {knob} {va} vs {vb} ({start}-{end}s) ===")
        update_style.invoke({"style_path": knob, "new_value": va})
        render(f"{tag}_A", start, end)
        update_style.invoke({"style_path": knob, "new_value": vb})
        render(f"{tag}_B", start, end)
finally:
    STYLE.write_text(original_style, encoding="utf-8")
    shutil.copy2(STYLE, ROOT / "remotion-composer" / "shared" / "isaacverse" / "isaacverse-style.json")
    shutil.copy2(STYLE, ROOT / "remotion-composer" / "public" / "isaacverse-style.json")
    print("\nStyle store restored byte-identical.")

print("done.")

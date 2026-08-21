"""Render the two C3 pairs at MASTER (1080p) for the morning re-vote.

Tests the resolution hypothesis: motion/zoom/global changes were tied at 360p
draft — maybe they become discriminable at 1080p. Baseline is shared between
pairs; each variant re-applied then reverted.
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

from harness_tools import render_window, update_style, _resolve_workspace_path

ROOT = Path(__file__).parent.parent
STYLE = ROOT / "libraries" / "04-visual" / "isaacverse-style.json"
WND = ROOT / "projects" / "isaacverse-final" / "renders" / "windows"
original = STYLE.read_text(encoding="utf-8-sig")


def render_master(tag):
    p = render_window.invoke({"project_slug": "isaacverse-final", "start_sec": 7, "end_sec": 10.5, "quality": "master"})
    assert not p.startswith("Render failed"), p[:300]
    out = WND / f"{tag}.mp4"
    shutil.copy2(_resolve_workspace_path(p), out)
    print(f"  rendered {out.name} ({out.stat().st_size // 1024} KB)", flush=True)


try:
    print("=== baseline (1080p) ===", flush=True)
    render_master("hr3_1080_baseline")
    print("=== filter variant (1080p) ===", flush=True)
    update_style.invoke({"style_path": "treatments.host-reflection.filter",
                         "new_value": '"saturate(.8) contrast(1.18) brightness(.88)"'})
    render_master("hr3_1080_color")
    print("=== push variant (1080p) ===", flush=True)
    update_style.invoke({"style_path": "treatments.host-reflection.filter",
                         "new_value": '"saturate(.72) contrast(1.18) brightness(.72)"'})
    update_style.invoke({"style_path": "treatments.host-reflection.pushDurationSec", "new_value": "1.5"})
    render_master("hr3_1080_push")
finally:
    STYLE.write_text(original, encoding="utf-8")
    shutil.copy2(STYLE, ROOT / "remotion-composer" / "shared" / "isaacverse" / "isaacverse-style.json")
    shutil.copy2(STYLE, ROOT / "remotion-composer" / "public" / "isaacverse-style.json")
    print("style restored", flush=True)

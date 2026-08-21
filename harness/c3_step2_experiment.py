"""C3 cycle step 2 — apply pushDurationSec 4->1.5, render, pixel-diff, pairwise."""
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

from harness_tools import render_window, update_style, compare_renders, pairwise_verdict, _resolve_workspace_path

ROOT = Path(__file__).parent.parent
STYLE = ROOT / "libraries" / "04-visual" / "isaacverse-style.json"
WND = ROOT / "projects" / "isaacverse-final" / "renders" / "windows"
original = STYLE.read_text(encoding="utf-8-sig")

try:
    print("=== 3. update_style pushDurationSec 4 -> 1.5 ===")
    print(update_style.invoke({"style_path": "treatments.host-reflection.pushDurationSec", "new_value": "1.5"}))
    print("\n=== 4. render after ===")
    p = render_window.invoke({"project_slug": "isaacverse-final", "start_sec": 7, "end_sec": 10.5, "quality": "draft"})
    after = WND / "hr3_after.mp4"
    shutil.copy2(_resolve_workspace_path(p), after)
    print("  ->", after.name)
    print("\n=== 5. pixel-diff gate ===")
    r = compare_renders.invoke({"video_a": "projects/isaacverse-final/renders/windows/hr3_baseline.mp4",
                                "video_b": "projects/isaacverse-final/renders/windows/hr3_after.mp4"})
    print(r)
    if "FAIL" in r.splitlines()[0]:
        print("\nGATE FAIL — change did not reach render. Restoring and stopping.")
    else:
        print("\n=== 6. pairwise verdict ===")
        v = pairwise_verdict.invoke({"video_a": "projects/isaacverse-final/renders/windows/hr3_baseline.mp4",
                                     "video_b": "projects/isaacverse-final/renders/windows/hr3_after.mp4"})
        print(v[:1000])
finally:
    STYLE.write_text(original, encoding="utf-8")
    shutil.copy2(STYLE, ROOT / "remotion-composer" / "shared" / "isaacverse" / "isaacverse-style.json")
    shutil.copy2(STYLE, ROOT / "remotion-composer" / "public" / "isaacverse-style.json")
    print("\n(style store restored to pre-experiment state — final keep decision applies the change only if won)")

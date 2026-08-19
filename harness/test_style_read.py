"""Isolate whether the style store is read AT ALL by the render.

Test revealDurationSec (edge draw-on, line 61 — fixed path) 0.65 vs 5.0.
At video t=1.0s the edge should be fully drawn (0.65) vs barely started (5.0)
=> massive visible difference if the store is read. If 0 diff, the store is
NOT reaching the render at all (deeper than the path bug).

Also re-test damping 18 vs 2 at the SAME correct sampling times.
"""
import sys, os, json, shutil, subprocess, tempfile, time
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

from harness_tools import render_window, update_style, _resolve_workspace_path

ROOT = Path(__file__).parent.parent
STYLE = ROOT / "libraries" / "04-visual" / "isaacverse-style.json"
SHARED = ROOT / "remotion-composer" / "shared" / "isaacverse" / "isaacverse-style.json"


def setknob(path, val):
    update_style.invoke({"style_path": path, "new_value": val})


def reset():
    s = json.loads(STYLE.read_text(encoding="utf-8-sig"))
    s["treatments"]["semantic-diagram"]["entrance"]["damping"] = 18
    s["treatments"]["semantic-diagram"]["entrance"]["durationSec"] = 0.75
    s["treatments"]["semantic-diagram"]["edge"]["revealDurationSec"] = 0.65
    s["treatments"]["semantic-diagram"]["edge"]["stroke"]["mode"] = "solid"
    STYLE.write_text(json.dumps(s, indent=2, ensure_ascii=False), encoding="utf-8")
    shutil.copy2(STYLE, SHARED)


def frame(video, t):
    tmp = tempfile.mkdtemp()
    fp = os.path.join(tmp, "f.png")
    subprocess.run(["ffmpeg", "-y", "-ss", str(t), "-i", str(video), "-frames:v", "1", "-vf", "scale=426:-1", fp], capture_output=True, timeout=30)
    img = Image.open(fp).convert("RGB") if os.path.exists(fp) else None
    shutil.rmtree(tmp, ignore_errors=True)
    return img


def pxdiff(a, b):
    d = ImageChops.difference(a, b).convert("L")
    h = d.histogram()
    t = sum(h)
    return round(sum(i * c for i, c in enumerate(h)) / t, 3), round(sum(h[8:]) / t * 100, 3)


def render():
    t0 = time.time()
    p = render_window.invoke({"project_slug": "isaacverse-final", "start_sec": 3.5, "end_sec": 7, "quality": "draft"})
    f = _resolve_workspace_path(p)
    print(f"  rendered in {time.time()-t0:.0f}s")
    return f


# --- TEST 1: revealDurationSec 0.65 vs 5.0 (should be HUGE diff) ---
print("=== TEST 1: revealDurationSec 0.65 vs 5.0 ===")
reset(); fA = render()
setknob("treatments.semantic-diagram.edge.revealDurationSec", "5.0"); fB = render()
reset()
print("  diff (video t=1.0s):", pxdiff(frame(fA, 1.0), frame(fB, 1.0)))
print("  diff (video t=2.0s):", pxdiff(frame(fA, 2.0), frame(fB, 2.0)))

# --- TEST 2: damping 18 vs 2 (correct sampling) ---
print("\n=== TEST 2: damping 18 vs 2 (video t=0.9, 1.1) ===")
reset(); fA = render()
setknob("treatments.semantic-diagram.entrance.damping", "2"); fB = render()
reset()
print("  diff (video t=0.9s):", pxdiff(frame(fA, 0.9), frame(fB, 0.9)))
print("  diff (video t=1.1s):", pxdiff(frame(fA, 1.1), frame(fB, 1.1)))
print("  diff (video t=1.3s):", pxdiff(frame(fA, 1.3), frame(fB, 1.3)))

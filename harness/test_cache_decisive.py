"""Decisive cache test: clear webpack cache, render A (damping=18) and B (damping=2)
via the same render_window tool the agent uses, then pixel-diff sampled frames.

If diff > 0 with a fresh cache, the webpack filesystem cache was silently
serving the stale style JSON — explaining EVERY prior "VLM can't detect
changes" result (the renders were literally identical).
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


def reset(damping):
    s = json.loads(STYLE.read_text(encoding="utf-8"))
    s["treatments"]["semantic-diagram"]["entrance"]["damping"] = damping
    s["treatments"]["semantic-diagram"]["entrance"]["durationSec"] = 0.75
    s["treatments"]["semantic-diagram"]["edge"]["revealDurationSec"] = 0.65
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


print("Cache cleared. Rendering A (damping=18)...")
reset(18)
t0 = time.time()
pA = render_window.invoke({"project_slug": "isaacverse-final", "start_sec": 3.5, "end_sec": 7, "quality": "draft"})
fA = _resolve_workspace_path(pA)
print(f"  A rendered in {time.time()-t0:.0f}s -> {fA}")

print("Setting damping=2, rendering B...")
update_style.invoke({"style_path": "treatments.semantic-diagram.entrance.damping", "new_value": "2"})
t0 = time.time()
pB = render_window.invoke({"project_slug": "isaacverse-final", "start_sec": 3.5, "end_sec": 7, "quality": "draft"})
fB = _resolve_workspace_path(pB)
print(f"  B rendered in {time.time()-t0:.0f}s -> {fB}")

print("\nPixel diff A vs B (fresh cache):")
for t in [0.4, 0.9, 1.6]:
    fa, fb = frame(fA, t), frame(fB, t)
    m, p = pxdiff(fa, fb)
    print(f"  t={t}s  mean={m}  changed_pct={p}")

reset(18)
print("\nStyle reverted to damping=18.")

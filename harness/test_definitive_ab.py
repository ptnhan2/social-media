"""DEFINITIVE A/B test — explicit fresh bundle + correct visible frames.

Root-cause trail (2026-08-19):
  1. treatments.tsx getStyle paths for semantic-diagram were missing the
     "treatments." prefix → always returned fallbacks. FIXED.
  2. `remotion render` (used by render_window) reuses a stale render-time
     bundle in %TEMP%/remotion-webpack-bundle-*, so source/JSON edits never
     reached the render. FIX: build an explicit bundle with `remotion bundle`
     and render via `remotion render <bundle-dir> ...`.

This script:
  - builds a fresh bundle (damping=18) -> render frames 140-160 -> fA
  - rebuilds fresh bundle (damping=2)  -> render frames 140-160 -> fB
  - pixel-diffs at several frames where the entrance is visible & divergent.

Composition frame math: beat semantic-diagram starts at 3.5s -> frame 105.
Nodes: signal activeFrom=0.2 (frame 111), choice 0.8 (frame 129), meaning 1.4 (frame 147).
Entrance duration 0.75s (22 frames). Visible + divergent window ~ beat-local
0.5-1.2s -> composition frames 120-141. We sample 130, 135, 140.
"""
import sys, os, json, shutil, subprocess, time
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from PIL import Image, ImageChops
from pathlib import Path

ROOT = Path(__file__).parent.parent
STYLE = ROOT / "libraries" / "04-visual" / "isaacverse-style.json"
SHARED = ROOT / "remotion-composer" / "shared" / "isaacverse" / "isaacverse-style.json"
REMO = ROOT / "remotion-composer"
BUNDLE = REMO / "build"
TMP = Path(os.environ["TEMP"]) / "kilo"


def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace", shell=True, **kw)


def set_damping(d):
    s = json.loads(STYLE.read_text(encoding="utf-8-sig"))
    s["treatments"]["semantic-diagram"]["entrance"]["damping"] = d
    s["treatments"]["semantic-diagram"]["entrance"]["durationSec"] = 0.75
    s["treatments"]["semantic-diagram"]["edge"]["revealDurationSec"] = 0.65
    STYLE.write_text(json.dumps(s, indent=2, ensure_ascii=False), encoding="utf-8")
    shutil.copy2(STYLE, SHARED)


def clear_caches():
    shutil.rmtree(REMO / "node_modules" / ".cache" / "webpack", ignore_errors=True)
    for d in Path(os.environ["TEMP"]).glob("remotion-webpack-bundle-*"):
        shutil.rmtree(d, ignore_errors=True)


def build_bundle():
    r = run("node_modules\\.bin\\remotion.cmd bundle projects\\isaacverse-final\\index.tsx build", cwd=REMO)
    return r.returncode == 0


def render_frames(out_mp4, start, end):
    r = run(f"node_modules\\.bin\\remotion.cmd render build isaacverse-final-30s \"{out_mp4}\" --frames={start}-{end} --scale=0.5 --gl=angle", cwd=REMO)
    return r.returncode == 0, r.stderr[-300:]


def frame(mp4, t):
    import tempfile
    tmp = tempfile.mkdtemp()
    fp = os.path.join(tmp, "f.png")
    subprocess.run(["ffmpeg", "-y", "-ss", str(t), "-i", str(mp4), "-frames:v", "1", "-vf", "scale=426:-1", fp], capture_output=True, timeout=30)
    img = Image.open(fp).convert("RGB") if os.path.exists(fp) else None
    shutil.rmtree(tmp, ignore_errors=True)
    return img


def pxdiff(a, b):
    d = ImageChops.difference(a, b).convert("L")
    h = d.histogram()
    t = sum(h)
    return round(sum(i * c for i, c in enumerate(h)) / t, 3), round(sum(h[8:]) / t * 100, 3)


# frames 130-145 -> mp4; sample at offsets within
print("=== damping=18: clear, build, render ===")
clear_caches(); set_damping(18)
assert build_bundle(), "bundle A failed"
ok, err = render_frames(TMP / "d18.mp4", 115, 130)
print(f"  render A ok={ok} {err[:120]}")

print("=== damping=2: clear, build, render ===")
clear_caches(); set_damping(2)
assert build_bundle(), "bundle B failed"
ok, err = render_frames(TMP / "d2.mp4", 115, 130)
print(f"  render B ok={ok} {err[:120]}")

set_damping(18)
print("\n=== pixel diff (composition frames 115-130, ~beat-local 0.3-0.8s = peak entrance divergence) ===")
mp4_a, mp4_b = TMP / "d18.mp4", TMP / "d2.mp4"
for lf in [0, 5, 10, 15]:
    t = lf / 30.0
    fa, fb = frame(mp4_a, t), frame(mp4_b, t)
    if fa and fb:
        m, p = pxdiff(fa, fb)
        print(f"  comp-frame {115+lf} (t={t:.2f}s)  mean={m}  changed_pct={p}")
    else:
        print(f"  comp-frame {115+lf}: frame extraction failed")

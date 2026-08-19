"""Oracle validation v2 — deterministic layer + premise-neutral VLM.

Layer 1 (deterministic): PIL pixel-diff between montages at sampled times.
  - A-vs-A must be exactly 0 (catches duplicates WITHOUT calling the VLM).
  - A-vs-B diff > 0 proves the knob change actually alters the render.
Layer 2 (VLM, premise-NEUTRAL): ask IF different first, then compare.
  - The previous prompt ("they differ ONLY in spring damping") made Qwen3-VL
    confabulate differences for IDENTICAL videos (control failed 2026-08-19).
  - Neutral prompt must not presuppose a difference.

Trials:
  1. A vs A  — deterministic (expect: identical, no VLM call)
  2. A vs A  — VLM forced, neutral prompt (expect: "identical" — honesty test)
  3. A vs B  — deterministic + VLM (expect: real diff, verdict on which is better)
"""
import sys, os, base64, subprocess, tempfile, shutil, time
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from pathlib import Path
from PIL import Image, ImageChops

for line in (Path(__file__).parent.parent / ".env").read_text(encoding="utf-8", errors="replace").splitlines():
    line = line.strip()
    if "=" in line and not line.startswith("#"):
        k, _, v = line.partition("=")
        v = v.strip()
        if "#" in v and not (v.startswith('"') or v.startswith("'")):
            v = v.split("#")[0].strip()
        if v:
            os.environ.setdefault(k.strip(), v)

from harness_tools import _provider_config, _chat_completions

ROOT = Path(__file__).parent.parent
A = ROOT / "projects" / "isaacverse-final" / "renders" / "windows" / "ab_A_damping18.mp4"
B = ROOT / "projects" / "isaacverse-final" / "renders" / "windows" / "ab_B_damping2.mp4"
TIMES = (0.4, 0.9, 1.6)


def log(msg):
    print(msg, flush=True)


def frame(video: Path, t: float) -> Image.Image | None:
    tmp = tempfile.mkdtemp()
    fp = os.path.join(tmp, "f.png")
    subprocess.run(["ffmpeg", "-y", "-ss", str(t), "-i", str(video), "-frames:v", "1",
                    "-vf", "scale=426:-1", fp], capture_output=True, timeout=30)
    img = Image.open(fp).convert("RGB") if os.path.exists(fp) else None
    shutil.rmtree(tmp, ignore_errors=True)
    return img


def pixel_diff(ia: Image.Image, ib: Image.Image) -> tuple[float, float]:
    """Return (mean_abs_diff_0_255, pct_pixels_changed) between two same-size images."""
    diff = ImageChops.difference(ia, ib)
    hist = diff.convert("L").histogram()
    total = sum(hist)
    changed = sum(hist[8:])  # pixels differing by > 8/255 in any channel proxy
    mean = sum(i * c for i, c in enumerate(hist)) / max(total, 1)
    return mean, changed / max(total, 1) * 100


def montage_b64(video: Path) -> str:
    imgs = [frame(video, t) for t in TIMES]
    imgs = [i for i in imgs if i]
    w = sum(i.width for i in imgs)
    h = max(i.height for i in imgs)
    canvas = Image.new("RGB", (w, h), (0, 0, 0))
    x = 0
    for i in imgs:
        canvas.paste(i, (x, 0))
        x += i.width
    tmp = os.path.join(tempfile.mkdtemp(), "m.jpg")
    canvas.save(tmp, "JPEG", quality=55)
    with open(tmp, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()
    shutil.rmtree(os.path.dirname(tmp), ignore_errors=True)
    return b64


NEUTRAL_PROMPT = (
    "You are given two images. Each image shows 3 snapshots of a video segment at "
    "t=0.4s, 0.9s, 1.6s (left to right).\n"
    "FIRST, answer honestly: are the two images identical, nearly identical, or "
    "clearly different? They might be exactly the same image — check carefully "
    "before claiming any difference.\n"
    "IF AND ONLY IF they are clearly different:\n"
    "  - Which image shows more visible animation progression between its panels?\n"
    "  - Which image's animation looks more polished?\n"
    "  - Describe the concrete differences you see.\n"
    "If they are identical or nearly identical, say exactly that and stop."
)


def vlm_pairwise(ma: str, mb: str, label: str):
    cfg = _provider_config("dashscope")
    content = [
        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{ma}"}},
        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{mb}"}},
        {"type": "text", "text": NEUTRAL_PROMPT},
    ]
    t0 = time.time()
    result = _chat_completions(cfg, content, "You are a careful motion designer. You never invent differences that are not present.", 180)
    log(f"\n=== {label} (VLM, {time.time()-t0:.0f}s) ===")
    log(result if not result.startswith("VLM API error") else "ERROR: " + result)
    return result


def main():
    # --- deterministic layer ---
    log("=== Layer 1: deterministic pixel diff (per sampled time) ===")
    for t in TIMES:
        fa, fb = frame(A, t), frame(B, t)
        if fa and fb:
            mean, pct = pixel_diff(fa, fb)
            log(f"  t={t}s: mean_diff={mean:.1f}/255  changed_px={pct:.1f}%")
    for t in TIMES[:1]:
        fa1, fa2 = frame(A, t), frame(A, t)
        mean, pct = pixel_diff(fa1, fa2)
        log(f"  CONTROL A-vs-A t={t}s: mean_diff={mean:.1f}  changed_px={pct:.1f}%  (must be 0)")

    ma, mb = montage_b64(A), montage_b64(B)
    log(f"\nmontage KB: A={len(ma)//1024} B={len(mb)//1024}")

    # --- control: A vs A through the VLM with neutral prompt ---
    vlm_pairwise(ma, ma, "CONTROL: A vs A (identical) — VLM honesty test")

    # --- real: A vs B ---
    vlm_pairwise(ma, mb, "REAL: A (damping=18) vs B (damping=2)")


if __name__ == "__main__":
    main()

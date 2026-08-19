"""VLM oracle validation v3 — with REAL differing renders.

Prerequisites (verified 2026-08-19): the render pipeline now applies style
changes (BeatTreatment regression fixed; runtime-fetched style JSON). fixtest_A.mp4
(damping=18) and fixtest_B.mp4 (damping=2) differ by 0.2-1.3% of pixels
(deterministic PIL diff), peaking during the node entrance animation.

Oracle design (layered):
  Layer 1 (deterministic): pixel diff — proves a change exists and quantifies it.
  Layer 2 (VLM, premise-NEUTRAL): pairwise "identical or different? which is
    better?" — only asked because layer 1 says the renders differ.
  Control: A-vs-A through the same prompt — must answer "identical", else the
    VLM confabulates and pairwise verdicts are untrustworthy.

VLM input: temporal montages (3 frames during the entrance) as ONE JPEG each,
under the ~64KB POST-body limit of the DashScope China endpoint.
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
A = ROOT / "projects" / "isaacverse-final" / "renders" / "windows" / "fixtest_A.mp4"
B = ROOT / "projects" / "isaacverse-final" / "renders" / "windows" / "fixtest_B.mp4"
# entrance animation window (peak divergence measured at video t 0.8-1.3)
TIMES = (0.8, 1.05, 1.3)


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


def pixel_diff(ia, ib):
    d = ImageChops.difference(ia, ib).convert("L")
    h = d.histogram()
    t = sum(h)
    return round(sum(i * c for i, c in enumerate(h)) / t, 3), round(sum(h[8:]) / t * 100, 3)


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
    "You are given two images. Each image shows 3 snapshots of the same video "
    "segment at successive times (left to right), during the entrance animation "
    "of diagram nodes.\n"
    "FIRST, answer honestly: are the two images identical, nearly identical, or "
    "clearly different? They might be exactly the same image — check carefully "
    "before claiming any difference.\n"
    "IF AND ONLY IF they are clearly different:\n"
    "  - Which image (first or second) shows more visible animation movement "
    "between its panels?\n"
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
    log(f"\n=== {label} (Qwen3-VL, {time.time()-t0:.0f}s) ===")
    log(result)
    return result


def main():
    # Layer 1: deterministic
    log("=== Layer 1: deterministic pixel diff (montage times) ===")
    for t in TIMES:
        fa, fb = frame(A, t), frame(B, t)
        m, p = pixel_diff(fa, fb)
        log(f"  t={t}s: mean={m} changed_pct={p}%")

    ma, mb = montage_b64(A), montage_b64(B)
    log(f"\nmontage KB: A={len(ma)//1024} B={len(mb)//1024}")

    # Control: A vs A — the oracle must say identical
    vlm_pairwise(ma, ma, "CONTROL: A vs A (identical renders)")

    # Real: A vs B (damping 18 vs 2)
    vlm_pairwise(ma, mb, "REAL: A (damping=18) vs B (damping=2)")


if __name__ == "__main__":
    main()

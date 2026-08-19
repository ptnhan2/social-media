"""Pairwise-only rerun — FORCE dashscope (Qwen3-VL), no fallback, surface errors.

Uses the existing A/B renders:
  ab_A_damping18.mp4 (damping=18, baseline)
  ab_B_damping2.mp4  (damping=2, drastic bouncier)

Also runs a control: identical video vs itself (A vs A) — a valid oracle must
answer "identical" there. If it claims to see differences on A-vs-A, it
hallucinates and pairwise verdicts are untrustworthy.
"""
import sys, os, base64, subprocess, tempfile, shutil
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

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

from harness_tools import _provider_config, _chat_completions

ROOT = Path(__file__).parent.parent
A = ROOT / "projects" / "isaacverse-final" / "renders" / "windows" / "ab_A_damping18.mp4"
B = ROOT / "projects" / "isaacverse-final" / "renders" / "windows" / "ab_B_damping2.mp4"


def log(msg):
    print(msg, flush=True)


def montage(video: Path, times=(0.4, 0.9, 1.6)) -> str | None:
    tmp = tempfile.mkdtemp()
    outs = []
    for i, t in enumerate(times):
        fp = os.path.join(tmp, f"m{i}.png")
        subprocess.run(["ffmpeg", "-y", "-ss", str(t), "-i", str(video), "-frames:v", "1",
                        "-vf", "scale=426:-1", fp], capture_output=True, timeout=30)
        if os.path.exists(fp):
            outs.append(fp)
    if not outs:
        return None
    joined = os.path.join(tmp, "montage.jpg")
    inputs = []
    for fp in outs:
        inputs += ["-i", fp]
    subprocess.run(["ffmpeg", "-y", *inputs, "-filter_complex", f"hstack=inputs={len(outs)}",
                    "-q:v", "55", joined], capture_output=True, timeout=30)
    if not os.path.exists(joined):
        return None
    with open(joined, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()
    shutil.rmtree(tmp, ignore_errors=True)
    return b64


PROMPT = (
    "IMAGE 1 = VIDEO A, IMAGE 2 = VIDEO B. Each image is 3 snapshots of the same "
    "4-second segment taken at t=0.4s, 0.9s, 1.6s (left to right) — the entrance "
    "animation of the diagram nodes. The two videos differ ONLY in the spring "
    "damping of the node entrance animation (lower damping = more oscillation/bounce).\n"
    "1. Compare the temporal progression between panels: which video shows more "
    "visible change/animation between t=0.4 and t=1.6? (A or B)\n"
    "2. Which video's entrance animation looks more polished? (A or B)\n"
    "3. Describe concretely what differences you SEE between IMAGE 1 and IMAGE 2.\n"
    "Be honest: if they look identical, say so explicitly."
)


def pairwise(ma: str, mb: str, label: str):
    cfg = _provider_config("dashscope")
    content = [
        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{ma}"}},
        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{mb}"}},
        {"type": "text", "text": PROMPT},
    ]
    import time
    t0 = time.time()
    result = _chat_completions(cfg, content, "You are a professional motion designer judging two video variants side by side from temporal montages.", 180)
    log(f"\n=== {label} (dashscope forced, {time.time()-t0:.0f}s) ===")
    log(result if not result.startswith("VLM API error") else "ERROR: " + result)
    return result


ma, mb = montage(A), montage(B)
log(f"montage KB: A={len(ma)//1024} B={len(mb)//1024}")
assert ma and mb

# Decisive test: A vs B
pairwise(ma, mb, "A (damping=18) vs B (damping=2)")

# Control: A vs A — oracle must say "identical"
pairwise(ma, ma, "CONTROL: A vs A (identical videos)")

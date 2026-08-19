"""Full improvement cycle v1 — the first LEGITIMATE end-to-end run.

Prerequisites (all verified 2026-08-19):
  - Style changes reach the render (BeatTreatment fix + runtime style fetch)
  - Deterministic pixel-diff gates every step (no more comparing identical videos)
  - VLM oracle validated (premise-neutral pairwise + A-vs-A control)

Cycle (mirrors memories/AGENTS.md loop, executed directly):
  1. Render baseline
  2. Critique baseline (absolute scores — Qwen3-VL sees real content)
  3. Pixel-diff gated change: pick a knob for the weakest aspect, apply ONE change
  4. Re-render, verify pixel-diff > 0 (change reached the render)
  5. Pairwise verdict (premise-neutral, control-checked)
  6. Record the experiment result (kept / reverted)
"""
import sys, os, json, shutil, subprocess, tempfile, time, re
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

from harness_tools import render_window, visual_critique, update_style, _resolve_workspace_path, _provider_config, _chat_completions

ROOT = Path(__file__).parent.parent
STYLE = ROOT / "libraries" / "04-visual" / "isaacverse-style.json"
WND = ROOT / "projects" / "isaacverse-final" / "renders" / "windows"
TIMES = (0.8, 1.05, 1.3)


def log(msg):
    print(msg, flush=True)


def extract_scores(text):
    clean = re.sub(r"[*_`#]", "", text.lower())
    scores = {}
    for name in ["composition", "color", "motion", "text", "pacing"]:
        m = re.search(rf"{name}(?:\s+legibility)?\s*[:\-]?\s*(\d)", clean)
        if m:
            scores[name] = int(m.group(1))
    return scores


def frame(video, t):
    tmp = tempfile.mkdtemp()
    fp = os.path.join(tmp, "f.png")
    subprocess.run(["ffmpeg", "-y", "-ss", str(t), "-i", str(video), "-frames:v", "1", "-vf", "scale=426:-1", fp], capture_output=True, timeout=30)
    img = Image.open(fp).convert("RGB") if os.path.exists(fp) else None
    shutil.rmtree(tmp, ignore_errors=True)
    return img


def pixel_diff(ia, ib):
    d = ImageChops.difference(ia, ib).convert("L")
    h = d.histogram()
    t = sum(h)
    return round(sum(i * c for i, c in enumerate(h)) / t, 3), round(sum(h[8:]) / t * 100, 3)


def montage_b64(video):
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


import base64

NEUTRAL_PROMPT = (
    "You are given two images. Each shows 3 snapshots of the same video segment "
    "at successive times, during the entrance animation of diagram nodes.\n"
    "FIRST, answer honestly: are the two images identical, nearly identical, or "
    "clearly different? They might be the same image.\n"
    "IF AND ONLY IF clearly different:\n"
    "  - Which image (first or second) shows more visible, purposeful animation movement?\n"
    "  - Which image's animation looks more polished overall?\n"
    "  - Verdict line: 'WINNER: first' or 'WINNER: second' for overall animation quality.\n"
    "If identical or nearly identical, say exactly that and stop."
)


def pairwise(ma, mb):
    cfg = _provider_config("dashscope")
    content = [
        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{ma}"}},
        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{mb}"}},
        {"type": "text", "text": NEUTRAL_PROMPT},
    ]
    return _chat_completions(cfg, content, "You are a careful motion designer. You never invent differences that are not present. End with a WINNER line when clearly different.", 180)


def reset_style():
    s = json.loads(STYLE.read_text(encoding="utf-8-sig"))
    s["treatments"]["semantic-diagram"]["entrance"]["damping"] = 18
    s["treatments"]["semantic-diagram"]["entrance"]["durationSec"] = 0.75
    s["treatments"]["semantic-diagram"]["edge"]["revealDurationSec"] = 0.65
    s["treatments"]["semantic-diagram"]["edge"]["stroke"]["mode"] = "solid"
    STYLE.write_text(json.dumps(s, indent=2, ensure_ascii=False), encoding="utf-8")


def render(tag):
    t0 = time.time()
    p = render_window.invoke({"project_slug": "isaacverse-final", "start_sec": 3.5, "end_sec": 7, "quality": "draft"})
    assert not p.startswith("Render failed"), p[:300]
    out = str(WND / f"cycle_{tag}.mp4")
    shutil.copy2(_resolve_workspace_path(p), out)
    log(f"  render {tag}: {time.time()-t0:.0f}s -> {out}")
    return out


def main():
    reset_style()
    log("=== STEP 1-2: render baseline + critique ===")
    fA = render("baseline")
    t0 = time.time()
    crit = visual_critique.invoke({"video_path": fA, "aspect": "all"})
    scores = extract_scores(crit)
    log(f"  critique in {time.time()-t0:.0f}s -> scores: {scores}")
    log("  --- critique (first 700 chars) ---")
    log("  " + crit[:700].replace("\n", "\n  "))

    log("\n=== STEP 3: change ONE knob (motion-focused test: damping 18->2) ===")
    update_style.invoke({"style_path": "treatments.semantic-diagram.entrance.damping", "new_value": "2"})

    log("\n=== STEP 4: re-render + pixel-diff gate ===")
    fB = render("damping2")
    diffs = [pixel_diff(frame(fA, t), frame(fB, t)) for t in TIMES]
    log(f"  pixel diff: {diffs}")
    gate = max(d for d, p in diffs)
    if gate <= 0.05:
        log("  GATE FAILED: change did not reach the render — reverting")
        reset_style()
        return
    log(f"  GATE PASSED (max mean diff {gate})")

    log("\n=== STEP 5: pairwise verdict (control first, then A/B) ===")
    ma, mb = montage_b64(fA), montage_b64(fB)
    ctrl = pairwise(ma, ma)
    if ctrl.startswith("VLM API error"):
        log(f"  CONTROL: oracle UNAVAILABLE (API error) — retrying once...")
        ctrl = pairwise(ma, ma)
    log(f"  CONTROL A-vs-A: {ctrl[:150]}")
    if ctrl.startswith("VLM API error"):
        log("  CONTROL: oracle unavailable — cannot verify verdict. Reverting (fail-safe).")
        reset_style()
        return
    if "identical" not in ctrl.lower():
        log("  CONTROL FAILED — oracle confabulating (claims difference on identical inputs). Verdict untrusted. Reverting.")
        reset_style()
        return
    verdict = pairwise(ma, mb)
    log("  --- A/B verdict ---")
    log("  " + verdict.replace("\n", "\n  "))

    log("\n=== STEP 6: record result ===")
    kept = "WINNER: second" in verdict
    result = "IMPROVED (B wins)" if kept else ("NO WIN" if "identical" in verdict.lower() else "A WINS / REVERT")
    log(f"  RESULT: {result}")
    if kept:
        log("  KEEPING damping=2 (pairwise verdict: B better)")
        # style stays at damping=2
    else:
        log("  REVERTING to damping=18")
        reset_style()
    log(f"\nFinal style damping: {json.loads(STYLE.read_text(encoding='utf-8-sig'))['treatments']['semantic-diagram']['entrance']['damping']}")


if __name__ == "__main__":
    main()

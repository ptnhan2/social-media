"""Qwen3-VL validation test — connectivity + controlled sensitivity check.

Network constraint discovered 2026-08-19: POST bodies > ~64KB to
dashscope.aliyuncs.com get connection-reset from this network. So:
  - absolute critiques use compressed JPEG frame pairs (budget 52KB)
  - pairwise comparison uses one 3-panel montage per video (~25KB each)

Steps:
  1. Render A (damping=18) -> critique (absolute scores, compressed frames)
  2. Render B (damping=2, DRASTIC) -> critique
  3. Pairwise: BOTH montages in ONE call — decisive test.
  4. Always revert style (try/finally).

Run:
    harness/.venv/Scripts/python.exe -u harness/test_vlm_qwen.py
"""
import sys, os, json, shutil, re, time, base64, subprocess, tempfile
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from pathlib import Path
env_file = Path(__file__).parent.parent / ".env"
if env_file.exists():
    for line in env_file.read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.strip()
        if "=" in line and not line.startswith("#"):
            k, _, v = line.partition("=")
            v = v.strip()
            if "#" in v and not (v.startswith('"') or v.startswith("'")):
                v = v.split("#")[0].strip()
            if v:
                os.environ.setdefault(k.strip(), v)

from harness_tools import render_window, visual_critique, update_style, _vlm_config, _call_vlm, _resolve_workspace_path

STYLE_REL = "libraries/04-visual/isaacverse-style.json"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SEG_DIR = os.path.join(ROOT, "projects", "isaacverse-final", "renders", "windows")
A_PATH = os.path.join(SEG_DIR, "ab_A_damping18.mp4")
B_PATH = os.path.join(SEG_DIR, "ab_B_damping2.mp4")


def log(msg):
    print(msg, flush=True)


def extract_scores(text):
    scores = {}
    for name in ["composition", "color", "motion", "text", "pacing"]:
        m = re.search(rf"{name}[:\s\-]*?(\d)", text.lower())
        if m:
            scores[name] = int(m.group(1))
    return scores


def reset_style():
    style_path = os.path.join(ROOT, STYLE_REL)
    with open(style_path, encoding="utf-8") as f:
        s = json.load(f)
    s["treatments"]["semantic-diagram"]["entrance"]["damping"] = 18
    s["treatments"]["semantic-diagram"]["entrance"]["durationSec"] = 0.75
    s["treatments"]["semantic-diagram"]["edge"]["revealDurationSec"] = 0.65
    s["treatments"]["semantic-diagram"]["edge"]["stroke"]["mode"] = "solid"
    with open(style_path, "w", encoding="utf-8") as f:
        json.dump(s, f, indent=2, ensure_ascii=False)
    shutil.copy2(style_path, os.path.join(ROOT, "remotion-composer", "shared", "isaacverse", "isaacverse-style.json"))


def montage(video: str, times: list[float]) -> str | None:
    """3-panel horizontal montage as base64 JPEG (~25KB). Panels are the video
    at the given times, left to right — shows temporal progression."""
    tmp = tempfile.mkdtemp()
    outs = []
    for i, t in enumerate(times):
        fp = os.path.join(tmp, f"m{i}.png")
        subprocess.run(["ffmpeg", "-y", "-ss", str(t), "-i", video, "-frames:v", "1",
                        "-vf", "scale=426:-1", fp], capture_output=True, timeout=30)
        if os.path.exists(fp):
            outs.append(fp)
    if not outs:
        return None
    joined = os.path.join(tmp, "montage.jpg")
    if len(outs) == 1:
        subprocess.run(["ffmpeg", "-y", "-i", outs[0], "-q:v", "55", joined], capture_output=True, timeout=30)
    else:
        inputs, filt = [], ""
        for fp in outs:
            inputs += ["-i", fp]
        filt = f"hstack=inputs={len(outs)}"
        subprocess.run(["ffmpeg", "-y", *inputs, "-filter_complex", filt, "-q:v", "55", joined], capture_output=True, timeout=30)
    if not os.path.exists(joined):
        return None
    with open(joined, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()
    shutil.rmtree(tmp, ignore_errors=True)
    return b64


def pairwise_critique(video_a: str, video_b: str) -> str:
    """Both videos as labeled montages in ONE call (payload < 64KB)."""
    # sample during the ENTRANCE animation (first ~2s of the clip)
    times = [0.4, 0.9, 1.6]
    ma, mb = montage(video_a, times), montage(video_b, times)
    if not ma or not mb:
        return "ERROR: could not build montages"
    log(f"  montage sizes (b64 KB): A={len(ma)//1024} B={len(mb)//1024}")
    content = [
        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{ma}"}},
        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{mb}"}},
        {"type": "text", "text": (
            "IMAGE 1 = VIDEO A, IMAGE 2 = VIDEO B. Each image is 3 snapshots of the same "
            "4-second segment taken at t=0.4s, 0.9s, 1.6s (left to right) — the entrance "
            "animation of the diagram nodes. The two videos differ ONLY in the spring "
            "damping of the node entrance animation.\n"
            "1. Compare the temporal progression between panels: which video shows more "
            "visible change/animation between t=0.4 and t=1.6? (A or B)\n"
            "2. Which video's entrance animation looks more polished? (A or B)\n"
            "3. Describe concretely what differences you SEE between IMAGE 1 and IMAGE 2.\n"
            "Be honest: if they look identical, say so explicitly."
        )},
    ]
    return _call_vlm(content, "You are a professional motion designer judging two video variants side by side from temporal montages.")


def main():
    cfg = _vlm_config()
    log(f"VLM primary: {cfg['provider']}/{cfg['model']} @ {cfg['base_url']}")
    try:
        log("\n=== STEP 1: render A (damping=18) + critique ===")
        t0 = time.time()
        reset_style()
        path_a = render_window.invoke({"project_slug": "isaacverse-final", "start_sec": 3.5, "end_sec": 7, "quality": "draft"})
        shutil.copy2(_resolve_workspace_path(path_a), A_PATH)
        log(f"  rendered A in {time.time()-t0:.0f}s -> {A_PATH}")
        t0 = time.time()
        crit_a = visual_critique.invoke({"video_path": path_a, "aspect": "all"})
        log(f"  critique A in {time.time()-t0:.0f}s -> scores: {extract_scores(crit_a)}")
        log("  --- critique A (first 600 chars) ---")
        log("  " + crit_a[:600].replace("\n", "\n  "))

        log("\n=== STEP 2: render B (damping=2) + critique ===")
        t0 = time.time()
        update_style.invoke({"style_path": "treatments.semantic-diagram.entrance.damping", "new_value": "2"})
        path_b = render_window.invoke({"project_slug": "isaacverse-final", "start_sec": 3.5, "end_sec": 7, "quality": "draft"})
        shutil.copy2(_resolve_workspace_path(path_b), B_PATH)
        log(f"  rendered B in {time.time()-t0:.0f}s -> {B_PATH}")
        t0 = time.time()
        crit_b = visual_critique.invoke({"video_path": path_b, "aspect": "all"})
        log(f"  critique B in {time.time()-t0:.0f}s -> scores: {extract_scores(crit_b)}")
        log("  --- critique B (first 600 chars) ---")
        log("  " + crit_b[:600].replace("\n", "\n  "))

        log("\n=== Absolute score comparison (A=damping18, B=damping2) ===")
        sa, sb = extract_scores(crit_a), extract_scores(crit_b)
        for a in ["composition", "color", "motion", "text", "pacing"]:
            log(f"  {a:<14} A={sa.get(a, '?')}  B={sb.get(a, '?')}")

        log("\n=== STEP 3: pairwise montage comparison (ONE call — decisive) ===")
        t0 = time.time()
        pw = pairwise_critique(A_PATH, B_PATH)
        log(f"  pairwise in {time.time()-t0:.0f}s")
        log("  --- pairwise verdict ---")
        log("  " + pw.replace("\n", "\n  "))
    finally:
        reset_style()
        log("\nStyle reverted to baseline (damping=18).")


if __name__ == "__main__":
    main()

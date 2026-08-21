"""Domain tools — render, critique, think, update_style.

render_window: spawns Remotion (Node.js subprocess)
visual_critique: calls the configured VLM. With Qwen3-VL (DashScope) the video is
  sent NATIVELY (video_url base64) so the VLM sees actual motion. With other
  providers (zhipu GLM-4V) it falls back to keyframe pairs.
think: strategic reflection — agent pauses to reason before acting
update_style: change a style knob by dot-notation path (avoids edit_file indentation issues)

Everything else (read_file, edit_file, write_file, ls, glob, grep, task)
is provided by Deep Agents built-in.
"""

from __future__ import annotations

import base64
import json
import os
import subprocess
import sys

from langchain.tools import tool

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RENDERER_DIR = os.path.join(PROJECT_ROOT, "remotion-composer")
STYLE_REL = "libraries/04-visual/isaacverse-style.json"

# ---------------------------------------------------------------------------
# VLM provider configuration (all OpenAI-compatible endpoints)
#
#   VLM_PROVIDER = dashscope | zhipu | openrouter   (default: dashscope)
#   VLM_MODEL    = e.g. qwen3-vl-flash | qwen3-vl-plus | qwen3.8-max
#   DASHSCOPE_BASE_URL = override endpoint region (default: international)
#     - international key: https://dashscope-intl.aliyuncs.com/compatible-mode/v1
#     - China key:         https://dashscope.aliyuncs.com/compatible-mode/v1
#   VLM_VIDEO_FPS = frames/sec sampled from video for dashscope video input (default 10)
# ---------------------------------------------------------------------------

_VLM_DEFAULTS = {
    "dashscope": {
        "base_url": "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
        "model": "qwen3-vl-flash",
        "key_env": "DASHSCOPE_API_KEY",
        "supports_video": True,
        "max_tokens": 1500,
        # POST bodies above ~64KB get connection-reset on the China endpoint from
        # some international routes. Override with VLM_MAX_BODY_KB=0 (unlimited)
        # when routing cleanly (e.g. international endpoint).
        "max_body_kb": 60,
    },
    "zhipu": {
        "base_url": "https://open.bigmodel.cn/api/paas/v4",
        "model": "glm-4v-flash",
        "key_env": "ZHIPU_API_KEY",
        "supports_video": False,
        "max_tokens": 1024,
    },
    "openrouter": {
        "base_url": "https://openrouter.ai/api/v1",
        "model": "openai/gpt-4o-mini",
        "key_env": "OPENROUTER_API_KEY",
        "supports_video": False,
        "max_tokens": 1500,
    },
}


def _resolve_workspace_path(video_path: str) -> str:
    full = video_path
    if full.startswith("/workspace/"):
        full = full[len("/workspace/"):]
    if not os.path.isabs(full):
        full = os.path.join(PROJECT_ROOT, full.lstrip("/"))
    return full


@tool
def render_window(project_slug: str, start_sec: float, end_sec: float, quality: str = "draft") -> str:
    """Render a video segment. Returns the video path for read_file.

    Args:
        project_slug: Project folder name (e.g. 'isaacverse-final').
        start_sec: Start time in seconds.
        end_sec: End time in seconds.
        quality: 'draft' (360p) or 'master' (1080p).
    """
    import shutil
    cmd = [
        "node", os.path.join(RENDERER_DIR, "scripts", "render-window.mjs"),
        "--project", project_slug, "--start", str(start_sec),
        "--end", str(end_sec), "--quality", quality,
    ]
    src_style = os.path.join(PROJECT_ROOT, STYLE_REL)
    dst_style = os.path.join(RENDERER_DIR, "shared", "isaacverse", "isaacverse-style.json")
    # styleLoader.ts now fetches the style at RUNTIME from public/ (bypassing
    # webpack bundling/cache), so the JSON MUST be present in public/ for the
    # render to pick up style-knob edits.
    public_style = os.path.join(RENDERER_DIR, "public", "isaacverse-style.json")
    if os.path.exists(src_style):
        shutil.copy2(src_style, dst_style)
        shutil.copy2(src_style, public_style)
    result = None
    for attempt in range(2):
        result = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace", cwd=RENDERER_DIR, timeout=300)
        if result.returncode == 0:
            break
        # transient failures (lingering chrome-headless-shell from a previous
        # render holding locks/ports) — wait and retry once
        import time
        time.sleep(5)
    if result.returncode != 0:
        return f"Render failed:\n{(result.stderr or '')[-1000:]}"
    import re
    out = result.stdout.strip()
    mp4_match = re.search(r'([A-Za-z]:\\[^\s"]+\.mp4|/[^\s"]+\.mp4)', out)
    raw_path = mp4_match.group(1) if mp4_match else ""
    if not raw_path:
        try:
            data = json.loads(out)
            if isinstance(data.get("args"), list) and len(data["args"]) > 3:
                raw_path = data["args"][3]
        except (json.JSONDecodeError, TypeError):
            pass
    if raw_path and raw_path.startswith(PROJECT_ROOT):
        rel = raw_path[len(PROJECT_ROOT):].lstrip("\\/").replace("\\", "/")
        return f"/workspace/{rel}"
    return raw_path or f"Render completed. stdout:\n{out[-300:]}"


def _extract_keyframes(video_path: str, max_frames: int = 4, jpeg: bool = False, budget_kb: int | None = None) -> list[str]:
    """Extract keyframes from video as base64 strings.

    Frame PAIRS (t, t+0.08s) sampled evenly across the clip, so the VLM can
    detect motion via intra-pair differences and progression via inter-pair.
    Returns pairs as adjacent frames: [frame_t1, frame_t1+0.08, frame_t2, frame_t2+0.08, ...]

    jpeg=True + budget_kb: re-encode frames as JPEG (512px, q55) and drop the
    last pairs until the total base64 payload fits the budget — needed for
    DashScope's China endpoint, which resets connections with POST bodies
    above ~64KB from international routes.
    """
    full = video_path
    if not os.path.exists(full):
        return []
    probe = subprocess.run(
        ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", str(full)],
        capture_output=True, text=True, timeout=30)
    duration = 10.0
    try:
        duration = float(json.loads(probe.stdout).get("format", {}).get("duration", 10))
    except Exception:
        pass
    frames: list[str] = []
    pair_offset = 0.08  # 80ms between pair frames (~2-3 frames at 30fps)
    num_pairs = max_frames // 2
    # Bias the FIRST pair into the entrance animation (most treatments animate
    # in during the first ~1s) — even spacing made VLMs consistently miss motion.
    first_t = min(0.7, duration / 4)
    pair_times = [first_t]
    if num_pairs > 1:
        pair_times.append(max(first_t * 2, duration * 0.5))
    if num_pairs > 2:
        interval = duration / (num_pairs + 1)
        pair_times = [interval * (i + 1) for i in range(num_pairs)]
    import tempfile, shutil
    tmpdir = tempfile.mkdtemp()
    if jpeg:
        vf, ext, qarg = "scale=512:-1", "jpg", ["-q:v", "55"]
    else:
        vf, ext, qarg = "scale=640:-1", "png", []
    for i in range(num_pairs):
        t = pair_times[i] if i < len(pair_times) else (duration / (num_pairs + 1)) * (i + 1)
        for j, time_offset in enumerate([0, pair_offset]):
            frame_path = os.path.join(tmpdir, f"frame_{i:02d}_{j}.{ext}")
            actual_t = min(t + time_offset, duration - 0.01)
            subprocess.run(
                ["ffmpeg", "-y", "-ss", str(actual_t), "-i", str(full),
                 "-frames:v", "1", *qarg, "-vf", vf, frame_path],
                capture_output=True, timeout=30)
            if os.path.exists(frame_path):
                with open(frame_path, "rb") as f:
                    frames.append(base64.b64encode(f.read()).decode())
    shutil.rmtree(tmpdir, ignore_errors=True)
    if budget_kb is not None:
        limit = budget_kb * 1024
        while frames and sum(len(f) for f in frames) > limit:
            frames = frames[:-2]  # drop the last pair
    return frames


def _encode_video(video_path: str) -> str | None:
    """Base64-encode a whole video for native VLM input (Qwen3-VL video_url).

    Returns None when the file is > 7MB — the OpenAI-compatible base64 limit
    for video on DashScope; larger files need a public URL instead.
    """
    try:
        if os.path.getsize(video_path) > 7 * 1024 * 1024:
            return None
        with open(video_path, "rb") as f:
            return base64.b64encode(f.read()).decode()
    except OSError:
        return None


def _provider_config(provider: str) -> dict:
    """Build a VLM config for a specific provider name (shared env overrides)."""
    cfg = dict(_VLM_DEFAULTS[provider])
    cfg["provider"] = provider
    if provider == "dashscope" and os.environ.get("DASHSCOPE_BASE_URL"):
        cfg["base_url"] = os.environ["DASHSCOPE_BASE_URL"]
    cfg["api_key"] = os.environ.get(cfg["key_env"], "")
    return cfg


def _vlm_config() -> dict:
    provider = os.environ.get("VLM_PROVIDER", "dashscope").lower()
    if provider not in _VLM_DEFAULTS:
        provider = "dashscope"
    cfg = _provider_config(provider)
    if os.environ.get("VLM_MODEL"):
        cfg["model"] = os.environ["VLM_MODEL"]
    if os.environ.get("VLM_BASE_URL"):
        cfg["base_url"] = os.environ["VLM_BASE_URL"]
    return cfg


def _chat_completions(cfg: dict, content_blocks: list[dict], system: str, timeout: int,
                      response_format: dict | None = None) -> str:
    """One chat/completions attempt (with transient-network retry) against a single
    provider. Returns text or 'VLM API error...'."""
    import urllib.request, urllib.error
    import time as _time
    if not cfg["api_key"]:
        return f"VLM API error: {cfg['key_env']} not set"
    payload = {
        "model": cfg["model"],
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": content_blocks},
        ],
        "max_tokens": int(cfg.get("max_tokens", 1500)), "temperature": 0.3,
    }
    if response_format:
        payload["response_format"] = response_format
    encoded = json.dumps(payload).encode()
    last_err = None
    for attempt in range(3):
        req = urllib.request.Request(
            f"{cfg['base_url'].rstrip('/')}/chat/completions",
            data=encoded, headers={"Authorization": f"Bearer {cfg['api_key']}", "Content-Type": "application/json"}, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return json.loads(resp.read().decode())["choices"][0]["message"]["content"]
        except urllib.error.HTTPError as e:
            body = e.read().decode()[:300]
            # 4xx = auth/billing/payload problems — retrying rarely helps, except 429 (rate limit)
            if e.code == 429 and attempt < 2:
                _time.sleep(5 * (attempt + 1))
                continue
            return f"VLM API error {e.code} ({cfg['provider']}/{cfg['model']}): {body}"
        except Exception as e:
            # transient network resets/timeouts — retry with backoff
            last_err = f"VLM API error ({cfg['provider']}/{cfg['model']}, timeout {timeout}s): {e}"
            if attempt < 2:
                _time.sleep(5 * (attempt + 1))
                continue
    return last_err or "VLM API error: unknown"


def _call_vlm(content_blocks: list[dict], system: str, timeout: int = 120) -> str:
    """Call the configured VLM with automatic provider fallback.

    Tries VLM_PROVIDER first; on auth/billing/network failure falls back to the
    other configured providers (image content is portable across all of them).
    Returns the first successful response, annotated with the serving provider.
    """
    primary = _vlm_config()
    chain = [primary] + [_provider_config(n) for n in _VLM_DEFAULTS if n != primary["provider"]]
    errors = []
    for cfg in chain:
        if not cfg["api_key"]:
            continue
        result = _chat_completions(cfg, content_blocks, system, timeout)
        if not result.startswith("VLM API error"):
            if cfg["provider"] != primary["provider"]:
                result += f"\n[served by fallback provider {cfg['provider']}/{cfg['model']}; primary {primary['provider']} failed: {errors[-1][:150] if errors else 'unknown'}]"
            return result
        errors.append(f"{cfg['provider']}/{cfg['model']}: {result[:200]}")
    return "VLM API error — all providers failed:\n" + "\n".join(errors)


_VLM_SYSTEM = "You are a professional video editor and art director. Analyze video and provide structured visual critique."


@tool
def visual_critique(video_path: str, aspect: str = "all") -> str:
    """Analyze a rendered video using the configured VLM (default: Qwen3-VL via DashScope).

    With a video-native VLM (Qwen3-VL) the WHOLE VIDEO is sent directly, so the
    critique sees actual motion, timing and pacing. With image-only VLMs it falls
    back to keyframe pairs. Returns structured critique.

    Args:
        video_path: Path to .mp4 (with /workspace/ prefix or relative).
        aspect: 'all', 'composition', 'color', 'motion', 'text', 'pacing'.
    """
    full = _resolve_workspace_path(video_path)
    if not os.path.exists(full):
        return f"Video not found: {full}"
    cfg = _vlm_config()
    prompts = {
        "all": "Analyze this video. For each aspect, give a score (1-5) and 1-2 sentences:\n1. Composition\n2. Color\n3. Motion\n4. Text legibility\n5. Pacing\n\nEnd with 'TOP ISSUE:' and the single most impactful improvement.",
        "composition": "Analyze composition only. Score 1-5 with feedback.",
        "color": "Analyze color only. Score 1-5 with feedback.",
        "motion": "Analyze motion only. Score 1-5 with feedback.",
        "text": "Analyze text legibility only. Score 1-5 with feedback.",
        "pacing": "Analyze pacing only. Score 1-5 with feedback.",
    }
    prompt = prompts.get(aspect, prompts["all"])

    # --- Preferred path: native video input (Qwen3-VL via DashScope) ---
    # video_url content is provider-specific, so no cross-provider fallback here —
    # on failure we degrade to keyframe pairs below.
    if cfg["supports_video"]:
        video_b64 = _encode_video(full)
        max_body_kb = int(os.environ.get("VLM_MAX_BODY_KB", str(cfg.get("max_body_kb", 0))))
        payload_ok = video_b64 is not None and (max_body_kb <= 0 or len(video_b64) <= max_body_kb * 1024)
        if payload_ok:
            fps = float(os.environ.get("VLM_VIDEO_FPS", "10"))
            content = [
                {"type": "video_url", "video_url": {"url": f"data:video/mp4;base64,{video_b64}"}, "fps": fps},
                {"type": "text", "text": prompt},
            ]
            critique = _chat_completions(cfg, content, _VLM_SYSTEM + " You are given the actual video (sampled frames), so judge motion and pacing from the temporal changes you observe.", 180)
            if not critique.startswith("VLM API error"):
                return f"Visual critique ({aspect}) of {video_path} [VLM: {cfg['provider']}/{cfg['model']} — native video @ {fps}fps]:\n\n{critique}"
            # native-video call failed (billing/auth) — fall through to frames

    # --- Fallback: keyframe pairs (any provider, with provider fallback chain) ---
    # DashScope China endpoint resets connections with POST bodies > ~64KB from
    # international routes — use compressed JPEG frames with a strict budget.
    if cfg["provider"] == "dashscope":
        frames = _extract_keyframes(full, max_frames=4, jpeg=True, budget_kb=52)
    else:
        frames = _extract_keyframes(full, max_frames=4)
    if not frames:
        return f"Could not extract frames from: {full}"
    prompt += "\n\nContext: These are frames from an IsaacVerse-style story-driven video. Frames are sent in PAIRS (consecutive frames 80ms apart) — compare adjacent frames to detect MOTION and animation. If frames in a pair look identical, there is no motion at that point."
    content = [{"type": "text", "text": prompt}]
    for b64 in frames:
        content.append({"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}})
    critique = _call_vlm(content, _VLM_SYSTEM)
    return f"Visual critique ({aspect}) of {video_path} [VLM: {cfg['provider']}/{cfg['model']} — keyframe pairs]:\n\n{critique}"


@tool
def think(reflection: str) -> str:
    """Strategic reflection — pause to reason before next action.

    Use this tool to think deliberately:
    - After critique: What's the weakest aspect? Which knob should I change? Why?
    - Before changing style: What's the risk? What's the expected improvement?
    - After re-render: Did scores improve? Should I continue or stop?
    - Before reporting: Have I verified the improvement? Is quality good enough?

    This is NOT optional — use it after each critique and before each style change.

    Args:
        reflection: Your detailed reasoning about current state, gaps, and next steps.
    """
    return f"Reflection recorded: {reflection}"


@tool
def update_style(style_path: str, new_value: str) -> str:
    """Update a style knob by dot-notation path. APPROVAL-GATED (human must approve).

    Simpler than edit_file for JSON — no indentation matching needed.
    Reads the JSON, navigates to the path, sets the value, writes back.

    Args:
        style_path: Dot-notation from root (e.g. 'treatments.semantic-diagram.edge.stroke.mode')
        new_value: New value as JSON string ('"gradient"' for string, '2' for number, '["#a","#b"]' for array)
    """
    style_file = os.path.join(PROJECT_ROOT, STYLE_REL)
    with open(style_file, encoding="utf-8") as f:
        style = json.load(f)
    parts = style_path.split(".")
    obj = style
    for p in parts[:-1]:
        if p not in obj:
            return f"Path not found: {style_path} (missing '{p}')"
        obj = obj[p]
    try:
        val = json.loads(new_value)
    except (json.JSONDecodeError, TypeError):
        val = new_value
    old = obj.get(parts[-1])
    if old == val:
        return f"No change (current value is already {json.dumps(val)})"
    obj[parts[-1]] = val
    style["version"] = style.get("version", 1) + 1
    with open(style_file, "w", encoding="utf-8") as f:
        json.dump(style, f, indent=2, ensure_ascii=False)
    # Sync to Remotion shared dir AND public/ (styleLoader fetches at runtime
    # from public/, so the public copy is the one the render actually reads)
    import shutil
    for dst in [
        os.path.join(RENDERER_DIR, "shared", "isaacverse", "isaacverse-style.json"),
        os.path.join(RENDERER_DIR, "public", "isaacverse-style.json"),
    ]:
        shutil.copy2(style_file, dst)
    return (f"Style updated: {style_path}\n  old: {json.dumps(old)}\n  new: {json.dumps(val)}\n"
            f"  version: {style['version']}\n  File: /workspace/{STYLE_REL}")


@tool
def copy_render(source_path: str, destination_path: str) -> str:
    """Copy a render file aside (protocol v4 step 2 — MANDATORY before re-rendering).

    render_window writes to a DETERMINISTIC output path — the next render
    OVERWRITES the previous one. Copy the baseline to e.g.
    renders/windows/cycle_baseline.mp4 BEFORE rendering the after, or your
    before/after comparison will compare the after with itself.

    Args:
        source_path: Path to the render to copy (with /workspace/ prefix or relative).
        destination_path: Destination path, project-relative (e.g. 'projects/<slug>/renders/windows/cycle_baseline.mp4').
    """
    src = _resolve_workspace_path(source_path)
    if not os.path.exists(src):
        return f"Copy failed: source not found: {src}"
    dst = _resolve_workspace_path(destination_path)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    import shutil
    shutil.copy2(src, dst)
    rel = os.path.relpath(dst, PROJECT_ROOT).replace("\\", "/")
    return f"Copied to /workspace/{rel} ({os.path.getsize(dst) // 1024} KB)"


# ---------------------------------------------------------------------------
# Protocol v4 tools — the layered oracle + the KEEP gate
# (design: docs/TASTE-AND-LEARNING-ROADMAP.md rev 3)
# ---------------------------------------------------------------------------

MEMORIES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "memories")
PREFERENCES_FILE = os.path.join(MEMORIES_DIR, "preferences.jsonl")
FEEDBACK_FILE = os.path.join(MEMORIES_DIR, "feedback.jsonl")
TASTE_STANDARD_FILE = os.path.join(MEMORIES_DIR, "taste-standard.md")


def _duration_of(video_path: str) -> float:
    probe = subprocess.run(
        ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", video_path],
        capture_output=True, text=True, timeout=30)
    try:
        return float(json.loads(probe.stdout).get("format", {}).get("duration", 10))
    except Exception:
        return 10.0


def _frame_image(video_path: str, t: float, width: int = 426):
    """Extract one frame as a PIL image."""
    from PIL import Image
    import tempfile, shutil as _sh
    tmp = tempfile.mkdtemp()
    fp = os.path.join(tmp, "f.png")
    subprocess.run(["ffmpeg", "-y", "-ss", str(t), "-i", video_path, "-frames:v", "1",
                    "-vf", f"scale={width}:-1", fp], capture_output=True, timeout=30)
    img = Image.open(fp).convert("RGB") if os.path.exists(fp) else None
    _sh.rmtree(tmp, ignore_errors=True)
    return img


def _pixel_diff_stats(ia, ib) -> tuple[float, float]:
    """Mean abs diff (0-255) and % of pixels differing by >8, between two PIL images."""
    from PIL import ImageChops
    d = ImageChops.difference(ia, ib).convert("L")
    h = d.histogram()
    total = sum(h)
    mean = sum(i * c for i, c in enumerate(h)) / max(total, 1)
    changed = sum(h[8:]) / max(total, 1) * 100
    return mean, changed


@tool
def compare_renders(video_a: str, video_b: str) -> str:
    """Deterministic pixel-diff gate between two renders (protocol v4 step 6).

    Extracts frames at entrance-biased times (animation lives early in a
    segment) and computes the pixel difference. Run this BEFORE trusting any
    VLM verdict: if max mean diff <= 0.05 the change did NOT reach the render —
    the pipeline is broken and you must NOT critique; report the failure.

    Args:
        video_a: Path to the before render (with /workspace/ prefix or relative).
        video_b: Path to the after render.
    """
    fa, fb = _resolve_workspace_path(video_a), _resolve_workspace_path(video_b)
    for p, n in [(fa, "video_a"), (fb, "video_b")]:
        if not os.path.exists(p):
            return f"GATE ERROR: {n} not found: {p}"
    dur = min(_duration_of(fa), _duration_of(fb))
    # entrance-biased sampling: ~18%, 30%, 45%, 65% of the clip
    times = [round(dur * f, 2) for f in (0.18, 0.30, 0.45, 0.65)]
    results = []
    for t in times:
        ia, ib = _frame_image(fa, t), _frame_image(fb, t)
        if ia is None or ib is None:
            results.append((t, None, None))
            continue
        mean, changed = _pixel_diff_stats(ia, ib)
        results.append((t, round(mean, 3), round(changed, 3)))
    means = [m for _, m, _ in results if m is not None]
    max_mean = max(means) if means else 0.0
    gate = "PASS" if max_mean > 0.05 else "FAIL"
    lines = [f"Pixel-diff gate: {gate} (max mean {max_mean})"]
    for t, m, c in results:
        lines.append(f"  t={t}s: mean={m} changed_pct={c}")
    if gate == "FAIL":
        lines.append("The change did NOT reach the render. Do NOT critique — report the pipeline failure and stop.")
    else:
        lines.append("Change verified in the render. Proceed to pairwise verdict (or request_keep if user-directed).")
    return "\n".join(lines)


def _montage_b64(video_path: str, times: list[float]) -> str | None:
    """3-panel horizontal montage as base64 JPEG (< 64KB, DashScope-safe)."""
    import base64, tempfile
    from PIL import Image
    imgs = [i for i in (_frame_image(video_path, t) for t in times) if i is not None]
    if not imgs:
        return None
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
    import shutil as _sh
    _sh.rmtree(os.path.dirname(tmp), ignore_errors=True)
    return b64


def _judge_system_prompt() -> str:
    """Conditioned judge: taste-standard principles + few-shot exemplar verdicts."""
    base = ("You are a careful motion designer judging two video variants side by side "
            "from temporal montages. You never invent differences that are not present.")
    principles = ""
    try:
        with open(TASTE_STANDARD_FILE, encoding="utf-8-sig") as f:
            principles = f.read().strip()
    except OSError:
        pass
    exemplars = []
    try:
        with open(PREFERENCES_FILE, encoding="utf-8-sig") as f:
            for line in f:
                try:
                    rec = json.loads(line)
                    if rec.get("user_verdict") in ("a", "b"):
                        exemplars.append(rec)
                except json.JSONDecodeError:
                    continue
    except OSError:
        pass
    parts = [base]
    if principles:
        parts.append("\nYou judge strictly by these approved principles:\n" + principles)
    if exemplars:
        ex_lines = []
        for rec in exemplars[-3:]:
            winner = rec.get("a") if rec.get("user_verdict") == "a" else rec.get("b")
            ex_lines.append(f"- knob {rec.get('knob')}: user preferred value {winner} ({rec.get('aspect', '?')} aspect)")
        parts.append("\nThe user's prior verdicts (follow this taste):\n" + "\n".join(ex_lines))
    return "\n".join(parts)


_PAIRWISE_PROMPT = (
    "You are given two images. Each shows 3 snapshots of the same video segment "
    "at successive times.\n"
    "FIRST decide honestly: are the two images identical, nearly identical, or "
    "clearly different? They might be the same image.\n"
    "Respond with STRICT JSON ONLY (no markdown fences, no extra text):\n"
    '{"assessment": "identical" | "nearly-identical" | "different", "winner": "first" | "second" | null, "reason": "<one short sentence>"}\n'
    "Rules: winner MUST be null unless assessment is exactly \"different\". When "
    "different, pick as winner the image that shows more visible, purposeful "
    "animation movement and the more polished overall look. "
    "Never invent differences that are not present in the frames."
)


def _parse_pairwise_verdict(text: str) -> str:
    """Extract the verdict word from a pairwise response: after|before|identical|unparsed.

    Prefers structured JSON (assessment/winner fields); falls back to legacy
    'WINNER: first/second' phrasing for robustness."""
    import re
    try:
        m = re.search(r"\{.*\}", text, re.DOTALL)
        if m:
            obj = json.loads(m.group(0))
            assessment = str(obj.get("assessment", "")).lower()
            winner = str(obj.get("winner") or "").strip().lower() or None
            if winner in ("first", "second"):
                return "before" if winner == "first" else "after"
            if "identical" in assessment:
                return "identical"
            if assessment == "different" and winner is None:
                return "unparsed"
    except (json.JSONDecodeError, AttributeError):
        pass
    low = text.lower().replace("*", "")
    if "winner: second" in low:
        return "after"
    if "winner: first" in low:
        return "before"
    if "identical" in low:
        return "identical"
    return "unparsed"


@tool
def pairwise_verdict(video_a: str, video_b: str, skip_control: bool = False) -> str:
    """Premise-neutral pairwise comparison with honesty control (protocol v4 step 7).

    Layer 1 (control): A vs A in one call — the oracle MUST answer 'identical',
    otherwise it is confabulating and this verdict is UNTRUSTED.
    Layer 2 (verdict): A vs B — trust only the WINNER/identical line, never the
    narrated details (VLMs confabulate specifics).

    Args:
        video_a: Path to the before render.
        video_b: Path to the after render.
        skip_control: Skip the A-vs-A control (NOT recommended — only for
            re-running when a previous control passed in the same session).
    """
    fa, fb = _resolve_workspace_path(video_a), _resolve_workspace_path(video_b)
    for p, n in [(fa, "video_a"), (fb, "video_b")]:
        if not os.path.exists(p):
            return f"VERDICT ERROR: {n} not found: {p}"
    dur = min(_duration_of(fa), _duration_of(fb))
    times = [round(dur * f, 2) for f in (0.18, 0.3, 0.42)]
    ma, mb = _montage_b64(fa, times), _montage_b64(fb, times)
    if not ma or not mb:
        return "VERDICT ERROR: could not build montages"

    def _pw(x: str, y: str, label: str) -> str:
        content = [
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{x}"}},
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{y}"}},
            {"type": "text", "text": _PAIRWISE_PROMPT},
        ]
        cfg = _provider_config("dashscope")
        # the decision-maker uses the stronger model by default (flash is
        # noisy on subtle A/B verdicts); override with VLM_PAIRWISE_MODEL
        cfg["model"] = os.environ.get("VLM_PAIRWISE_MODEL", "qwen3-vl-plus")
        out = _chat_completions(cfg, content, _judge_system_prompt(), 180,
                                response_format={"type": "json_object"})
        if out.startswith("VLM API error 400"):
            # endpoint may not support response_format with image inputs —
            # the prompt still demands JSON, parsing tolerates prose
            out = _chat_completions(cfg, content, _judge_system_prompt(), 180)
        return out

    if not skip_control:
        ctrl = _pw(ma, ma, "control")
        if ctrl.startswith("VLM API error"):
            return f"ORACLE UNAVAILABLE (control call failed): {ctrl[:200]}"
        ctrl_verdict = _parse_pairwise_verdict(ctrl)
        if ctrl_verdict in ("before", "after") or ctrl_verdict == "unparsed":
            return ("CONTROL FAILED — the oracle claims differences between IDENTICAL inputs "
                    "(confabulating). Verdict untrusted. Do NOT use this verdict; treat the "
                    "cycle as unverifiable and revert.\nControl response:\n" + ctrl[:400])
    verdict = _pw(ma, mb, "verdict")
    if verdict.startswith("VLM API error"):
        return f"ORACLE UNAVAILABLE: {verdict[:200]}"
    winner = _parse_pairwise_verdict(verdict)
    header = f"Pairwise verdict: {winner}\n(control {'skipped' if skip_control else 'passed'})\n\n"
    return header + verdict


def _append_jsonl(path: str, record: dict) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")


@tool
def request_keep(knob: str, old_value: str, new_value: str, video_before: str,
                 video_after: str, verdict_summary: str, aspect: str = "",
                 user_directed: bool = False, feedback_context: str = "") -> str:
    """The KEEP gate (protocol v4 step 8) — ask the human whether to keep a style change.

    PAUSES for a human decision. Show up with both renders + the verdict.
    Three exits: keep / keep+note / reject+note. The vote is recorded to
    /memories/preferences.jsonl automatically; notes go to /memories/feedback.jsonl.

    For AGENT-DRIVEN cycles: call after pairwise_verdict says the after-render wins.
    For USER-DIRECTED (feedback-driven) fixes: call with user_directed=True right
    after compare_renders passes — the user is the oracle for their own request,
    no VLM verdict is needed.

    Args:
        knob: Style knob that was changed (dot-notation).
        old_value: Previous value (as string).
        new_value: New value (as string).
        video_before: Path to the before render.
        video_after: Path to the after render.
        verdict_summary: One line — the pairwise verdict, or 'user-directed fix per your feedback'.
        aspect: Which critique aspect this targets (motion/color/text/pacing/composition).
        user_directed: True when this change came from the user's feedback (skip VLM framing).
        feedback_context: For user-directed fixes: the user's original feedback text.
    """
    from langgraph.types import interrupt
    import datetime
    payload = {
        "kind": "keep_gate",
        "knob": knob,
        "old_value": old_value,
        "new_value": new_value,
        "video_before": video_before,
        "video_after": video_after,
        "verdict_summary": verdict_summary,
        "aspect": aspect,
        "user_directed": user_directed,
        "feedback_context": feedback_context,
    }
    decision = interrupt(payload)
    # decision: {"type": "keep" | "reject", "note": str}
    dtype = decision.get("type", "reject") if isinstance(decision, dict) else "reject"
    note = (decision.get("note", "") or "").strip() if isinstance(decision, dict) else ""
    ts = datetime.datetime.now().isoformat(timespec="seconds")
    vote = "b" if dtype == "keep" else "a"
    vlm_verdict = "" if user_directed else verdict_summary
    _append_jsonl(PREFERENCES_FILE, {
        "ts": ts, "knob": knob, "a": old_value, "b": new_value,
        "user_verdict": vote, "vlm_verdict": vlm_verdict, "aspect": aspect,
        "user_directed": user_directed, "segment_note": os.path.basename(video_before),
    })
    if note:
        _append_jsonl(FEEDBACK_FILE, {
            "ts": ts, "knob_under_test": knob, "a": old_value, "b": new_value,
            "verdict": "kept_with_note" if dtype == "keep" else "rejected_with_note",
            "note": note, "user_directed": user_directed,
        })
    outcome = ("KEPT" if dtype == "keep" else "REJECTED (revert the knob via update_style)")
    result = f"KEEP GATE: {outcome}. knob={knob} {old_value}->{new_value}, user_verdict={vote}"
    if note:
        result += f"\nUser note (recorded to feedback.jsonl — diagnose it next): {note}"
    if dtype != "keep":
        result += "\nNEXT: revert the knob, then process the note per the feedback rules (3-case diagnosis)."
    return result

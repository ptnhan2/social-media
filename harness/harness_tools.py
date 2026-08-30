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
import tempfile
import urllib.request

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
    "deepseek": {
        # DeepSeek-V4-Flash-Vision-Exp (2026-08-21): frontier-class VLM at
        # flash pricing ($0.22/1M off-peak). Beats Opus 4.8 on 3/11 agent
        # benchmarks. Images tokenized at <=384 tokens each (800x800 resize).
        # OpenAI-compatible Chat Completions; base64/URL/Files API transports.
        "base_url": "https://api.deepseek.com/v1",
        "model": "deepseek-v4-flash-vision-exp",
        "key_env": "DEEPSEEK_API_KEY",
        "supports_video": False,
        "max_tokens": 1500,
    },
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
def render_window(project_slug: str, start_sec: float, end_sec: float, quality: str = "draft", render_path: str = "editor") -> str:
    """Render a video segment. Returns the video path for read_file.

    Args:
        project_slug: Project folder name (e.g. 'isaacverse-final').
        start_sec: Start time in seconds.
        end_sec: End time in seconds.
        quality: 'draft' (360p) or 'master' (1080p).
        render_path: 'editor' (clip-first flow driven by editor/current.json —
            DEFAULT since the E2 parity gate PASSED 2026-08-25: both measurement
            windows < 2.0 mean abs diff vs the treatment flow, so renders now
            reflect the editable timeline) or 'treatment' (style-store live
            generator preview — use for cheap knob A/B without an EditorDoc).
    """
    import shutil
    cmd = [
        "node", os.path.join(RENDERER_DIR, "scripts", "render-window.mjs"),
        "--project", project_slug, "--start", str(start_sec),
        "--end", str(end_sec), "--quality", quality,
    ]
    if render_path in ("editor", "treatment"):
        cmd += ["--path", render_path]
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

    # DeepSeek path (PIPELINE-HARDENING-SPEC §3.4): SoM overlay + short natural-
    # language prompts — complex JSON/score-based prompts return EMPTY responses
    # from DeepSeek VLM. The vlm_qa pipeline handles the WHERE/WHAT split.
    if cfg["provider"] == "deepseek":
        try:
            from vlm_qa import _extract_frame, _som_overlay, _region_block_diff
            import base64 as _b64
            import io as _io

            # extract 3 keyframe samples + describe content via SoM-style prompt
            sample_times = [1.0, 0.5, 0.8]  # fractions of duration
            dur = _duration_of(full)
            descriptions = []
            for frac in sample_times:
                t = dur * frac
                frame = _extract_frame(full, t)
                if frame is None:
                    continue
                buf = _io.BytesIO()
                frame.save(buf, format="JPEG", quality=80)
                frame_b64 = _b64.b64encode(buf.getvalue()).decode()
                content = [
                    {"type": "text", "text": f"Describe the visual elements in this frame from a video. What treatments/layouts, text content, character poses, and overall composition do you see? Be concise (3-5 sentences)."},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{frame_b64}"}},
                ]
                desc = _call_vlm(content, _VLM_SYSTEM + " Focus on what is VISIBLE, not scores.", timeout=120)
                if not desc.startswith("VLM API error"):
                    descriptions.append(f"[t={t:.1f}s] {desc}")
            if descriptions:
                return f"Visual critique ({aspect}) of {video_path} [VLM: {cfg['provider']}/{cfg['model']} — SoM keyframes]:\n\n" + "\n\n".join(descriptions)
        except Exception:
            pass  # fall through to generic keyframe path

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


def _treatment_from_knob_path(style_path: str) -> str | None:
    """'treatments.semantic-diagram.node.fontSize' -> 'semantic-diagram';
    'colors.amber' -> None (global knob). Pure — unit-tested."""
    parts = style_path.split(".")
    if len(parts) >= 2 and parts[0] == "treatments":
        return parts[1]
    return None


def _regenerate_editor_for_knob(style_path: str, slug: str = "isaacverse-final") -> str:
    """Chain update_style -> generate-editor (PIPELINE-HARDENING-SPEC §3.2-1a,
    closes GENERATOR-SPEC risk #1): a knob change must reach the DEFAULT
    (editor) render without a manual sync step. Scoped per affected beat when
    the knob belongs to one treatment; full sync for global knobs."""
    edit_doc_path = os.path.join(PROJECT_ROOT, "projects", slug, "05-edit-doc.json")
    if not os.path.exists(edit_doc_path):
        return "generator refresh skipped (no edit doc)"
    try:
        with open(edit_doc_path, encoding="utf-8") as f:
            edit_doc = json.load(f)
    except Exception as exc:
        return f"generator refresh skipped (edit doc unreadable: {exc})"
    gen = os.path.join(RENDERER_DIR, "scripts", "generate-editor.mjs")
    treatment_id = _treatment_from_knob_path(style_path)
    if treatment_id:
        beats = [b.get("id") for b in edit_doc.get("beats", [])
                 if (b.get("treatment") or {}).get("id") == treatment_id]
        if not beats:
            return f"generator refresh skipped (no beats use treatment '{treatment_id}')"
        parts = []
        for beat in beats:
            r = subprocess.run(["node", gen, "--project", slug, "--beat", str(beat)],
                               capture_output=True, text=True, encoding="utf-8",
                               errors="replace", cwd=RENDERER_DIR, timeout=180)
            parts.append(f"beat {beat}: {'ok' if r.returncode == 0 else 'FAILED ' + ((r.stderr or r.stdout) or '')[:200]}")
        return "generator refreshed (scoped): " + "; ".join(parts)
    r = subprocess.run(["node", gen, "--project", slug, "--mode", "sync"],
                       capture_output=True, text=True, encoding="utf-8",
                       errors="replace", cwd=RENDERER_DIR, timeout=300)
    if r.returncode != 0:
        return "generator refresh FAILED (full sync): " + ((r.stderr or r.stdout) or "")[:300]
    return "generator refreshed (full sync ok — unmodified clips pick up the new knob value)"


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
    # VERSION SNAPSHOT (PIPELINE-HARDENING-SPEC §3.5): every version is
    # snapshotted to libraries/04-visual/style-versions/vNNN.json so a
    # bad principle can be rolled back without git archaeology. Only
    # written if absent — immutable history.
    versions_dir = os.path.join(os.path.dirname(style_file), "style-versions")
    os.makedirs(versions_dir, exist_ok=True)
    snapshot_path = os.path.join(versions_dir, f"v{style['version']:03d}.json")
    if not os.path.exists(snapshot_path):
        import shutil as _sh2
        _sh2.copy2(style_file, snapshot_path)
    # Sync to Remotion shared dir AND public/ (styleLoader fetches at runtime
    # from public/, so the public copy is the one the render actually reads)
    import shutil
    for dst in [
        os.path.join(RENDERER_DIR, "shared", "isaacverse", "isaacverse-style.json"),
        os.path.join(RENDERER_DIR, "public", "isaacverse-style.json"),
    ]:
        shutil.copy2(style_file, dst)
    # CHAIN (spec §3.2-1a): bake the new knob into the EditorDoc so the
    # DEFAULT (editor) render reflects it — unmodified clips refresh, userEdited
    # clips are kept + flagged stale. Failures are reported, never swallowed:
    # a silent skip here is exactly the "sync thiếu" failure mode.
    chain = _regenerate_editor_for_knob(style_path)
    return (f"Style updated: {style_path}\n  old: {json.dumps(old)}\n  new: {json.dumps(val)}\n"
            f"  version: {style['version']}\n  {chain}\n"
            f"  File: /workspace/{STYLE_REL}")


@tool
def style_rollback(target_version: int, reason: str = "") -> str:
    """Rollback the style store to a previous version (PIPELINE-HARDENING-SPEC §3.5).

    Loads the snapshot from libraries/04-visual/style-versions/vNNN.json,
    writes it back with a NEW version number (never overwrites history —
    the audit trail is preserved via snapshot timestamps), syncs to remotion,
    and chains generate-editor sync to refresh the editor doc.

    The agent must have a user decision (request_keep rejected a principle)
    before calling this — rollbacks without a reason are a protocol violation.

    Args:
        target_version: The version number to roll back to (from the snapshot dir).
        reason: Why the rollback — appended to the style JSON + knowledge-base.
    """
    style_file = os.path.join(PROJECT_ROOT, STYLE_REL)
    versions_dir = os.path.join(os.path.dirname(style_file), "style-versions")
    snapshot = os.path.join(versions_dir, f"v{int(target_version):03d}.json")
    if not os.path.exists(snapshot):
        return f"ROLLBACK FAILED: no snapshot for version {int(target_version)} at {snapshot}"
    try:
        with open(snapshot, encoding="utf-8") as f:
            old_style = json.load(f)
        with open(style_file, encoding="utf-8") as f:
            current = json.load(f)
    except Exception as exc:
        return f"ROLLBACK FAILED: read error — {exc}"
    new_version = current.get("version", 0) + 1
    old_style["version"] = new_version
    old_style["rollbackFrom"] = int(target_version)
    old_style["rollbackReason"] = reason or "no reason given"
    old_style["rollbackAt"] = __import__("datetime").datetime.now().isoformat()
    # snapshot the CURRENT state before overwriting (immutable trail)
    current_snapshot = os.path.join(versions_dir, f"v{current['version']:03d}.json")
    if not os.path.exists(current_snapshot):
        import shutil as _sh3
        _sh3.copy2(style_file, current_snapshot)
    with open(style_file, "w", encoding="utf-8") as f:
        json.dump(old_style, f, indent=2, ensure_ascii=False)
    import shutil
    for dst in [
        os.path.join(RENDERER_DIR, "shared", "isaacverse", "isaacverse-style.json"),
        os.path.join(RENDERER_DIR, "public", "isaacverse-style.json"),
    ]:
        shutil.copy2(style_file, dst)
    chain = _regenerate_editor_for_knob("colors.amber")
    return (f"Style rolled back: v{int(target_version)} → v{new_version}\n"
            f"  (content from snapshot restored; new version for audit trail)\n"
            f"  Reason: {reason or 'no reason given'}\n  {chain}\n"
            f"  File: /workspace/{STYLE_REL}")


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
    # copy the freshness sidecar too — the KEEP gate reads it from the copy
    side_src = src + ".render-report.json"
    if os.path.exists(side_src):
        shutil.copy2(side_src, dst + ".render-report.json")
    rel = os.path.relpath(dst, PROJECT_ROOT).replace("\\", "/")
    return f"Copied to /workspace/{rel} ({os.path.getsize(dst) // 1024} KB)"


def _render_freshness(video_path: str) -> tuple[bool, str]:
    """KEEP-gate freshness check (PIPELINE-HARDENING-SPEC §3.3).

    Reads the render sidecar (`<video>.render-report.json`, written by
    render-window.mjs) and compares renderedFromRevision + editorDocHash
    against the LIVE editor doc. A human must never approve a diff rendered
    from a stale doc. Returns (ok, message). Missing sidecar (older renders)
    is allowed but reported as unverifiable — refusal only on PROVEN mismatch.
    """
    vid = _resolve_workspace_path(video_path)
    sidecar = vid + ".render-report.json"
    if not os.path.exists(sidecar):
        return True, "freshness unverifiable (no render report sidecar — older render)"
    try:
        with open(sidecar, encoding="utf-8") as f:
            report = json.load(f)
    except Exception as exc:  # unreadable sidecar = cannot trust the render
        return False, f"render report unreadable: {exc}"
    slug = report.get("project")
    rendered_rev = report.get("renderedFromRevision")
    if not slug or not isinstance(rendered_rev, int):
        return True, "render report lacks revision info — freshness not enforced"
    live = os.path.join(PROJECT_ROOT, "projects", str(slug), "editor", "current.json")
    if not os.path.exists(live):
        return True, f"no live editor doc for '{slug}' — freshness not enforced"
    try:
        with open(live, encoding="utf-8") as f:
            live_doc = json.load(f)
    except Exception as exc:
        return False, f"live editor doc unreadable ({slug}): {exc}"
    live_rev = (live_doc.get("revision") or {}).get("revision")
    if live_rev != rendered_rev:
        return False, (
            f"RENDER STALE: '{os.path.basename(vid)}' was rendered from editor revision "
            f"r{rendered_rev} but the live doc is r{live_rev} — re-render BEFORE asking for a keep decision"
        )
    rendered_hash = report.get("editorDocHash")
    if rendered_hash:
        import hashlib
        with open(live, "rb") as f:
            live_hash = hashlib.sha256(f.read()).hexdigest()[:16]
        if live_hash != rendered_hash:
            return False, (
                "RENDER STALE: editor doc content changed without a revision bump "
                "(manual file edit?) — re-render before keep"
            )
    return True, f"fresh (editor r{rendered_rev})"


@tool
def editor_op(op: str, clip_id: str = "", time_sec: float = 0.0, edge: str = "",
              start_sec: float = 0.0, from_sec: float = 0.0, delta_sec: float = 0.0,
              changes: str = "", project_slug: str = "isaacverse-final") -> str:
    """Edit a clip on the editor timeline (protocol v5 clip editing, spec E3).

    Bridges ONE pure editorOperation onto projects/<slug>/editor/current.json —
    same functions the Composer UI uses, revision bumped exactly once. After a
    clip edit, render with qa_gate/--path editor to verify, then request_keep.

    Ops:
      list                        — list all clips (id, kind, range, userEdited)
      split  clip_id time_sec     — split a clip at a time
      trim   clip_id edge time_sec — trim start/end edge to a time
      move   clip_id start_sec    — move a clip in time (collision-safe)
      metadata clip_id changes    — set clip metadata (JSON string, e.g. '{"fontSize":72}')
      ripple from_sec delta_sec   — shift all clips from a time
      delete clip_id              — delete (ledgered: never resurrected by the generator)

    Args:
        op: One of list|split|trim|move|metadata|ripple|delete.
        clip_id: Target clip id (from list).
        time_sec: Time for split/trim.
        edge: 'start'|'end' for trim.
        start_sec: New start for move.
        from_sec/delta_sec: Ripple parameters.
        changes: JSON string of metadata changes.
        project_slug: Project folder name.
    """
    cmd = ["node", os.path.join(RENDERER_DIR, "scripts", "editor-ops.mjs"),
           "--project", project_slug, "--op", op]
    if clip_id:
        cmd += ["--clipId", clip_id]
    if time_sec:
        cmd += ["--timeSec", str(time_sec)]
    if edge:
        cmd += ["--edge", edge]
    if start_sec:
        cmd += ["--startSec", str(start_sec)]
    if from_sec:
        cmd += ["--fromSec", str(from_sec)]
    if delta_sec:
        cmd += ["--deltaSec", str(delta_sec)]
    if changes:
        cmd += ["--changes", changes]
    def run_bridge():
        return subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8",
                              errors="replace", cwd=RENDERER_DIR, timeout=120)

    result = run_bridge()
    # CONFLICT RETRY (PIPELINE-HARDENING-SPEC §3.6): a human edit landed while
    # the op was running → the bridge aborted without writing. Ops are
    # idempotent per clipId, so one re-read + retry is safe.
    if result.returncode != 0 and '"conflict": true' in (result.stderr or ""):
        result = run_bridge()
        if result.returncode != 0 and '"conflict": true' in (result.stderr or ""):
            return ("EDITOR OP CONFLICT: the editor doc keeps moving (human editing?). "
                    "Wait for the human save to settle, then retry.")
    out = (result.stdout or "").strip()
    err = (result.stderr or "").strip()
    if result.returncode != 0:
        return f"EDITOR OP FAILED: {err or out or 'unknown error'}"
    return f"EDITOR OP OK:\n{out}"


@tool
def draft_story(project_slug: str, idea: str, story: str, target_duration_sec: int = 0, beat_count: int = 0) -> str:
    """Draft the STORY for a video idea (Creation Flow step 1 — CONTENT-STUDIO-SPEC §5).

    YOU compose the story (you are the creative here — use your storytelling
    craft); this tool writes it to the studio's story review checkpoint
    through the SAME endpoint the user edits with. The human reviews/edits
    the story in the Content Studio BEFORE you write the script.

    Args:
        project_slug: Project folder name.
        idea: The user's original idea, VERBATIM from their ask (recorded as
              the journey's origin + later becomes the script's instruction).
        story: JSON string you composed: {idea, surfaceProblem,
              deeperProblem, thumbnailPromise, commonGoal: {viewer, creator}}
              — one or two sentences per field, concrete, no filler.
        target_duration_sec: Target video duration in seconds (from the
              user's shape selection — hook ~30s, explainer ~150s, etc.).
              Your story should be scoped for THIS duration.
        beat_count: Number of beats the script should have (from the user's
              shape selection). The story's hero journey should have exactly
              this many narrative beats.
    """
    try:
        story_obj = json.loads(story)
    except json.JSONDecodeError as exc:
        return f"DRAFT STORY FAILED: `story` must be valid JSON — {exc}"
    required = ["idea", "surfaceProblem", "deeperProblem", "thumbnailPromise"]
    missing = [key for key in required if not str(story_obj.get(key, "")).strip()]
    if missing:
        return f"DRAFT STORY FAILED: story.{', story.'.join(missing)} are required and non-empty"
    payload = json.dumps({"projectId": project_slug, "status": "pending", "originalIdea": idea, "story": story_obj}).encode()
    req = urllib.request.Request(
        "http://localhost:5174/api/project/story-draft",
        data=payload, method="POST",
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = json.loads(resp.read().decode("utf-8"))
    except Exception as exc:  # noqa: BLE001 — surface, don't crash the loop
        return f"DRAFT STORY FAILED: {exc} (is the composer server up on :5174?)"
    if not body.get("ok"):
        return f"DRAFT STORY FAILED: {body.get('error', 'unknown')}"
    return ("DRAFT STORY OK — status PENDING, the story card is now in the Content Studio.\n"
            f"Original idea recorded: {idea}\n"
            + (f"Target shape: ~{target_duration_sec}s, {beat_count} beats — scope the story for this duration.\n" if target_duration_sec else "")
            + "STOP and tell the human to review the story (edit fields inline, then Duyệt story). "
            "After approval, write the script with write_edit_doc using the approved story as "
            "the `story` input and the original idea as `instruction`. "
            + (f"The script MUST have exactly {beat_count} beats." if beat_count else ""))


@tool
def check_story_review(project_slug: str) -> str:
    """Read the story review verdict from the Content Studio (Creation Flow).

    Returns: none (no draft yet), pending (human has not decided — wait,
    do NOT write the script), approved (proceed: write_edit_doc with the
    approved story + the original idea as instruction), or
    changes_requested (revise the story per the note, then re-draft).

    Args:
        project_slug: Project folder name.
    """
    path = os.path.join(PROJECT_ROOT, "projects", project_slug, "qa", "story-draft.json")
    if not os.path.exists(path):
        return f"STORY: none — no story drafted yet for {project_slug}. Call draft_story first."
    try:
        with open(path, encoding="utf-8") as handle:
            draft = json.load(handle)
    except (OSError, json.JSONDecodeError) as exc:
        return f"STORY READ FAILED: {exc}"
    status = draft.get("status", "none")
    lines = [f"STORY: {status} (updated {draft.get('updatedAt', '?')})",
             f"  idea: {draft.get('idea', '')}"]
    note = draft.get("note") or ""
    if note:
        lines.append(f"  human note: {note}")
    if status == "pending":
        lines.append("  -> the human has not decided. Do NOT write the script yet.")
    elif status == "approved":
        lines.append("  -> approved. Write the script NOW: write_edit_doc with this story as `story` "
                     f"and '{draft.get('originalIdea', '')}' as `instruction`, then STOP for script review.")
    elif status == "changes_requested":
        lines.append("  -> revise the story exactly as the note says, call draft_story again.")
    return "\n".join(lines)


@tool
def write_edit_doc(project_slug: str, story: str, beats: str, instruction: str = "", overwrite_confirm: bool = False) -> str:
    """Write the edit-doc from YOUR beat plan (A1 — the produce flow's first mile).

    You (the agent) design the beats; this tool is the VALIDATED write-path.
    It builds 04-video-doc.json + 05-edit-doc.json through the project store's
    sanctioned saveSourceDocs (schema validation + atomic writes + public
    sync), computing startSec cumulatively from your durations.

    Args:
        project_slug: Project folder name (created if new).
        story: JSON string {idea, surfaceProblem, deeperProblem,
              thumbnailPromise, commonGoal: {viewer, creator}} — from the
              story doc (02-story/story.md) when one exists.
        beats: JSON string array, ONE object per beat, in play order:
              {transcript (EXACT spoken words), narrativeFunction,
               treatment: {id, params}, durationSec? (default 4 — the
               voice-first retime adjusts it), journeySlot?, id?}.
              Treatments available: chapter-card (params: title, subtitle,
              accent — the proven minimal), semantic-diagram (title, kicker,
              centerLabel, nodes, edges), process-timeline (title, steps,
              activeStep), candidate-comparison (title, criteria,
              selectedIndex, candidates), host-reflection-cinematic
              (subtitle, lightSide), cinematic-metaphor (subtitle, label,
              mode). Param shapes: remotion-composer/shared/isaacverse/
              EditVideo.tsx + the style store.
        instruction: THE PROMPT behind this script version — the user's ask
              or your creative intent, in one or two sentences ("beat 2
              punchy hơn — câu ngắn, meta clock/breath"). The Content Studio
              shows it next to the script with a re-run affordance: the
              script and its generating recipe travel together. Always
              include it when you author or re-plan a script.
        overwrite_confirm: MUST be true to replace an existing edit doc
              (a backup is kept). Without it the tool refuses.

    Rule: transcript = exact spoken words (tags/CAPS allowed later in the
    studio beat editor — the words themselves never change). Duration per
    beat should match the target: ~3-8s for hooks, ~8-20s for explainers,
    ~20-60s for deep dives. ALWAYS honor the beat_count from the user's
    shape selection if one was given in the conversation.
    """
    cmd = ["node", os.path.join(RENDERER_DIR, "scripts", "write-edit-doc.mjs"),
           "--project", project_slug]
    payload_files = []
    try:
        if instruction.strip():
            # free text via file — Windows arg quoting mangles long strings
            handle = tempfile.NamedTemporaryFile("w", suffix="-instruction.txt",
                                                 delete=False, encoding="utf-8")
            handle.write(instruction.strip())
            handle.close()
            payload_files.append(handle.name)
            cmd += ["--instruction-file", handle.name]
        for name, payload in (("story", story), ("beats", beats)):
            handle = tempfile.NamedTemporaryFile("w", suffix=f"-{name}.json",
                                                 delete=False, encoding="utf-8")
            handle.write(payload)
            handle.close()
            payload_files.append(handle.name)
            cmd += [f"--{name}", handle.name]
        if overwrite_confirm:
            cmd.append("--overwrite-confirm")
        result = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8",
                                errors="replace", cwd=RENDERER_DIR, timeout=180)
    finally:
        for file in payload_files:
            try: os.unlink(file)
            except OSError: pass
    out = (result.stdout or "").strip()
    err = (result.stderr or "").strip()
    span = ""
    for text in (out, err):
        start = text.find("{")
        end = text.rfind("}")
        if start >= 0 and end > start:
            span = text[start:end + 1]
            break
    if result.returncode != 0 and not span:
        return f"WRITE EDIT DOC FAILED: {err or out or 'unknown error'}"
    try:
        payload = json.loads(span)
    except json.JSONDecodeError:
        return f"WRITE EDIT DOC FAILED (unparseable): {span[:400]}"
    if not payload.get("ok"):
        lines = ["WRITE EDIT DOC REFUSED:"]
        for blocker in payload.get("blocking", [])[:10]:
            lines.append(f"  - {blocker}")
        for warning in payload.get("warnings", [])[:6]:
            lines.append(f"  WARN {warning}")
        lines.append("Fix the beats and call again.")
        return "\n".join(lines)
    lines = [f"WRITE EDIT DOC OK — {payload.get('beats')} beat(s), {payload.get('durationSec')}s planned",
             f"files: {', '.join(payload.get('files', []))}"]
    if payload.get("backup"):
        lines.append(f"backup of previous doc: {payload['backup']}")
    lines.append("NEXT: scaffold-voice-plan --regen (TTS + voice-first retime) -> generate-timeline -> render. Those are separate tools/steps — voice first, then the timeline.")
    return "\n".join(lines)


@tool
def generate_timeline(project_slug: str, mode: str = "sync") -> str:
    """Generate (or regenerate) the editor timeline from the edit-doc (M3 produce step).

    Runs the SAME script the Composer Timeline-QA panel runs:
    pre-flight validate (schema + contiguity + cues + params + asset
    existence) -> generate-editor (ledger keeps user edits in sync mode) ->
    post-check voice clips -> report at projects/<slug>/qa/timeline-report.json.

    Blocking issues (timeline gaps/overlaps, missing assets) stop generation
    and are returned; schema-discipline issues (e.g. empty transcript) are
    warnings — the timeline still generates.

    Args:
        project_slug: Project folder name.
        mode: 'sync' (merge, default — keeps user edits) or 'cold' (fresh).
    """
    if mode not in ("sync", "cold"):
        return "GENERATE TIMELINE FAILED: mode must be 'sync' or 'cold'"
    cmd = ["node", os.path.join(RENDERER_DIR, "scripts", "generate-timeline.mjs"),
           "--project", project_slug, "--mode", mode]
    result = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8",
                            errors="replace", cwd=RENDERER_DIR, timeout=300)
    out = (result.stdout or "").strip()
    err = (result.stderr or "").strip()
    # the script prints its result JSON on stdout (exit 0) or stderr (exit 1,
    # blocked) — surface whichever carries the JSON
    span = ""
    for text in (out, err):
        start = text.find("{")
        end = text.rfind("}")
        if start >= 0 and end > start:
            span = text[start:end + 1]
            break
    if result.returncode != 0 and not span:
        return f"GENERATE TIMELINE FAILED: {err or out or 'unknown error'}"
    if not span:
        return "GENERATE TIMELINE FAILED: no result JSON from the script"
    try:
        payload = json.loads(span)
    except json.JSONDecodeError:
        return f"GENERATE TIMELINE FAILED (unparseable): {span[:400]}"
    if payload.get("blocking"):
        return ("GENERATE TIMELINE BLOCKED — fix these first:\n"
                + "\n".join(f"- {b}" for b in payload["blocking"][:12])
                + f"\nFull report: {payload.get('report')}")
    # the console summary carries ids only — the report file has labels +
    # details. Read it when present (the UI panel reads the same file).
    report_path = os.path.join(PROJECT_ROOT, "projects", project_slug, "qa",
                               "timeline-report.json")
    checks = payload.get("checks", [])
    try:
        with open(report_path, encoding="utf-8") as handle:
            report = json.load(handle)
        checks = report.get("checks", checks)
    except OSError:
        pass
    lines = [f"GENERATE TIMELINE {'OK' if payload.get('ok') else 'GENERATED WITH WARNINGS'}",
             f"style v{payload.get('styleVersion')} · mode {payload.get('mode')}"]
    for check in checks:
        label = check.get("label") or check.get("id") or "?"
        detail = ("" if check.get("pass") else f" — {str(check.get('detail', [])[:3])[:200]}")
        lines.append(f"  {'PASS' if check.get('pass') else 'FAIL'}  {label}{detail}")
    for warning in payload.get("warnings", [])[:8]:
        lines.append(f"  WARN  {warning}")
    lines.append(f"report: {payload.get('report')}")
    lines.append("next: render a window (render_window) or read the report for the fix cycle")
    return "\n".join(lines)


@tool
def request_approval(project_slug: str, summary: str) -> str:
    """Hand a finished draft to the human for review (A3 gate — you STOP here).

    Call this when a produce/improve cycle ends and the draft needs a human
    taste decision. It sets the project approval to PENDING with your summary;
    the human decides on the project page (Keep / Redo + note). Read the
    decision next cycle with check_approval — do NOT keep iterating past this
    gate: the human's verdict is the loop's steering signal.

    Args:
        project_slug: Project folder name.
        summary: One or two sentences — what changed this cycle and what you
              want the human to judge (e.g. "beat-02 re-voiced with assertive
              direction; judge the new pacing").
    """
    if not summary.strip():
        return "REQUEST APPROVAL FAILED: summary is required (what should the human judge?)"
    payload = json.dumps({"projectId": project_slug, "status": "pending", "summary": summary.strip()}).encode()
    req = urllib.request.Request(
        "http://localhost:5174/api/project/approval",
        data=payload, method="POST",
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = json.loads(resp.read().decode("utf-8"))
    except Exception as exc:  # noqa: BLE001 — surface, don't crash the loop
        return f"REQUEST APPROVAL FAILED: {exc} (is the composer server up on :5174?)"
    if not body.get("ok"):
        return f"REQUEST APPROVAL FAILED: {body.get('error', 'unknown')}"
    return (f"APPROVAL REQUESTED for {project_slug} — status PENDING.\n"
            f"Summary shown to the human: {summary.strip()}\n"
            "STOP this cycle now. Next cycle, call check_approval first: "
            "approved = build on it; changes_requested = fix exactly what the note says.")


@tool
def check_approval(project_slug: str) -> str:
    """Read the human's verdict from the project page approval gate (A3 loop).

    Returns the current approval status: none (never requested), pending
    (human has not decided yet — do nothing, wait), changes_requested (fix
    exactly what the note says, then re-render + re-request), or approved
    (the human kept it — build on this state).

    Args:
        project_slug: Project folder name.
    """
    approval_path = os.path.join(PROJECT_ROOT, "projects", project_slug, "qa", "approval.json")
    if not os.path.exists(approval_path):
        return f"APPROVAL: none — no gate requested yet for {project_slug}. Call request_approval when a draft is ready."
    try:
        with open(approval_path, encoding="utf-8") as handle:
            approval = json.load(handle)
    except (OSError, json.JSONDecodeError) as exc:
        return f"APPROVAL READ FAILED: {exc}"
    status = approval.get("status", "none")
    note = approval.get("note") or ""
    summary = approval.get("summary") or ""
    updated = approval.get("updatedAt", "?")
    lines = [f"APPROVAL: {status} (updated {updated})"]
    if summary:
        lines.append(f"  what was asked: {summary}")
    if note:
        lines.append(f"  human note: {note}")
    if status == "pending":
        lines.append("  -> the human has not decided. Do NOT iterate; wait.")
    elif status == "changes_requested":
        lines.append("  -> fix EXACTLY what the note says, re-render, then request_approval again.")
    elif status == "approved":
        lines.append("  -> the human kept this draft. Build on it (next improvement cycle or publish prep).")
    return "\n".join(lines)


@tool
def qa_gate(project_slug: str, start_sec: float, end_sec: float, video_before: str, render_path: str = "editor") -> str:
    """QA gate for treatment-code edits (protocol v5 step 5) — build+render+diff in one call.

    Runs the FULL pipeline: remotion bundle build (catches TSX syntax/import
    errors), a draft render of the window, and a deterministic pixel-diff
    against the before-render. Call this after EVERY edit_file on treatment
    code. On FAIL: fix or revert — never leave the tree broken.

    Prerequisite: render the BEFORE with render_window and copy_render it
    aside BEFORE editing, then pass that copy here as video_before.

    Args:
        project_slug: Project folder name (e.g. 'isaacverse-final').
        start_sec: Window start (must match the before-render's window).
        end_sec: Window end (must match the before-render's window).
        video_before: Path to the before-render copy (with /workspace/ prefix or relative).
        render_path: 'treatment' (default) or 'editor' — must MATCH the before-render's path.
    """
    fb = _resolve_workspace_path(video_before)
    if not os.path.exists(fb):
        return (f"QA GATE ERROR: video_before not found: {fb}\n"
                "Render the baseline FIRST (render_window), copy it aside (copy_render), "
                "then edit, then call qa_gate.")
    # 1. build + render (render_window already retries transient chrome locks;
    #    a TSX syntax error makes the build fail and returns 'Render failed: ...')
    render_result = render_window.invoke({
        "project_slug": project_slug, "start_sec": start_sec,
        "end_sec": end_sec, "quality": "draft", "render_path": render_path,
    })
    if render_result.startswith("Render failed"):
        return ("QA GATE: BUILD/RENDER FAIL — your edit broke the build or the render.\n"
                f"{render_result}\nNEXT: fix the error or revert the edit. Do NOT proceed.")
    # extract the deterministic output path from the render result
    out_path = render_result.strip().splitlines()[0] if render_result.startswith("/workspace/") else ""
    if not out_path:
        return (f"QA GATE ERROR: could not resolve render output path.\n{render_result[:300]}")
    # 2. pixel-diff vs baseline
    diff_result = compare_renders.invoke({"video_a": video_before, "video_b": out_path})
    header = f"QA GATE for {project_slug} {start_sec}-{end_sec}s\nrender: {out_path}\n\n"
    return header + diff_result


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
                 user_directed: bool = False, feedback_context: str = "",
                 motivation: str = "") -> str:
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
        motivation: WHY this knob/value was chosen — cite the source, e.g.
            'taste-standard#accent-area' or 'knowledge-base pending experiment'.
            The user's keep/reject is attributed back to that source (principle
            tallies), closing the learning loop.
    """
    from langgraph.types import interrupt
    import datetime
    # FRESHNESS GATE (PIPELINE-HARDENING-SPEC §3.3): the human approves a RENDER
    # DIFF — if the render is stale, they would be approving fiction. Refuse
    # loudly and make the agent re-render before asking again.
    fresh_ok, fresh_msg = _render_freshness(video_after)
    if not fresh_ok:
        return ("KEEP GATE REFUSED — " + fresh_msg + "\n"
                "Never ask the human to approve a diff rendered from a stale doc. "
                "Fix: re-render the window (render_window with the same args), then call "
                "request_keep again with the fresh output.")
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
        "motivation": motivation,
        "render_freshness": fresh_msg,
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
        "motivation": motivation,
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

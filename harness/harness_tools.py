"""Domain tools — render, critique, think, update_style.

render_window: spawns Remotion (Node.js subprocess)
visual_critique: calls GLM-4V-Flash API (VLM) with frame pairs
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
    if os.path.exists(src_style):
        shutil.copy2(src_style, dst_style)
    result = subprocess.run(cmd, capture_output=True, text=True, cwd=RENDERER_DIR, timeout=300)
    if result.returncode != 0:
        return f"Render failed:\n{result.stderr[-500:]}"
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


def _extract_keyframes(video_path: str, max_frames: int = 4) -> list[str]:
    """Extract keyframes from video as base64 PNG strings.
    
    Extracts frame PAIRS (t, t+0.08s) so VLM can detect motion via frame differences.
    Returns pairs as adjacent frames: [frame_t1, frame_t1+0.08, frame_t2, frame_t2+0.08, ...]
    """
    full = video_path
    if full.startswith("/workspace/"):
        full = full[len("/workspace/"):]
    if not os.path.isabs(full):
        full = os.path.join(PROJECT_ROOT, full.lstrip("/"))
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
    # Extract frame pairs: for each sample point, get frame at t and t+0.08s
    # This lets the VLM see motion by comparing adjacent frames
    pair_offset = 0.08  # 80ms between pair frames (~2-3 frames at 30fps)
    num_pairs = max_frames // 2  # 4 frames = 2 pairs
    interval = duration / (num_pairs + 1)
    import tempfile, shutil
    tmpdir = tempfile.mkdtemp()
    for i in range(num_pairs):
        t = interval * (i + 1)
        for j, time_offset in enumerate([0, pair_offset]):
            frame_path = os.path.join(tmpdir, f"frame_{i:02d}_{j}.png")
            actual_t = min(t + time_offset, duration - 0.01)
            subprocess.run(
                ["ffmpeg", "-y", "-ss", str(actual_t), "-i", str(full),
                 "-frames:v", "1", "-q:v", "2", "-vf", "scale=640:-1", frame_path],
                capture_output=True, timeout=30)
            if os.path.exists(frame_path):
                with open(frame_path, "rb") as f:
                    b64 = base64.b64encode(f.read()).decode()
                    frames.append(b64)
    shutil.rmtree(tmpdir, ignore_errors=True)
    return frames


def _call_vlm(frames: list[str], prompt: str) -> str:
    """Call VLM (GLM-4V-Flash via Zhipu API) with image frames."""
    import urllib.request, urllib.error
    api_key = os.environ.get("ZHIPU_API_KEY", "")
    if not api_key:
        return "ERROR: ZHIPU_API_KEY not set."
    content = [{"type": "text", "text": prompt}]
    for b64 in frames:
        content.append({"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}})
    payload = json.dumps({
        "model": "glm-4v-flash",
        "messages": [
            {"role": "system", "content": "You are a professional video editor and art director. Analyze video frames and provide structured visual critique."},
            {"role": "user", "content": content},
        ],
        "max_tokens": 1000, "temperature": 0.3,
    }).encode()
    req = urllib.request.Request(
        "https://open.bigmodel.cn/api/paas/v4/chat/completions",
        data=payload, headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            return json.loads(resp.read().decode())["choices"][0]["message"]["content"]
    except urllib.error.HTTPError as e:
        return f"VLM API error {e.code}: {e.read().decode()[:300]}"
    except Exception as e:
        return f"VLM API error (timeout 45s): {e}"


@tool
def visual_critique(video_path: str, aspect: str = "all") -> str:
    """Analyze a rendered video using VLM (GLM-4V-Flash).

    Extracts keyframes, sends to VLM, returns structured critique.
    Use this to evaluate composition, color, motion, text, pacing.

    Args:
        video_path: Path to .mp4 (with /workspace/ prefix or relative).
        aspect: 'all', 'composition', 'color', 'motion', 'text', 'pacing'.
    """
    full = video_path
    if full.startswith("/workspace/"):
        full = full[len("/workspace/"):]
    if not os.path.isabs(full):
        full = os.path.join(PROJECT_ROOT, full.lstrip("/"))
    if not os.path.exists(full):
        return f"Video not found: {full}"
    frames = _extract_keyframes(full, max_frames=4)
    if not frames:
        return f"Could not extract frames from: {full}"
    prompts = {
        "all": "Analyze these video frames. For each aspect, give a score (1-5) and 1-2 sentences:\n1. Composition\n2. Color\n3. Motion\n4. Text legibility\n5. Pacing\n\nEnd with 'TOP ISSUE:' and the single most impactful improvement.",
        "composition": "Analyze composition only. Score 1-5 with feedback.",
        "color": "Analyze color only. Score 1-5 with feedback.",
        "motion": "Analyze motion only. Score 1-5 with feedback.",
        "text": "Analyze text legibility only. Score 1-5 with feedback.",
        "pacing": "Analyze pacing only. Score 1-5 with feedback.",
    }
    prompt = prompts.get(aspect, prompts["all"])
    prompt += "\n\nContext: These are frames from an IsaacVerse-style story-driven video. Frames are sent in PAIRS (consecutive frames 80ms apart) — compare adjacent frames to detect MOTION and animation. If frames in a pair look identical, there is no motion at that point."
    critique = _call_vlm(frames, prompt)
    return f"Visual critique ({aspect}) of {video_path}:\n\n{critique}"


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
    # Sync to Remotion shared dir
    import shutil
    dst = os.path.join(RENDERER_DIR, "shared", "isaacverse", "isaacverse-style.json")
    shutil.copy2(style_file, dst)
    return (f"Style updated: {style_path}\n  old: {json.dumps(old)}\n  new: {json.dumps(val)}\n"
            f"  version: {style['version']}\n  File: /workspace/{STYLE_REL}")

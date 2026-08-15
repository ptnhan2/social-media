"""Visual critique tool — uses VLM (GPT-4o via OpenRouter) to judge rendered video frames.

DeepSeek V4 is text-only, so this tool acts as the agent's "eyes":
1. Extract keyframes from rendered video (ffmpeg)
2. Send frames to VLM (GPT-4o via OpenRouter)
3. Return structured critique (composition, color, motion, text, pacing)
"""

from __future__ import annotations

import base64
import json
import os
import subprocess
import sys

from langchain.tools import tool

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _extract_keyframes(video_path: str, max_frames: int = 4) -> list[str]:
    """Extract keyframes from video as base64-encoded PNG strings."""
    full = video_path
    if not os.path.isabs(full):
        full = os.path.join(PROJECT_ROOT, video_path.lstrip("/"))

    if not os.path.exists(full):
        return []

    # Get duration
    probe = subprocess.run(
        ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", str(full)],
        capture_output=True, text=True, timeout=30)
    duration = 10.0
    try:
        info = json.loads(probe.stdout)
        duration = float(info.get("format", {}).get("duration", 10))
    except Exception:
        pass

    # Extract frames as base64
    frames = []
    interval = duration / (max_frames + 1)
    import tempfile
    tmpdir = tempfile.mkdtemp()

    for i in range(max_frames):
        t = interval * (i + 1)
        frame_path = os.path.join(tmpdir, f"frame_{i:02d}.png")
        subprocess.run(
            ["ffmpeg", "-y", "-ss", str(t), "-i", str(full),
             "-frames:v", "1", "-q:v", "2", "-vf", "scale=640:-1", frame_path],
            capture_output=True, timeout=30)
        if os.path.exists(frame_path):
            with open(frame_path, "rb") as f:
                b64 = base64.b64encode(f.read()).decode()
                frames.append(f"data:image/png;base64,{b64}")

    # Cleanup
    import shutil
    shutil.rmtree(tmpdir, ignore_errors=True)
    return frames


def _call_vlm_openrouter(frames: list[str], prompt: str) -> str:
    """Call GPT-4o via OpenRouter API with image frames."""
    import urllib.request

    api_key = os.environ.get("OPENROUTER_API_KEY", "")
    if not api_key:
        return "ERROR: OPENROUTER_API_KEY not set. Set it in .env to enable visual critique."

    # Build message with images
    content = [{"type": "text", "text": prompt}]
    for i, frame in enumerate(frames):
        content.append({
            "type": "image_url",
            "image_url": {"url": frame}
        })

    payload = json.dumps({
        "model": "openai/gpt-4o",
        "messages": [
            {"role": "system", "content": "You are a professional video editor and art director. Analyze video frames and provide structured visual critique. Be specific, concise, and actionable."},
            {"role": "user", "content": content}
        ],
        "max_tokens": 1000,
        "temperature": 0.3,
    }).encode()

    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            result = json.loads(resp.read().decode())
            return result["choices"][0]["message"]["content"]
    except Exception as e:
        return f"VLM API error: {e}"


@tool
def visual_critique(video_path: str, aspect: str = "all") -> str:
    """Analyze a rendered video using a VLM (GPT-4o via OpenRouter).

    Extracts keyframes from the video, sends them to the VLM, and returns
    a structured critique covering composition, color, motion, text legibility,
    and pacing. Use this AFTER rendering to evaluate visual quality.

    Args:
        video_path: Path to rendered .mp4 (under /workspace/ or absolute).
        aspect: What to focus on: 'all', 'composition', 'color', 'motion', 'text', 'pacing'.

    Returns:
        Structured text critique from the VLM.
    """
    # Resolve path
    full = video_path
    if not os.path.isabs(full):
        full = os.path.join(PROJECT_ROOT, video_path.lstrip("/"))

    if not os.path.exists(full):
        return f"Video not found: {full}"

    # Extract keyframes
    frames = _extract_keyframes(full, max_frames=4)
    if not frames:
        return f"Could not extract frames from: {full}"

    # Build critique prompt
    aspect_prompts = {
        "all": "Analyze these video frames holistically. For each aspect below, give a score (1-5) and 1-2 sentences of specific feedback:\n1. Composition (layout, focal point, balance)\n2. Color (harmony, contrast, temperature)\n3. Motion (smoothness, purpose, energy)\n4. Text legibility (readability, hierarchy, occlusion)\n5. Pacing (rhythm, breathing room, flow)\n\nEnd with 'TOP ISSUE:' and the single most impactful improvement.",
        "composition": "Analyze composition only: layout, focal point, balance, rule of thirds, negative space. Score 1-5 with specific feedback.",
        "color": "Analyze color only: harmony, contrast, temperature, saturation. Score 1-5 with specific feedback.",
        "motion": "Analyze motion only: smoothness, purpose, energy, easing. Score 1-5 with specific feedback.",
        "text": "Analyze text legibility only: readability, hierarchy, occlusion, font choice. Score 1-5 with specific feedback.",
        "pacing": "Analyze pacing only: rhythm, breathing room, flow, cut timing. Score 1-5 with specific feedback.",
    }

    prompt = aspect_prompts.get(aspect, aspect_prompts["all"])
    prompt += f"\n\nContext: These are frames from an IsaacVerse-style story-driven video. The style should feel cinematic, disciplined, and narrative-purposeful."

    # Call VLM
    critique = _call_vlm_openrouter(frames, prompt)
    return f"Visual critique ({aspect}) of {video_path}:\n\n{critique}"

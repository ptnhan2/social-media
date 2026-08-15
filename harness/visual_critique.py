"""Visual critique tool — uses VLM to judge rendered video frames.

DeepSeek V4 is text-only, so this tool acts as the agent's "eyes":
1. Extract keyframes from rendered video (ffmpeg)
2. Send frames to a VLM (Gemini primary, OpenAI fallback, OpenRouter last resort)
3. Return structured critique (composition, color, motion, text, pacing)

VLM backend selection (first available key wins):
  - ZHIPU_API_KEY    → GLM-4V-Flash (free, fast, vision-capable)
  - GOOGLE_API_KEY   → Gemini 2.0 Flash (fast, free tier, excellent vision)
  - OPENAI_API_KEY   → GPT-4o mini (direct, no OpenRouter middleman)
  - OPENROUTER_API_KEY → GPT-4o via OpenRouter
"""

from __future__ import annotations

import base64
import json
import os
import subprocess
import sys

from langchain.tools import tool

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

VLM_SYSTEM = (
    "You are a professional video editor and art director. "
    "Analyze video frames and provide structured visual critique. "
    "Be specific, concise, and actionable."
)


def _extract_keyframes(video_path: str, max_frames: int = 4) -> list[str]:
    """Extract keyframes from video as base64-encoded PNG strings (raw base64, no data URI prefix)."""
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

    # Extract frames as raw base64
    frames: list[str] = []
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
                frames.append(b64)

    import shutil
    shutil.rmtree(tmpdir, ignore_errors=True)
    return frames


def _call_zhipu(frames: list[str], prompt: str) -> str:
    """Call GLM-4V-Flash via Zhipu BigModel API v4 (OpenAI-compatible)."""
    import urllib.request
    import urllib.error

    api_key = os.environ.get("ZHIPU_API_KEY", "")
    if not api_key:
        return ""

    content: list[dict] = [{"type": "text", "text": prompt}]
    for b64 in frames:
        content.append({
            "type": "image_url",
            "image_url": {"url": f"data:image/png;base64,{b64}"},
        })

    payload = json.dumps({
        "model": "glm-4v-flash",
        "messages": [
            {"role": "system", "content": VLM_SYSTEM},
            {"role": "user", "content": content},
        ],
        "max_tokens": 1000,
        "temperature": 0.3,
    }).encode()

    req = urllib.request.Request(
        "https://open.bigmodel.cn/api/paas/v4/chat/completions",
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
    except urllib.error.HTTPError as e:
        return f"Zhipu API error {e.code}: {e.read().decode()[:300]}"
    except Exception as e:
        return f"Zhipu API error: {e}"


def _call_gemini(frames: list[str], prompt: str) -> str:
    """Call Gemini 2.0 Flash via Google AI API with image frames."""
    import urllib.request
    import urllib.error

    api_key = os.environ.get("GOOGLE_API_KEY", "")
    if not api_key:
        return ""

    # Build Gemini request (inline_data parts)
    parts: list[dict] = [{"text": f"{VLM_SYSTEM}\n\n{prompt}"}]
    for b64 in frames:
        parts.append({"inline_data": {"mime_type": "image/png", "data": b64}})

    payload = json.dumps({
        "contents": [{"role": "user", "parts": parts}],
        "generationConfig": {"temperature": 0.3, "maxOutputTokens": 1000},
    }).encode()

    url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
    req = urllib.request.Request(
        f"{url}?key={api_key}",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            result = json.loads(resp.read().decode())
            candidates = result.get("candidates", [])
            if candidates:
                content = candidates[0].get("content", {}).get("parts", [])
                return " ".join(p.get("text", "") for p in content)
            return f"Gemini returned no candidates: {json.dumps(result)[:200]}"
    except urllib.error.HTTPError as e:
        body = e.read().decode()[:300]
        return f"Gemini API error {e.code}: {body}"
    except Exception as e:
        return f"Gemini API error: {e}"


def _call_openai_direct(frames: list[str], prompt: str) -> str:
    """Call GPT-4o-mini directly via OpenAI API (no OpenRouter)."""
    import urllib.request
    import urllib.error

    api_key = os.environ.get("OPENAI_API_KEY", "")
    if not api_key:
        return ""

    content: list[dict] = [{"type": "text", "text": prompt}]
    for b64 in frames:
        content.append({
            "type": "image_url",
            "image_url": {"url": f"data:image/png;base64,{b64}"},
        })

    payload = json.dumps({
        "model": "gpt-4o-mini",
        "messages": [
            {"role": "system", "content": VLM_SYSTEM},
            {"role": "user", "content": content},
        ],
        "max_tokens": 1000,
        "temperature": 0.3,
    }).encode()

    req = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
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
    except urllib.error.HTTPError as e:
        return f"OpenAI API error {e.code}: {e.read().decode()[:300]}"
    except Exception as e:
        return f"OpenAI API error: {e}"


def _call_openrouter(frames: list[str], prompt: str) -> str:
    """Call GPT-4o via OpenRouter API (fallback)."""
    import urllib.request
    import urllib.error

    api_key = os.environ.get("OPENROUTER_API_KEY", "")
    if not api_key:
        return ""

    content: list[dict] = [{"type": "text", "text": prompt}]
    for b64 in frames:
        content.append({
            "type": "image_url",
            "image_url": {"url": f"data:image/png;base64,{b64}"},
        })

    payload = json.dumps({
        "model": "openai/gpt-4o",
        "messages": [
            {"role": "system", "content": VLM_SYSTEM},
            {"role": "user", "content": content},
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
    except urllib.error.HTTPError as e:
        return f"OpenRouter API error {e.code}: {e.read().decode()[:300]}"
    except Exception as e:
        return f"OpenRouter API error: {e}"


def _call_vlm(frames: list[str], prompt: str) -> tuple[str, str]:
    """Try VLM backends in priority order. Returns (backend_name, critique_text)."""
    # 1. Zhipu GLM-4V-Flash (free, fast)
    if os.environ.get("ZHIPU_API_KEY"):
        result = _call_zhipu(frames, prompt)
        if result and not result.startswith("Zhipu API error"):
            return "glm-4v-flash", result

    # 2. Gemini (Google API key)
    if os.environ.get("GOOGLE_API_KEY"):
        result = _call_gemini(frames, prompt)
        if result and not result.startswith("Gemini API error"):
            return "gemini-2.0-flash", result

    # 3. OpenAI direct
    if os.environ.get("OPENAI_API_KEY"):
        result = _call_openai_direct(frames, prompt)
        if result and not result.startswith("OpenAI API error"):
            return "gpt-4o-mini", result

    # 4. OpenRouter (fallback)
    if os.environ.get("OPENROUTER_API_KEY"):
        result = _call_openrouter(frames, prompt)
        if result and not result.startswith("OpenRouter API error"):
            return "openrouter/gpt-4o", result

    # All failed
    return "none", "ERROR: No VLM backend available. Set ZHIPU_API_KEY, GOOGLE_API_KEY, OPENAI_API_KEY, or OPENROUTER_API_KEY in .env."


@tool
def visual_critique(video_path: str, aspect: str = "all") -> str:
    """Analyze a rendered video using a VLM (Gemini/GPT-4o).

    Extracts keyframes from the video, sends them to the VLM, and returns
    a structured critique covering composition, color, motion, text legibility,
    and pacing. Use this AFTER rendering to evaluate visual quality.

    Args:
        video_path: Path to rendered .mp4 (under /workspace/ or absolute).
        aspect: What to focus on: 'all', 'composition', 'color', 'motion', 'text', 'pacing'.

    Returns:
        Structured text critique from the VLM.
    """
    # Resolve path — handle /workspace/ prefix (virtual path → real disk)
    full = video_path
    if full.startswith("/workspace/"):
        full = full[len("/workspace/"):]
    if not os.path.isabs(full):
        full = os.path.join(PROJECT_ROOT, full.lstrip("/"))

    if not os.path.exists(full):
        return f"Video not found: {full} (tried resolving {video_path})"

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
    prompt += "\n\nContext: These are frames from an IsaacVerse-style story-driven video. The style should feel cinematic, disciplined, and narrative-purposeful."

    # Call VLM (auto-selects backend)
    backend_name, critique = _call_vlm(frames, prompt)
    return f"Visual critique ({aspect}) via {backend_name} of {video_path}:\n\n{critique}"

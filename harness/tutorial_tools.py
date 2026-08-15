"""Tutorial ingestion tool — extract editing techniques from tutorial videos.

Given a tutorial video path, this tool:
1. Extracts keyframes (ffmpeg)
2. Transcribes audio (if whisper available)
3. Returns frame paths + transcript for the agent to analyze
4. Agent proposes style changes based on what it sees in the tutorial
"""

from __future__ import annotations

import json
import os
import subprocess
import time

from langchain.tools import tool

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


@tool
def ingest_tutorial(video_path: str, max_frames: int = 8) -> str:
    """Ingest a tutorial video for learning. Extracts keyframes + transcript.

    The agent can then read_file the extracted frames (multimodal) to see
    what editing techniques the tutorial demonstrates, and propose style changes.

    Args:
        video_path: Path to the tutorial video (under /workspace/ or absolute).
        max_frames: Max keyframes to extract (default 8).

    Returns:
        Paths to extracted frames + transcript (if available).
    """
    # Resolve path
    full = video_path
    if not os.path.isabs(full):
        full = os.path.join(PROJECT_ROOT, video_path.lstrip("/"))
    if not os.path.exists(full):
        return f"Video not found: {full}"

    # Create output dir
    out_dir = os.path.join(PROJECT_ROOT, "harness", "tutorial_frames")
    os.makedirs(out_dir, exist_ok=True)

    # Get video duration
    probe = subprocess.run(
        ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", str(full)],
        capture_output=True, text=True, timeout=30)
    duration = 60.0  # default
    try:
        info = json.loads(probe.stdout)
        duration = float(info.get("format", {}).get("duration", 60))
    except Exception:
        pass

    # Extract keyframes at evenly spaced intervals
    frames = []
    interval = duration / (max_frames + 1)
    for i in range(max_frames):
        t = interval * (i + 1)
        frame_path = os.path.join(out_dir, f"frame_{i:02d}_{int(t)}s.png")
        subprocess.run(
            ["ffmpeg", "-y", "-ss", str(t), "-i", str(full),
             "-frames:v", "1", "-q:v", "2", frame_path],
            capture_output=True, timeout=30)
        if os.path.exists(frame_path):
            rel = os.path.relpath(frame_path, PROJECT_ROOT).replace("\\", "/")
            frames.append(f"/workspace/{rel}")

    # Try transcription (if whisper/ffmpeg subtitle available)
    transcript = ""
    try:
        sub_result = subprocess.run(
            ["ffmpeg", "-y", "-i", str(full), "-vn", "-ac", "1", "-ar", "16000",
             "-f", "wav", os.path.join(out_dir, "tutorial_audio.wav")],
            capture_output=True, timeout=60)
        # Note: actual transcription needs whisper/whisperx installed
        # For now, just note the audio was extracted
        if sub_result.returncode == 0:
            transcript = "Audio extracted to /workspace/harness/tutorial_frames/tutorial_audio.wav. Use a transcription tool to get text."
    except Exception:
        transcript = "Audio extraction failed (ffmpeg not available or video has no audio)."

    result = {
        "video": video_path,
        "duration_sec": duration,
        "frames_extracted": len(frames),
        "frame_paths": frames,
        "transcript": transcript,
        "instruction": "Read each frame via read_file (multimodal) to see the tutorial's editing techniques. Then propose style changes based on what you observe.",
    }
    return json.dumps(result, indent=2)


@tool
def capture_feedback(dimension: str, verdict: str, note: str, beat_id: str = "") -> str:
    """Capture a per-aspect feedback verdict on a rendered segment.

    Args:
        dimension: Visual aspect (e.g. 'edge-stroke', 'pacing', 'color', 'motion').
        verdict: 'like' or 'dislike'.
        note: What's good/bad.
        beat_id: Optional beat ID for segment attribution.
    """
    log_dir = os.path.join(PROJECT_ROOT, "harness", "logs")
    os.makedirs(log_dir, exist_ok=True)
    entry = {"dimension": dimension, "verdict": verdict, "note": note,
             "beatId": beat_id, "ts": time.time()}
    with open(os.path.join(log_dir, "feedback.jsonl"), "a", encoding="utf-8") as f:
        f.write(json.dumps(entry) + "\n")
    beat_info = f" (beat: {beat_id})" if beat_id else ""
    return f"Feedback logged: {dimension}={verdict}{beat_info}"


@tool
def render_compare(project_slug: str, start_sec: float, end_sec: float,
                   style_path: str, new_value: str, beat_id: str = "") -> str:
    """Render before and after a style change for visual comparison.

    Returns paths to both rendered videos (use read_file to view them).

    Args:
        project_slug: Project folder name.
        start_sec: Start time (or use beat_id to auto-resolve).
        end_sec: End time (or use beat_id to auto-resolve).
        style_path: Style knob to change (dot-notation).
        new_value: New value for the knob.
        beat_id: Optional beat ID — if provided, auto-resolves start/end from edit doc.
    """
    STYLE_REL = "libraries/04-visual/isaacverse-style.json"
    RENDERER_DIR = os.path.join(PROJECT_ROOT, "remotion-composer")

    # Beat-scoped: resolve start/end from edit doc
    if beat_id:
        ed_path = os.path.join(PROJECT_ROOT, "projects", project_slug, "05-edit-doc.json")
        if os.path.exists(ed_path):
            import json as _json
            with open(ed_path, encoding="utf-8") as f:
                doc = _json.load(f)
            for b in doc.get("beats", []):
                if b.get("id") == beat_id:
                    start_sec = b["startSec"]
                    end_sec = b["startSec"] + b["durationSec"]
                    break

    def do_render(slug, start, end):
        import shutil as _shutil
        _src = os.path.join(PROJECT_ROOT, STYLE_REL)
        _dst = os.path.join(RENDERER_DIR, "shared", "isaacverse", "isaacverse-style.json")
        if os.path.exists(_src):
            _shutil.copy2(_src, _dst)
        cmd = ["node", os.path.join(RENDERER_DIR, "scripts", "render-window.mjs"),
               "--project", slug, "--start", str(start), "--end", str(end), "--quality", "draft"]
        r = subprocess.run(cmd, capture_output=True, text=True, cwd=RENDERER_DIR, timeout=300)
        if r.returncode != 0:
            return f"Render failed: {r.stderr[-200:]}"
        lines = r.stdout.strip().split("\n")
        raw = lines[-1] if lines else ""
        if raw.startswith(PROJECT_ROOT):
            rel = raw[len(PROJECT_ROOT):].lstrip("\\/").replace("\\", "/")
            return f"/workspace/{rel}"
        return raw

    # 1. Render before
    before = do_render(project_slug, start_sec, end_sec)
    # 2. Apply proposed change
    path = os.path.join(PROJECT_ROOT, STYLE_REL)
    with open(path, encoding="utf-8") as f:
        style = json.load(f)
    parts = style_path.split(".")
    obj = style
    for p in parts[:-1]:
        obj = obj[p]
    old_val = obj.get(parts[-1])
    try:
        val = json.loads(new_value)
    except Exception:
        val = new_value
    obj[parts[-1]] = val
    with open(path, "w", encoding="utf-8") as f:
        json.dump(style, f, indent=2, ensure_ascii=False)
    # 3. Render after
    after = do_render(project_slug, start_sec, end_sec)
    # 4. Revert
    obj[parts[-1]] = old_val
    with open(path, "w", encoding="utf-8") as f:
        json.dump(style, f, indent=2, ensure_ascii=False)
    return f"Before: {before}\nAfter: {after}\nUse read_file on both paths to compare visually."

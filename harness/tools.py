"""Harness tools — bridge between the Deep Agent and the Remotion renderer."""

from __future__ import annotations

import json
import os
import subprocess

from langchain.tools import tool

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RENDERER_DIR = os.path.join(PROJECT_ROOT, "remotion-composer")
STYLE_FILE = os.path.join(PROJECT_ROOT, "libraries", "04-visual", "isaacverse-style.json")


@tool
def render_window(project_slug: str, start_sec: float, end_sec: float, quality: str = "draft") -> str:
    """Render a video window for the given project.

    Args:
        project_slug: Project folder name under projects/ (e.g. 'isaacverse-final').
        start_sec: Start time in seconds.
        end_sec: End time in seconds.
        quality: 'draft' (360p, fast) or 'master' (1080p, slow).

    Returns:
        Path to the rendered .mp4, or an error message.
    """
    cmd = [
        "node",
        os.path.join(RENDERER_DIR, "scripts", "render-window.mjs"),
        "--project", project_slug,
        "--start", str(start_sec),
        "--end", str(end_sec),
        "--quality", quality,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, cwd=RENDERER_DIR, timeout=300)
    if result.returncode != 0:
        return f"Render failed (exit {result.returncode}):\n{result.stderr[-500:]}"
    output = result.stdout.strip().split("\n")
    return output[-1] if output else "Render completed (no path in output)"


@tool
def read_edit_doc(project_slug: str) -> str:
    """Read the EditDoc (05-edit-doc.json) for a project.

    Returns the JSON structure showing beats, treatments, and timeline.
    """
    path = os.path.join(PROJECT_ROOT, "projects", project_slug, "05-edit-doc.json")
    if not os.path.exists(path):
        return f"Edit doc not found: {path}"
    with open(path, encoding="utf-8") as f:
        doc = json.load(f)
    beats_summary = []
    for beat in doc.get("beats", []):
        beats_summary.append({
            "id": beat.get("id"),
            "treatment": beat.get("treatment", {}).get("id"),
            "startSec": beat.get("startSec"),
            "durationSec": beat.get("durationSec"),
            "transcript": beat.get("transcript", "")[:80],
        })
    return json.dumps({"id": doc.get("id"), "beats": beats_summary}, indent=2)


@tool
def update_style(style_path: str, new_value: str) -> str:
    """Update a style knob in the style store.

    Args:
        style_path: Dot-notation path within the style JSON
                    (e.g. 'treatments.semantic-diagram.edge.stroke.mode').
        new_value: New value as a string. Will attempt JSON parse first
                   (so '"gradient"' for a string, '2' for a number,
                   '{"mode":"gradient","stops":["#a","#b"]}' for an object).

    This tool is INTERRUPT-GATED: the user must approve before the write persists.
    """
    if not os.path.exists(STYLE_FILE):
        return f"Style file not found: {STYLE_FILE}"
    with open(STYLE_FILE, encoding="utf-8") as f:
        style = json.load(f)

    parts = style_path.split(".")
    obj = style
    for p in parts[:-1]:
        if p not in obj:
            return f"Path not found: {style_path} (missing key '{p}')"
        obj = obj[p]

    try:
        val = json.loads(new_value)
    except (json.JSONDecodeError, TypeError):
        val = new_value

    old_value = obj.get(parts[-1])
    obj[parts[-1]] = val
    style["version"] = style.get("version", 1) + 1

    with open(STYLE_FILE, "w", encoding="utf-8") as f:
        json.dump(style, f, indent=2, ensure_ascii=False)

    return (
        f"Style updated: {style_path}\n"
        f"  old: {json.dumps(old_value)}\n"
        f"  new: {json.dumps(val)}\n"
        f"  style version: {style['version']}"
    )


@tool
def read_video(video_path: str) -> str:
    """Report a rendered video path for visual inspection.

    The Deep Agent's built-in read_file tool can read .mp4 as multimodal
    content (video frames). Pass the path returned by render_window.
    """
    full = video_path if os.path.isabs(video_path) else os.path.join(PROJECT_ROOT, video_path)
    if not os.path.exists(full):
        return f"Video not found: {full}"
    size_mb = os.path.getsize(full) / (1024 * 1024)
    return f"Video ready: {full} ({size_mb:.1f} MB). Use read_file to view as multimodal."


@tool
def run_structural_qa(project_slug: str) -> str:
    """Run structural QA on a project's edit doc.

    Returns pass/fail status and any findings.
    """
    vd = os.path.join(PROJECT_ROOT, "projects", project_slug, "04-video-doc.json")
    ed = os.path.join(PROJECT_ROOT, "projects", project_slug, "05-edit-doc.json")
    out = os.path.join(PROJECT_ROOT, "projects", project_slug, "qa", "harness-check.json")
    cmd = [
        "python",
        os.path.join(PROJECT_ROOT, "tools", "quality", "isaacverse_gate.py"),
        "--video-doc", vd,
        "--edit-doc", ed,
        "--draft",
        "--output", out,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    if result.returncode == 0:
        return f"QA passed.\n{result.stdout[-300:]}"
    return f"QA issues (exit {result.returncode}):\n{result.stderr[-300:]}"


@tool
def capture_feedback(dimension: str, verdict: str, note: str, beat_id: str = "") -> str:
    """Capture a per-aspect feedback verdict on a rendered segment.

    Args:
        dimension: The visual aspect (e.g. 'edge-stroke', 'pacing', 'color', 'motion').
        verdict: 'like' or 'dislike'.
        note: Free-text explanation of what's good/bad.
        beat_id: Optional beat ID the feedback applies to.

    The feedback is logged and will be used to propose style refinements.
    """
    log_dir = os.path.join(PROJECT_ROOT, "harness", "logs")
    os.makedirs(log_dir, exist_ok=True)
    log_file = os.path.join(log_dir, "feedback.jsonl")
    import time
    entry = {
        "dimension": dimension,
        "verdict": verdict,
        "note": note,
        "beatId": beat_id,
        "timestamp": time.time(),
    }
    with open(log_file, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry) + "\n")
    return f"Feedback captured: {dimension}={verdict} ({note[:60]}...). Logged to harness/logs/feedback.jsonl"

"""Harness tools — bridge between the Deep Agent and the Remotion renderer.

All project file paths use /workspace/ prefix (mapped to FilesystemBackend root_dir=PROJECT_ROOT).
The agent reads files via built-in read_file (supports video multimodal).
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import time

from langchain.tools import tool

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RENDERER_DIR = os.path.join(PROJECT_ROOT, "remotion-composer")
STYLE_REL = "libraries/04-visual/isaacverse-style.json"

# Import governance for validation
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import governance as gov


@tool
def render_window(project_slug: str, start_sec: float, end_sec: float, quality: str = "draft") -> str:
    """Render a video window. Returns the video path under /workspace/ for read_file.

    Args:
        project_slug: Project folder name (e.g. 'isaacverse-final').
        start_sec: Start time in seconds.
        end_sec: End time in seconds.
        quality: 'draft' (360p) or 'master' (1080p).
    """
    cmd = [
        "node", os.path.join(RENDERER_DIR, "scripts", "render-window.mjs"),
        "--project", project_slug, "--start", str(start_sec),
        "--end", str(end_sec), "--quality", quality,
    ]
    # Sync style JSON before render so Remotion uses the latest style
    import shutil
    src_style = os.path.join(PROJECT_ROOT, STYLE_REL)
    dst_style = os.path.join(RENDERER_DIR, "shared", "isaacverse", "isaacverse-style.json")
    if os.path.exists(src_style):
        shutil.copy2(src_style, dst_style)
    result = subprocess.run(cmd, capture_output=True, text=True, cwd=RENDERER_DIR, timeout=300)
    if result.returncode != 0:
        return f"Render failed:\n{result.stderr[-500:]}"
    # Extract output path from stdout, convert to /workspace/ path
    lines = result.stdout.strip().split("\n")
    raw_path = lines[-1] if lines else ""
    # Convert absolute path to /workspace/ relative
    if raw_path.startswith(PROJECT_ROOT):
        rel = raw_path[len(PROJECT_ROOT):].lstrip("\\/").replace("\\", "/")
        return f"/workspace/{rel}"
    return raw_path or "Render completed (no path)"


@tool
def read_style() -> str:
    """Read the current style store. Returns the full JSON."""
    path = os.path.join(PROJECT_ROOT, STYLE_REL)
    if not os.path.exists(path):
        return "Style file not found"
    with open(path, encoding="utf-8") as f:
        return json.dumps(json.load(f), indent=2)


@tool
def list_style_knobs() -> str:
    """List all available style knobs with current values."""
    path = os.path.join(PROJECT_ROOT, STYLE_REL)
    if not os.path.exists(path):
        return "Style file not found"
    with open(path, encoding="utf-8") as f:
        style = json.load(f)
    knobs = []
    def traverse(obj, prefix=""):
        if isinstance(obj, dict):
            for k, v in obj.items():
                if isinstance(v, dict):
                    traverse(v, f"{prefix}{k}.")
                else:
                    knobs.append(f"{prefix}{k} = {json.dumps(v)}")
    traverse(style.get("treatments", {}), "treatments.")
    return "\n".join(knobs)


@tool
def update_style(style_path: str, new_value: str) -> str:
    """Update a style knob. INTERRUPT-GATED: user must approve.

    Args:
        style_path: Dot-notation path from root (e.g. 'treatments.semantic-diagram.edge.stroke.mode').
        new_value: New value (JSON-parsed: '"gradient"' for string, '2' for number, '{"a":1}' for object).
    """
    path = os.path.join(PROJECT_ROOT, STYLE_REL)
    with open(path, encoding="utf-8") as f:
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
    # Governance check: validate before writing
    allowed, reason = gov.validate_style_change(style_path, val)
    if not allowed:
        return f"BLOCKED by governance: {reason}"
    old = obj.get(parts[-1])
    if old == val:
        return f"No change (current value is already {json.dumps(val)})"
    obj[parts[-1]] = val
    style["version"] = style.get("version", 1) + 1
    with open(path, "w", encoding="utf-8") as f:
        json.dump(style, f, indent=2, ensure_ascii=False)
    # QA gate: verify the style JSON is valid + has required structure after write
    try:
        with open(path, encoding="utf-8") as f:
            verify = json.load(f)
        assert "version" in verify, "missing 'version' key"
        assert "treatments" in verify, "missing 'treatments' key"
        assert isinstance(verify["treatments"], dict), "'treatments' must be object"
    except Exception as e:
        # Revert on invalid write
        obj[parts[-1]] = old
        style["version"] -= 1
        with open(path, "w", encoding="utf-8") as f:
            json.dump(style, f, indent=2, ensure_ascii=False)
        return f"QA GATE FAILED: style invalid after write ({e}). Reverted."
    # Log the change
    log_dir = os.path.join(PROJECT_ROOT, "harness", "logs")
    os.makedirs(log_dir, exist_ok=True)
    with open(os.path.join(log_dir, "events.jsonl"), "a", encoding="utf-8") as f:
        f.write(json.dumps({"type": "style_update", "path": style_path, "old": old,
                            "new": val, "version": style["version"], "ts": time.time()}) + "\n")
    return (f"Style updated: {style_path}\n  old: {json.dumps(old)}\n  new: {json.dumps(val)}\n"
            f"  version: {style['version']}\n  File: /workspace/{STYLE_REL}")


@tool
def capture_feedback(dimension: str, verdict: str, note: str, beat_id: str = "") -> str:
    """Capture a per-aspect feedback verdict on a rendered segment.

    Args:
        dimension: Visual aspect (e.g. 'edge-stroke', 'pacing', 'color').
        verdict: 'like' or 'dislike'.
        note: What's good/bad.
        beat_id: Optional beat ID.
    """
    log_dir = os.path.join(PROJECT_ROOT, "harness", "logs")
    os.makedirs(log_dir, exist_ok=True)
    entry = {"dimension": dimension, "verdict": verdict, "note": note,
             "beatId": beat_id, "ts": time.time()}
    with open(os.path.join(log_dir, "feedback.jsonl"), "a", encoding="utf-8") as f:
        f.write(json.dumps(entry) + "\n")
    return f"Feedback logged: {dimension}={verdict}"


@tool
def run_structural_qa(project_slug: str) -> str:
    """Run structural QA on a project."""
    vd = os.path.join(PROJECT_ROOT, "projects", project_slug, "04-video-doc.json")
    ed = os.path.join(PROJECT_ROOT, "projects", project_slug, "05-edit-doc.json")
    out = os.path.join(PROJECT_ROOT, "projects", project_slug, "qa", "harness-check.json")
    cmd = ["python", os.path.join(PROJECT_ROOT, "tools", "quality", "isaacverse_gate.py"),
           "--video-doc", vd, "--edit-doc", ed, "--draft", "--output", out]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    return f"QA {'passed' if result.returncode == 0 else 'failed'}:\n{result.stdout[-200:]}"


@tool
def render_compare(project_slug: str, start_sec: float, end_sec: float,
                   style_path: str, new_value: str) -> str:
    """Render before and after a style change for visual comparison.

    Returns paths to both rendered videos (use read_file to view them).

    Args:
        project_slug: Project folder name.
        start_sec: Start time.
        end_sec: End time.
        style_path: Style knob to change (dot-notation).
        new_value: New value for the knob.
    """
    # 1. Render "before" (current style)
    before = render_window.invoke({"project_slug": project_slug, "start_sec": start_sec,
                                    "end_sec": end_sec, "quality": "draft"})
    # 2. Apply proposed change temporarily
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
    except:
        val = new_value
    obj[parts[-1]] = val
    with open(path, "w", encoding="utf-8") as f:
        json.dump(style, f, indent=2, ensure_ascii=False)
    # 3. Render "after"
    after = render_window.invoke({"project_slug": project_slug, "start_sec": start_sec,
                                   "end_sec": end_sec, "quality": "draft"})
    # 4. Revert to original
    obj[parts[-1]] = old_val
    with open(path, "w", encoding="utf-8") as f:
        json.dump(style, f, indent=2, ensure_ascii=False)
    return f"Before: {before}\nAfter: {after}\nUse read_file on both paths to compare visually."

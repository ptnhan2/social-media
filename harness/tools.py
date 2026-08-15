"""Harness domain tools — only tools that spawn external processes.

The agent uses built-in filesystem tools (read_file, edit_file, ls, glob, grep)
for file operations. These domain tools exist because they spawn Remotion
(Node.js subprocess) which can't be done via filesystem operations.

Style store reads: use built-in read_file("/workspace/libraries/04-visual/isaacverse-style.json")
Style store writes: use update_style (schema-validated, approval-gated)
Memory writes: use built-in edit_file("/memories/taste-standard.md") (approval-gated)
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

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from style_schema import validate_style_schema
import governance as gov


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


@tool
def render_compare(project_slug: str, start_sec: float, end_sec: float,
                   style_path: str, new_value: str) -> str:
    """Render before and after a style change for visual comparison.

    Returns paths to both rendered videos (use read_file or delegate to critic subagent to view).

    Args:
        project_slug: Project folder name.
        start_sec: Start time.
        end_sec: End time.
        style_path: Style knob to change (dot-notation from root).
        new_value: New value for the knob.
    """
    before = render_window.invoke({"project_slug": project_slug, "start_sec": start_sec,
                                    "end_sec": end_sec, "quality": "draft"})
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
    after = render_window.invoke({"project_slug": project_slug, "start_sec": start_sec,
                                   "end_sec": end_sec, "quality": "draft"})
    obj[parts[-1]] = old_val
    with open(path, "w", encoding="utf-8") as f:
        json.dump(style, f, indent=2, ensure_ascii=False)
    return f"Before: {before}\nAfter: {after}\nUse the critic subagent to compare both videos."


@tool
def update_style(style_path: str, new_value: str) -> str:
    """Update a style knob. APPROVAL-GATED (human must approve via interrupt).

    Validates against JSON Schema before writing. Logs the change.
    Use this to change any value in the style store.

    Args:
        style_path: Dot-notation path from root (e.g. 'treatments.semantic-diagram.edge.stroke.mode').
        new_value: New value (JSON-parsed: '"gradient"' for string, '2' for number).
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
    old = obj.get(parts[-1])
    if old == val:
        return f"No change (current value is already {json.dumps(val)})"
    obj[parts[-1]] = val
    style["version"] = style.get("version", 1) + 1
    # Schema validation before write
    valid, schema_err = validate_style_schema(style)
    if not valid:
        obj[parts[-1]] = old
        style["version"] -= 1
        return f"SCHEMA VALIDATION FAILED: {schema_err}. Change rejected."
    with open(path, "w", encoding="utf-8") as f:
        json.dump(style, f, indent=2, ensure_ascii=False)
    # Verify after write
    try:
        with open(path, encoding="utf-8") as f:
            verify = json.load(f)
        valid2, err2 = validate_style_schema(verify)
        if not valid2:
            raise ValueError(err2)
    except Exception as e:
        obj[parts[-1]] = old
        style["version"] -= 1
        with open(path, "w", encoding="utf-8") as f:
            json.dump(style, f, indent=2, ensure_ascii=False)
        return f"QA GATE FAILED: style invalid after write ({e}). Reverted."
    # Log
    gov.log_event("style_update", {
        "path": style_path, "old": old, "new": val,
        "version": style["version"], "provenance": "update_style_tool",
    })
    return (f"Style updated: {style_path}\n  old: {json.dumps(old)}\n  new: {json.dumps(val)}\n"
            f"  version: {style['version']}\n  File: /workspace/{STYLE_REL}")


@tool
def style_diff(from_version: int = 0, to_version: int = 0) -> str:
    """Show style changes between two versions (from event log).

    Args:
        from_version: Start version (0 = first in log).
        to_version: End version (0 = latest in log).
    """
    log_file = os.path.join(PROJECT_ROOT, "harness", "logs", "events.jsonl")
    if not os.path.exists(log_file):
        return "No event log found."
    events = []
    with open(log_file, encoding="utf-8") as f:
        for line in f:
            try:
                entry = json.loads(line)
                if entry.get("type") == "style_update":
                    events.append(entry)
            except json.JSONDecodeError:
                continue
    if not events:
        return "No style_update events in log."
    versions = [e.get("data", {}).get("version", 0) for e in events]
    min_v, max_v = (min(versions), max(versions)) if versions else (0, 0)
    from_v = from_version if from_version > 0 else min_v
    to_v = to_version if to_version > 0 else max_v
    relevant = [e for e in events if from_v <= e.get("data", {}).get("version", 0) <= to_v]
    if not relevant:
        return f"No changes between v{from_v} and v{to_v}."
    lines = [f"Style changes (v{from_v} -> v{to_v}): {len(relevant)} change(s)\n"]
    for e in relevant:
        d = e.get("data", {})
        lines.append(f"  v{d.get('version', '?')}: {d.get('path', '?')}")
        lines.append(f"    {json.dumps(d.get('old'))} -> {json.dumps(d.get('new'))}")
        lines.append(f"    provenance: {d.get('provenance', 'unknown')}\n")
    return "\n".join(lines)

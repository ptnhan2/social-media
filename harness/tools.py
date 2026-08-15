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
    # Parse output — render-window.mjs outputs JSON with the file path in args
    out = result.stdout.strip()
    raw_path = ""
    # Search for .mp4 path in stdout (handles JSON, colored output, plain text)
    import re
    mp4_match = re.search(r'([A-Za-z]:\\[^\s"]+\.mp4|/[^\s"]+\.mp4)', out)
    if mp4_match:
        raw_path = mp4_match.group(1)
    if not raw_path:
        # Fallback: try JSON parse
        try:
            data = json.loads(out)
            if isinstance(data.get("args"), list) and len(data["args"]) > 3:
                raw_path = data["args"][3]
        except (json.JSONDecodeError, TypeError):
            pass
    # Convert absolute path to /workspace/ relative
    if raw_path and raw_path.startswith(PROJECT_ROOT):
        rel = raw_path[len(PROJECT_ROOT):].lstrip("\\/").replace("\\", "/")
        return f"/workspace/{rel}"
    return raw_path or f"Render completed. stdout:\n{out[-300:]}"


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
    # QA gate: render-test (quick 1-second draft render to verify style doesn't break rendering)
    try:
        import shutil as _shutil
        _src = os.path.join(PROJECT_ROOT, STYLE_REL)
        _dst = os.path.join(RENDERER_DIR, "shared", "isaacverse", "isaacverse-style.json")
        _shutil.copy2(_src, _dst)
        _r = subprocess.run(
            ["node", os.path.join(RENDERER_DIR, "scripts", "render-window.mjs"),
             "--project", "isaacverse-final", "--start", "0", "--end", "1", "--quality", "draft"],
            capture_output=True, text=True, cwd=RENDERER_DIR, timeout=120)
        if _r.returncode != 0:
            # Render failed — revert
            obj[parts[-1]] = old
            style["version"] -= 1
            with open(path, "w", encoding="utf-8") as f:
                json.dump(style, f, indent=2, ensure_ascii=False)
            return f"QA RENDER-TEST FAILED: style change broke rendering. Reverted.\n{_r.stderr[-300:]}"
    except subprocess.TimeoutExpired:
        pass  # timeout = inconclusive, allow the change
    except Exception:
        pass  # render test optional, don't block on infra issues
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


# --- Aspect → style knob mapping for propose_improvement ---
_ASPECT_KNOB_MAP = {
    "motion": [
        ("treatments.semantic-diagram.edge.revealDurationSec", [0.8, 1.0, 1.2],
         "Increase reveal animation duration for smoother motion"),
        ("treatments.semantic-diagram.edge.stroke.width", [2, 3],
         "Adjust stroke width for visual presence"),
    ],
    "composition": [
        ("treatments.chapter-card.title.fontSizeShort", [100, 110, 120],
         "Adjust title font size for better balance"),
        ("treatments.chapter-card.title.fontSizeLong", [64, 72, 80],
         "Adjust long-title font size"),
    ],
    "color": [
        ("treatments.semantic-diagram.edge.stroke.mode", ["gradient"],
         "Switch to gradient stroke for richer color depth"),
        ("treatments.semantic-diagram.edge.stroke.gradientStops",
         [["#FFD700", "#FF6B35"], ["#4FC3F7", "#81D4FA"]],
         "Try different gradient color pairs"),
        ("treatments.host-reflection.filter", ["brightness(0.9) contrast(1.1)", "brightness(0.85) contrast(1.15)"],
         "Adjust host-reflection color filter"),
    ],
    "text": [
        ("treatments.chapter-card.title.fontSizeShort", [100, 110, 120],
         "Increase font size for better legibility"),
        ("treatments.host-reflection.subtitleFontSize", [18, 20, 22],
         "Adjust subtitle font size"),
    ],
    "pacing": [
        ("treatments.semantic-diagram.edge.revealDurationSec", [0.8, 1.0, 1.2],
         "Adjust reveal duration to control pacing"),
    ],
}


@tool
def propose_improvement(video_path: str, critique_text: str = "") -> str:
    """Analyze a rendered video and propose specific style improvements.

    If critique_text is provided (from visual_critique), uses it directly.
    Otherwise, runs visual_critique internally.

    Maps critique findings to available style knobs and returns concrete
    proposals with rationale. Does NOT apply changes — use update_style to apply.

    Args:
        video_path: Path to rendered .mp4.
        critique_text: Optional pre-computed critique from visual_critique.

    Returns:
        Structured proposals: style_path, suggested_value, rationale.
    """
    # Get critique if not provided
    if not critique_text:
        from visual_critique import visual_critique
        critique_text = visual_critique.invoke({"video_path": video_path, "aspect": "all"})

    # Read current style knobs
    style_path = os.path.join(PROJECT_ROOT, STYLE_REL)
    with open(style_path, encoding="utf-8") as f:
        style = json.load(f)

    def get_style_value(path: str):
        parts = path.split(".")
        obj = style
        for p in parts:
            if isinstance(obj, dict) and p in obj:
                obj = obj[p]
            else:
                return None
        return obj

    # Parse critique to find low-scoring aspects
    proposals = []
    critique_lower = critique_text.lower()

    # Extract scores from critique (pattern: "aspect: N" or "aspect - N")
    import re
    score_pattern = r"(composition|color|motion|text\s+legibility|text|pacing)\s*[:\-]\s*(\d)"
    raw_scores = re.findall(score_pattern, critique_lower)
    # Deduplicate: keep first match per aspect (text_legibility → text)
    scores = []
    seen = set()
    for aspect, score in raw_scores:
        aspect = "text" if "text" in aspect else aspect
        if aspect not in seen:
            scores.append((aspect, score))
            seen.add(aspect)

    # Find TOP ISSUE
    top_issue = ""
    if "top issue:" in critique_lower:
        top_issue = critique_text[critique_lower.index("top issue:"):].strip()

    # Generate proposals for low-scoring aspects (score <= 3)
    low_aspects = set()
    for aspect, score in scores:
        if int(score) <= 3:
            low_aspects.add(aspect)

    # If no scores found, propose for all aspects
    if not scores:
        low_aspects = {"motion", "composition", "color"}

    for aspect in low_aspects:
        knob_suggestions = _ASPECT_KNOB_MAP.get(aspect, [])
        for knob_path, suggested_values, rationale in knob_suggestions:
            current = get_style_value(knob_path)
            # Find a suggested value different from current
            for val in suggested_values:
                if val != current:
                    proposals.append({
                        "aspect": aspect,
                        "style_path": knob_path,
                        "current_value": current,
                        "suggested_value": val,
                        "rationale": rationale,
                    })
                    break  # One proposal per knob

    # Build output
    lines = [f"Proposed improvements for {video_path}:", ""]
    if top_issue:
        lines.append(f"TOP ISSUE: {top_issue}")
        lines.append("")

    if not proposals:
        lines.append("No specific improvements to propose. All aspects scored well.")
    else:
        lines.append(f"Found {len(proposals)} proposal(s) for low-scoring aspects {sorted(low_aspects)}:")
        lines.append("")
        for i, p in enumerate(proposals, 1):
            lines.append(f"  {i}. [{p['aspect']}] {p['style_path']}")
            lines.append(f"     current: {json.dumps(p['current_value'])}")
            lines.append(f"     proposed: {json.dumps(p['suggested_value'])}")
            lines.append(f"     why: {p['rationale']}")
            lines.append("")
        lines.append("To apply: call update_style(style_path, suggested_value) for any proposal above.")
        lines.append("Each update is approval-gated and governance-validated.")

    return "\n".join(lines)


@tool
def run_consolidation() -> str:
    """Analyze accumulated feedback and propose batch style refinements.

    Reads the feedback log, finds recurring patterns (dimensions with >= 2 dislikes),
    and returns concrete style change proposals. Use this periodically to consolidate
    feedback into actionable improvements.

    Returns:
        Feedback patterns + proposed style refinements.
    """
    from consolidation_agent import analyze_feedback, propose_refinements

    patterns = analyze_feedback()
    if not patterns:
        return "No feedback patterns found (need >= 2 dislikes for same dimension to form a pattern)."

    lines = [f"Consolidation analysis: found {len(patterns)} pattern(s):\n"]
    for p in patterns:
        lines.append(f"  Dimension: {p['dimension']} ({p['dislike_count']} dislikes)")
        lines.append(f"  Knob: {p['knob'] or '(unmapped)'}")
        lines.append(f"  Notes: {p['notes'][:2]}")
        lines.append(f"  Recommendation: {p['recommendation']}\n")

    proposals = propose_refinements(patterns)
    if proposals:
        lines.append("Proposed refinements (each needs approval via update_style):")
        for prop in proposals:
            lines.append(f"  update_style({prop['style_path']}, {prop['proposed_value']})")
            lines.append(f"    Reason: {prop['reason']}\n")
    else:
        lines.append("No concrete proposals (patterns have no knob mapping).")

    return "\n".join(lines)

"""Memory governance for the style store.

Implements the write-gate pattern from the harness spec:
- Pre-consolidation validation (contradiction check + minSupport >= 2).
- Append-only event log (every feedback → refinement → approval recorded).
- Reversible reconciliation (rebuild style from log).

This is a CUSTOM MIDDLEWARE stub for Deep Agents. To wire into create_deep_agent,
pass it via the middleware= parameter once the deepagents middleware API is verified.
"""

from __future__ import annotations

import json
import os
import time
from typing import Any

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STYLE_FILE = os.path.join(PROJECT_ROOT, "libraries", "04-visual", "isaacverse-style.json")
LOG_DIR = os.path.join(PROJECT_ROOT, "harness", "logs")
EVENT_LOG = os.path.join(LOG_DIR, "events.jsonl")
FEEDBACK_LOG = os.path.join(LOG_DIR, "feedback.jsonl")

MIN_SUPPORT = 2  # a single observation is not yet a pattern


def log_event(event_type: str, data: dict[str, Any]) -> None:
    """Append an event to the immutable event log."""
    os.makedirs(LOG_DIR, exist_ok=True)
    entry = {"type": event_type, "timestamp": time.time(), "data": data}
    with open(EVENT_LOG, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def count_feedback(dimension: str) -> int:
    """Count how many feedback entries mention a given dimension."""
    if not os.path.exists(FEEDBACK_LOG):
        return 0
    count = 0
    with open(FEEDBACK_LOG, encoding="utf-8") as f:
        for line in f:
            try:
                entry = json.loads(line)
                if entry.get("dimension") == dimension:
                    count += 1
            except json.JSONDecodeError:
                continue
    return count


def check_contradiction(style_path: str, new_value: Any, current_style: dict) -> str | None:
    """Check if a new style value contradicts an existing approved value.

    Returns a contradiction message if found, None if OK.
    """
    parts = style_path.split(".")
    obj = current_style
    for p in parts[:-1]:
        if not isinstance(obj, dict) or p not in obj:
            return None  # path doesn't exist yet — no contradiction
        obj = obj[p]
    if not isinstance(obj, dict):
        return None
    old = obj.get(parts[-1])
    if old is None:
        return None  # no existing value — no contradiction
    if old == new_value:
        return f"New value identical to current ({old}) — no change needed."
    return None  # different value is OK (it's an update, not a contradiction)


def validate_style_change(style_path: str, new_value: Any) -> tuple[bool, str]:
    """Pre-consolidation validation gate.

    Returns (allowed, reason).
    """
    # Load current style
    if not os.path.exists(STYLE_FILE):
        return False, "Style file not found"
    with open(STYLE_FILE, encoding="utf-8") as f:
        current_style = json.load(f)

    # Check contradiction
    contradiction = check_contradiction(style_path, new_value, current_style)
    if contradiction:
        return False, f"Contradiction: {contradiction}"

    # Check minSupport for NEW rules (not for updating existing ones)
    parts = style_path.split(".")
    obj = current_style
    path_exists = True
    for p in parts:
        if not isinstance(obj, dict) or p not in obj:
            path_exists = False
            break
        obj = obj[p]

    if not path_exists:
        # This is a NEW style knob — check minSupport
        dimension = parts[-1]  # use last path segment as dimension
        support = count_feedback(dimension)
        if support < MIN_SUPPORT:
            return False, (
                f"minSupport not met: {support}/{MIN_SUPPORT} feedback entries "
                f"for '{dimension}'. A single observation is not yet a pattern."
            )

    return True, "Validation passed"


def apply_approved_change(style_path: str, new_value: Any, provenance: str) -> str:
    """Apply an approved style change and log it.

    Called AFTER the user approves via the interrupt gate.
    """
    allowed, reason = validate_style_change(style_path, new_value)
    if not allowed:
        return f"Blocked by governance: {reason}"

    with open(STYLE_FILE, encoding="utf-8") as f:
        style = json.load(f)

    parts = style_path.split(".")
    obj = style
    for p in parts[:-1]:
        obj = obj.setdefault(p, {})
    old_value = obj.get(parts[-1])
    obj[parts[-1]] = new_value
    style["version"] = style.get("version", 1) + 1

    with open(STYLE_FILE, "w", encoding="utf-8") as f:
        json.dump(style, f, indent=2, ensure_ascii=False)

    log_event("style_update", {
        "path": style_path,
        "old": old_value,
        "new": new_value,
        "provenance": provenance,
        "version": style["version"],
    })

    return (
        f"Style updated: {style_path} = {json.dumps(new_value)} "
        f"(v{style['version']}, provenance: {provenance})"
    )


def replay_from_log() -> dict:
    """Rebuild the style store from the event log (reversible reconciliation).

    Returns the reconstructed style dict.
    """
    if not os.path.exists(EVENT_LOG):
        return {}
    style: dict[str, Any] = {"version": 0}
    with open(EVENT_LOG, encoding="utf-8") as f:
        for line in f:
            try:
                event = json.loads(line)
                if event.get("type") == "style_update":
                    data = event["data"]
                    parts = data["path"].split(".")
                    obj = style
                    for p in parts[:-1]:
                        obj = obj.setdefault(p, {})
                    obj[parts[-1]] = data["new"]
                    style["version"] = max(style.get("version", 0), data.get("version", 0))
            except (json.JSONDecodeError, KeyError):
                continue
    return style

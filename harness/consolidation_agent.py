"""Background consolidation agent — reviews feedback log, proposes batch style refinements.

This agent runs between conversations (sleep-time compute). It reads the feedback
log, identifies recurring patterns (dimension with multiple dislikes), and proposes
style changes that address them. The proposed changes still go through the normal
governance + approval flow.

Run manually:
    harness/.venv/Scripts/python.exe harness/consolidation_agent.py

Or schedule via cron (see langgraph.json consolidation_agent graph).
"""

from __future__ import annotations

import json
import os
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FEEDBACK_LOG = os.path.join(PROJECT_ROOT, "harness", "logs", "feedback.jsonl")
STYLE_FILE = os.path.join(PROJECT_ROOT, "libraries", "04-visual", "isaacverse-style.json")

# Dimension → style knob mapping
DIMENSION_TO_KNOB = {
    "edge-stroke": "treatments.semantic-diagram.edge.stroke.mode",
    "pacing": "treatments.semantic-diagram.edge.revealDurationSec",
    "font-size": "treatments.chapter-card.title.fontSizeShort",
    "color": "treatments.semantic-diagram.edge.stroke.color",
    "motion": "treatments.host-reflection.pushStart",
    "letterbox": "treatments.host-reflection.letterboxTopPct",
}


def analyze_feedback() -> list[dict]:
    """Read feedback log, group by dimension, find patterns (minSupport >= 2 dislikes)."""
    if not os.path.exists(FEEDBACK_LOG):
        return []

    entries = []
    with open(FEEDBACK_LOG, encoding="utf-8") as f:
        for line in f:
            try:
                entries.append(json.loads(line))
            except json.JSONDecodeError:
                continue

    # Group by dimension + verdict
    dim_counter: Counter[str] = Counter()
    dim_notes: dict[str, list[str]] = {}
    for e in entries:
        key = f"{e['dimension']}:{e['verdict']}"
        dim_counter[key] += 1
        if e["dimension"] not in dim_notes:
            dim_notes[e["dimension"]] = []
        dim_notes[e["dimension"]].append(e.get("note", ""))

    # Find patterns: dimensions with >= 2 dislikes
    patterns = []
    for key, count in dim_counter.items():
        dim, verdict = key.split(":", 1)
        if verdict == "dislike" and count >= 2:
            knob = DIMENSION_TO_KNOB.get(dim, "")
            patterns.append({
                "dimension": dim,
                "dislike_count": count,
                "knob": knob,
                "notes": dim_notes.get(dim, []),
                "recommendation": f"Multiple dislikes ({count}) for {dim}. Consider changing {knob}." if knob else f"Multiple dislikes ({count}) for {dim} (no knob mapping).",
            })

    return patterns


def propose_refinements(patterns: list[dict]) -> list[dict]:
    """Convert patterns into concrete style change proposals."""
    proposals = []
    for p in patterns:
        if not p["knob"]:
            continue
        # Simple heuristic proposals based on dimension
        dim = p["dimension"]
        if dim == "edge-stroke":
            proposals.append({
                "style_path": p["knob"],
                "proposed_value": "gradient",
                "reason": f"{p['dislike_count']} dislikes for edge-stroke. Notes: {p['notes'][:2]}. Try gradient mode.",
            })
        elif dim == "font-size":
            proposals.append({
                "style_path": p["knob"],
                "proposed_value": "110",
                "reason": f"{p['dislike_count']} dislikes for font-size. Try larger font.",
            })
        elif dim == "pacing":
            proposals.append({
                "style_path": p["knob"],
                "proposed_value": "0.45",
                "reason": f"{p['dislike_count']} dislikes for pacing. Try faster reveal.",
            })
    return proposals


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    print("=== Background Consolidation Agent ===\n")

    patterns = analyze_feedback()
    if not patterns:
        print("No feedback patterns found (need >= 2 dislikes for same dimension).")
        return

    print(f"Found {len(patterns)} feedback pattern(s):\n")
    for p in patterns:
        print(f"  Dimension: {p['dimension']} ({p['dislike_count']} dislikes)")
        print(f"  Knob: {p['knob'] or '(unmapped)'}")
        print(f"  Notes: {p['notes'][:2]}")
        print(f"  Recommendation: {p['recommendation']}\n")

    proposals = propose_refinements(patterns)
    if proposals:
        print("Proposed style refinements:\n")
        for prop in proposals:
            print(f"  update_style({prop['style_path']}, {prop['proposed_value']})")
            print(f"    Reason: {prop['reason']}\n")
        print("These proposals should go through the normal governance + approval flow.")
        print("Run the main agent and present these proposals to the user.")
    else:
        print("No concrete proposals (patterns have no knob mapping).")


if __name__ == "__main__":
    main()

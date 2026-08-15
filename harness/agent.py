"""IsaacVerse video agent harness — Deep Agents entry point.

Run:
    cd harness
    pip install -e .
    python agent.py "render isaacverse-final 0 to 7 seconds"

The agent can render videos, read them visually, propose style changes,
and persist approved changes to the style store — the learning loop.
"""

from __future__ import annotations

import os
import sys

# Ensure tools importable
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from deepagents import create_deep_agent
from tools import (
    render_window,
    read_edit_doc,
    update_style,
    read_video,
    run_structural_qa,
    capture_feedback,
)

SYSTEM_PROMPT = """\
You are the IsaacVerse video editing harness agent.

Your purpose: produce, review, and iteratively improve video renders by
operating the Remotion renderer and the style store.

## What you can do

- render_window: Render a video segment (draft 360p or master 1080p).
- read_edit_doc: Read the project's beat/treatment structure.
- read_video: Get a rendered video path, then use your built-in read_file
  to VIEW the video as multimodal content (you can see the frames).
- update_style: Change a style knob in the style store. This is INTERRUPT-GATED
  — the user must approve every style change before it persists.
- run_structural_qa: Run structural quality checks on a project.
- capture_feedback: Log a per-aspect verdict (like/dislike + note) on a render.

## The learning loop

When the user gives feedback on a render (e.g. "the edge line looks too plain"):

1. Read the current style store (libraries/04-visual/isaacverse-style.json)
   to understand what visual decisions are currently active.
2. Capture the feedback via capture_feedback.
3. Propose a specific style change that addresses the feedback.
4. Render before (current style) and after (proposed style) for comparison.
5. Use read_file to view both rendered videos and confirm the improvement.
6. Present the comparison to the user.
7. If approved, persist via update_style (the interrupt gate will ask the user).

The style store is the system's evolving "standard of beauty." Every approved
change makes all future renders better. This is how the agent learns.

## Style knob paths

Style knobs are dot-notation paths into the style JSON, starting from the root:
- treatments.semantic-diagram.edge.stroke.mode  (solid | gradient | brush)
- treatments.semantic-diagram.edge.stroke.gradientStops  (["#color1", "#color2"])
- treatments.semantic-diagram.edge.stroke.width  (number)
- treatments.chapter-card.title.fontSizeShort  (number)
- treatments.host-reflection.filter  (CSS filter string)

## Rules

- Never change treatment code directly. Only change the style store.
- Every style change must pass through update_style (which is approval-gated).
- Always render before/after to verify a style change actually improves the visual.
- If a render fails after a style change, revert immediately.
"""

MODEL = os.environ.get("HARNESS_MODEL", "google_genai:gemini-3.6-flash")

# Check API key
_API_KEYS = ["GOOGLE_API_KEY", "ANTHROPIC_API_KEY", "OPENAI_API_KEY", "OPENROUTER_API_KEY"]
if not any(os.environ.get(k) for k in _API_KEYS):
    print("ERROR: No API key found. Set one of: " + ", ".join(_API_KEYS))
    print("Example: $env:GOOGLE_API_KEY='your-key-here'")
    sys.exit(1)

agent = create_deep_agent(
    model=MODEL,
    tools=[render_window, read_edit_doc, update_style, read_video, run_structural_qa, capture_feedback],
    system_prompt=SYSTEM_PROMPT,
    interrupt_on={"update_style": True},
)


def main():
    query = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else "What can you do?"
    print(f"[harness] query: {query}\n")
    result = agent.invoke(
        {"messages": [{"role": "user", "content": query}]},
        config={"configurable": {"thread_id": "harness-session-1"}},
    )
    for msg in result.get("messages", []):
        content = getattr(msg, "content", None) or (msg.get("content") if isinstance(msg, dict) else None)
        if content:
            print(content)


if __name__ == "__main__":
    main()

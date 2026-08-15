r"""IsaacVerse video agent harness — Deep Agents entry point.

Run:
    harness/run.ps1 "your query"
    Or: harness/.venv/Scripts/python.exe harness/agent.py "your query"
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

# Load .env
env_file = Path(__file__).parent.parent / ".env"
if env_file.exists():
    for line in env_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if "=" in line and not line.startswith("#"):
            k, _, v = line.partition("=")
            os.environ.setdefault(k.strip(), v.strip())

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from deepagents import create_deep_agent
from deepagents.backends import CompositeBackend, StateBackend, FilesystemBackend, StoreBackend
from langgraph.checkpoint.memory import MemorySaver
from langgraph.store.memory import InMemoryStore
from deepagents import FilesystemPermission

from tools import (
    render_window, read_style, list_style_knobs, update_style,
    capture_feedback, run_structural_qa,
)
from tutorial_tools import ingest_tutorial, render_compare as rc_compare
from visual_critique import visual_critique

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL = os.environ.get("HARNESS_MODEL", "deepseek:deepseek-chat")

# --- Store (cross-thread memory) ---
store = InMemoryStore()

# Seed memory
try:
    from deepagents.backends.utils import create_file_data
    agents_md = (Path(__file__).parent / "AGENTS.md").read_text(encoding="utf-8")
    store.put(("harness",), "/memories/AGENTS.md", create_file_data(agents_md))
except Exception:
    # Fallback: direct dict
    agents_md = (Path(__file__).parent / "AGENTS.md").read_text(encoding="utf-8")
    store.put(("harness",), "/memories/AGENTS.md", {"content": agents_md, "type": "text"})

# --- Backend ---
backend = CompositeBackend(
    default=StateBackend(),
    routes={
        "/workspace/": FilesystemBackend(root_dir=PROJECT_ROOT, virtual_mode=True),
        "/memories/": StoreBackend(namespace=lambda _rt: ("harness",)),
        "/skills/": FilesystemBackend(root_dir=os.path.join(os.path.dirname(__file__), "skills"), virtual_mode=True),
    },
)

# --- Permissions ---
permissions = [
    # Agent can't write directly to /memories/ (must use update_style tool)
    FilesystemPermission(operations=["write"], paths=["/memories/**"], mode="deny"),
    # Agent can't modify treatment code
    FilesystemPermission(operations=["write"],
                         paths=["/workspace/remotion-composer/shared/**"], mode="deny"),
    # Agent can't bypass update_style by writing style JSON directly
    FilesystemPermission(operations=["write"],
                         paths=["/workspace/libraries/04-visual/**"], mode="deny"),
]

# --- System Prompt ---
SYSTEM_PROMPT = """\
You are the IsaacVerse video editing harness agent.

## What you can do

- render_window: Render a video segment (draft 360p or master 1080p).
- read_style: Read the current style store JSON.
- list_style_knobs: List all available style knobs with current values.
- update_style: Change a style knob (APPROVAL-GATED — user must approve).
- render_compare: Render before/after a style change for visual comparison.
- capture_feedback: Log a per-aspect verdict on a render.
- run_structural_qa: Run structural QA on a project.
- read_file (built-in): Read ANY file including rendered .mp4 videos (multimodal — you SEE the frames).
- visual_critique: Send rendered video frames to a VLM (GPT-4o) for structured visual critique.
  Use this AFTER rendering to evaluate composition, color, motion, text, pacing.
- write_file/edit_file (built-in): Write to scratch space (NOT /memories/ — that's denied).

## File paths

Project files are under /workspace/:
- Style store: /workspace/libraries/04-visual/isaacverse-style.json
- Edit doc: /workspace/projects/<slug>/05-edit-doc.json
- Rendered videos: /workspace/projects/<slug>/renders/*.mp4
- Treatment code: /workspace/remotion-composer/shared/isaacverse/treatments.tsx (READ-ONLY)

## The learning loop

When the user gives feedback on a render (e.g. "the edge line looks too plain"):

1. Capture the feedback: capture_feedback(dimension="edge-stroke", verdict="dislike", note="too plain")
2. Read current style: read_style() — see what's active now
3. List knobs: list_style_knobs() — see what you can change
4. Propose a change: update_style(style_path, new_value) — this PAUSES for user approval
5. After approval, render: render_window(project, start, end, "draft")
6. Critique the result: visual_critique(video_path, "all") — VLM evaluates the render
7. If critique is good: report success. If not: propose another change.

## Proactive improvement loop (agent-initiated)

After any render, you can proactively:
1. Call visual_critique on the rendered video
2. Based on the critique, propose style changes that address the issues
3. Present the proposed changes to the user for approval
4. This is how the system "learns" — each critique cycle improves the style store

## Style knob reference

Key knobs (dot-notation from root):
- treatments.semantic-diagram.edge.stroke.mode         solid | gradient | brush
- treatments.semantic-diagram.edge.stroke.color         rgba string
- treatments.semantic-diagram.edge.stroke.width         number
- treatments.semantic-diagram.edge.stroke.gradientStops ["#color1", "#color2"]
- treatments.semantic-diagram.edge.stroke.brushDasharray "3 1 5 2"
- treatments.chapter-card.title.fontSizeShort           number
- treatments.chapter-card.title.fontSizeLong            number
- treatments.host-reflection.filter                     CSS filter string
- treatments.host-reflection.letterboxTopPct            number
- treatments.host-reflection.subtitleFontSize           number

## Rules

1. Never edit treatment code directly — only change the style store via update_style.
2. Every style change must pass through update_style (approval-gated).
3. Always render and view the result after a style change — never persist blind.
4. Use render_compare to show before/after when proposing a change.
5. If a render fails after a style change, revert immediately.
"""

# --- Create Agent (module-level, no checkpointer/store — langgraph server compatible) ---
_COMMON_KWARGS = dict(
    model=MODEL,
    tools=[render_window, read_style, list_style_knobs, update_style,
           capture_feedback, run_structural_qa, rc_compare, ingest_tutorial,
           visual_critique],
    system_prompt=SYSTEM_PROMPT,
    backend=backend,
    memory=["/memories/AGENTS.md"],
    skills=["/skills/"],
    permissions=permissions,
    interrupt_on={"update_style": True},
)

# This is what langgraph server imports (no custom checkpointer/store)
agent = create_deep_agent(**_COMMON_KWARGS)


def main():
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    from langgraph.types import Command
    from langgraph.checkpoint.memory import MemorySaver

    # Standalone CLI: create a separate agent WITH MemorySaver + store for interrupt resume
    cli_agent = create_deep_agent(**_COMMON_KWARGS, checkpointer=MemorySaver(), store=store)

    query = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else "What can you do?"
    print(f"[harness] model={MODEL}  query: {query}\n")
    config = {"configurable": {"thread_id": "harness-1"}}
    result = cli_agent.invoke(
        {"messages": [{"role": "user", "content": query}]},
        config=config,
    )
    # Handle interrupts (approval gates for update_style)
    while "__interrupt__" in result:
        print("\n" + "="*60)
        print("[APPROVAL NEEDED — style change requested]")
        for item in result["__interrupt__"]:
            if hasattr(item, 'value'):
                print(item.value)
            else:
                print(str(item))
        print("="*60)
        resp = input("\nApprove this style change? (yes/no): ").strip().lower()
        if resp.startswith("y"):
            resume_val = {"decisions": [{"type": "approve"}]}
        else:
            resume_val = {"decisions": [{"type": "reject"}]}
        result = cli_agent.invoke(Command(resume=resume_val), config=config)
    # Print final messages
    for msg in result.get("messages", []):
        content = getattr(msg, "content", None)
        if not content and isinstance(msg, dict):
            content = msg.get("content")
        if content:
            print(content)


if __name__ == "__main__":
    main()

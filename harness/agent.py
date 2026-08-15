r"""IsaacVerse video agent harness — Deep Agents native assembly.

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
    for line in env_file.read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.strip()
        if "=" in line and not line.startswith("#"):
            k, _, v = line.partition("=")
            v = v.strip()
            if "#" in v and not (v.startswith('"') or v.startswith("'")):
                v = v.split("#")[0].strip()
            os.environ.setdefault(k.strip(), v)

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from deepagents import create_deep_agent, SubAgent, FilesystemPermission
from deepagents.backends import CompositeBackend, StateBackend, FilesystemBackend, StoreBackend
from deepagents.middleware import RubricMiddleware
from langchain.agents.middleware import TodoListMiddleware
from langgraph.checkpoint.memory import MemorySaver

from tools import render_window, render_compare, update_style, style_diff
from subagents import ALL_SUBAGENTS, CRITIC_SUBAGENT
from rubric import TASTE_RUBRIC
from file_store import FileBackedStore

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL = os.environ.get("HARNESS_MODEL", "deepseek:deepseek-chat")

# --- Store (persistent cross-thread memory) ---
STORE_FILE = os.path.join(os.path.dirname(__file__), "logs", "store.json")
store = FileBackedStore(STORE_FILE)


def _seed_memory():
    """Seed memory files if not already present."""
    harness_dir = Path(__file__).parent
    memory_files = {
        "/memories/AGENTS.md": harness_dir / "AGENTS.md",
        "/memories/taste-standard.md": harness_dir / "memories" / "taste-standard.md",
    }
    for mem_path, disk_path in memory_files.items():
        existing = store.get(("harness",), mem_path)
        if existing is None and disk_path.exists():
            content = disk_path.read_text(encoding="utf-8")
            try:
                from deepagents.backends.utils import create_file_data
                store.put(("harness",), mem_path, create_file_data(content))
            except Exception:
                store.put(("harness",), mem_path, {"content": content, "type": "text"})


_seed_memory()

# --- Backend (native CompositeBackend, no wrapper) ---
backend = CompositeBackend(
    default=StateBackend(),
    routes={
        "/workspace/": FilesystemBackend(root_dir=PROJECT_ROOT, virtual_mode=True),
        "/memories/": StoreBackend(namespace=lambda _rt: ("harness",)),
        "/skills/": FilesystemBackend(root_dir=os.path.join(os.path.dirname(__file__), "skills"), virtual_mode=True),
    },
)

# --- Permissions (native — interrupt mode for governed paths, not deny) ---
permissions = [
    # Style store writes → human approval (interrupt)
    FilesystemPermission(operations=["write", "edit"],
                         paths=["/workspace/libraries/04-visual/**"], mode="interrupt"),
    # Memory writes → human approval (agent can learn, but with oversight)
    FilesystemPermission(operations=["write", "edit"],
                         paths=["/memories/**"], mode="interrupt"),
    # Treatment code → deny (never modify code)
    FilesystemPermission(operations=["write", "edit"],
                         paths=["/workspace/remotion-composer/shared/**"], mode="deny"),
]

# --- System Prompt ---
SYSTEM_PROMPT = """\
You are the IsaacVerse video editing harness agent — a self-improving agent that \
renders, critiques, and iteratively improves video style.

## Your workspace

The filesystem is your knowledge store. Use built-in tools (read_file, edit_file, ls, glob, grep) \
to navigate it.

Key paths:
- Style store: /workspace/libraries/04-visual/isaacverse-style.json
  Read it with read_file. Change values with update_style (approval-gated).
- Memory: /memories/AGENTS.md (your constitution), /memories/taste-standard.md (accumulated taste principles)
  Write learnings with edit_file (approval-gated). This is how you improve over time.
- Skills: /skills/ (editing-craft, style-knobs, visual-critique)
  Read SKILL.md files when a task matches their domain.
- Rendered videos: /workspace/projects/<slug>/renders/*.mp4
  You can read_file these — video frames are decoded natively.
- Projects: /workspace/projects/<slug>/05-edit-doc.json (edit structure)

## Your tools

Domain tools (spawn external processes):
- render_window: Render a video segment (draft 360p or master 1080p).
- render_compare: Render before/after a style change.
- update_style: Change a style knob (APPROVAL-GATED — human must approve).
- style_diff: Show style change history.

Built-in tools (from Deep Agents):
- read_file: Read any file (including .mp4 videos — frames decoded natively).
- write_file / edit_file: Write to scratch space or memory (memory writes are approval-gated).
- ls / glob / grep: Navigate the filesystem.
- task: Delegate to subagents (see below).
- write_todos: Plan multi-step work.

## Delegation — the `task` tool

You CANNOT see video — your model is text-only. Delegate visual analysis to the `critic` subagent:

    task(description="Critique the video at /workspace/projects/isaacverse-final/renders/windows/xxx.mp4", subagent_type="critic")

The critic uses a VLM (GLM-4V-Flash) to analyze video frames and returns structured scores \
(composition, color, motion, text, pacing) with a top issue and suggestions.

Launch multiple subagents concurrently when independent. Each returns a distilled report.

## Planning — write_todos

For multi-step work (render → critique → change style → re-render → verify):
1. Call write_todos with a concrete plan.
2. Work through each todo.
3. Mark todos as completed as you finish them.

## Memory — learning

When you learn something (user feedback, critique insight, successful technique):
1. edit_file("/memories/taste-standard.md", old_text, new_text) to add the learning.
2. The write is approval-gated — human reviews before it persists.
3. In future sessions, taste-standard.md is loaded into your context via memory.

This is how you improve: each approved learning compounds across sessions.

## The improvement loop

1. Plan with write_todos.
2. Render: render_window(project, start, end, "draft").
3. Critique: task(subagent_type="critic", description="...video path...").
4. Analyze: read the critic's structured scores. Identify the weakest aspect.
5. Change: update_style(style_path, new_value) to address the weakness.
6. Re-render: render_window again.
7. Verify: task(subagent_type="critic") again to confirm improvement.
8. Learn: if the improvement worked, edit_file("/memories/taste-standard.md") to record the principle.
9. Repeat until all scores >= 4 or the rubric is satisfied.

## Rubric evaluation

When a rubric is active (passed in invocation state), a grader will evaluate your work \
after you finish. If it says "needs_revision", read the feedback and fix the issues. \
The grader checks: motion present, text legible, composition balanced, no rendering errors, \
style change verified.

## Style knob reference

Key knobs (dot-notation from root):
- treatments.semantic-diagram.edge.stroke.mode         solid | gradient | brush
- treatments.semantic-diagram.edge.stroke.width         number (0.5-10)
- treatments.semantic-diagram.edge.stroke.gradientStops ["#color1", "#color2"]
- treatments.semantic-diagram.edge.revealDurationSec    number (0.1-5.0)
- treatments.chapter-card.title.fontSizeShort           number (30-200)
- treatments.chapter-card.title.fontSizeLong            number (30-200)
- treatments.host-reflection.filter                     CSS filter string
- treatments.host-reflection.letterboxTopPct            number (0-50)
- treatments.host-reflection.subtitle.fontSize          number (10-60)

Read the full style store with read_file to see all 53 knobs.

## Rules

1. Never edit treatment code — only change the style store via update_style.
2. Always render and critique after a style change — never persist blind.
3. Use the critic subagent for ALL visual analysis — you cannot see video.
4. Learn from every critique cycle — write principles to /memories/taste-standard.md.
5. Plan with write_todos before multi-step work.
"""

# --- Middleware ---
# RubricMiddleware: no-op unless a rubric is passed in invocation state.
# To activate: agent.invoke({"messages": [...], "rubric": TASTE_RUBRIC})
middleware = [
    TodoListMiddleware(),
    RubricMiddleware(
        model=MODEL,
        max_iterations=3,
    ),
]

# --- Create Agent (module-level, no checkpointer/store — langgraph server compatible) ---
_COMMON_KWARGS = dict(
    model=MODEL,
    tools=[render_window, render_compare, update_style, style_diff],
    system_prompt=SYSTEM_PROMPT,
    backend=backend,
    memory=["/memories/AGENTS.md", "/memories/taste-standard.md"],
    skills=["/skills/"],
    permissions=permissions,
    subagents=ALL_SUBAGENTS,
    middleware=middleware,
    interrupt_on={"update_style": True},
)

agent = create_deep_agent(**_COMMON_KWARGS)


def main():
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    from langgraph.types import Command

    cli_agent = create_deep_agent(**_COMMON_KWARGS, checkpointer=MemorySaver(), store=store)

    query = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else "What can you do?"
    print(f"[harness] model={MODEL}  query: {query}\n")
    config = {"configurable": {"thread_id": "harness-1"}}
    result = cli_agent.invoke(
        {"messages": [{"role": "user", "content": query}]},
        config=config,
    )
    while "__interrupt__" in result:
        print("\n" + "="*60)
        print("[APPROVAL NEEDED]")
        for item in result["__interrupt__"]:
            if hasattr(item, 'value'):
                print(item.value)
            else:
                print(str(item))
        print("="*60)
        resp = input("\nApprove? (yes/no): ").strip().lower()
        resume_val = {"decisions": [{"type": "approve" if resp.startswith("y") else "reject"}]}
        result = cli_agent.invoke(Command(resume=resume_val), config=config)
    for msg in result.get("messages", []):
        content = getattr(msg, "content", None)
        if not content and isinstance(msg, dict):
            content = msg.get("content")
        if content:
            print(content)


if __name__ == "__main__":
    main()

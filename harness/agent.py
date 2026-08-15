"""IsaacVerse video agent — Deep Agents assembly.

Behavior comes from AGENTS.md (memory), skills/ (workflows), and the
critic subagent spec. This file just wires them together.
"""

from __future__ import annotations

import os
import sys
from dataclasses import dataclass
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

from deepagents import create_deep_agent, FilesystemPermission
from deepagents.backends import CompositeBackend, StateBackend, FilesystemBackend
from langchain.agents.middleware import TodoListMiddleware, ModelRetryMiddleware
from langgraph.checkpoint.memory import MemorySaver
from langgraph.store.memory import InMemoryStore

from harness_tools import render_window, visual_critique, think
from subagents import CRITIC_SUBAGENT

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HARNESS_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL = os.environ.get("HARNESS_MODEL", "deepseek:deepseek-chat")


@dataclass
class AgentContext:
    """Per-run runtime context — passed via context= on invocation."""
    project_id: str = "isaacverse-final"
    current_sec: float = 0.0


_COMMON = dict(
    model=MODEL,
    tools=[render_window, visual_critique, think],
    memory=["/memories/AGENTS.md", "/memories/taste-standard.md"],
    skills=["/skills/"],
    subagents=[CRITIC_SUBAGENT],
    permissions=[
        FilesystemPermission(operations=["write"], paths=["/workspace/libraries/04-visual/**"], mode="interrupt"),
        FilesystemPermission(operations=["write"], paths=["/memories/**"], mode="interrupt"),
        FilesystemPermission(operations=["write"], paths=["/workspace/remotion-composer/shared/**"], mode="deny"),
    ],
    backend=CompositeBackend(
        default=StateBackend(),
        routes={
            "/workspace/": FilesystemBackend(root_dir=PROJECT_ROOT, virtual_mode=True),
            "/memories/": FilesystemBackend(root_dir=os.path.join(HARNESS_DIR, "memories"), virtual_mode=True),
            "/skills/": FilesystemBackend(root_dir=os.path.join(HARNESS_DIR, "skills"), virtual_mode=True),
        },
    ),
    middleware=[TodoListMiddleware(), ModelRetryMiddleware()],
    context_schema=AgentContext,
)

agent = create_deep_agent(**_COMMON)


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    from langgraph.types import Command
    cli_agent = create_deep_agent(**_COMMON, checkpointer=MemorySaver(), store=InMemoryStore())
    query = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else "What can you do?"
    print(f"[harness] model={MODEL}  query: {query}\n")
    config = {"configurable": {"thread_id": "harness-1"}}
    result = cli_agent.invoke({"messages": [{"role": "user", "content": query}]}, config=config)
    while "__interrupt__" in result:
        print("\n" + "=" * 60)
        print("[APPROVAL NEEDED]")
        for item in result["__interrupt__"]:
            print(getattr(item, "value", str(item)))
        print("=" * 60)
        resp = input("\nApprove? (yes/no): ").strip().lower()
        result = cli_agent.invoke(Command(resume={"decisions": [{"type": "approve" if resp.startswith("y") else "reject"}]}), config=config)
    for msg in result.get("messages", []):
        content = getattr(msg, "content", None) or (msg.get("content") if isinstance(msg, dict) else None)
        if content:
            print(content)


if __name__ == "__main__":
    main()

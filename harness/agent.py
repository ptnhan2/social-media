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
            if v:  # Skip empty values
                os.environ.setdefault(k.strip(), v)

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from deepagents import create_deep_agent, FilesystemPermission
from deepagents.backends import CompositeBackend, StateBackend, FilesystemBackend
from langchain.agents.middleware import TodoListMiddleware, ModelRetryMiddleware, ToolCallLimitMiddleware
from langgraph.checkpoint.memory import MemorySaver
from langgraph.store.memory import InMemoryStore

from harness_tools import render_window, visual_critique, think, update_style, compare_renders, pairwise_verdict, request_keep
from subagents import CRITIC_SUBAGENT

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HARNESS_DIR = os.path.dirname(os.path.abspath(__file__))

# Model: support DeepSeek, Zhipu / Qwen-DashScope (via OpenAI-compatible), or any langchain provider
#   HARNESS_MODEL=openai:<model>      + OPENAI_BASE_URL/OPENAI_API_KEY   (e.g. Zhipu GLM-4-Flash)
#   HARNESS_MODEL=dashscope:<model>   + DASHSCOPE_API_KEY                 (e.g. qwen-plus, qwen3-vl-plus)
#   HARNESS_MODEL=deepseek:<model>    + DEEPSEEK_API_KEY
_model_str = os.environ.get("HARNESS_MODEL", "openai:glm-4-flash")
if _model_str.startswith("dashscope:"):
    from langchain_openai import ChatOpenAI
    MODEL = ChatOpenAI(
        model=_model_str.split(":", 1)[1],
        api_key=os.environ.get("DASHSCOPE_API_KEY", ""),
        base_url=os.environ.get("DASHSCOPE_BASE_URL", "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"),
        use_responses_api=False,
    )
elif _model_str.startswith("openai:") and os.environ.get("OPENAI_BASE_URL"):
    # OpenAI-compatible endpoint (e.g. Zhipu GLM-4-Flash)
    from langchain_openai import ChatOpenAI
    MODEL = ChatOpenAI(
        model=_model_str.split(":", 1)[1],
        api_key=os.environ.get("OPENAI_API_KEY", ""),
        base_url=os.environ.get("OPENAI_BASE_URL"),
        use_responses_api=False,
    )
else:
    MODEL = _model_str


@dataclass
class AgentContext:
    """Per-run runtime context — passed via context= on invocation."""
    project_id: str = "isaacverse-final"
    current_sec: float = 0.0


_COMMON = dict(
    model=MODEL,
    tools=[render_window, visual_critique, think, update_style, compare_renders, pairwise_verdict, request_keep],
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
    middleware=[TodoListMiddleware(), ModelRetryMiddleware(), ToolCallLimitMiddleware(run_limit=30)],
    context_schema=AgentContext,
)

agent = create_deep_agent(**_COMMON)


def _get_checkpointer():
    """Use Postgres checkpointer if DATABASE_URL is set, else MemorySaver."""
    db_url = os.environ.get("DATABASE_URL") or os.environ.get("POSTGRES_URL")
    if db_url:
        try:
            from langgraph.checkpoint.postgres import PostgresSaver
            return PostgresSaver.from_conn_string(db_url)
        except ImportError:
            pass
    return MemorySaver()

def _get_store():
    """Use InMemoryStore for dev. Postgres store handled by LangGraph server in prod."""
    return InMemoryStore()


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    from langgraph.types import Command
    cli_agent = create_deep_agent(**_COMMON, checkpointer=_get_checkpointer(), store=_get_store())
    query = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else "What can you do?"
    print(f"[harness] model={MODEL}  query: {query}\n")
    config = {"configurable": {"thread_id": "harness-1"}}
    result = cli_agent.invoke({"messages": [{"role": "user", "content": query}]}, config=config)
    while "__interrupt__" in result:
        print("\n" + "=" * 60)
        for item in result["__interrupt__"]:
            val = getattr(item, "value", item)
            if isinstance(val, dict) and val.get("kind") == "keep_gate":
                # KEEP gate (protocol v4): 3-exit decision with optional note
                print("[KEEP GATE]")
                print(f"  knob: {val.get('knob')} {val.get('old_value')} -> {val.get('new_value')}")
                print(f"  verdict: {val.get('verdict_summary')}")
                if val.get("feedback_context"):
                    print(f"  your feedback was: {val.get('feedback_context')}")
                print(f"  before: {val.get('video_before')}")
                print(f"  after:  {val.get('video_after')}")
                resp = input("\nKeep this change? (keep/reject) + optional note after ';': ").strip()
                choice, _, note = resp.partition(";")
                dtype = "keep" if choice.strip().lower().startswith("k") else "reject"
                resume = {"type": dtype, "note": note.strip()}
            else:
                # permission interrupt (edit_file/write_file on gated paths)
                print("[APPROVAL NEEDED]")
                print(val)
                resp = input("\nApprove? (yes/no): ").strip().lower()
                resume = {"decisions": [{"type": "approve" if resp.startswith("y") else "reject"}]}
        print("=" * 60)
        result = cli_agent.invoke(Command(resume=resume), config=config)
    for msg in result.get("messages", []):
        content = getattr(msg, "content", None) or (msg.get("content") if isinstance(msg, dict) else None)
        if content:
            print(content)


if __name__ == "__main__":
    main()

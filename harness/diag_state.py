"""Diagnostic 2: check memory_contents in agent state after invoke."""
import sys, os
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "harness"))

from pathlib import Path
env_file = Path(__file__).parent.parent / ".env"
if env_file.exists():
    for line in env_file.read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.strip()
        if "=" in line and not line.startswith("#"):
            k, _, v = line.partition("=")
            v = v.strip()
            if "#" in v and not (v.startswith('"') or v.startswith("'")):
                v = v.split("#")[0].strip()
            if v:
                os.environ.setdefault(k.strip(), v)

import agent as agent_mod

from langgraph.checkpoint.memory import MemorySaver
diag_agent = agent_mod.create_deep_agent(
    **agent_mod._COMMON, checkpointer=MemorySaver(), store=agent_mod._get_store(),
)
diag_agent.invoke(
    {"messages": [{"role": "user", "content": "hi"}]},
    config={"configurable": {"thread_id": "diag-2"}},
)
# inspect state via get_state
state = diag_agent.get_state({"configurable": {"thread_id": "diag-2"}})
vals = state.values
print("state keys:", sorted(vals.keys()))
mc = vals.get("memory_contents")
if mc:
    for k, v in mc.items():
        print(f"  {k}: len={len(v)}")
else:
    print("memory_contents: MISSING FROM STATE")

"""Diagnostic: inspect the actual system prompt of the assembled agent."""
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

from agent import agent

# invoke a trivial query and inspect the system message
result = agent.invoke({"messages": [{"role": "user", "content": "hi"}]}, config={"configurable": {"thread_id": "diag-1"}})
msgs = result.get("messages", [])
print(f"total messages: {len(msgs)}")
for m in msgs[:3]:
    t = getattr(m, "type", "?")
    c = getattr(m, "content", "")
    if isinstance(c, list):
        c = "".join(x.get("text", "") if isinstance(x, dict) else str(x) for x in c)
    print(f"--- [{t}] len={len(str(c))} ---")
    print(str(c)[:800])

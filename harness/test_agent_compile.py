"""Verify agent compiles with native Deep Agents assembly."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from agent import agent
print("Agent type:", type(agent).__name__)
print("Compiled OK")

nodes = list(agent.get_graph().nodes.keys())
print("Graph nodes:", nodes[:10])

# Check subagents are wired
from subagents import ALL_SUBAGENTS
print(f"Subagents defined: {len(ALL_SUBAGENTS)}")
for sa in ALL_SUBAGENTS:
    print(f"  - {sa['name']}: {sa['description'][:60]}...")

# Check middleware
from agent import middleware
print(f"Middleware: {[type(m).__name__ for m in middleware]}")

# Check permissions
from agent import permissions
print(f"Permissions: {len(permissions)} rules")
for p in permissions:
    print(f"  - {p.operations} on {p.paths} mode={p.mode}")

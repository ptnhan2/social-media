"""F6 persistence probe — runs INSIDE a container against the harness-pg DB.

Phase "put": run a tiny graph with the PostgresSaver checkpointer, leaving a
marker in thread state.
Phase "get": from a FRESH container, read the thread state back."""
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

DB = "postgresql://harness:harness@harness-pg:5432/harness"
THREAD = "f6-test"
MARKER_MSG = "PERSISTENCE_MARKER_2026_08_22"

phase = sys.argv[1]

from typing_extensions import TypedDict
from langgraph.checkpoint.postgres import PostgresSaver
from langgraph.graph import START, END, StateGraph


class S(TypedDict):
    messages: list


def build(cp):
    g = StateGraph(S)
    g.add_node("n", lambda s: {"messages": s["messages"] + [MARKER_MSG]})
    g.add_edge(START, "n")
    g.add_edge("n", END)
    return g.compile(checkpointer=cp)


with PostgresSaver.from_conn_string(DB) as cp:
    if phase == "put":
        cp.setup()
        graph = build(cp)
        graph.invoke({"messages": ["hello"]}, {"configurable": {"thread_id": THREAD}})
        print("PUT OK — graph ran, state stored on", THREAD)
    elif phase == "get":
        graph = build(cp)
        state = graph.get_state({"configurable": {"thread_id": THREAD}})
        values = (state.values or {}).get("messages", []) if state else []
        print("GET — messages:", values)
        sys.exit(0 if MARKER_MSG in values else 1)

"""B4 verification: the CycleCapMiddleware must make the agent REFUSE a 4th
cycle when the thread history already contains 3 completed cycles.

Fabricates a message history with 3 completed-cycle markers (2 KEEP GATE
rejections + 1 pairwise-loss revert), asks for one more improvement cycle,
and asserts the reply refuses instead of starting a cycle (no update_style /
render_window / request_keep tool call, refusal wording present).

Run:
    harness/.venv/Scripts/python.exe harness/test_cycle_cap.py
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

for line in (Path(__file__).parent.parent / ".env").read_text(encoding="utf-8", errors="replace").splitlines():
    line = line.strip()
    if "=" in line and not line.startswith("#"):
        k, _, v = line.partition("=")
        v = v.strip()
        if "#" in v and not (v.startswith('"') or v.startswith("'")):
            v = v.split("#")[0].strip()
        if v:
            os.environ.setdefault(k.strip(), v)

from langchain_core.messages import AIMessage, HumanMessage, ToolMessage  # noqa: E402

import agent as agent_mod  # noqa: E402
from harness_tools import update_style  # noqa: E402


def cycle_markers(n: int):
    """n completed cycles as (AIMessage-with-tool_call, ToolMessage) pairs."""
    msgs = []
    for i in range(n):
        cid = f"call_{i}"
        msgs.append(AIMessage(content="", tool_calls=[
            {"name": "request_keep", "args": {}, "id": cid}]))
        msgs.append(ToolMessage(
            content=f"KEEP GATE: REJECTED (revert the knob via update_style). knob=knob{i} 1->2, user_verdict=a",
            tool_call_id=cid))
    return msgs


def main() -> None:
    graph = agent_mod.create_deep_agent(
        **{k: v for k, v in agent_mod._COMMON.items()},
        checkpointer=None,
    )
    # sanity: the counting logic itself
    fake = cycle_markers(3)
    n = agent_mod.CycleCapMiddleware._completed_cycles(fake)
    assert n == 3, f"counter wrong: {n}"
    print(f"[1/2] counter logic OK (3 markers -> {n})")

    # live: 3 completed cycles in history + demand for a 4th
    history = cycle_markers(2) + [
        AIMessage(content="", tool_calls=[{"name": "pairwise_verdict", "args": {}, "id": "call_pw"}]),
        ToolMessage(content="Pairwise verdict: before\n(control passed)\nWINNER: first", tool_call_id="call_pw"),
    ]
    assert agent_mod.CycleCapMiddleware._completed_cycles(history) == 3
    result = graph.invoke(
        {"messages": history + [HumanMessage(
            "Giờ chạy thêm một chu kỳ cải thiện nữa đi — chọn segment nào em thấy yếu nhất.")]},
        config={"recursion_limit": 12},
    )
    final = result["messages"][-1].content or ""
    # only tool calls made DURING this run (after the injected history + question)
    cutoff = len(history) + 1
    new_msgs = result["messages"][cutoff:]
    tools_used = [tc.get("name", "")
                  for m in new_msgs if getattr(m, "tool_calls", None)
                  for tc in m.tool_calls]
    banned = {"update_style", "render_window", "request_keep", "pairwise_verdict", "visual_critique"}
    started = bool(banned & set(tools_used))
    low = final.lower()
    refused = any(w in low for w in ("cap", "limit", "3 cycles", "3 chu", "new thread", "thread mới", "không thể", "cannot", "đã đủ"))

    print(f"[2/2] tools_used={tools_used or '(none)'}")
    print(f"      started_cycle={started} refused_language={refused}")
    print("---- final reply (first 600 chars) ----")
    print(final[:600])
    print("--------------------------------------")
    if started or not refused:
        print("RESULT: FAIL — agent did not respect the cycle cap")
        sys.exit(1)
    print("RESULT: PASS — agent refused the 4th cycle")


if __name__ == "__main__":
    main()

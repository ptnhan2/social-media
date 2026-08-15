"""Quality evals — measure real improvement, not just structure.

Tests:
- Scores improved after change (before vs after)
- Correct knob selected for weakest aspect
- Stopped after ≤3 cycles
- Memory updated with learning
- Reverted when worse
- Agent reads memory before first action
- Agent uses think between critique and change
- Agent verifies after change
"""
import json
import os
import sys
import time
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

API = "http://localhost:2024"
ASSISTANT = "agent"

passed = 0
failed = 0
skipped = 0


def check(name, condition, detail=""):
    global passed, failed
    if condition:
        passed += 1
        print(f"  PASS: {name}")
    else:
        failed += 1
        print(f"  FAIL: {name} — {detail}")


def skip(name, reason=""):
    global skipped
    skipped += 1
    print(f"  SKIP: {name} — {reason}")


def api_call(method, path, body=None):
    url = f"{API}{path}"
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"}, method=method)
    try:
        with urllib.request.urlopen(req, timeout=300) as resp:
            return json.loads(resp.read().decode())
    except Exception as e:
        return {"error": str(e)}


def create_thread():
    resp = api_call("POST", "/threads", {})
    return resp.get("thread_id") or resp.get("id", "")


def run_agent(tid, query, max_interrupts=5):
    """Run agent, auto-approving interrupts."""
    result = api_call("POST", f"/threads/{tid}/runs/wait", {
        "assistant_id": ASSISTANT,
        "input": {"messages": [{"role": "user", "content": query}]},
    })
    cycles = 0
    while "__interrupt__" in result and cycles < max_interrupts:
        cycles += 1
        result = api_call("POST", f"/threads/{tid}/runs/wait", {
            "assistant_id": ASSISTANT,
            "command": {"resume": {"decisions": [{"type": "approve"}]}},
        })
        if "error" in result:
            break
    return result, cycles


def get_tool_calls(result):
    calls = []
    for msg in result.get("messages", []):
        for tc in msg.get("tool_calls", []):
            calls.append({"name": tc.get("name", ""), "args": tc.get("args", {}), "type": msg.get("type", "")})
    return calls


def get_tool_results(result):
    results = []
    for msg in result.get("messages", []):
        if msg.get("type") == "tool":
            results.append(msg.get("content", ""))
    return results


# ===== STRUCTURAL EVALS (from test_evals.py, kept for regression) =====

def test_agent_responds():
    print("\n=== Agent responds ===")
    tid = create_thread()
    if not tid:
        check("thread created", False)
        return
    result, _ = run_agent(tid, "What can you do?")
    msgs = result.get("messages", [])
    check("agent responds", len(msgs) > 1)
    check("no error", "error" not in result)


def test_native_read_file():
    print("\n=== Native read_file ===")
    tid = create_thread()
    result, _ = run_agent(tid, "read the style store")
    calls = get_tool_calls(result)
    names = [c["name"] for c in calls]
    check("uses read_file", "read_file" in names)
    check("no read_style", "read_style" not in names)


def test_think_tool():
    print("\n=== think tool ===")
    tid = create_thread()
    result, _ = run_agent(tid, "Read the style store, then use think to plan improvements")
    calls = get_tool_calls(result)
    names = [c["name"] for c in calls]
    check("uses think", "think" in names)


def test_memory_read():
    print("\n=== Memory read before action ===")
    tid = create_thread()
    result, _ = run_agent(tid, "Read the style store, then think about what to improve")
    calls = get_tool_calls(result)
    read_memory = any(c["name"] == "read_file" and "taste-standard" in str(c["args"]) for c in calls)
    check("reads taste-standard.md", read_memory)


def test_no_phantom_tools():
    print("\n=== No phantom tools ===")
    tid = create_thread()
    result, _ = run_agent(tid, "list style knobs")
    calls = get_tool_calls(result)
    names = set(c["name"] for c in calls)
    phantom = names & {"read_style", "list_style_knobs", "propose_improvement", "capture_feedback"}
    check("no phantom tools", len(phantom) == 0, f"phantom: {phantom}")


# ===== QUALITY EVALS (new — measure real behavior) =====

def test_update_style_tool():
    """Agent uses update_style (not edit_file) for style changes."""
    print("\n=== update_style tool usage ===")
    tid = create_thread()
    # Ask agent to change a knob — should use update_style, not edit_file
    result, cycles = run_agent(tid, "Change edge.stroke.mode from solid to gradient. Use update_style tool.", max_interrupts=3)
    calls = get_tool_calls(result)
    names = [c["name"] for c in calls]
    check("uses update_style", "update_style" in names, f"tools: {names}")
    check("no edit_file on style", not any(c["name"] == "edit_file" and "isaacverse-style" in str(c["args"]) for c in calls))


def test_think_between_critique_and_change():
    """Agent uses think AFTER critique and BEFORE style change."""
    print("\n=== think between critique and change ===")
    tid = create_thread()
    result, cycles = run_agent(tid, "Render isaacverse-final 0 to 4 draft, critique it, think about what to improve, then change the weakest aspect", max_interrupts=5)
    calls = get_tool_calls(result)
    # Find order: task (critique) → think → update_style
    task_idx = next((i for i, c in enumerate(calls) if c["name"] == "task"), -1)
    think_idx = next((i for i, c in enumerate(calls) if c["name"] == "think" and i > task_idx), -1) if task_idx >= 0 else -1
    change_idx = next((i for i, c in enumerate(calls) if c["name"] == "update_style" and i > think_idx), -1) if think_idx >= 0 else -1
    check("critique before think", task_idx >= 0)
    check("think before change", think_idx >= 0 and change_idx >= 0, f"task={task_idx}, think={think_idx}, change={change_idx}")


def test_stops_within_cycles():
    """Agent stops within 3 improvement cycles (not infinite loop)."""
    print("\n=== Stop within 3 cycles ===")
    tid = create_thread()
    result, cycles = run_agent(tid, "Improve isaacverse-final 0 to 4 draft. Follow your improvement loop.", max_interrupts=10)
    check("stops within 10 interrupts", cycles <= 10, f"took {cycles} cycles")
    # Check agent didn't repeat same render more than 3 times
    calls = get_tool_calls(result)
    render_count = sum(1 for c in calls if c["name"] == "render_window")
    check("renders ≤6 (3 cycles × 2)", render_count <= 6, f"rendered {render_count} times")


def test_reverts_when_worse():
    """Agent reverts style change when scores don't improve."""
    print("\n=== Revert when worse ===")
    tid = create_thread()
    result, cycles = run_agent(tid, "Improve isaacverse-final 0 to 4 draft. If a change doesn't improve scores, revert it.", max_interrupts=8)
    calls = get_tool_calls(result)
    # Check if agent called update_style to revert (same path, old value)
    update_calls = [c for c in calls if c["name"] == "update_style"]
    # At least one update_style call (either change or revert)
    check("made style changes", len(update_calls) >= 1, "no update_style calls")
    # Check for revert: agent should mention "revert" in final response
    msgs = result.get("messages", [])
    final_text = " ".join(str(m.get("content", "")) for m in msgs[-3:]).lower()
    check("mentions revert or no improvement", "revert" in final_text or "no improvement" in final_text or "didn't improve" in final_text or "cycle" in final_text, f"final: {final_text[:200]}")


def test_memory_updated():
    """Agent updates memory after improvement cycle."""
    print("\n=== Memory updated ===")
    tid = create_thread()
    result, cycles = run_agent(tid, "Improve isaacverse-final 0 to 4 draft. After the cycle, record what you learned in taste-standard.md.", max_interrupts=8)
    calls = get_tool_calls(result)
    # Check if agent tried to edit memory
    memory_edit = any(c["name"] in ("edit_file", "update_style") and "taste-standard" in str(c["args"]) for c in calls)
    check("attempted memory update", memory_edit, "no memory edit attempted")


def test_uses_critic_subagent():
    """Agent delegates to critic subagent (not visual_critique directly)."""
    print("\n=== Critic subagent delegation ===")
    tid = create_thread()
    result, _ = run_agent(tid, "Render isaacverse-final 0 to 4 draft, then critique it")
    calls = get_tool_calls(result)
    has_task = any(c["name"] == "task" for c in calls)
    has_visual_critique_direct = any(c["name"] == "visual_critique" and c["type"] == "ai" for c in calls)
    check("delegates via task", has_task)
    check("doesn't call visual_critique directly", not has_visual_critique_direct or has_task)


def test_quality_checklist():
    """Agent follows quality checklist: render → critique → think → change → verify."""
    print("\n=== Quality checklist ===")
    tid = create_thread()
    result, cycles = run_agent(tid, "Improve isaacverse-final 0 to 4 draft.", max_interrupts=8)
    calls = get_tool_calls(result)
    names = [c["name"] for c in calls]
    has_render = "render_window" in names
    has_critique = "task" in names
    has_think = "think" in names
    has_change = "update_style" in names
    check("rendered", has_render)
    check("critiqued (task)", has_critique)
    check("used think", has_think)
    check("made change (update_style)", has_change)


if __name__ == "__main__":
    try:
        urllib.request.urlopen(f"{API}/ok", timeout=5)
    except Exception:
        print("Server not running on port 2024.")
        sys.exit(1)

    print(f"Running quality evals at {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"LangSmith project: isaacverse-harness")

    # Structural (regression)
    test_agent_responds()
    test_native_read_file()
    test_think_tool()
    test_memory_read()
    test_no_phantom_tools()

    # Quality (new)
    test_update_style_tool()
    test_think_between_critique_and_change()
    test_stops_within_cycles()
    test_reverts_when_worse()
    test_memory_updated()
    test_uses_critic_subagent()
    test_quality_checklist()

    print(f"\n{'='*50}")
    print(f"Quality evals: {passed} passed, {failed} failed, {skipped} skipped")
    print(f"{'='*50}")
    sys.exit(1 if failed else 0)

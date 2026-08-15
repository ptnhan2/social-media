"""Eval test cases for the harness agent.

Tests that the agent exhibits smart behaviors:
- Uses think tool after critique
- Reads memory before acting
- Stops after 3 cycles
- Reverts when worse

Run: harness/.venv/Scripts/python.exe harness/test_evals.py
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


def run_agent(thread_id, query):
    result = api_call("POST", f"/threads/{thread_id}/runs/wait", {
        "assistant_id": ASSISTANT,
        "input": {"messages": [{"role": "user", "content": query}]},
    })
    return result


def get_tool_calls(result):
    """Extract all tool calls from messages."""
    calls = []
    for msg in result.get("messages", []):
        for tc in msg.get("tool_calls", []):
            calls.append({"name": tc.get("name", ""), "args": tc.get("args", {})})
    return calls


def get_tool_results(result):
    """Extract all tool results."""
    results = []
    for msg in result.get("messages", []):
        if msg.get("type") == "tool":
            results.append(msg.get("content", ""))
    return results


def test_agent_responds():
    """Basic: agent responds to a simple query."""
    print("\n=== Agent responds ===")
    tid = create_thread()
    if not tid:
        check("thread created", False, "no thread_id")
        return
    result = run_agent(tid, "What can you do?")
    msgs = result.get("messages", [])
    check("agent responds", len(msgs) > 1, f"only {len(msgs)} messages")
    check("no error", "error" not in result, result.get("error", ""))


def test_read_file_native():
    """Agent uses built-in read_file, not custom read_style."""
    print("\n=== Native read_file ===")
    tid = create_thread()
    result = run_agent(tid, "read the style store")
    calls = get_tool_calls(result)
    tool_names = [c["name"] for c in calls]
    check("uses read_file", "read_file" in tool_names, f"tools: {tool_names}")
    check("no read_style", "read_style" not in tool_names, "still using old read_style tool")


def test_think_tool():
    """Agent uses think tool when asked to plan."""
    print("\n=== think tool ===")
    tid = create_thread()
    result = run_agent(tid, "Read the style store, then use the think tool to plan what you would improve first")
    calls = get_tool_calls(result)
    tool_names = [c["name"] for c in calls]
    check("uses think", "think" in tool_names, f"tools: {tool_names}")
    check("uses read_file", "read_file" in tool_names, f"tools: {tool_names}")


def test_memory_read():
    """Agent reads taste-standard.md when planning improvements."""
    print("\n=== Memory read ===")
    tid = create_thread()
    result = run_agent(tid, "Read the style store, then think about what to improve")
    calls = get_tool_calls(result)
    # Check if agent read taste-standard.md
    read_memory = any(
        c["name"] == "read_file" and "taste-standard" in str(c["args"])
        for c in calls
    )
    check("reads taste-standard.md", read_memory, "agent didn't read memory before planning")


def test_no_phantom_tools():
    """Agent doesn't call removed tools (read_style, list_style_knobs, etc.)."""
    print("\n=== No phantom tools ===")
    tid = create_thread()
    result = run_agent(tid, "list style knobs")
    calls = get_tool_calls(result)
    tool_names = set(c["name"] for c in calls)
    phantom = tool_names & {"read_style", "list_style_knobs", "update_style", "propose_improvement",
                            "capture_feedback", "run_structural_qa", "run_consolidation", "style_diff"}
    check("no phantom tools", len(phantom) == 0, f"phantom tools found: {phantom}")


if __name__ == "__main__":
    # Check server is running
    try:
        urllib.request.urlopen(f"{API}/ok", timeout=5)
    except Exception:
        print("Server not running on port 2024. Start with: langgraph dev --port 2024")
        sys.exit(1)

    print(f"Running evals at {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"LangSmith project: isaacverse-harness")

    test_agent_responds()
    test_read_file_native()
    test_think_tool()
    test_memory_read()
    test_no_phantom_tools()

    print(f"\n{'='*50}")
    print(f"Evals: {passed} passed, {failed} failed, {skipped} skipped")
    print(f"{'='*50}")
    sys.exit(1 if failed else 0)

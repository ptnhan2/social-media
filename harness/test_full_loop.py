"""Full loop test: render → critic → think → edit_file (interrupt) → approve → re-render → verify → learn.

Handles interrupts via LangGraph API: when agent pauses for approval,
this script responds with 'approve' and continues.
"""
import json
import urllib.request
import time

API = "http://localhost:2024"
ASSISTANT = "agent"


def api_call(method, path, body=None):
    url = f"{API}{path}"
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"}, method=method)
    try:
        with urllib.request.urlopen(req, timeout=300) as resp:
            return json.loads(resp.read().decode())
    except Exception as e:
        return {"error": str(e)}


def print_messages(result):
    msgs = result.get("messages", [])
    for m in msgs:
        c = m.get("content", "")
        t = m.get("type", "?")
        tc = m.get("tool_calls", [])
        if tc:
            for item in tc:
                n = item.get("name", "?")
                a = str(item.get("args", ""))[:120]
                print(f"  [{t}] TOOL: {n}({a})")
        elif c and len(str(c)) > 5:
            print(f"  [{t}] {str(c)[:250]}")
    # Check for interrupts
    interrupts = result.get("__interrupt__", [])
    if interrupts:
        print(f"\n  ⏸ INTERRUPT: {len(interrupts)} pending")
        for item in interrupts:
            val = item.get("value", item) if isinstance(item, dict) else getattr(item, "value", str(item))
            print(f"    {str(val)[:200]}")


def run_full_loop():
    # 1. Create thread
    thread = api_call("POST", "/threads", {})
    print(f"Thread response: {json.dumps(thread)[:200]}")
    thread_id = thread.get("thread_id") or thread.get("id", "")
    if not thread_id:
        print(f"ERROR: No thread_id in response: {thread}")
        return
    print(f"Thread: {thread_id}")

    # 2. Send improvement request
    query = "Improve the isaacverse-final video. Render 0 to 4 seconds draft, critique it, then improve the weakest aspect. Follow the full improvement loop from your memory."
    print(f"\n{'='*60}")
    print(f"STEP 1: Send improvement request")
    print(f"{'='*60}")
    result = api_call("POST", f"/threads/{thread_id}/runs/wait", {
        "assistant_id": ASSISTANT,
        "input": {"messages": [{"role": "user", "content": query}]},
    })
    print_messages(result)

    # 3. Handle interrupts (approve style changes)
    cycle = 0
    while "__interrupt__" in result and cycle < 10:
        cycle += 1
        print(f"\n{'='*60}")
        print(f"STEP {cycle + 1}: Approve interrupt #{cycle}")
        print(f"{'='*60}")

        # Resume with approve
        result = api_call("POST", f"/threads/{thread_id}/runs/wait", {
            "assistant_id": ASSISTANT,
            "command": {"resume": {"decisions": [{"type": "approve"}]}},
        })
        print_messages(result)

        if "error" in result:
            print(f"ERROR: {result['error']}")
            break

    # 4. Final result
    print(f"\n{'='*60}")
    print(f"FINAL RESULT")
    print(f"{'='*60}")
    msgs = result.get("messages", [])
    if msgs:
        last = msgs[-1]
        content = last.get("content", "")
        if content:
            print(f"  Agent final response: {str(content)[:500]}")
    print(f"\nTotal messages: {len(msgs)}")
    print(f"Total interrupt cycles: {cycle}")

    # 5. Check if memory was updated
    print(f"\n{'='*60}")
    print(f"CHECK: Memory updated?")
    print(f"{'='*60}")
    # Read taste-standard.md to see if new principle was added
    mem_result = api_call("POST", f"/threads", {})
    mem_thread = mem_result.get("thread_id", "")
    if mem_thread:
        mem_check = api_call("POST", f"/threads/{mem_thread}/runs/wait", {
            "assistant_id": ASSISTANT,
            "input": {"messages": [{"role": "user", "content": "read /memories/taste-standard.md and tell me if any new principles were added recently"}]},
        })
        mem_msgs = mem_check.get("messages", [])
        for m in mem_msgs[-2:]:
            c = m.get("content", "")
            if c and len(str(c)) > 10:
                print(f"  {str(c)[:300]}")


if __name__ == "__main__":
    print("Starting full loop test with LangSmith tracing...")
    print(f"Time: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    run_full_loop()
    print(f"\nDone. Check LangSmith: https://smith.langchain.com")
    print(f"Project: isaacverse-harness")

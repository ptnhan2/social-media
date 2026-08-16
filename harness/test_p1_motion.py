"""P1-TEST: Improve motion on segment 3.5-7s (semantic-diagram).

Test: render → critique → think → change entrance.damping → approve → re-render → critique → verify.
"""
import json, urllib.request, time

API = "http://localhost:2024"

def api(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(f"{API}{path}", data=data, headers={"Content-Type": "application/json"}, method=method)
    with urllib.request.urlopen(req, timeout=300) as resp:
        return json.loads(resp.read().decode())

def run(tid, query, max_interrupts=5):
    result = api("POST", f"/threads/{tid}/runs/wait", {
        "assistant_id": "agent",
        "input": {"messages": [{"role": "user", "content": query}]},
    })
    cycles = 0
    while "__interrupt__" in result and cycles < max_interrupts:
        cycles += 1
        print(f"  Interrupt {cycles} — approving...")
        result = api("POST", f"/threads/{tid}/runs/wait", {
            "assistant_id": "agent",
            "command": {"resume": {"decisions": [{"type": "approve"}]}},
        })
        if "error" in result:
            print(f"  ERROR: {result['error'][:200]}")
            break
    return result, cycles

def print_summary(result, cycles):
    msgs = result.get("messages", [])
    tool_calls = []
    for m in msgs:
        for tc in m.get("tool_calls", []):
            tool_calls.append(tc.get("name", ""))
        c = m.get("content", "")
        t = m.get("type", "")
        if t == "ai" and c and len(str(c)) > 20:
            print(f"  [AI] {str(c)[:300]}")
        elif t == "tool" and c and len(str(c)) > 20:
            # Show critique scores if found
            lower = str(c).lower()
            if "motion" in lower or "score" in lower or "composition" in lower:
                print(f"  [CRITIQUE] {str(c)[:300]}")
    print(f"\n  Tool calls: {tool_calls}")
    print(f"  Total tool calls: {len(tool_calls)}")
    print(f"  Interrupt cycles: {cycles}")
    # Check for update_style calls
    updates = [i for i, t in enumerate(tool_calls) if t == "update_style"]
    print(f"  update_style calls: {len(updates)} at positions {updates}")

# Test
tid = api("POST", "/threads", {}).get("thread_id", "")
print(f"Thread: {tid}")
print(f"\n{'='*60}")
print(f"TEST: Improve motion on segment 3.5-7s (semantic-diagram)")
print(f"{'='*60}")

query = "Improve the isaacverse-final video segment 3.5 to 7 seconds. This is a semantic-diagram treatment. Read the style-knobs skill first, then render, critique, think, and improve the weakest aspect using update_style. Follow the improvement loop exactly."
print(f"Query: {query}\n")

start = time.time()
result, cycles = run(tid, query)
elapsed = time.time() - start

print(f"\n{'='*60}")
print(f"RESULTS ({elapsed:.0f}s)")
print(f"{'='*60}")
print_summary(result, cycles)

# Final message
msgs = result.get("messages", [])
if msgs:
    last = msgs[-1]
    c = last.get("content", "")
    if c:
        print(f"\nFinal response:\n{str(c)[:500]}")

"""P1-5: Test improvement — render + critique with frame pairs."""
import json, urllib.request

API = "http://localhost:2024"

def api(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(f"{API}{path}", data=data, headers={"Content-Type": "application/json"}, method=method)
    with urllib.request.urlopen(req, timeout=300) as resp:
        return json.loads(resp.read().decode())

tid = api("POST", "/threads", {}).get("thread_id", "")
print(f"Thread: {tid}")

print("Step 1: Render + critique baseline (with frame pairs)...")
r = api("POST", f"/threads/{tid}/runs/wait", {
    "assistant_id": "agent",
    "input": {"messages": [{"role": "user", "content": "Render isaacverse-final 0 to 4 draft. Then use the critic subagent to critique it. Report the scores."}]},
})
for m in r.get("messages", []):
    c = m.get("content", "")
    t = m.get("type", "?")
    tc = m.get("tool_calls", [])
    if tc:
        for item in tc:
            n = item.get("name", "?")
            a = str(item.get("args", ""))[:100]
            print(f"  [{t}] TOOL: {n}({a})")
    elif c and len(str(c)) > 20:
        print(f"  [{t}] {str(c)[:250]}")

# Check for interrupts
if "__interrupt__" in r:
    print("\nInterrupt detected — approving...")
    r2 = api("POST", f"/threads/{tid}/runs/wait", {
        "assistant_id": "agent",
        "command": {"resume": {"decisions": [{"type": "approve"}]}},
    })
    for m in r2.get("messages", [])[-3:]:
        c = m.get("content", "")
        if c and len(str(c)) > 20:
            print(f"  [{m.get('type')}] {str(c)[:250]}")

print("\nDone. Check LangSmith for full trace.")

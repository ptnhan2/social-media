"""Full improvement loop test — verify scores actually improve."""
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
            break
    return result, cycles

# Step 1: Baseline — render + critique segment 3.5-7s
tid = api("POST", "/threads", {})["thread_id"]
print(f"Thread: {tid}")
print(f"\n{'='*60}")
print("STEP 1: Baseline render + critique (segment 3.5-7s)")
print(f"{'='*60}")

result, cycles = run(tid, "Render isaacverse-final 3.5 to 7 draft. Then use the critic subagent to critique it. Report the scores only.")
msgs = result.get("messages", [])
baseline_scores = ""
for m in msgs:
    c = m.get("content", "")
    t = m.get("type", "")
    if t == "tool" and c:
        lower = str(c).lower()
        if "motion" in lower or "composition" in lower:
            print(f"  [CRITIQUE] {str(c)[:400]}")
            baseline_scores = str(c)
    elif t == "ai" and c and len(str(c)) > 20:
        print(f"  [AI] {str(c)[:300]}")
print(f"  Tool calls: {sum(len(m.get('tool_calls', [])) for m in msgs)} | Interrupts: {cycles}")

# Step 2: Improve — change entrance.damping
print(f"\n{'='*60}")
print("STEP 2: Improve motion (entrance.damping 18->10)")
print(f"{'='*60}")

tid2 = api("POST", "/threads", {})["thread_id"]
result2, cycles2 = run(tid2, "Read the style store, then use update_style to change treatments.semantic-diagram.entrance.damping from 18 to 10. This should make the entrance animation bouncier and improve motion.")
msgs2 = result2.get("messages", [])
for m in msgs2:
    c = m.get("content", "")
    t = m.get("type", "")
    tc = m.get("tool_calls", [])
    if tc:
        for item in tc:
            print(f"  [{t}] {item.get('name')}({str(item.get('args',''))[:100]})")
    elif t == "tool" and c:
        print(f"  [RESULT] {str(c)[:200]}")
    elif t == "ai" and c and len(str(c)) > 20:
        print(f"  [AI] {str(c)[:300]}")
print(f"  Tool calls: {sum(len(m.get('tool_calls', [])) for m in msgs2)} | Interrupts: {cycles2}")

# Step 3: Re-render + critique with new style
print(f"\n{'='*60}")
print("STEP 3: Re-render + critique with new style (damping=10)")
print(f"{'='*60}")

tid3 = api("POST", "/threads", {})["thread_id"]
result3, cycles3 = run(tid3, "Render isaacverse-final 3.5 to 7 draft. Then use the critic subagent to critique it. Report the scores only.")
msgs3 = result3.get("messages", [])
after_scores = ""
for m in msgs3:
    c = m.get("content", "")
    t = m.get("type", "")
    if t == "tool" and c:
        lower = str(c).lower()
        if "motion" in lower or "composition" in lower:
            print(f"  [CRITIQUE] {str(c)[:400]}")
            after_scores = str(c)
    elif t == "ai" and c and len(str(c)) > 20:
        print(f"  [AI] {str(c)[:300]}")
print(f"  Tool calls: {sum(len(m.get('tool_calls', [])) for m in msgs3)} | Interrupts: {cycles3}")

# Summary
print(f"\n{'='*60}")
print("SUMMARY")
print(f"{'='*60}")
print(f"Baseline scores: {baseline_scores[:200]}")
print(f"After scores:    {after_scores[:200]}")

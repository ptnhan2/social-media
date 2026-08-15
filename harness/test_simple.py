"""Test simplified agent: read style, delegate to critic."""
import json, urllib.request

# Test 1: read style store via native read_file
req = urllib.request.Request("http://localhost:2024/threads", data=b"{}", headers={"Content-Type": "application/json"}, method="POST")
resp = json.loads(urllib.request.urlopen(req, timeout=10).read())
thread_id = resp["thread_id"]

payload = json.dumps({
    "assistant_id": "agent",
    "input": {"messages": [{"role": "user", "content": "read the style store and tell me the edge stroke mode"}]},
}).encode()
req2 = urllib.request.Request(
    f"http://localhost:2024/threads/{thread_id}/runs/wait",
    data=payload, headers={"Content-Type": "application/json"}, method="POST")
print("Test 1: read style store...")
resp2 = json.loads(urllib.request.urlopen(req2, timeout=120).read())
msgs = resp2.get("messages", [])
for m in msgs[-2:]:
    c = m.get("content", "")
    t = m.get("type", "?")
    if c and len(str(c)) > 10:
        print(f"  [{t}] {str(c)[:200]}")

# Test 2: delegate to critic subagent
print("\nTest 2: delegate to critic...")
req3 = urllib.request.Request("http://localhost:2024/threads", data=b"{}", headers={"Content-Type": "application/json"}, method="POST")
resp3 = json.loads(urllib.request.urlopen(req3, timeout=10).read())
thread_id2 = resp3["thread_id"]

payload2 = json.dumps({
    "assistant_id": "agent",
    "input": {"messages": [{"role": "user", "content": "Use the critic subagent to analyze /workspace/projects/isaacverse-final/renders/windows/isaacverse-final-draft-0.00-3.95.mp4"}]},
}).encode()
req4 = urllib.request.Request(
    f"http://localhost:2024/threads/{thread_id2}/runs/wait",
    data=payload2, headers={"Content-Type": "application/json"}, method="POST")
resp4 = json.loads(urllib.request.urlopen(req4, timeout=180).read())
msgs2 = resp4.get("messages", [])
for m in msgs2:
    c = m.get("content", "")
    t = m.get("type", "?")
    tc = m.get("tool_calls", [])
    if tc:
        for tc_item in tc:
            print(f"  [{t}] TOOL: {tc_item.get('name')}({str(tc_item.get('args',''))[:80]})")
    elif c and len(str(c)) > 10:
        print(f"  [{t}] {str(c)[:200]}")

print("\nDone.")

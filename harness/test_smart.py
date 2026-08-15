"""Test smart agent: think_tool + improvement loop."""
import json, urllib.request

req = urllib.request.Request("http://localhost:2024/threads", data=b"{}", headers={"Content-Type": "application/json"}, method="POST")
resp = json.loads(urllib.request.urlopen(req, timeout=10).read())
thread_id = resp["thread_id"]

# Test: ask agent to think strategically
payload = json.dumps({
    "assistant_id": "agent",
    "input": {"messages": [{"role": "user", "content": "Read the style store, then use think to plan what you would improve first and why"}]},
}).encode()
req2 = urllib.request.Request(
    f"http://localhost:2024/threads/{thread_id}/runs/wait",
    data=payload, headers={"Content-Type": "application/json"}, method="POST")
print("Testing think_tool...")
resp2 = json.loads(urllib.request.urlopen(req2, timeout=120).read())
msgs = resp2.get("messages", [])
for m in msgs:
    c = m.get("content", "")
    t = m.get("type", "?")
    tc = m.get("tool_calls", [])
    if tc:
        for tc_item in tc:
            name = tc_item.get("name", "?")
            args = str(tc_item.get("args", ""))[:150]
            print(f"  [{t}] TOOL: {name}({args})")
    elif c and len(str(c)) > 10:
        print(f"  [{t}] {str(c)[:250]}")
print("\nDone.")

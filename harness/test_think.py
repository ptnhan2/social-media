"""Test think tool — agent should use think() to reason."""
import json, urllib.request

req = urllib.request.Request("http://localhost:2024/threads", data=b"{}", headers={"Content-Type": "application/json"}, method="POST")
resp = json.loads(urllib.request.urlopen(req, timeout=10).read())
tid = resp["thread_id"]

payload = json.dumps({
    "assistant_id": "agent",
    "input": {"messages": [{"role": "user", "content": "Read the style store, then use the think tool to plan what you would improve first"}]},
}).encode()
req2 = urllib.request.Request(
    f"http://localhost:2024/threads/{tid}/runs/wait",
    data=payload, headers={"Content-Type": "application/json"}, method="POST")
print("Testing think tool...")
r = json.loads(urllib.request.urlopen(req2, timeout=120).read())
msgs = r.get("messages", [])
print(f"Got {len(msgs)} messages")
for m in msgs:
    c = m.get("content", "")
    t = m.get("type", "?")
    tc = m.get("tool_calls", [])
    if tc:
        for item in tc:
            n = item.get("name", "?")
            a = str(item.get("args", ""))[:150]
            print(f"  [{t}] TOOL: {n}({a})")
    elif c and len(str(c)) > 5:
        print(f"  [{t}] {str(c)[:250]}")

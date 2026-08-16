"""Quick verify: render 3.5-7s + critique with current style (damping=12, duration=1.5, gradient)."""
import json, urllib.request

API = "http://localhost:2024"
tid = json.loads(urllib.request.urlopen(urllib.request.Request(
    f"{API}/threads", data=b"{}", headers={"Content-Type": "application/json"}, method="POST"), timeout=10).read())["thread_id"]

payload = json.dumps({"assistant_id": "agent", "input": {"messages": [{"role": "user", "content": "Render isaacverse-final 3.5 to 7 draft, then use the critic subagent to critique it. Report scores only."}]}}).encode()
req = urllib.request.Request(f"{API}/threads/{tid}/runs/wait", data=payload, headers={"Content-Type": "application/json"}, method="POST")
print("Rendering + critiquing 3.5-7s...")
r = json.loads(urllib.request.urlopen(req, timeout=300).read())
for m in r.get("messages", []):
    c = m.get("content", "")
    t = m.get("type", "")
    tc = m.get("tool_calls", [])
    if tc:
        for item in tc:
            n = item.get("name", "?")
            a = str(item.get("args", ""))[:80]
            print(f"  [{t}] {n}({a})")
    elif c and len(str(c)) > 20:
        print(f"  [{t}] {str(c)[:300]}")

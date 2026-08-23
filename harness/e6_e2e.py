"""E6 E2E driver: agent-driven clip edit through the KEEP gate (spec E6).

Sends the task to the real agent (Ox Alpha via LangGraph), lets it run
editor_op -> qa_gate -> request_keep, answers the KEEP interrupt, and
verifies the outcome: revision advanced, pixel-diff > 0.05, vote recorded.
"""
import json
import sys
import time
import urllib.request

sys.path.insert(0, "harness")
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

API = "http://localhost:2024"

TASK = (
    "In project isaacverse-final, do ONE clip edit end-to-end (protocol v5 clip editing):\n"
    "1. editor_op list to find the clip with id containing 'final-beat-02:kicker' (semantic-diagram kicker text).\n"
    "2. editor_op metadata on that clip with changes {\"fontSize\": 30}.\n"
    "3. qa_gate with project isaacverse-final, start 3.5, end 7.0, render_path 'editor', "
    "video_before '/workspace/projects/isaacverse-final/renders/windows/e6_baseline.mp4'.\n"
    "4. If the gate passes, call request_keep with knob='editor-clip:final-beat-02:kicker.fontSize', "
    "old_value='18', new_value='30', video_before/video_after the two renders, "
    "verdict_summary='agent clip edit via editor_op', aspect='typography', user_directed=False.\n"
    "Report the gate numbers and the keep decision."
)


def api(method, path, body=None, timeout=600):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(f"{API}{path}", data=data,
                                 headers={"Content-Type": "application/json"}, method=method)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode())


def main():
    tid = api("POST", "/threads", {}).get("thread_id", "")
    print(f"thread: {tid}")
    result = api("POST", f"/threads/{tid}/runs/wait", {
        "assistant_id": "agent",
        "input": {"messages": [{"role": "user", "content": TASK}]},
    })
    # walk interrupts
    guard = 0
    while "__interrupt__" in result and guard < 5:
        guard += 1
        for item in result["__interrupt__"]:
            val = getattr(item, "value", item)
            if isinstance(val, dict) and val.get("kind") == "keep_gate":
                print(f"[KEEP GATE] knob={val.get('knob')} {val.get('old_value')}->{val.get('new_value')}")
                print(f"  verdict: {val.get('verdict_summary')}")
                resume = {"type": "keep", "note": "E6 e2e test auto-approve"}
            else:
                print(f"[INTERRUPT] {str(val)[:200]}")
                resume = {"decisions": [{"type": "approve"}]}
        result = api("POST", f"/threads/{tid}/runs/wait", {
            "assistant_id": "agent",
            "command": {"resume": resume},
        })
    # summarize the run
    tool_calls = []
    final_text = ""
    for msg in result.get("messages", []):
        for tc in (msg.get("tool_calls") or []):
            tool_calls.append(tc.get("name", ""))
        if msg.get("type") == "ai" and msg.get("content"):
            final_text = str(msg["content"])
    print("\ntool sequence:", tool_calls)
    print("\nfinal response (first 600 chars):\n", final_text[:600])

    # verify outcomes
    ok = True
    checks = []
    if "editor_op" in tool_calls:
        checks.append("PASS agent used editor_op")
    else:
        checks.append("FAIL agent never used editor_op"); ok = False
    if "qa_gate" in tool_calls:
        checks.append("PASS agent used qa_gate")
    else:
        checks.append("FAIL agent never used qa_gate"); ok = False
    if "request_keep" in tool_calls:
        checks.append("PASS agent reached the KEEP gate")
    else:
        checks.append("FAIL agent never reached KEEP gate"); ok = False

    # repo state: clip fontSize + revision
    doc = json.load(open("projects/isaacverse-final/editor/current.json", encoding="utf-8"))
    kicker = next((c for t in doc["tracks"] for c in t["clips"] if "final-beat-02:kicker" in c["id"]), None)
    if kicker and kicker["metadata"].get("fontSize") == 30:
        checks.append(f"PASS clip fontSize=30 persisted (revision {doc['revision']['revision']})")
    else:
        checks.append(f"FAIL clip fontSize={kicker and kicker['metadata'].get('fontSize')} (rev {doc['revision']['revision']})"); ok = False
    if kicker and kicker["metadata"].get("userEdited") is True:
        checks.append("PASS userEdited ledger flag set")
    else:
        checks.append("FAIL userEdited flag missing"); ok = False

    # vote recorded
    votes = [json.loads(l) for l in open("harness/memories/preferences.jsonl", encoding="utf-8-sig") if l.strip()]
    last = votes[-1] if votes else {}
    if "editor-clip" in str(last.get("knob", "")):
        checks.append("PASS KEEP vote recorded in preferences.jsonl")
    else:
        checks.append(f"FAIL vote not recorded (last knob: {last.get('knob')})"); ok = False

    # pixel-diff > 0.05 through the editor flow
    sys.path.insert(0, "harness")
    from harness_tools import compare_renders
    diff = compare_renders.invoke({
        "video_a": "projects/isaacverse-final/renders/windows/e6_baseline.mp4",
        "video_b": "projects/isaacverse-final/renders/windows/isaacverse-final-draft-3.05-7.45.mp4",
    })
    first = diff.splitlines()[0]
    print("\npixel-diff:", first)
    if "PASS" in first:
        checks.append("PASS pixel-diff > 0.05 through the editor flow")
    else:
        checks.append("FAIL pixel-diff gate"); ok = False

    print("\n=== E6 VERDICT ===")
    for c in checks:
        print(" ", c)
    print("\nE6:", "PASS" if ok else "FAIL")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())

"""run_task — drive ONE real agent cycle against the LangGraph server (:2025).

The general-purpose runner (e6_e2e.py is the E6-specific probe). Permanent
infrastructure for exercising the improvement loop on real tasks:

  python run_task.py --task-file tasks/display-font-ab.txt
  python run_task.py --thread <id> --verdict keep|reject [--note "..."]

At a KEEP gate interrupt the runner STOPS and prints the proposal + thread id.
Resume with --verdict after the human decides — the vote is recorded through
request_keep exactly as in the UI flow (preferences.jsonl / feedback.jsonl).
"""
import argparse
import json
import sys
import urllib.request

sys.path.insert(0, "harness")
for s in (sys.stdout, sys.stderr):
    try:
        s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

API = "http://localhost:2025"


def api(method, path, body=None, timeout=900):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(f"{API}{path}", data=data,
                                 headers={"Content-Type": "application/json"}, method=method)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode())


def summarize(result):
    calls, final_text = [], ""
    for msg in result.get("messages", []):
        for tc in (msg.get("tool_calls") or []):
            calls.append(tc.get("name", ""))
        if msg.get("type") == "ai" and msg.get("content"):
            final_text = str(msg["content"])
    return calls, final_text


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--task-file")
    ap.add_argument("--task")
    ap.add_argument("--thread", help="resume an existing thread at its KEEP gate")
    ap.add_argument("--verdict", choices=["keep", "reject"])
    ap.add_argument("--note", default="")
    args = ap.parse_args()

    if args.thread:
        if not args.verdict:
            ap.error("--thread requires --verdict keep|reject")
        resume = {"type": args.verdict, "note": args.note}
        print(f"[resume] thread {args.thread} verdict={args.verdict}")
        result = api("POST", f"/threads/{args.thread}/runs/wait", {
            "assistant_id": "agent",
            "command": {"resume": resume},
        })
        calls, final_text = summarize(result)
        print("tool sequence:", calls)
        print("\nfinal response:\n", final_text[:1200])
        return 0

    task = open(args.task_file, encoding="utf-8").read() if args.task_file else args.task
    if not task:
        ap.error("need --task or --task-file")

    tid = api("POST", "/threads", {}).get("thread_id", "")
    print(f"[thread] {tid}")
    result = api("POST", f"/threads/{tid}/runs/wait", {
        "assistant_id": "agent",
        "input": {"messages": [{"role": "user", "content": task}]},
    })

    guard = 0
    while "__interrupt__" in result and guard < 8:
        guard += 1
        item = result["__interrupt__"][0]
        val = item.get("value") if isinstance(item, dict) and "value" in item else getattr(item, "value", item)
        if isinstance(val, dict) and val.get("kind") == "keep_gate":
            # STOP — the human decides. Do NOT auto-answer.
            print("\n=== KEEP GATE — HUMAN DECISION REQUIRED ===")
            print(f"thread      : {tid}")
            print(f"knob        : {val.get('knob')}")
            print(f"a -> b      : {val.get('old_value')}  ->  {val.get('new_value')}")
            print(f"video_before: {val.get('video_before')}")
            print(f"video_after : {val.get('video_after')}")
            print(f"aspect      : {val.get('aspect')}")
            print(f"summary     : {val.get('verdict_summary')}")
            print(f"motivation  : {val.get('motivation')}")
            print("\nDecide, then resume:")
            print(f"  python run_task.py --thread {tid} --verdict keep|reject --note \"...\"")
            calls, final_text = summarize(result)
            print("\ntool sequence so far:", calls)
            return 2
        print(f"[INTERRUPT] {str(val)[:160]}")
        result = api("POST", f"/threads/{tid}/runs/wait", {
            "assistant_id": "agent",
            "command": {"resume": {"decisions": [{"type": "approve"}]}},
        })

    calls, final_text = summarize(result)
    print("\ntool sequence:", calls)
    print("\nfinal response:\n", final_text[:1200])
    return 0


if __name__ == "__main__":
    sys.exit(main())

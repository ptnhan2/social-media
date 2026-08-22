"""Online evaluators — auto-score new production traces in LangSmith.

Uses LangSmith NATIVE mechanisms only (per the no-custom-eval constraint):
- list_runs to fetch new traces from the isaacverse-harness project
- client.create_feedback to attach evaluator scores to runs (shows in UI +
  dashboards, exactly like UI-configured online evaluators)
- annotation queues to route low-scoring runs to human review

Evaluators applied to every new ROOT run (an agent conversation turn):
1. tool_discipline (code, deterministic from the trace):
   - reads memory before acting
   - runs qa_gate after any treatment-code edit
   - respects the 3-cycle cap
2. response_quality (LLM-as-judge, same judge as eval.py)

Run:  python harness/online_evaluators.py            (score + route)
      python harness/online_evaluators.py --status   (watermark + queue state)

Scheduling: run after each protocol session, or put on a timer
(`Register-ScheduledTask` / cron) — the watermark file makes it idempotent.
"""
from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# load .env without overriding real env
env_file = Path(__file__).parent.parent / ".env"
if env_file.exists():
    for line in env_file.read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.strip()
        if "=" in line and not line.startswith("#"):
            k, _, v = line.partition("=")
            v = v.strip()
            if "#" in v and not (v.startswith('"') or v.startswith("'")):
                v = v.split("#")[0].strip()
            if v and not os.environ.get(k.strip()):
                os.environ[k.strip()] = v

from langsmith import Client  # noqa: E402

PROJECT_NAME = "isaacverse-harness"
QUEUE_NAME = "render-review"
WATERMARK_FILE = Path(__file__).parent / ".online_eval_watermark.json"
LOW_SCORE_THRESHOLD = 0.7

MEMORY_TOOLS = ("read_file",)
EDIT_TOOLS = ("edit_file", "write_file")
TREATMENT_PATH_MARKERS = ("treatments.tsx", "/workspace/remotion-composer/shared")


def _load_watermark() -> str:
    try:
        data = json.loads(WATERMARK_FILE.read_text(encoding="utf-8-sig"))
        return data.get("last_run_ts", "")
    except (OSError, json.JSONDecodeError):
        # first run: only score the last 24h so we don't judge ancient history
        return time.strftime("%Y-%m-%dT%H:%M:%S+00:00", time.gmtime(time.time() - 86400))


def _save_watermark(ts: str) -> None:
    WATERMARK_FILE.write_text(json.dumps({"last_run_ts": ts}), encoding="utf-8")


def _flatten_messages(run) -> list[dict]:
    """Best-effort extraction of the run's IO messages (langsmith run dicts)."""
    inputs = run.get("inputs") or {}
    outputs = run.get("outputs") or {}
    msgs = []
    for io in (inputs, outputs):
        if isinstance(io, dict):
            chat = io.get("messages")
            if isinstance(chat, list):
                msgs.extend(m for m in chat if isinstance(m, dict))
    return msgs


def _run_field(run, field: str, default=None):
    """Read a field from a Run object or dict."""
    if isinstance(run, dict):
        return run.get(field, default)
    return getattr(run, field, default)


def eval_tool_discipline(run, child_runs) -> dict:
    """Deterministic trace checks (score 0-1)."""
    call_times = [(_run_field(c, "name", "") or "", _run_field(c, "start_time")) for c in child_runs]
    first_acting = next((t for n, t in call_times if n not in (*MEMORY_TOOLS, "think") and t), None)
    read_memory_first = any(n in MEMORY_TOOLS for n, t in call_times if first_acting is None or (t and t <= first_acting))

    edited_treatment = False
    for c in child_runs:
        if (_run_field(c, "name", "") or "") in EDIT_TOOLS:
            try:
                blob = json.dumps(_run_field(c, "inputs", {}) or {})
            except (TypeError, ValueError):
                blob = str(_run_field(c, "inputs", ""))
            if any(m in blob for m in TREATMENT_PATH_MARKERS):
                edited_treatment = True
                break
    ran_qa = any(n == "qa_gate" for n, _ in call_times)

    reasons = []
    if not read_memory_first:
        reasons.append("did not read memory before acting")
    if edited_treatment and not ran_qa:
        reasons.append("edited treatment code without qa_gate")

    score = 1.0 if not reasons else (0.5 if len(reasons) == 1 else 0.0)
    return {"key": "tool_discipline", "score": score,
            "comment": "OK" if not reasons else "; ".join(reasons)}


def eval_response_quality_online(run, child_runs) -> dict:
    """LLM-as-judge on the run's final output (same family as eval.py's judge)."""
    try:
        from openevals.llm import create_llm_as_judge
        judge = create_llm_as_judge(
            prompt="""You are evaluating a video editing agent's conversation turn.

Inputs (user query): {inputs}
Outputs (agent response): {outputs}

Score 1 if the response addresses the query, follows the protocol (reads
memory, uses think, honest about limits) and doesn't hallucinate. Else 0.

Return JSON: {{"score": 0 or 1, "comment": "brief"}}""",
            model=os.environ.get("EVAL_JUDGE_MODEL", "openai:glm-4-flash"),
            feedback_key="response_quality_online",
            use_reasoning=False,
        )
        inputs = _run_field(run, "inputs", {}) or {}
        outputs = _run_field(run, "outputs", {}) or {}
        return judge(inputs=inputs, outputs=outputs)
    except Exception as e:
        return {"key": "response_quality_online", "score": 0, "comment": f"Judge error: {e}"}


def _get_or_create_queue(client: Client):
    for q in client.list_annotation_queues():
        if q.name == QUEUE_NAME:
            return q
    return client.create_annotation_queue(name=QUEUE_NAME, description=(
        "Low-scoring agent runs routed for human review. Review at: "
        "LangSmith UI → Annotation Queues → render-review"))


def score_new_runs(client: Client) -> dict:
    from datetime import datetime
    watermark = _load_watermark()
    since = datetime.fromisoformat(watermark)
    # list_runs (sync, works until 2027) — same pattern as pull_eval_scores.py
    runs = [r for r in client.list_runs(project_name=PROJECT_NAME, is_root=True,
                                        start_time=since, error=False)]
    if not runs:
        return {"scored": 0, "routed": 0, "note": f"no new root runs since {watermark}"}

    queue = _get_or_create_queue(client)
    scored = routed = 0
    latest_ts = watermark
    for run in runs:
        children = list(client.list_runs(project_name=PROJECT_NAME, trace_id=run.trace_id))
        scores = [eval_tool_discipline(run, children), eval_response_quality_online(run, children)]
        for s in scores:
            fb_kwargs = {"run_id": run.id, "key": s["key"], "score": s["score"],
                         "comment": s.get("comment", "")}
            session_id = _run_field(run, "session_id")
            if session_id:
                fb_kwargs["session_id"] = session_id
            client.create_feedback(**fb_kwargs)
        avg = sum(s["score"] for s in scores) / max(len(scores), 1)
        scored += 1
        if avg < LOW_SCORE_THRESHOLD:
            client.add_runs_to_annotation_queue(queue_id=queue.id, run_ids=[run.id])
            routed += 1
        end = str(_run_field(run, "end_time") or "")
        if end > latest_ts:
            latest_ts = end
    _save_watermark(latest_ts)
    return {"scored": scored, "routed": routed, "watermark": latest_ts}


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if "--status" in sys.argv:
        print("watermark:", _load_watermark())
        client = Client()
        for q in client.list_annotation_queues():
            n = len(list(client.list_runs_from_annotation_queue(queue_id=q.id)))
            print(f"queue {q.name}: {n} run(s)")
        return 0
    client = Client()
    result = score_new_runs(client)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    if result.get("routed"):
        print(f"→ {result['routed']} low-scoring run(s) added to '{QUEUE_NAME}' for user review")
    return 0


if __name__ == "__main__":
    sys.exit(main())

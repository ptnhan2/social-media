"""Pull the latest eval experiment scores from LangSmith (new SDK paths)."""
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
for line in (Path(__file__).parent.parent / ".env").read_text(encoding="utf-8", errors="replace").splitlines():
    line = line.strip()
    if "=" in line and not line.startswith("#"):
        k, _, v = line.partition("=")
        v = v.strip()
        if "#" in v and not (v.startswith('"') or v.startswith("'")):
            v = v.split("#")[0].strip()
        if v:
            os.environ.setdefault(k.strip(), v)

from langsmith import Client

client = Client()
ds = list(client.list_datasets(dataset_name="isaacverse-harness-evals"))[0]
examples = list(client.list_examples(dataset_id=ds.id))
print(f"examples: {len(examples)}")

scores: dict[str, dict] = {}
failing = []
for ex in examples:
    targets = list(client.list_runs(reference_example=[ex.id]))
    if not targets:
        continue
    # only the LATEST experiment's run per example
    targets.sort(key=lambda r: str(getattr(r, "start_time", "")))
    latest = targets[-1]
    run_ids = [latest.id]
    try:
        kids = list(client.list_runs(parent_run=[latest.id]))
        run_ids.extend(k.id for k in kids)
    except Exception:
        pass
    try:
        feedback = list(client.list_feedback(run_ids=run_ids))
    except Exception as e:
        print(f"feedback fetch error: {e}")
        continue
    q = (ex.inputs or {}).get("query", "?")[:50]
    case_failed = False
    for f in feedback:
        key = f.key
        scores.setdefault(key, {"total": 0, "passed": 0})
        scores[key]["total"] += 1
        if f.score == 1:
            scores[key]["passed"] += 1
        else:
            case_failed = True
    if case_failed:
        fails = [f"{f.key}={f.score}" for f in feedback if f.score != 1]
        failing.append(f"case '{q}': {', '.join(fails)}")

print("=== EVAL SCORES (latest experiment) ===")
for key, d in sorted(scores.items()):
    print(f"  {key}: {d['passed']}/{d['total']} ({d['passed']/max(d['total'],1):.0%})")

print("\n=== failing cases ===")
for line in failing:
    print(f"  {line}")

out = Path(__file__).parent / "eval_scores.json"
out.write_text(json.dumps({"scores": scores, "failing": failing}, indent=1), encoding="utf-8")
print(f"\nwritten {out}")

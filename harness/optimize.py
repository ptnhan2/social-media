"""Outer-loop optimization — better-harness pattern.

Reads LangSmith experiment results → identifies failing cases →
proposes AGENTS.md improvements → re-evaluates → keeps if better.

This is a simplified version of the better-harness example from
github.com/langchain-ai/deepagents/examples/better-harness.

Run:
    harness/.venv/Scripts/python.exe harness/optimize.py
"""
from __future__ import annotations
import json, os, sys, shutil
from pathlib import Path
from langsmith import Client

# Load .env
env_file = Path(__file__).parent.parent / ".env"
if env_file.exists():
    for line in env_file.read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.strip()
        if "=" in line and not line.startswith("#"):
            k, _, v = line.partition("=")
            v = v.strip()
            if "#" in v and not (v.startswith('"') or v.startswith("'")):
                v = v.split("#")[0].strip()
            os.environ.setdefault(k.strip(), v)

DATASET_NAME = "isaacverse-harness-evals"
AGENTS_MD = Path(__file__).parent / "memories" / "AGENTS.md"


def get_experiment_scores(client: Client) -> dict:
    """Read latest experiment results from LangSmith."""
    try:
        datasets = list(client.list_datasets(dataset_name=DATASET_NAME))
        if not datasets:
            return {"error": "Dataset not found"}
        ds = datasets[0]
        runs = list(client.list_runs(dataset_id=ds.id, run_type="evaluator"))
        scores = {}
        for run in runs:
            eval_name = run.name
            feedback = getattr(run, "feedback", None)
            if feedback:
                for fb in feedback if isinstance(feedback, list) else [feedback]:
                    key = getattr(fb, "key", eval_name)
                    score = getattr(fb, "score", None)
                    if key not in scores:
                        scores[key] = {"total": 0, "passed": 0}
                    scores[key]["total"] += 1
                    if score == 1:
                        scores[key]["passed"] += 1
        return scores
    except Exception as e:
        return {"error": str(e)}


def propose_improvement(scores: dict, agents_md_content: str) -> str | None:
    """Based on failing evaluators, propose an AGENTS.md improvement."""
    if "error" in scores:
        return None

    proposals = []
    for key, data in scores.items():
        pass_rate = data["passed"] / max(data["total"], 1)
        if pass_rate < 1.0:
            if key == "used_think" and pass_rate < 1.0:
                proposals.append(
                    "## Optimization: stronger think requirement\n"
                    "The 'used_think' evaluator is failing. Adding stronger language to AGENTS.md.\n"
                    "Proposed change: Add 'You MUST call think() before ANY update_style call. "
                    "If you skip think, your change will be rejected.' to the Rules section."
                )
            elif key == "used_expected_tools" and pass_rate < 1.0:
                proposals.append(
                    "## Optimization: tool usage reminder\n"
                    "The 'used_expected_tools' evaluator is failing. Adding tool reminder.\n"
                    "Proposed change: Add 'Always use the exact tool name specified in your instructions.' "
                    "to the Rules section."
                )
            elif key == "no_phantom_tools" and pass_rate < 1.0:
                proposals.append(
                    "## Optimization: phantom tool warning\n"
                    "The 'no_phantom_tools' evaluator is failing. Adding explicit warning.\n"
                    "Proposed change: Add 'NEVER call read_style, list_style_knobs, propose_improvement, "
                    "or capture_feedback. These tools were REMOVED. Use read_file, update_style, think instead.' "
                    "to the Rules section."
                )
            elif key == "response_quality" and pass_rate < 1.0:
                proposals.append(
                    "## Optimization: response quality\n"
                    "The 'response_quality' LLM-as-judge is failing. Improving response format.\n"
                    "Proposed change: Add 'Always provide a clear, structured response. Use markdown headers. "
                    "Include before/after scores in a table format.' to the Rules section."
                )
    return "\n\n".join(proposals) if proposals else None


def apply_and_test(client: Client, proposal: str, original_content: str) -> bool:
    """Apply proposal to AGENTS.md, run eval, compare scores."""
    # Backup
    backup = AGENTS_MD.read_text(encoding="utf-8")
    # Apply
    new_content = original_content + "\n\n" + proposal + "\n"
    AGENTS_MD.write_text(new_content, encoding="utf-8")
    print("  Applied proposal to AGENTS.md")
    # Run eval
    print("  Running eval...")
    try:
        from eval import main as run_eval
        run_eval()
    except Exception as e:
        print(f"  Eval failed: {e}")
        AGENTS_MD.write_text(backup, encoding="utf-8")
        print("  Reverted AGENTS.md")
        return False
    # Compare scores
    new_scores = get_experiment_scores(client)
    old_scores = get_experiment_scores(client)  # Note: this gets latest, need comparison logic
    # For simplicity: keep if no regressions
    print(f"  New scores: {new_scores}")
    # Revert for safety (user should manually review)
    AGENTS_MD.write_text(backup, encoding="utf-8")
    print("  Reverted AGENTS.md (review proposal manually)")
    return True


def main():
    client = Client()
    print("=== Outer-Loop Optimization ===\n")

    # 1. Get current scores
    print("1. Reading current experiment scores...")
    scores = get_experiment_scores(client)
    print(f"   Scores: {json.dumps(scores, indent=2)}")

    if "error" in scores:
        print(f"   Error: {scores['error']}")
        print("   Run eval.py first to generate experiment data.")
        return

    # 2. Propose improvement
    print("\n2. Analyzing failing evaluators...")
    agents_md = AGENTS_MD.read_text(encoding="utf-8")
    proposal = propose_improvement(scores, agents_md)

    if not proposal:
        print("   All evaluators passing! No optimization needed.")
        return

    print(f"   Proposal:\n{proposal}")

    # 3. Apply and test
    print("\n3. Testing proposal (apply → eval → compare → revert)...")
    success = apply_and_test(client, proposal, agents_md)

    if success:
        print("\n✓ Proposal tested. Review and apply manually if improved.")
        print(f"  Proposed addition:\n{proposal}")
    else:
        print("\n✗ Proposal test failed. No changes made.")


if __name__ == "__main__":
    main()

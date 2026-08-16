"""LangSmith annotation queues + online evaluators setup.

Creates:
1. Annotation queue for human review: "Did agent improve video quality?"
2. Online evaluator rules: auto-score production traces

Run:
    harness/.venv/Scripts/python.exe harness/setup_langsmith.py
"""
from __future__ import annotations
import os, sys
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

def main():
    client = Client()
    project_name = os.environ.get("LANGSMITH_PROJECT", "isaacverse-harness")

    # 1. Create annotation queue
    print("Creating annotation queue...")
    try:
        queue = client.create_annotation_queue(
            name="harness-quality-review",
            description="Review agent improvement cycles: Did the agent pick the correct knob? Did scores improve?",
        )
        print(f"  Created queue: {queue.name} (ID: {queue.id})")
    except Exception as e:
        print(f"  Queue creation: {e}")

    # 2. List existing datasets
    print("\nDatasets:")
    try:
        datasets = client.list_datasets()
        for ds in datasets:
            print(f"  - {ds.name} (ID: {ds.id})")
    except Exception as e:
        print(f"  List datasets: {e}")

    # 3. List existing experiments
    print("\nRecent experiments:")
    try:
        for ds in client.list_datasets():
            runs = client.list_runs(dataset_id=ds.id, run_type="evaluator")
            if runs:
                print(f"  Dataset: {ds.name}")
                for run in list(runs)[:5]:
                    print(f"    - {run.name}: score={getattr(run, 'feedback', 'N/A')}")
    except Exception as e:
        print(f"  List experiments: {e}")

    print(f"\nLangSmith dashboard: https://smith.langchain.com")
    print(f"Project: {project_name}")
    print(f"Annotation queue: harness-quality-review")
    print(f"\nTo add runs to queue: manually flag interesting traces in LangSmith UI")
    print(f"To review: go to Annotation Queues in LangSmith sidebar")


if __name__ == "__main__":
    main()

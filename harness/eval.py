"""LangSmith eval — dataset + evaluators + experiment runner.

Creates a dataset of test inputs, defines evaluators (code + LLM-as-judge),
runs the agent against the dataset, and records results on LangSmith.

Run:
    harness/.venv/Scripts/python.exe harness/eval.py
"""
from __future__ import annotations

import json
import os
import sys
import urllib.request

from langsmith import Client

# Load .env
from pathlib import Path
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

API = "http://localhost:2024"
ASSISTANT = "agent"
DATASET_NAME = "isaacverse-harness-evals"


# ===== 1. DATASET CREATION =====

def create_dataset():
    """Create LangSmith dataset with test inputs + reference outputs."""
    client = Client()

    # Delete existing dataset if present
    try:
        existing = client.read_dataset(dataset_name=DATASET_NAME)
        client.delete_dataset(dataset_id=existing.id)
        print(f"Deleted existing dataset: {DATASET_NAME}")
    except Exception:
        pass

    dataset = client.create_dataset(
        dataset_name=DATASET_NAME,
        description="Test cases for the IsaacVerse video agent harness.",
    )

    examples = [
        {
            "inputs": {"query": "read the style store"},
            "outputs": {"expected_tools": ["read_file"], "must_not_contain": ["read_style"]},
        },
        {
            "inputs": {"query": "Read the style store, then use the think tool to plan what you would improve first"},
            "outputs": {"expected_tools": ["read_file", "think"], "must_not_contain": ["read_style"]},
        },
        {
            "inputs": {"query": "Change edge stroke mode to gradient. Use update_style tool."},
            "outputs": {"expected_tools": ["update_style"], "must_not_contain": ["edit_file"]},
        },
        {
            "inputs": {"query": "Read /memories/taste-standard.md and tell me what principles exist"},
            "outputs": {"expected_tools": ["read_file"], "must_not_contain": []},
        },
        {
            "inputs": {"query": "Read /memories/knowledge-base.md and tell me what experiments were tried"},
            "outputs": {"expected_tools": ["read_file"], "must_not_contain": []},
        },
    ]

    client.create_examples(dataset_id=dataset.id, examples=examples)
    print(f"Created dataset: {DATASET_NAME} with {len(examples)} examples")
    return dataset


# ===== 2. TARGET FUNCTION =====

def target(inputs: dict) -> dict:
    """Run the agent via LangGraph API and return the response."""
    query = inputs["query"]
    tid = _api("POST", "/threads", {}).get("thread_id", "")
    if not tid:
        return {"response": "ERROR: could not create thread", "tool_calls": []}

    result = _api("POST", f"/threads/{tid}/runs/wait", {
        "assistant_id": ASSISTANT,
        "input": {"messages": [{"role": "user", "content": query}]},
    })

    if "error" in result:
        return {"response": f"ERROR: {result['error']}", "tool_calls": []}

    # Extract tool calls and final response
    tool_calls = []
    final_response = ""
    for msg in result.get("messages", []):
        for tc in msg.get("tool_calls", []):
            tool_calls.append(tc.get("name", ""))
        if msg.get("type") == "ai" and msg.get("content"):
            final_response = str(msg["content"])

    return {"response": final_response[:2000], "tool_calls": tool_calls}


def _api(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        f"{API}{path}", data=data,
        headers={"Content-Type": "application/json"}, method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=300) as resp:
            return json.loads(resp.read().decode())
    except Exception as e:
        return {"error": str(e)}


# ===== 3. EVALUATORS =====

def eval_used_expected_tools(inputs: dict, outputs: dict, reference_outputs: dict):
    """Code evaluator: did the agent use the expected tools?"""
    expected = reference_outputs.get("expected_tools", [])
    actual = outputs.get("tool_calls", [])
    used_all = all(tool in actual for tool in expected)
    return {
        "key": "used_expected_tools",
        "score": 1 if used_all else 0,
        "comment": f"Expected: {expected}. Got: {actual}",
    }


def eval_no_phantom_tools(inputs: dict, outputs: dict, reference_outputs: dict):
    """Code evaluator: did the agent avoid phantom/removed tools?"""
    must_not = reference_outputs.get("must_not_contain", [])
    actual = outputs.get("tool_calls", [])
    has_phantom = any(tool in actual for tool in must_not)
    return {
        "key": "no_phantom_tools",
        "score": 0 if has_phantom else 1,
        "comment": f"Must not contain: {must_not}. Got: {actual}",
    }


def eval_response_quality(inputs: dict, outputs: dict, reference_outputs: dict):
    """LLM-as-judge: is the agent's response helpful and correct?"""
    from openevals.llm import create_llm_as_judge

    judge = create_llm_as_judge(
        prompt="""You are evaluating a video editing agent's response.

User query: {inputs[query]}
Agent response: {outputs[response]}

Score 1 if the response:
- Directly addresses the user's query
- Is helpful and actionable
- Does not hallucinate or make up information
- Follows the improvement loop pattern (read → critique → think → change → verify)

Score 0 if:
- The response is empty, error, or unhelpful
- The agent clearly misunderstood the query
- The response contains fabricated information

Return a JSON with "score" (0 or 1) and "comment" (brief explanation).""",
        model="openai:gpt-4o-mini",
        feedback_key="response_quality",
    )
    return evaluator(inputs=inputs, outputs=outputs)


# ===== 4. RUN EXPERIMENT =====

def main():
    # Check server
    try:
        urllib.request.urlopen(f"{API}/ok", timeout=5)
    except Exception:
        print("ERROR: LangGraph server not running on port 2024")
        print("Start with: harness/.venv/Scripts/python.exe -m langgraph_cli dev --port 2024")
        sys.exit(1)

    # Create dataset
    create_dataset()

    # Run experiment
    client = Client()
    results = client.evaluate(
        target,
        data=DATASET_NAME,
        evaluators=[
            eval_used_expected_tools,
            eval_no_phantom_tools,
        ],
        experiment_prefix="harness-eval",
        max_concurrency=1,  # Agent is stateful, run sequentially
    )

    print(f"\nExperiment complete!")
    print(f"View results: https://smith.langchain.com")
    print(f"Dataset: {DATASET_NAME}")


if __name__ == "__main__":
    main()

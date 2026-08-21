"""LangSmith eval — dataset + evaluators + experiment runner.

Dataset: 10+ test cases covering structural, quality, and behavioral aspects.
Evaluators: code (tool trajectory) + LLM-as-judge (DeepSeek).
"""
from __future__ import annotations
import json, os, sys, urllib.request
from pathlib import Path
from langsmith import Client

# Load .env (an empty-string env var from the parent shell must NOT win)
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

API = "http://localhost:2024"
ASSISTANT = "agent"
DATASET_NAME = "isaacverse-harness-evals"
# Judge default: glm-4-flash via the Zhipu OpenAI-compatible endpoint (working
# key). DeepSeek is out of balance and silently scores 0 — override with
# EVAL_JUDGE_MODEL if you switch providers.
JUDGE_MODEL = os.environ.get("EVAL_JUDGE_MODEL", "openai:glm-4-flash")


def create_dataset():
    client = Client()
    try:
        existing = client.read_dataset(dataset_name=DATASET_NAME)
        client.delete_dataset(dataset_id=existing.id)
    except Exception:
        pass
    dataset = client.create_dataset(dataset_name=DATASET_NAME, description="IsaacVerse harness agent eval cases.")
    examples = [
        {"inputs": {"query": "read the style store"},
         "outputs": {"expected_tools": ["read_file"], "must_not_contain": ["read_style"], "category": "structural"}},
        {"inputs": {"query": "Read the style store, then use the think tool to plan what you would improve first"},
         "outputs": {"expected_tools": ["read_file", "think"], "must_not_contain": ["read_style"], "category": "structural"}},
        {"inputs": {"query": "Change edge stroke mode to gradient. Use update_style tool."},
         "outputs": {"expected_tools": ["update_style"], "must_not_contain": ["edit_file"], "category": "structural"}},
        {"inputs": {"query": "Read /memories/taste-standard.md and tell me what principles exist"},
         "outputs": {"expected_tools": ["read_file"], "must_not_contain": [], "category": "structural"}},
        {"inputs": {"query": "Read /memories/knowledge-base.md and tell me what experiments were tried"},
         "outputs": {"expected_tools": ["read_file"], "must_not_contain": [], "category": "structural"}},
        {"inputs": {"query": "Read /skills/style-knobs/SKILL.md and tell me which knobs control motion"},
         "outputs": {"expected_tools": ["read_file"], "must_not_contain": [], "category": "structural"}},
        {"inputs": {"query": "What can you do?"},
         "outputs": {"expected_tools": [], "must_not_contain": [], "category": "structural"}},
        {"inputs": {"query": "Render isaacverse-final 3.5 to 7 draft"},
         "outputs": {"expected_tools": ["render_window"], "must_not_contain": [], "category": "structural"}},
        {"inputs": {"query": "Read the style store, then think about what to improve. Focus on the semantic-diagram treatment which has motion knobs like entrance.damping."},
         "outputs": {"expected_tools": ["read_file", "think"], "must_not_contain": ["read_style"], "category": "behavioral"}},
        {"inputs": {"query": "Read /memories/knowledge-base.md first, then read the style store, then think about what to improve next. Avoid repeating failed experiments from the knowledge base."},
         "outputs": {"expected_tools": ["read_file", "read_file", "think"], "must_not_contain": ["read_style"], "category": "behavioral"}},
    ]
    client.create_examples(dataset_id=dataset.id, examples=examples)
    print(f"Created dataset: {DATASET_NAME} with {len(examples)} examples")
    return dataset


def target(inputs: dict) -> dict:
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
    req = urllib.request.Request(f"{API}{path}", data=data, headers={"Content-Type": "application/json"}, method=method)
    try:
        with urllib.request.urlopen(req, timeout=300) as resp:
            return json.loads(resp.read().decode())
    except Exception as e:
        return {"error": str(e)}


# ===== CODE EVALUATORS =====

def eval_used_expected_tools(inputs, outputs, reference_outputs):
    expected = reference_outputs.get("expected_tools", [])
    actual = outputs.get("tool_calls", [])
    used_all = all(t in actual for t in expected)
    return {"key": "used_expected_tools", "score": 1 if used_all else 0,
            "comment": f"Expected: {expected}. Got: {actual}"}

def eval_no_phantom_tools(inputs, outputs, reference_outputs):
    must_not = reference_outputs.get("must_not_contain", [])
    actual = outputs.get("tool_calls", [])
    has_phantom = any(t in actual for t in must_not)
    return {"key": "no_phantom_tools", "score": 0 if has_phantom else 1,
            "comment": f"Must not: {must_not}. Got: {actual}"}

def eval_used_think(inputs, outputs, reference_outputs):
    actual = outputs.get("tool_calls", [])
    used_think = "think" in actual
    return {"key": "used_think", "score": 1 if used_think else 0,
            "comment": f"think in tools: {used_think}. Tools: {actual}"}

def eval_read_memory(inputs, outputs, reference_outputs):
    actual = outputs.get("tool_calls", [])
    # Check if agent read taste-standard.md or knowledge-base.md
    response = outputs.get("response", "").lower()
    read_memory = "taste-standard" in response or "knowledge-base" in response
    # Also check tool calls for read_file with memory paths
    return {"key": "read_memory", "score": 1 if read_memory else 0,
            "comment": f"Memory mentioned in response: {read_memory}"}

def eval_response_not_empty(inputs, outputs, reference_outputs):
    response = outputs.get("response", "")
    return {"key": "response_not_empty", "score": 1 if len(response) > 20 else 0,
            "comment": f"Response length: {len(response)}"}


# ===== LLM-AS-JUDGE EVALUATOR (DeepSeek) =====

def eval_response_quality(inputs, outputs, reference_outputs):
    """LLM-as-judge using glm-4-flash: is the response helpful and correct?

    NOTE: openevals stringifies inputs/outputs before formatting the prompt —
    use {inputs}/{outputs} (full JSON), NEVER {inputs[query]} (dict subscript
    raises TypeError and every score lands 0)."""
    try:
        from openevals.llm import create_llm_as_judge
        judge = create_llm_as_judge(
            prompt="""You are evaluating a video editing agent's response.

The full inputs JSON (contains the user's query) is:
{inputs}

The agent's output JSON (contains its final response) is:
{outputs}

Score 1 if the response directly addresses the query, is helpful, and doesn't hallucinate.
Score 0 if the response is empty, an error, or unhelpful.

Return JSON: {{"score": 0 or 1, "comment": "brief explanation"}}""",
            model=JUDGE_MODEL,
            feedback_key="response_quality",
            use_reasoning=False,
        )
        return judge(inputs=inputs, outputs=outputs)
    except Exception as e:
        return {"key": "response_quality", "score": 0, "comment": f"Judge error: {e}"}


def main():
    try:
        urllib.request.urlopen(f"{API}/ok", timeout=5)
    except Exception:
        print("ERROR: LangGraph server not running on port 2024")
        sys.exit(1)
    create_dataset()
    client = Client()
    results = client.evaluate(
        target,
        data=DATASET_NAME,
        evaluators=[
            eval_used_expected_tools,
            eval_no_phantom_tools,
            eval_used_think,
            eval_read_memory,
            eval_response_not_empty,
            eval_response_quality,
        ],
        experiment_prefix="harness-eval",
        max_concurrency=1,
    )
    print(f"\nExperiment complete! View: https://smith.langchain.com")
    print(f"Dataset: {DATASET_NAME}")


if __name__ == "__main__":
    main()

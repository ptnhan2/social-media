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
        # --- Design quality cases (spec C1) ---
        {"inputs": {"query": "Read /memories/taste-standard.md and the current treatment code at /workspace/remotion-composer/shared/isaacverse/treatments.tsx. List every violation of the ACTIVE typography principle (all text bold 900+ with visual effects). Do NOT edit anything — report only."},
         "outputs": {"expected_tools": ["read_file"], "must_not_contain": ["edit_file"], "category": "design_quality",
                     "checks": ["reports_fontWeight_violations", "reports_text_effect_violations"]}},
        {"inputs": {"query": "Read /memories/taste-standard.md and /memories/self-check.md, then run the self-check checklist against the treatment code at /workspace/remotion-composer/shared/isaacverse/treatments.tsx. Report compliance per checklist item. Do NOT edit anything."},
         "outputs": {"expected_tools": ["read_file"], "must_not_contain": ["edit_file"], "category": "design_quality",
                     "checks": ["covers_all_HIGH_items", "cites_specific_code"]}},
        {"inputs": {"query": "Read /memories/taste-standard.md. Explain the difference between ACTIVE and CANDIDATE principles and give one example of each. Which 5 principles are the user's design direction?"},
         "outputs": {"expected_tools": ["read_file"], "must_not_contain": [], "category": "design_quality",
                     "checks": ["explains_ACTIVE_vs_CANDIDATE", "names_user_directives"]}},
        {"inputs": {"query": "Read /memories/feedback-patterns.json and /memories/taste-standard.md. For each HIGH-confidence pattern, tell me which taste-standard principle ids implement it."},
         "outputs": {"expected_tools": ["read_file"], "must_not_contain": [], "category": "design_quality",
                     "checks": ["maps_patterns_to_principles"]}},
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


# ===== DESIGN QUALITY EVALUATORS (spec C2) =====
# These evaluators check the REPO STATE (not the agent's answer) — they
# measure whether the treatments/style store currently comply with the
# HIGH-confidence ACTIVE principles. Score 1 = compliant, 0 = violations.
# This makes design regressions visible as eval regressions in LangSmith.

_TREATMENTS_TSX = Path(__file__).parent.parent / "remotion-composer" / "shared" / "isaacverse" / "treatments.tsx"
_STYLE_JSON = Path(__file__).parent.parent / "libraries" / "04-visual" / "isaacverse-style.json"

import re as _re


def _treatments_source() -> str:
    try:
        return _TREATMENTS_TSX.read_text(encoding="utf-8")
    except OSError:
        return ""


def eval_principle_compliance(inputs, outputs, reference_outputs):
    """Check repo compliance with the 5 ACTIVE user principles (typo-001, col-001, col-002, comp-001).

    typography: every explicit fontWeight in treatments.tsx >= 900 (or bold)
    color-vivid: no filter string with saturate(<1.0) or brightness(<0.85)
    gradients: at least N gradient fills present (>= 8 across treatments)
    """
    src = _treatments_source()
    if not src:
        return {"key": "principle_compliance", "score": 0, "comment": "treatments.tsx unreadable"}
    violations = []

    # typo-001: fontWeight >= 900 everywhere it is explicit
    weights = [int(m) for m in _re.findall(r"fontWeight:\s*(\d+)", src)]
    light = [w for w in weights if w < 900]
    if light:
        violations.append(f"typo-001: {len(light)} fontWeight values < 900: {sorted(set(light))}")

    # col-001: vivid filters — no washed-out saturate/brightness below floor
    filters = _re.findall(r'filter[^;\n]*(?:saturate|brightness)\([^)]*\)[^;\n"]*', src)
    washed = [f for f in filters
              if (m := _re.search(r"saturate\(([\d.]+)\)", f)) and float(m.group(1)) < 1.0
              or (m2 := _re.search(r"brightness\(([\d.]+)\)", f)) and float(m2.group(1)) < 0.85]
    # exclude grayscale/sepia styling modes (intentional, not washed-out)
    washed = [f for f in washed if "grayscale" not in f and "sepia" not in f]
    if washed:
        violations.append(f"col-001: {len(washed)} washed-out filter strings (saturate<1.0 or brightness<0.85)")

    # col-002: gradients present on major elements
    n_gradients = len(_re.findall(r"linear-gradient|radial-gradient", src))
    if n_gradients < 8:
        violations.append(f"col-002: only {n_gradients} gradient fills (need >= 8)")

    # style-store subtitle/brightness knobs
    try:
        style = json.loads(_STYLE_JSON.read_text(encoding="utf-8-sig"))
        hr_filter = style.get("treatments", {}).get("host-reflection", {}).get("filter", "")
        m = _re.search(r"saturate\(([\d.]+)\)", hr_filter)
        m2 = _re.search(r"brightness\(([\d.]+)\)", hr_filter)
        if (m and float(m.group(1)) < 1.0) or (m2 and float(m2.group(1)) < 0.85):
            violations.append(f"col-001: host-reflection.filter washed out: {hr_filter}")
    except (OSError, json.JSONDecodeError):
        violations.append("col-001: style store unreadable")

    return {"key": "principle_compliance", "score": 1 if not violations else 0,
            "comment": "All principles satisfied" if not violations else "Violations: " + "; ".join(violations)}


def eval_code_quality(inputs, outputs, reference_outputs):
    """Hardcoded text styling that should read the style store.

    Counts fontWeight/fontSize literals not wrapped in getStyle() — each is a
    style knob the agent cannot tune. Returns a 0-1 score: 1 when <= 6 remain
    (baseline tolerance), scaled to 0 at 14+.
    """
    src = _treatments_source()
    if not src:
        return {"key": "code_quality", "score": 0, "comment": "treatments.tsx unreadable"}
    styled = _re.findall(r"fontWeight:\s*([^\n,}]+)", src) + _re.findall(r"fontSize:\s*([^\n,}]+)", src)
    hardcoded = [s for s in styled if "getStyle" not in s]
    n = len(hardcoded)
    score = 1.0 if n <= 6 else (0.0 if n >= 14 else round(1 - (n - 6) / 8, 2))
    return {"key": "code_quality", "score": score,
            "comment": f"{n} hardcoded fontWeight/fontSize values (tolerance 6, fail 14): {[h.strip()[:40] for h in hardcoded[:5]]}"}


def eval_aesthetic_quality(inputs, outputs, reference_outputs):
    """LLM-as-judge (Gemini 3 Flash, free tier): does the agent's answer show
    design understanding (principles, specifics, honest limits)?

    Text-only judging of the RESPONSE (not frames — the VLM-blindness finding
    makes frame-scoring unreliable; visual quality enters through
    principle_compliance + user review instead).
    """
    try:
        from openevals.llm import create_llm_as_judge
        judge = create_llm_as_judge(
            prompt="""You are evaluating a video-design agent's answer about visual style work.

The inputs JSON (user query) is:
{inputs}

The agent's output JSON is:
{outputs}

Score 1 if the answer demonstrates real design understanding: cites specific
treatments/elements/values, applies stated principles (bold 900+, gradients,
vivid contrast, organic curves), and is honest about limits.
Score 0 if vague, generic, hallucinated, or ignores the principles.

Return JSON: {{"score": 0 or 1, "comment": "brief explanation"}}""",
            model=os.environ.get("EVAL_AESTHETIC_MODEL", "gemini-2.0-flash"),
            feedback_key="aesthetic_quality",
            use_reasoning=False,
        )
        return judge(inputs=inputs, outputs=outputs)
    except Exception as e:
        return {"key": "aesthetic_quality", "score": 0, "comment": f"Judge error: {e}"}


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
            eval_principle_compliance,
            eval_code_quality,
            eval_aesthetic_quality,
        ],
        experiment_prefix="harness-eval",
        max_concurrency=1,
    )
    print(f"\nExperiment complete! View: https://smith.langchain.com")
    print(f"Dataset: {DATASET_NAME}")


if __name__ == "__main__":
    main()

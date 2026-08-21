"""Direct judge test — is the glm-4-flash judge constructible and callable?"""
import os
import sys
from pathlib import Path

sys.path.insert(0, "harness")
for line in Path(".env").read_text(encoding="utf-8", errors="replace").splitlines():
    line = line.strip()
    if "=" in line and not line.startswith("#"):
        k, _, v = line.partition("=")
        v = v.strip()
        if "#" in v and not (v.startswith('"') or v.startswith("'")):
            v = v.split("#")[0].strip()
        if v:
            os.environ.setdefault(k.strip(), v)

from openevals.llm import create_llm_as_judge

try:
    judge = create_llm_as_judge(
        prompt=("You are evaluating a video editing agent's response.\n\n"
                "The full inputs JSON (contains the user's query) is:\n{inputs}\n\n"
                "The agent's output JSON (contains its final response) is:\n{outputs}\n\n"
                "Score 1 if the response directly addresses the query.\n"
                'Return JSON: {{"score": 0 or 1, "comment": "brief"}}'),
        model="openai:glm-4-flash",
        feedback_key="response_quality",
        use_reasoning=False,
    )
    r = judge(inputs={"query": "read the style store"},
              outputs={"response": "I read the style store at /workspace/libraries/04-visual/isaacverse-style.json and it contains colors and treatments knobs."})
    print("JUDGE RESULT:", r)
except Exception as e:  # noqa: BLE001
    print("JUDGE ERROR:", type(e).__name__, str(e)[:400])

"""Reproduce the judge credentials failure using eval.py's exact env loading."""
import os
import sys
from pathlib import Path

sys.path.insert(0, "harness")
env_file = Path(".env")
if env_file.exists():
    for line in env_file.read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.strip()
        if "=" in line and not line.startswith("#"):
            k, _, v = line.partition("=")
            v = v.strip()
            if "#" in v and not (v.startswith('"') or v.startswith("'")):
                v = v.split("#")[0].strip()
            if v:
                os.environ.setdefault(k.strip(), v)

print("OPENAI_API_KEY set:", bool(os.environ.get("OPENAI_API_KEY")),
      "len:", len(os.environ.get("OPENAI_API_KEY", "")))
print("OPENAI_BASE_URL:", os.environ.get("OPENAI_BASE_URL"))

from openevals.llm import create_llm_as_judge

judge = create_llm_as_judge(
    prompt=("Inputs JSON: {inputs}\nOutputs JSON: {outputs}\n"
            'Return JSON: {{"score": 0 or 1, "comment": "brief"}}'),
    model="openai:glm-4-flash",
    feedback_key="response_quality",
    use_reasoning=False,
)
r = judge(inputs={"query": "read the style store"},
          outputs={"response": "I read the style store; it has colors and treatments."})
print("JUDGE:", r)

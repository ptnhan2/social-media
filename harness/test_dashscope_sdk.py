"""Test DashScope native SDK with local video file (bypasses big JSON body).

The SDK uploads the file via its file-upload flow (OSS), then sends a small
generation request — avoiding the ~50KB POST body limit we hit on the
OpenAI-compatible endpoint from this network.
"""
import sys, os, time
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from pathlib import Path
for line in (Path(__file__).parent.parent / ".env").read_text(encoding="utf-8", errors="replace").splitlines():
    line = line.strip()
    if "=" in line and not line.startswith("#"):
        k, _, v = line.partition("=")
        v = v.strip()
        if "#" in v and not (v.startswith('"') or v.startswith("'")):
            v = v.split("#")[0].strip()
        if v:
            os.environ.setdefault(k.strip(), v)

import dashscope
from dashscope import MultiModalConversation
dashscope.api_key = os.environ["DASHSCOPE_API_KEY"]

VIDEO = str((Path(__file__).parent.parent / "projects" / "isaacverse-final" / "renders" / "windows" / "ab_A_damping18.mp4").resolve())

t0 = time.time()
resp = MultiModalConversation.call(
    model="qwen3-vl-flash",
    messages=[{
        "role": "user",
        "content": [
            {"video": f"file://{VIDEO}"},
            {"text": "One sentence: what motion do you see in this video?"},
        ],
    }],
    max_tokens=100,
)
dt = time.time() - t0
if resp.status_code == 200:
    content = resp.output.choices[0].message.content
    text = "".join(part.get("text", "") for part in content if isinstance(part, dict))
    print(f"OK in {dt:.1f}s -> {text[:300]}")
else:
    print(f"FAIL in {dt:.1f}s -> code={resp.status_code} {str(resp)[:300]}")

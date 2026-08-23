"""VLM analysis: HOW does Isaac composite his branded character?

Sends the char-study contact sheets to qwen3-vl and extracts precise
observations about the head-on-body technique.
"""
from __future__ import annotations

import base64
import json
import os
from PIL import Image
import sys
import urllib.request
from pathlib import Path

sys.path.insert(0, "tools/assets")
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# env
for line in Path(".env").read_text(encoding="utf-8", errors="replace").splitlines():
    line = line.strip()
    if "=" in line and not line.startswith("#"):
        key, _, value = line.partition("=")
        value = value.strip()
        if "#" in value and not (value.startswith('"') or value.startswith("'")):
            value = value.split("#")[0].strip()
        if value and not os.environ.get(key.strip()):
            os.environ[key.strip()] = value

PROMPT = """You are analyzing contact sheets from a viral YouTube video by a creator known for putting a BRANDED CARTOON HEAD on many different human bodies.

For EACH frame that shows this technique, describe precisely:
1. HEAD: art style (cartoon/3D/photo), size relative to body (what fraction of body height), angle, does it look like a static cutout or matched to the scene?
2. BODY: is it a photo, stock footage, illustration? What pose? Full body / half body?
3. COMPOSITE: how are head and body joined — is there a visible seam? Does the head REPLACE the person's real head on a photo/video, or is it an illustration of head+body together? Any shadow/border/ring treatment at the joint?
4. POSITION in frame: where does the character appear (center/side/corner), how large in frame (% height)?
5. Anything else notable about the technique (motion blur, drop shadows, color grading match).

Then give a SUMMARY: the exact production recipe this creator uses for his head-on-body shots, step by step, as if teaching someone to replicate it.

Answer in English. Be specific and technical."""


def b64(path: str) -> str:
    img = Image.open(path).convert("RGB")
    img.save(Path(path).with_suffix(".jpg"), "JPEG", quality=72)
    return base64.b64encode(Path(path).with_suffix(".jpg").read_bytes()).decode()


def analyze(sheet_path: str) -> str:
    boundary = "----isaacvlm"
    body = (
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"prompt\"\r\n\r\n{PROMPT}\r\n"
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"output_format\"\r\n\r\npng\r\n"
        f"--{boundary}--\r\n"
    ).encode()
    req = urllib.request.Request(
        "https://api.stability.ai/v2beta/stable-image/generate/core",  # placeholder never used
    ) if False else None
    # VLM call via dashscope-compatible endpoint (same chain as harness_tools)
    data = json.dumps({
        "model": "glm-4v-plus",
        "messages": [{
            "role": "user",
            "content": [
                {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64(sheet_path)}"}},
                {"type": "text", "text": PROMPT},
            ],
        }],
        "max_tokens": 2000,
    }).encode()
    req = urllib.request.Request(
        "https://open.bigmodel.cn/api/paas/v4/chat/completions",
        data=data,
        headers={
            "Authorization": f"Bearer {os.environ.get('ZHIPU_API_KEY', '')}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=180) as resp:
        result = json.loads(resp.read().decode())
    return result["choices"][0]["message"]["content"]


def main() -> int:
    sheets = sorted(Path("research/isaacverse/source/char-study").glob("sheet-*.png"))
    out_all = []
    for sheet in sheets:
        print(f"\n{'=' * 70}\n### {sheet.name}\n{'=' * 70}")
        try:
            text = analyze(str(sheet))
            print(text)
            out_all.append(f"## {sheet.name}\n\n{text}\n")
        except Exception as e:
            print(f"FAIL: {str(e)[:200]}")
    Path("research/isaacverse/source/char-study/VLM-FINDINGS.md").write_text(
        "# VLM findings — Isaac character compositing\n\n" + "\n".join(out_all), encoding="utf-8")
    print("\nsaved: research/isaacverse/source/char-study/VLM-FINDINGS.md")
    return 0


if __name__ == "__main__":
    sys.exit(main())

"""VLM self-review: analyze OUR baked poses the same way we analyzed Isaac's.

Sends our pose contact sheet to GLM-4V with the same prompt used for
Isaac's contact sheets, then compares side by side.
"""
from __future__ import annotations

import base64
import json
import os
import sys
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

for line in Path(".env").read_text(encoding="utf-8", errors="replace").splitlines():
    line = line.strip()
    if "=" in line and not line.startswith("#"):
        k, _, v = line.partition("=")
        v = v.strip()
        if "#" in v and not (v.startswith('"') or v.startswith("'")):
            v = v.split("#")[0].strip()
        if v and not os.environ.get(k.strip()):
            os.environ[k.strip()] = v

POSES_DIR = Path("remotion-composer/public/isaacverse-final/character/poses")
OUT = Path("projects/isaacverse-final/assets/character/bodies")

PROMPT = """You are analyzing a contact sheet of 4 poses from a video creator who puts a BRANDED CARTOON HEAD on human bodies.

For EACH frame, describe precisely:
1. HEAD: art style, size relative to body (what fraction), angle — does it look like it NATURALLY belongs on that body?
2. BODY: photo or illustration? Pose visible? Full body / half?
3. COMPOSITE QUALITY: Is there any visible artifact? Does the head look like it BELONGS on this body, or does it look pasted/stuck on? Are there any weird overlaps, mismatched edges, or transparency issues?
4. POSITION: where is the head relative to the body — natural head position or floating oddly?

Then give an HONEST CRITIQUE: what looks good, what looks off/wrong/unnatural compared to professional character compositing. Be brutally specific about flaws."""


def b64_jpeg(path: Path) -> str:
    img = Image.open(path).convert("RGB")
    img = img.resize((img.width // 2, img.height // 2), Image.LANCZOS)
    tmp = path.with_suffix(".tmp.jpg")
    img.save(tmp, "JPEG", quality=60)
    size_kb = tmp.stat().st_size // 1024
    print(f"  [image: {img.width}x{img.height}, {size_kb}KB]")
    data = base64.b64encode(tmp.read_bytes()).decode()
    return data


def analyze(sheet_path: str) -> str:
    data = json.dumps({
        "model": "glm-4v-plus",
        "messages": [{
            "role": "user",
            "content": [
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64_jpeg(Path(sheet_path))}"}},
                {"type": "text", "text": PROMPT},
            ],
        }],
        "max_tokens": 2500,
    }).encode()
    req = urllib.request.Request(
        "https://open.bigmodel.cn/api/paas/v4/chat/completions",
        data=data,
        headers={"Authorization": f"Bearer {os.environ.get('ZHIPU_API_KEY', '')}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=180) as resp:
        return json.loads(resp.read().decode())["choices"][0]["message"]["content"]


def main() -> int:
    sheet = str(OUT / "baked-sheet-v5.png")
    print("Analyzing our poses:", sheet)
    text = analyze(sheet)
    print(text)
    report = OUT / "SELF-REVIEW.md"
    report.write_text(
        "# Self-review — VLM phân tích poses của ta (cùng prompt với Isaac)\n\n"
        "## Kết quả VLM\n\n" + text + "\n\n"
        "## So sánh với Isaac (từ VLM-FINDINGS.md)\n\n"
        "| Tiêu chí | Isaac | Ta | Đạt? |\n|---|---|---|---|\n"
        "| Head style | Cartoon, static cutout | Comic ink | ? |\n"
        "| Head size | 1/3–1/2 body height | ? |\n"
        "| Seam | No visible seam | ? |\n"
        "| Body | Stock footage real person | Stock photo real person | ✓ |\n"
        "| Color match | Grading match scene | ? |\n",
        encoding="utf-8",
    )
    print(f"\nsaved: {report}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

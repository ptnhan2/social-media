"""Character asset generation — Gemini image models (free tier) with
Replicate FLUX fallback (paid, ~$0.003/image; needs credit).

Usage:
  python tools/assets/character_gen.py --prompt "<...>" --out <path.png>
  python tools/assets/character_gen.py --batch <batch.json>   # {name: prompt}
"""
from __future__ import annotations

import json
import os
import sys
import time
import urllib.request
from pathlib import Path

GEMINI_MODEL = "gemini-2.5-flash-image"


def _load_env() -> None:
    env_file = Path(__file__).parent.parent.parent / ".env"
    if not env_file.exists():
        return
    for line in env_file.read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.strip()
        if "=" in line and not line.startswith("#"):
            key, _, value = line.partition("=")
            value = value.strip()
            if "#" in value and not (value.startswith('"') or value.startswith("'")):
                value = value.split("#")[0].strip()
            if value and not os.environ.get(key.strip()):
                os.environ[key.strip()] = value


def generate_gemini(prompt: str, out_path: Path) -> str:
    from google import genai
    from google.genai import types

    client = genai.Client()
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(response_modalities=["TEXT", "IMAGE"]),
    )
    for candidate in response.candidates or []:
        for part in candidate.content.parts or []:
            if part.inline_data and part.inline_data.data:
                out_path.parent.mkdir(parents=True, exist_ok=True)
                out_path.write_bytes(part.inline_data.data)
                return str(out_path)
    raise RuntimeError("no image in Gemini response")


def generate_replicate(prompt: str, out_path: Path) -> str:
    api = "https://api.replicate.com/v1"
    key = os.environ.get("REPLICATE_API_KEY", "")

    def request(method: str, url: str, body: dict | None = None):
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(url, data=data, method=method, headers={
            "Authorization": f"Bearer {key}", "Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=120) as resp:
            return json.loads(resp.read().decode())

    prediction = request("POST", f"{api}/models/black-forest-labs/flux-schnell/predictions", {
        "input": {"prompt": prompt, "aspect_ratio": "1:1", "output_format": "png"},
    })
    deadline = time.time() + 180
    while time.time() < deadline:
        result = request("GET", f"{api}/predictions/{prediction['id']}")
        if result.get("status") == "succeeded":
            url = (result.get("output") or [None])[0]
            with urllib.request.urlopen(url, timeout=120) as resp:
                out_path.parent.mkdir(parents=True, exist_ok=True)
                out_path.write_bytes(resp.read())
            return str(out_path)
        if result.get("status") == "failed":
            raise RuntimeError(f"replicate failed: {result.get('error')}")
        time.sleep(2)
    raise TimeoutError("replicate timeout")


def generate(prompt: str, out_path: str) -> str:
    out = Path(out_path)
    try:
        return generate_gemini(prompt, out)
    except Exception as gemini_error:
        if not os.environ.get("REPLICATE_API_KEY"):
            raise
        print(f"  [gemini failed: {str(gemini_error)[:120]} -> replicate fallback]")
        return generate_replicate(prompt, out)


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    _load_env()
    args = sys.argv[1:]
    if "--batch" in args:
        batch_file = Path(args[args.index("--batch") + 1])
        jobs = json.loads(batch_file.read_text(encoding="utf-8"))
        ok, failed = 0, 0
        for name, prompt in jobs.items():
            out = batch_file.parent / f"{name}.png"
            if out.exists():
                print(f"skip (exists): {out}")
                ok += 1
                continue
            try:
                print(f"generated {generate(prompt, str(out))}")
                ok += 1
            except Exception as error:
                print(f"FAILED {name}: {str(error)[:150]}")
                failed += 1
        print(f"\n{ok} generated, {failed} failed")
        return 1 if failed and not ok else 0
    if "--prompt" in args and "--out" in args:
        prompt = args[args.index("--prompt") + 1]
        out = args[args.index("--out") + 1]
        print(f"generated {generate(prompt, out)}")
        return 0
    print(__doc__)
    return 1


if __name__ == "__main__":
    sys.exit(main())

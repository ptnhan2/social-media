"""Stock body search + download via Pexels API (license-free, commercial OK).

Usage:
  python tools/assets/stock_body_fetch.py --query "person pointing isolated" --list
  python tools/assets/stock_body_fetch.py --query "..." --download <photoId> --out <path>
  python tools/assets/stock_body_fetch.py --query "..." --auto 3   # top-3 by alt-text heuristic
"""
from __future__ import annotations

import json
import os
import sys
import urllib.request
from pathlib import Path

API = "https://api.pexels.com/v1/search"


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


def search(query: str, per_page: int = 15) -> list[dict]:
    url = f"{API}?query={urllib.request.quote(query)}&per_page={per_page}&orientation=portrait"
    req = urllib.request.Request(url, headers={
        "Authorization": os.environ.get("PEXELS_API_KEY", ""),
        # Pexels sits behind Cloudflare: a plain urllib signature gets 403/1010
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) IsaacVerseComposer/1.0",
    })
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode())
    return data.get("photos", [])


def download(photo: dict, out_path: str) -> str:
    src = photo.get("src", {})
    url = src.get("large2x") or src.get("large") or src.get("original")
    req = urllib.request.Request(url, headers={
        "Authorization": os.environ.get("PEXELS_API_KEY", ""),
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) IsaacVerseComposer/1.0",
    })
    with urllib.request.urlopen(req, timeout=60) as resp:
        Path(out_path).parent.mkdir(parents=True, exist_ok=True)
        Path(out_path).write_bytes(resp.read())
    return out_path


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    _load_env()
    args = sys.argv[1:]

    def arg(name: str, default: str = "") -> str:
        return args[args.index(name) + 1] if name in args and args.index(name) + 1 < len(args) else default

    query = arg("--query")
    if not query:
        print(__doc__)
        return 1
    photos = search(query)
    if "--list" in args:
        for p in photos:
            print(f"{p['id']:>10}  {p['width']}x{p['height']}  alt={p.get('alt', '')[:60]!r}  {p['photographer']}")
        return 0
    if "--auto" in args:
        count = int(arg("--auto", "3"))
        # prefer isolated/plain backgrounds by alt-text keywords, portrait-ish
        def score(p: dict) -> int:
            alt = (p.get("alt") or "").lower()
            return sum(kw in alt for kw in ("isolated", "white background", "studio", "cutout", "background removed"))
        ranked = sorted(photos, key=score, reverse=True)
        out_dir = arg("--out", "projects/isaacverse-final/assets/character/bodies/inbox")
        for p in ranked[:count]:
            out = download(p, str(Path(out_dir) / f"pexels-{p['id']}.jpg"))
            print(f"downloaded {out} (alt={p.get('alt', '')[:50]!r}, by {p['photographer']})")
        return 0
    if "--download" in args:
        photo_id = int(arg("--download"))
        photo = next((p for p in photos if p["id"] == photo_id), None)
        if not photo:
            print(f"photo {photo_id} not in search results")
            return 1
        print(f"downloaded {download(photo, arg('--out', f'pexels-{photo_id}.jpg'))}")
        return 0
    print("use --list, --auto N, or --download <id> --out <path>")
    return 1


if __name__ == "__main__":
    sys.exit(main())

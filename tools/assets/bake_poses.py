"""Bake character poses: composite the channel head onto each body asset.

The auto mode scales the head relative to the detected neck width (mascot
proportion), centered on neckX with a small overlap below the neck line.
Manual mode: edit the pose's .json anchor (neckX/neckWidth) and re-run —
the composite regenerates.

Usage:
  python tools/assets/bake_poses.py --head <head.png> --bodies <dir> --out <posesDir>
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image

HEAD_TO_NECK = 2.6  # mascot proportion: head width = 2.6x neck width
OVERLAP = 0.18      # head bottom dips below the neck line by 18% of head height


def composite(body: Image.Image, head: Image.Image, anchor: dict) -> Image.Image:
    neck_w = max(8, int(anchor.get("neckWidth", 60)))
    neck_x = int(anchor.get("neckX", body.width // 2))
    head_w = int(neck_w * HEAD_TO_NECK)
    head_h = int(head.height * (head_w / head.width))
    head_scaled = head.resize((head_w, head_h), Image.LANCZOS)
    out = body.convert("RGBA").copy()
    x = neck_x - head_w // 2
    y = -int(head_h * OVERLAP)
    out.alpha_composite(head_scaled, (int(x), int(y)))
    return out


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    args = sys.argv[1:]

    def arg(name: str, default: str = "") -> str:
        return args[args.index(name) + 1] if name in args and args.index(name) + 1 < len(args) else default

    head_path, bodies_dir, out_dir = arg("--head"), arg("--bodies"), arg("--out")
    if not (head_path and bodies_dir and out_dir):
        print(__doc__)
        return 1
    head = Image.open(head_path).convert("RGBA")
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    for body_file in sorted(Path(bodies_dir).glob("*.png")):
        if "sheet" in body_file.stem or "proof" in body_file.stem:
            continue
        anchor_file = body_file.with_suffix(".json")
        anchor = json.loads(anchor_file.read_text(encoding="utf-8")) if anchor_file.exists() else {}
        body = Image.open(body_file).convert("RGBA")
        merged = composite(body, head, anchor)
        merged.save(out / f"{body_file.stem}.png")
        print(f"baked {body_file.stem}: head at x={anchor.get('neckX', '?')}, neckW={anchor.get('neckWidth', '?')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

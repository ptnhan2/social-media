"""Bake character poses — ISAAC-STYLE direct replacement (v3).

The channel's cartoon head is placed DIRECTLY OVER the original person's
head in the stock photo, scaled to cover it completely + margin. No circle
badge, no neck cropping, no seam to match — the cartoon head IS the new head.

Size follows Isaac's proportions (VLM-verified): cartoon head = 1/3 to 1/2
of body height in frame. Coverage is guaranteed by taking the max of
(38% canvas height, 1.45x real-head coverage).

Usage:
  python tools/assets/bake_poses.py --head <head.png> --bodies <dir> --out <posesDir>
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

CANVAS_W, CANVAS_H = 800, 1300


def _vertical_gradient(size: int, top_hex: str, bottom_hex: str) -> Image.Image:
    top = tuple(int(top_hex[i:i + 2], 16) for i in (1, 3, 5))
    bottom = tuple(int(bottom_hex[i:i + 2], 16) for i in (1, 3, 5))
    grad = Image.new("RGB", (size, size))
    px = grad.load()
    for y in range(size):
        t = y / max(1, size - 1)
        row = tuple(int(top[c] + (bottom[c] - top[c]) * t) for c in range(3))
        for x in range(size):
            px[x, y] = row
    return grad.convert("RGBA")


def composite(body: Image.Image, head: Image.Image, anchor: dict) -> Image.Image:
    canvas = body.convert("RGBA").copy()
    if canvas.size != (CANVAS_W, CANVAS_H):
        canvas = canvas.resize((CANVAS_W, CANVAS_H), Image.LANCZOS)

    # --- cartoon head size: Isaac proportion + full coverage ---
    isaac_h = int(CANVAS_H * 0.40)  # 40% of canvas height (1/3 to 1/2 range)
    cover_w = int(anchor.get("headW", 200) * 1.45)   # cover real head + margin
    cover_h = int(anchor.get("headH", 250) * 1.35)
    head_size = max(isaac_h, cover_w, cover_h)

    # center on the original head position
    cx = int(anchor.get("headCX", CANVAS_W // 2))
    cy = int(anchor.get("headCY", CANVAS_H * 0.12))
    x = cx - head_size // 2
    y = cy - head_size // 2 - int(head_size * 0.04)  # slight upward bias

    # subtle drop shadow for depth (matches scene depth without harsh seam)
    shadow_layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    sh_draw = ImageDraw.Draw(shadow_layer)
    pad = int(head_size * 0.06)
    sh_draw.ellipse([x - pad, y - pad + int(head_size * 0.08),
                     x + head_size + pad, y + head_size + pad],
                    fill=(0, 0, 0, 60))
    from PIL import ImageFilter
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(radius=8))
    canvas.alpha_composite(shadow_layer)

    head_scaled = head.resize((head_size, head_size), Image.LANCZOS)
    canvas.alpha_composite(head_scaled, (x, y))
    return canvas


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
        if any(kw in body_file.stem for kw in ("sheet", "proof", "composite", "cutout", "test")):
            continue
        anchor_file = body_file.with_suffix(".json")
        anchor = json.loads(anchor_file.read_text(encoding="utf-8")) if anchor_file.exists() else {}
        merged = composite(Image.open(body_file).convert("RGBA"), head, anchor)
        merged.save(out / f"{body_file.stem}.png")
        print(f"baked {body_file.stem}: headCX={anchor.get('headCX', '?')} headW={anchor.get('headW', '?')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

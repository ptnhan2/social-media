"""Bake character poses — AVATAR-CIRCLE style v2 (user feedback 2026-08-23).

Layout (canvas 800x1100):
  - BODY scaled to fit 800x720, anchored at the BOTTOM
  - HEAD badge: circular clip + gradient ring, D=400, top of canvas,
    bottom overlapping the body collar by ~30px
Fixes vs v1: backing-disc alpha bug (paste overwrote alpha -> transparent
circle), absurd neck-derived sizes (fixed D=380-400), head sunk into chest.

Usage:
  python tools/assets/bake_poses.py --head <head.png> --bodies <dir> --out <posesDir>
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageOps

CANVAS_W, CANVAS_H = 800, 1100
BODY_MAX_H = 720          # body occupies the lower part
BADGE_D = 400             # fixed head-badge diameter (mascot proportion)
BADGE_TOP = 10


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


def head_badge(head: Image.Image, diameter: int = BADGE_D, ring_colors: tuple[str, str] = ("#ff6b35", "#ffd166")) -> Image.Image:
    """Circular-clipped head with gradient ring. Alpha-safe: the backing disc
    can never be punched through by transparent regions of the head art."""
    ring_w = max(6, diameter // 34)
    badge = Image.new("RGBA", (diameter, diameter), (0, 0, 0, 0))
    # 1. opaque backing disc
    ImageDraw.Draw(badge).ellipse(
        [ring_w, ring_w, diameter - ring_w - 1, diameter - ring_w - 1],
        fill=(14, 19, 26, 255),
    )
    # 2. head content clipped to the inner circle, alpha-intersected
    inner = diameter - 2 * ring_w - 6
    fitted = ImageOps.contain(head, (inner, inner))
    layer = Image.new("RGBA", (diameter, diameter), (0, 0, 0, 0))
    layer.paste(fitted, ((diameter - fitted.width) // 2, (diameter - fitted.height) // 2), fitted)
    circle_mask = Image.new("L", (diameter, diameter), 0)
    ImageDraw.Draw(circle_mask).ellipse(
        [ring_w, ring_w, diameter - ring_w - 1, diameter - ring_w - 1], fill=255,
    )
    layer_alpha = np.minimum(
        np.asarray(layer.getchannel("A")),
        np.asarray(circle_mask),
    )
    layer.putalpha(Image.fromarray(layer_alpha))
    badge.alpha_composite(layer)
    # 3. gradient ring (opaque paste — ring is solid by definition)
    grad = _vertical_gradient(diameter, ring_colors[0].lstrip("#"), ring_colors[1].lstrip("#"))
    ring_mask = Image.new("L", (diameter, diameter), 0)
    ImageDraw.Draw(ring_mask).ellipse([1, 1, diameter - 2, diameter - 2], outline=255, width=ring_w)
    badge.paste(grad, (0, 0), ring_mask)
    return badge


def composite(body: Image.Image, head: Image.Image, anchor: dict) -> Image.Image:
    canvas = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
    # body: fit 800x720, bottom-anchored
    scale = min(CANVAS_W / body.width, BODY_MAX_H / body.height)
    bw, bh = int(body.width * scale), int(body.height * scale)
    body_scaled = body.resize((bw, bh), Image.LANCZOS)
    body_top = CANVAS_H - bh
    body_left = (CANVAS_W - bw) // 2
    canvas.alpha_composite(body_scaled, (body_left, body_top))
    # head badge: fixed size, centered on neck-x, overlapping the collar
    neck_x = int(anchor.get("neckX", CANVAS_W // 2))
    bx = max(BADGE_D // 2 + 6, min(CANVAS_W - BADGE_D // 2 - 6, neck_x))
    badge = head_badge(head, BADGE_D)
    canvas.alpha_composite(badge, (bx - BADGE_D // 2, BADGE_TOP))
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
        if "sheet" in body_file.stem or "proof" in body_file.stem or "composite" in body_file.stem:
            continue
        anchor_file = body_file.with_suffix(".json")
        anchor = json.loads(anchor_file.read_text(encoding="utf-8")) if anchor_file.exists() else {}
        merged = composite(Image.open(body_file).convert("RGBA"), head, anchor)
        merged.save(out / f"{body_file.stem}.png")
        print(f"baked {body_file.stem}: badge D={BADGE_D} at x={anchor.get('neckX', '?')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

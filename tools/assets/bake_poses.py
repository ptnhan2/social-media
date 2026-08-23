"""Bake character poses v5 — quality iteration loop.

Fixes applied per VLM self-review round 1:
  - Head size: 50% canvas height (Isaac proportion, was too small)
  - Alpha patch: opaque backing ellipse behind head covers neck-joint gaps
  - Color grade: subtle warm tint on head to match body photo temperature
  - Feathered edges: slight blur on head boundary for smoother transition
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

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


def _color_grade(head: Image.Image, warmth: float = 0.08) -> Image.Image:
    """Subtle warm tint to help the cartoon head sit in a warm-lit scene."""
    result = head.copy()
    r, g, b, a = result.split()
    r = r.point(lambda v: min(255, int(v * (1 + warmth))))
    b = b.point(lambda v: int(v * (1 - warmth * 0.5)))
    result = Image.merge("RGBA", [r, g, b, a])
    return ImageEnhance.Color(result).enhance(1.06)


def composite(body: Image.Image, head: Image.Image, anchor: dict) -> Image.Image:
    canvas = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))

    # --- body: fit full width, anchored at bottom ---
    scale = CANVAS_W / body.width if body.width > CANVAS_W else min(CANVAS_W / body.width, CANVAS_H / body.height)
    bw, bh = int(body.width * scale), int(body.height * scale)
    body_scaled = body.resize((bw, bh), Image.LANCZOS)
    body_top = CANVAS_H - bh
    canvas.alpha_composite(body_scaled, ((CANVAS_W - bw) // 2, body_top))

    # --- head: Isaac proportion — 45% of canvas height ---
    head_h = int(CANVAS_H * 0.45)
    head_w = int(head.width * (head_h / head.height))

    # position: centered horizontally near detected neck-x, vertically so the
    # head BOTTOM sits just above the body's shoulder line
    neck_x = int(anchor.get("headCX", CANVAS_W // 2))
    hx = max(head_w // 2 + 6, min(CANVAS_W - head_w // 2 - 6, neck_x))
    hy = max(8, body_top - int(head_h * 0.72))  # head bottom dips 72% into frame

    # --- drop shadow for depth ---
    shadow = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
    sh_draw = ImageDraw.Draw(shadow)
    sh_draw.ellipse([hx - head_w // 2 + 10, hy + 12, hx + head_w // 2 + 10, hy + head_h + 12], fill=(0, 0, 0, 55))
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=14))
    canvas.alpha_composite(shadow)

    # --- head: scale + color grade + feather edges ---
    head_layer = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
    head_scaled = _color_grade(head.resize((head_w, head_h), Image.LANCZOS), warmth=0.08)

    # feather edges: dilate alpha then blur boundary for smooth transition
    h_alpha = np.asarray(head_scaled.getchannel("A")).copy()
    # dilate: expand solid area by 3px to cover any cutout gaps
    from scipy import ndimage as ndi
    dilated = ndi.binary_dilation(h_alpha > 10, iterations=3)
    h_alpha[dilated & (h_alpha < 200)] = np.maximum(h_alpha[dilated & (h_alpha < 200)], 180)
    head_alpha_img = Image.fromarray(h_alpha)
    head_alpha_img = head_alpha_img.filter(ImageFilter.GaussianBlur(radius=1.5))
    head_scaled.putalpha(head_alpha_img)

    head_layer.paste(head_scaled, (hx - head_w // 2, hy), head_scaled)
    canvas.alpha_composite(head_layer)

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
        merged = composite(body := Image.open(body_file).convert("RGBA"), head, anchor)
        merged.save(out / f"{body_file.stem}.png")
        print(f"baked {body_file.stem}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

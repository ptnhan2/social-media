"""Bake character poses v6 — angle-matched direct head replacement.

Per user feedback 2026-08-23:
- Head asset is HEAD ONLY (no neck, no shoulders) — generated per angle
- Angle variant matched to body orientation (front body → front head)
- Head bottom aligns with the neck cut line on the body
- Isaac proportion: head = ~40% of visible body height
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

CANVAS_W, CANVAS_H = 800, 1300


def _color_grade(head: Image.Image, warmth: float = 0.08) -> Image.Image:
    """Subtle warm tint so cartoon head sits in warm-lit scenes."""
    result = head.copy()
    r, g, b, a = result.split()
    r = r.point(lambda v: min(255, int(v * (1 + warmth))))
    b = b.point(lambda v: int(v * (1 - warmth * 0.5)))
    result = Image.merge("RGBA", [r, g, b, a])
    return ImageEnhance.Color(result).enhance(1.06)


def composite(body: Image.Image, heads: dict, anchor: dict) -> Image.Image:
    """heads: {"front": img, "3q": img} — angle matched to pose orientation."""
    canvas = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))

    # --- body: fit width, anchored at bottom ---
    scale = CANVAS_W / body.width if body.width > CANVAS_W else min(CANVAS_W / body.width, CANVAS_H / body.height)
    bw, bh = int(body.width * scale), int(body.height * scale)
    body_scaled = body.resize((bw, bh), Image.LANCZOS)
    body_top = CANVAS_H - bh
    canvas.alpha_composite(body_scaled, ((CANVAS_W - bw) // 2, body_top))

    # --- head: pick angle variant ---
    angle = anchor.get("angle", "front")
    head_img = heads.get(angle) or heads.get("front") or next(iter(heads.values()), None)
    if head_img is None:
        print(f"WARNING: no head asset available")

    # Isaac proportion: head = ~40% of visible body height (bh)
    head_h = int(bh * 0.42)
    head_w = int(head_img.width * (head_h / head_img.height))

    # position: centered on detected head-x; bottom of head overlaps collar slightly
    neck_x = int(anchor.get("neckX", CANVAS_W // 2))
    hx = max(head_w // 2 + 4, min(CANVAS_W - head_w // 2 - 4, neck_x))
    hy = body_top - head_h + int(head_h * 0.14)  # chin dips 14% into collar zone

    # --- drop shadow for depth ---
    shadow = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
    sh_draw = ImageDraw.Draw(shadow)
    sh_draw.ellipse([hx - head_w // 2 + 8, hy + 10,
                     hx + head_w // 2 + 8, hy + head_h + 10], fill=(0, 0, 0, 50))
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=12))
    canvas.alpha_composite(shadow)

    # --- color grade + feathered edges ---
    head_scaled = _color_grade(head_img.resize((head_w, head_h), Image.LANCZOS))
    h_alpha = np.asarray(head_scaled.getchannel("A")).copy()
    from scipy import ndimage as ndi
    dilated = ndi.binary_dilation(h_alpha > 10, iterations=3)
    h_alpha[dilated & (h_alpha < 200)] = np.maximum(h_alpha[dilated & (h_alpha < 200)], 180)
    head_alpha_img = Image.fromarray(h_alpha).filter(ImageFilter.GaussianBlur(radius=1.5))
    head_scaled.putalpha(head_alpha_img)

    canvas.alpha_composite(head_scaled, (hx - head_w // 2, hy))
    return canvas


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    args = sys.argv[1:]

    def arg(name: str, default: str = "") -> str:
        return args[args.index(name) + 1] if name in args and args.index(name) + 1 < len(args) else default

    heads_dir, bodies_dir, out_dir = arg("--heads"), arg("--bodies"), arg("--out")
    if not (heads_dir and bodies_dir and out_dir):
        print(__doc__)
        return 1

    heads_dir_path = Path(heads_dir)
    heads = {}
    for f in sorted(heads_dir_path.glob("*.png")):
        if "head-front" in f.stem:
            heads["front"] = Image.open(f).convert("RGBA")
        elif "head-3q" in f.stem:
            heads["3q"] = Image.open(f).convert("RGBA")
        elif f.stem == "head":
            heads["default"] = Image.open(f).convert("RGBA")
    print(f"loaded {len(heads)} head variants: {list(heads.keys())}")

    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)

    for body_file in sorted(Path(bodies_dir).glob("*.png")):
        if any(kw in body_file.stem for kw in ("sheet", "proof", "composite", "cutout", "test")):
            continue
        anchor_file = body_file.with_suffix(".json")
        anchor = json.loads(anchor_file.read_text(encoding="utf-8")) if anchor_file.exists() else {}

        # angle matching: front-facing bodies get front head, turned bodies get 3q
        pose_name = body_file.stem
        if "celebrate" in pose_name or "energetic" in pose_name:
            angle = "front"
        elif "point" in pose_name or "side" in pose_name or "turn" in pose_name:
            angle = "3q"
        else:
            angle = "front"

        merged = composite(Image.open(body_file).convert("RGBA"), heads, {**anchor, "angle": angle})
        merged.save(out / f"{body_file.stem}.png")
        print(f"baked {body_file.stem}: angle={angle}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

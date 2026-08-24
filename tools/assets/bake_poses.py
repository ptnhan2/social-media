"""Bake character poses v7 — SIMPLEST CORRECT APPROACH.

NO face detection needed. The cartoon head goes at the TOP of the body
cutout (where the original head always is in a portrait photo).
Size = big enough to cover the entire original head area.
"""
from __future__ import annotations

import json, os, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, 'tools/assets')
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from process_body import _load_env
_load_env()

CANVAS_W, CANVAS_H = 800, 1300


def composite(body: Image.Image, head: Image.Image) -> Image.Image:
    """Place cartoon head at the TOP of the body cutout."""
    # body is the rembg cutout (transparent bg, person visible)
    # find where the subject starts (topmost opaque pixel)
    arr = np.asarray(body.getchannel("A"))
    ys, xs = np.where(arr > 10)
    if len(ys) == 0:
        return body.copy()

    sub_top = int(ys.min())
    sub_left = int(xs.min())
    sub_right = int(xs.max())
    sub_center_x = (sub_left + sub_right) // 2
    sub_h = int(ys.max()) - sub_top

    # cartoon head size: ~45% of subject height (Isaac proportion)
    head_size = max(300, int(sub_h * 0.42))

    # position: centered horizontally on the head area,
    # bottom of head overlaps the body by ~15% of head height
    hx = sub_center_x - head_size // 2
    hy = sub_top - int(head_size * 0.85)  # mostly above the neck line

    # clamp within canvas
    hx = max(-head_size // 4, min(CANVAS_W - head_size * 3 // 4, hx))
    hy = max(-head_size // 4, min(CANVAS_H - head_size, hy))

    # --- build final canvas ---
    canvas = body.convert("RGBA").copy()

    # subtle drop shadow behind head
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.ellipse([hx + 8, hy + 12, hx + head_size + 8, hy + head_size + 12], fill=(0, 0, 0, 50))
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=12))
    canvas.alpha_composite(shadow)

    # color grade head (warm tint to blend with scene)
    head_copy = head.copy()
    r, g, b, a = head_copy.split()
    r = r.point(lambda v: min(255, int(v * 1.06)))
    b = b.point(lambda v: int(v * 0.96))
    head_copy = Image.merge("RGBA", [r, g, b, a])
    head_copy = ImageEnhance_enhance(head_copy)

    canvas.alpha_composite(head_copy.resize((head_size, head_size), Image.LANCZOS), (hx, hy))

    # crop to content
    fa = np.asarray(canvas.getchannel("A"))
    cys, cxs = np.where(fa > 10)
    if len(cys):
        canvas = canvas.crop((int(cxs.min()), int(cys.min()), int(cxs.max())+1, int(cys.max())+1))

    return canvas


def ImageEnhance_enhance(img):
    from PIL import ImageEnhance
    return ImageEnhance.Color(img).enhance(1.04)


def main():
    args = sys.argv[1:]

    def arg(name, default=""):
        return args[args.index(name) + 1] if name in args and args.index(name) + 1 < len(args) else default

    head_path, bodies_dir, out_dir = arg("--head"), arg("--bodies"), arg("--out")
    if not (head_path and bodies_dir and out_dir):
        print(__doc__); return 1

    head = Image.open(head_path).convert("RGBA")
    out = Path(out_dir); out.mkdir(parents=True, exist_ok=True)

    # process raw stock photos from inbox
    inbox = Path(bodies_dir) / "inbox"
    raw_files = sorted(inbox.glob("*.jpg")) + sorted(inbox.glob("*.png"))
    raw_files = [f for f in raw_files if "cutout" not in f.stem and "test" not in f.stem and "cmp" not in f.stem]

    pose_map = {}
    for f in raw_files:
        stem = f.stem.lower()
        if "point-up" in stem or "pointing" in stem or "confident" in stem:
            pose_map[f] = "present"
        elif "think" in stem or "chin" in stem or "pensive" in stem or "asian" in stem:
            pose_map[f] = "think"
        elif "celebrat" in stem or "cheer" in stem or "smiling" in stem:
            pose_map[f] = "celebrate"
        elif "point-side" in stem or "side" in stem or "gesture" in stem:
            pose_map[f] = "point-right"
        else:
            pose_map[f] = stem.replace("-raw", "").replace(".jpg", "")

    session = None
    for raw_file in sorted(raw_files):
        pose_name = pose_map[raw_file]
        print(f"\n--- {pose_name} ({raw_file.name}) ---")

        # 1. rembg tách nền
        from rembg import remove, new_session as _ns
        if session is None:
            session = _ns("isnet-general-use")
        img = Image.open(raw_file).convert("RGB")
        cutout = remove(img, session=session)

        # normalize to 800×1100
        canvas = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
        scale = min(CANVAS_W / cutout.width, CANVAS_H / cutout.height)
        new_size = (int(cutout.width * scale), int(cutout.height * scale))
        resized = cutout.resize(new_size, Image.LANCZOS)
        canvas.paste(resized, ((CANVAS_W-new_size[0])//2, (CANVAS_H-new_size[1])//2), resized)

        # save intermediate body-only
        tmp_body = Path(bodies_dir) / f"{pose_name}.png"
        canvas.save(tmp_body)

        # 2. bake cartoon head on top
        merged = composite(canvas, head)
        merged.save(out / f"{pose_name}.png")
        print(f"  saved {pose_name}.png")

    return 0


if __name__ == "__main__":
    sys.exit(main())

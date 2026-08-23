"""Process a stock body photo into a character-pose asset.

Pipeline (for isolated/plain-background stock photos):
  1. Background removal — threshold-based (near-uniform bg -> transparent).
     For complex backgrounds, run `hyperframes remove-background` first and
     pass the cutout to this script with --bg-already-removed.
  2. Neck crop — remove the original head: crop from --neck-y (fraction of
     the subject bbox height, default 0.22) downward.
  3. Normalize — fit into a standard canvas (800x1100, transparent).

Usage:
  python tools/assets/process_body.py --in <photo> --out <pose.png> [--neck-y 0.22] [--bg-already-removed]
"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image


def subject_bbox(img: Image.Image, alpha: Image.Image | None = None) -> tuple[int, int, int, int]:
    """Bounding box of non-background pixels."""
    if alpha is not None:
        bbox = alpha.getbbox()
        return bbox if bbox else (0, 0, img.width, img.height)
    # threshold: non-near-bg pixels (works for plain backgrounds)
    gray = img.convert("L")
    px = gray.load()
    min_x, min_y, max_x, max_y = img.width, img.height, -1, -1
    # sample corners for the bg level
    corners = [px[2, 2], px[img.width - 3, 2], px[2, img.height - 3], px[img.width - 3, img.height - 3]]
    bg = sum(corners) / len(corners)
    for y in range(0, img.height, 2):
        for x in range(0, img.width, 2):
            if abs(px[x, y] - bg) > 28:
                min_x, min_y = min(min_x, x), min(min_y, y)
                max_x, max_y = max(max_x, x), max(max_y, y)
    if max_x < 0:
        return 0, 0, img.width, img.height
    return min_x, min_y, max_x + 1, max_y + 1


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    args = sys.argv[1:]

    def arg(name: str, default: str = "") -> str:
        return args[args.index(name) + 1] if name in args and args.index(name) + 1 < len(args) else default

    in_path, out_path = arg("--in"), arg("--out")
    if not in_path or not out_path:
        print(__doc__)
        return 1
    neck_y = float(arg("--neck-y", "0.22"))
    already_cut = "--bg-already-removed" in args

    img = Image.open(in_path).convert("RGB")
    if already_cut:
        src = Image.open(in_path).convert("RGBA")
        alpha = src.getchannel("A")
        bbox = subject_bbox(img, alpha)
        work = src
    else:
        # 1. threshold background removal
        bbox = subject_bbox(img)
        gray = img.convert("L")
        corners = [gray.getpixel((2, 2)), gray.getpixel((img.width - 3, 2)), gray.getpixel((2, img.height - 3)), gray.getpixel((img.width - 3, img.height - 3))]
        bg = sum(corners) / len(corners)
        rgba = img.convert("RGBA")
        px = rgba.load()
        for y in range(rgba.height):
            for x in range(rgba.width):
                if abs(gray.getpixel((x, y)) - bg) <= 28:
                    px[x, y] = (0, 0, 0, 0)
        work = rgba

    x0, y0, x1, y1 = bbox
    subject = work.crop((x0, y0, x1, y1))
    # 2. neck crop — drop the original head
    neck_line = int(subject.height * neck_y)
    body = subject.crop((0, neck_line, subject.width, subject.height))
    # 3. normalize to 800x1100 canvas (fit, keep aspect)
    canvas = Image.new("RGBA", (800, 1100), (0, 0, 0, 0))
    scale = min(800 / body.width, 1100 / body.height)
    new_size = (int(body.width * scale), int(body.height * scale))
    body = body.resize(new_size, Image.LANCZOS)
    canvas.paste(body, ((800 - new_size[0]) // 2, 0), body)
    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    canvas.save(out_path)
    print(f"processed {out_path} (subject {x1-x0}x{y1-y0}, neck at {neck_y:.0%}, canvas 800x1100)")
    return 0


if __name__ == "__main__":
    sys.exit(main())

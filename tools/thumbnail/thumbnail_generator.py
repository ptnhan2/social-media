"""Generate an original thumbnail system artifact without a provider call."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


THUMBNAIL_TYPES = ("shock", "big-number", "simple-weird", "social-hacking", "header-comparison", "blur-reveal", "branded", "question", "before-after", "single-claim")


def font(size: int, bold: bool = False):
    candidates = ["C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]
    for candidate in candidates:
        if Path(candidate).exists(): return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()


def generate(title: str, thumbnail_type: str, output: Path) -> dict:
    if thumbnail_type not in THUMBNAIL_TYPES: raise ValueError(f"unknown thumbnail type: {thumbnail_type}")
    image = Image.new("RGB", (1280, 720), "#0b1017")
    draw = ImageDraw.Draw(image)
    for y in range(720):
        ratio = y / 719
        draw.line((0, y, 1280, y), fill=(14 + int(18 * ratio), 24 + int(18 * ratio), 32 + int(28 * ratio)))
    draw.ellipse((760, -120, 1430, 550), fill="#1b3540", outline="#61d7e8", width=7)
    draw.rounded_rectangle((62, 74, 1218, 646), radius=22, outline="#40515f", width=4)
    draw.rectangle((72, 84, 1208, 112), fill="#151d27")
    draw.ellipse((94, 94, 108, 108), fill="#ec6a5e")
    draw.ellipse((120, 94, 134, 108), fill="#f2b84b")
    draw.ellipse((146, 94, 160, 108), fill="#61d7e8")
    accent = "#f2b84b" if thumbnail_type in {"shock", "big-number", "before-after"} else "#61d7e8"
    draw.rounded_rectangle((92, 190, 740, 520), radius=18, fill="#111923", outline=accent, width=5)
    draw.line((144, 458, 274, 356, 398, 414, 548, 274, 682, 318), fill="#ec6a5e", width=12)
    for x, y in ((144, 458), (274, 356), (398, 414), (548, 274), (682, 318)):
        draw.ellipse((x - 12, y - 12, x + 12, y + 12), fill=accent)
    draw.text((100, 132), "ISAACVERSE / EDITING", fill="#61d7e8", font=font(22, True))
    words = title.upper().split()
    lines = [" ".join(words[: max(1, len(words) // 2)]), " ".join(words[max(1, len(words) // 2):])]
    draw.text((790, 222), lines[0], fill="#f4f7f7", font=font(54, True), stroke_width=2, stroke_fill="#0b1017")
    draw.text((790, 292), lines[1], fill=accent, font=font(54, True), stroke_width=2, stroke_fill="#0b1017")
    draw.text((790, 410), "THE TIMELINE IS NOT THE EDIT", fill="#c5d1d8", font=font(19, True))
    output.parent.mkdir(parents=True, exist_ok=True)
    image.save(output, format="PNG", optimize=True)
    return {"id": f"thumbnail-{thumbnail_type}", "src": str(output), "type": thumbnail_type, "title": title, "qaStatus": "pending", "dimensions": {"width": 1280, "height": 720}}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--title", required=True)
    parser.add_argument("--type", default="single-claim", choices=THUMBNAIL_TYPES)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--metadata", type=Path, required=True)
    args = parser.parse_args()
    result = generate(args.title, args.type, args.output)
    args.metadata.parent.mkdir(parents=True, exist_ok=True)
    args.metadata.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__": raise SystemExit(main())

"""Bg-removal model comparison for the Asset Studio spec decision (D3).

Tests available models on the real stock photos and builds a comparison
sheet. Run: python tools/assets/compare_bg_models.py (long: downloads models
on first use — birefnet-general is ~1GB).
"""
from __future__ import annotations

import sys
import time
from pathlib import Path

from PIL import Image, ImageDraw

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BODIES = Path("projects/isaacverse-final/assets/character/bodies/inbox")
OUT = BODIES
PHOTOS = ["celebrate-raw.jpg", "point-up-raw.jpg"]
MODELS = [
    ("flood-fill", None),  # no model — pure algorithm (process_body.py)
    ("u2net_human_seg", "hyperframes"),  # via hyperframes CLI
    ("bria-rmbg", "rembg"),
    ("isnet-general-use", "rembg"),
    ("birefnet-general", "rembg"),
]


def flood_fill(img: Image.Image) -> Image.Image:
    sys.path.insert(0, "tools/assets")
    from process_body import flood_fill_background
    return flood_fill_background(img, tolerance=30)


def hyperframes_u2net(img_path: str, out_path: str) -> Image.Image:
    import subprocess
    subprocess.run(["npx", "hyperframes", "remove-background", "-o", out_path, img_path],
                   capture_output=True, timeout=600)
    return Image.open(out_path).convert("RGBA")


def rembg_model(model: str, img: Image.Image) -> Image.Image:
    from rembg import remove, new_session
    session = new_session(model)
    return remove(img, session=session)


def checkerboard_paste(img: Image.Image, size: tuple[int, int]) -> Image.Image:
    """Composite on a checkerboard so alpha quality is visible."""
    w, h = size
    board = Image.new("RGB", (w, h), (24, 24, 28))
    d = ImageDraw.Draw(board)
    cell = 24
    for y in range(0, h, cell):
        for x in range(0, w, cell):
            if (x // cell + y // cell) % 2 == 0:
                d.rectangle([x, y, x + cell - 1, y + cell - 1], fill=(38, 38, 44))
    thumb = img.convert("RGBA").resize((w, h), Image.LANCZOS)
    board.paste(thumb, (0, 0), thumb)
    return board


def main() -> int:
    results: dict[str, dict[str, Image.Image]] = {}
    for photo in PHOTOS:
        results[photo] = {}
    for model, provider in MODELS:
        for photo in PHOTOS:
            src = str(BODIES / photo)
            stem = Path(photo).stem
            t0 = time.time()
            try:
                if provider is None:
                    out_img = flood_fill(Image.open(src))
                elif provider == "hyperframes":
                    out_path = str(OUT / f"cmp-{model}-{stem}.png")
                    out_img = hyperframes_u2net(src, out_path)
                else:
                    out_img = rembg_model(model, Image.open(src))
                    out_img.save(OUT / f"cmp-{model}-{stem}.png")
                results[photo][model] = out_img
                print(f"[{model}] {photo}: OK ({time.time()-t0:.0f}s)")
            except Exception as e:
                print(f"[{model}] {photo}: FAIL {str(e)[:100]}")
    # comparison sheets: one per photo, all models side by side
    ok_models = [m for m, _ in MODELS if any(m in results[p] for p in PHOTOS)]
    for photo in PHOTOS:
        available = [m for m in ok_models if m in results[photo]]
        if not available:
            continue
        cols = 1 + len(available)
        cw, ch = 300, 420
        sheet = Image.new("RGB", (cw * cols + 12 * (cols + 1), ch + 46), (10, 14, 20))
        d = ImageDraw.Draw(sheet)
        x = 12
        d.text((x, 10), "ORIGINAL", fill=(255, 209, 102))
        sheet.paste(checkerboard_paste(Image.open(BODIES / photo), (cw, ch)), (x, 36))
        x += cw + 12
        for m in available:
            d.text((x, 10), m, fill=(255, 209, 102))
            sheet.paste(checkerboard_paste(results[photo][m], (cw, ch)), (x, 36))
            x += cw + 12
        out = OUT / f"bg-comparison-{Path(photo).stem}.png"
        sheet.save(out)
        print(f"sheet: {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

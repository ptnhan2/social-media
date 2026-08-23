"""Process a stock body photo into a character-pose asset (v2).

Fixes over v1 (user-reported 2026-08-23):
  - bg removal ate dark body parts -> FLOOD-FILL removal: only pixels
    CONNECTED to the border with bg-like color are removed (enclosed dark
    regions inside the subject survive).
  - head anchor misplaced -> NECK DETECTION: width-profile analysis finds the
    head->shoulder transition; anchor = neck line + neck x-centroid + neck
    width (drives head scale at composite time).

Pipeline: flood-fill bg removal -> subject bbox -> neck detect -> crop at
neck -> normalize 800x1100 -> pose.png + pose.json (anchor manifest).

Usage:
  python tools/assets/process_body.py --in <photo> --out <pose.png> [--neck-frac 0.22]
       (neck-frac = fallback when detection fails)
  python tools/assets/process_body.py --in <cutout.png> --bg-already-removed --out <pose.png>
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

CANVAS_W, CANVAS_H = 800, 1100


def flood_fill_background(rgba: Image.Image, tolerance: float = 30) -> Image.Image:
    """Remove only the background connected to the image border."""
    arr = np.asarray(rgba.convert("RGB")).astype(np.int16)
    h, w, _ = arr.shape
    # bg reference: median of a 4px border ring
    border = np.concatenate([arr[:4].reshape(-1, 3), arr[-4:].reshape(-1, 3), arr[:, :4].reshape(-1, 3), arr[:, -4:].reshape(-1, 3)])
    bg = np.median(border, axis=0)
    # candidate bg-like pixels
    dist = np.abs(arr - bg).sum(axis=2)
    bg_like = dist < tolerance * 3
    # connected components of bg-like pixels; keep only those touching the border
    labels, n = ndimage.label(bg_like)
    border_labels = set(np.unique(np.concatenate([labels[:2].ravel(), labels[-2:].ravel(), labels[:, :2].ravel(), labels[:, -2:].ravel()])))
    border_labels.discard(0)
    bg_mask = np.isin(labels, list(border_labels)) if border_labels else np.zeros_like(bg_like)
    out = rgba.convert("RGBA")
    alpha = np.asarray(out.getchannel("A")).copy()
    alpha[bg_mask] = 0
    out.putalpha(Image.fromarray(alpha))
    return out


def _row_runs(alpha_row: np.ndarray) -> list[tuple[int, int]]:
    """Opaque runs [start, end) in one alpha row."""
    row = alpha_row > 0
    change = np.diff(np.concatenate([[0], row.astype(np.int8), [0]]))
    starts = np.where(change == 1)[0]
    ends = np.where(change == -1)[0]
    return [(int(s), int(e)) for s, e in zip(starts, ends)]


def detect_neck(alpha: np.ndarray) -> tuple[int, int, int] | None:
    """Neck detection: narrowest main-column row inside the anatomical band
    (15%–42% of subject height — below the scalp, above the torso), after
    removing tiny noise components. The main run = the widest run at the row
    (arms are separate narrower runs).

    Returns (neck_y, neck_x, neck_width) or None.
    """
    h, w = alpha.shape
    # 1. clean noise: drop components smaller than 0.05% of the subject area
    mask = alpha > 0
    if not mask.any():
        return None
    labels, n = ndimage.label(mask)
    sizes = ndimage.sum(mask, labels, range(1, n + 1))
    min_size = max(60.0, mask.sum() * 0.0005)
    keep_ids = [i + 1 for i, s in enumerate(sizes) if s >= min_size]
    if not keep_ids:
        return None
    clean = np.where(np.isin(labels, keep_ids), alpha, 0)

    rows = clean.sum(axis=1) / 255.0
    top = int(np.argmax(rows > 0))
    subject_h = h - top
    if subject_h < 30:
        return None
    # 2. anatomical band: 15%–42% of subject height
    y_start = top + int(subject_h * 0.15)
    y_end = min(h, top + int(subject_h * 0.42))
    min_neck_w = max(8, int(w * 0.025))
    best_y, best_w, best_main = None, None, None
    for y in range(y_start, y_end):
        runs = _row_runs(clean[y])
        if not runs:
            continue
        main = max(runs, key=lambda r: r[1] - r[0])
        width = main[1] - main[0]
        if width < min_neck_w:
            continue
        # neck must sit near the horizontal middle (±35% of width)
        center_x = (main[0] + main[1]) / 2
        if abs(center_x - w / 2) > w * 0.35:
            continue
        if best_w is None or width < best_w:
            best_w, best_y, best_main = width, y, main
    if best_y is None:
        return None
    # 3. sanity: the body must widen substantially below the neck
    widened = any(rows[y] > 1.7 * best_w for y in range(best_y + 2, min(h, best_y + int(subject_h * 0.20))))
    if not widened:
        return None
    return int(best_y), int((best_main[0] + best_main[1]) // 2), int(best_w)


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    args = sys.argv[1:]

    def arg(name: str, default: str = "") -> str:
        return args[args.index(name) + 1] if name in args and args.index(name) + 1 < len(args) else default

    in_path, out_path = arg("--in"), arg("--out")
    if not in_path or not out_path:
        print(__doc__)
        return 1
    out = Path(out_path)
    out.parent.mkdir(parents=True, exist_ok=True)

    img = Image.open(in_path)
    if "--bg-already-removed" in args:
        work = img.convert("RGBA")
    else:
        work = flood_fill_background(img)

    alpha = np.asarray(work.getchannel("A"))
    mask = alpha > 0
    if not mask.any():
        print("ERROR: no subject found")
        return 1
    ys, xs = np.where(mask)
    x0, y0, x1, y1 = int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1
    subject = work.crop((x0, y0, x1, y1))
    s_alpha = np.asarray(subject.getchannel("A"))

    detection = detect_neck(s_alpha)
    if detection:
        neck_y, neck_x, neck_w = detection
        method = "detected"
    else:
        neck_y, neck_x, neck_w = int(subject.height * float(arg("--neck-frac", "0.22"))), subject.width // 2, max(20, subject.width // 8)
        method = "fallback"
    neck_frac = neck_y / subject.height

    body = subject.crop((0, neck_y, subject.width, subject.height))
    scale = min(CANVAS_W / body.width, CANVAS_H / body.height)
    new_size = (int(body.width * scale), int(body.height * scale))
    body = body.resize(new_size, Image.LANCZOS)
    canvas = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
    offset_x = (CANVAS_W - new_size[0]) // 2
    canvas.paste(body, (offset_x, 0), body)
    # anchor in canvas coords: neck x scales with the same transform
    anchor = {
        "neckX": int(offset_x + (neck_x - 0) * scale),
        "neckY": 0,
        "neckWidth": max(6, int(neck_w * scale)),
        "method": method,
        "source": Path(in_path).name,
    }
    canvas.save(out)
    manifest = out.with_suffix(".json")
    manifest.write_text(json.dumps(anchor, indent=2), encoding="utf-8")
    print(f"processed {out.name}: neck {method} (frac {neck_frac:.0%}, x={anchor['neckX']}, w={anchor['neckWidth']})")
    return 0


if __name__ == "__main__":
    sys.exit(main())

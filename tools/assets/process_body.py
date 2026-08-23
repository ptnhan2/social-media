"""Process a stock FULL-BODY photo into a character-pose asset (v3).

Isaac-style pipeline (VLM-verified 2026-08-23, see char-study/VLM-FINDINGS.md):
  1. AI background removal (isnet/bria/birefnet via rembg)
  2. KEEP the full body INCLUDING the original head — no cropping
  3. Detect the ORIGINAL HEAD ZONE (position + size) so the channel's
     cartoon head can be placed exactly over it, covering it completely
  4. Normalize to an 800x1300 canvas (extra headroom above for the big head)

Output: <pose>.png + <pose>.json (anchor manifest).

Usage:
  python tools/assets/process_body.py --in <raw.jpg> --out <pose.png> [--bg-already-removed]
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

CANVAS_W, CANVAS_H = 800, 1300


def _load_env() -> None:
    env_file = Path(__file__).parent.parent.parent / ".env"
    if not env_file.exists():
        return
    for line in env_file.read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.strip()
        if "=" in line and not line.startswith("#"):
            key, _, value = line.partition("=")
            value = value.strip()
            if "#" in value and not (value.startswith('"') or value.startswith("'")):
                value = value.split("#")[0].strip()
            if value and not os.environ.get(key.strip()):
                os.environ[key.strip()] = value


def flood_fill_background(rgba, tolerance=30):
    arr = np.asarray(rgba.convert("RGB")).astype(np.int16)
    h, w, _ = arr.shape
    border = np.concatenate([arr[:4].reshape(-1, 3), arr[-4:].reshape(-1, 3), arr[:, :4].reshape(-1, 3), arr[:, -4:].reshape(-1, 3)])
    bg = np.median(border, axis=0)
    dist = np.abs(arr - bg).sum(axis=2)
    labels, n = ndimage.label(dist < tolerance * 3)
    border_labels = set(np.unique(np.concatenate([labels[:2].ravel(), labels[-2:].ravel(), labels[:, :2].ravel(), labels[:, -2:].ravel()])))
    border_labels.discard(0)
    bg_mask = np.isin(labels, list(border_labels)) if border_labels else np.zeros_like(dist, dtype=bool)
    out = rgba.convert("RGBA")
    a = np.asarray(out.getchannel("A")).copy()
    a[bg_mask] = 0
    out.putalpha(Image.fromarray(a))
    return out


def detect_head_zone(alpha: np.ndarray) -> dict:
    """Detect the original head zone in a full-body cutout.

    Strategy: the head is the topmost blob. Scan rows from the top; the head
    ends where the width jumps > 1.8x the median width of the first rows.
    Returns {cx, cy, w, h} in pixel coords relative to the input image.
    """
    h, w = alpha.shape
    mask = alpha > 24
    # clean noise
    labels, n = ndimage.label(mask)
    sizes = ndimage.sum(mask, labels, range(1, n + 1))
    keep_ids = [i + 1 for i, s in enumerate(sizes) if s >= mask.sum() * 0.0008]
    if not keep_ids:
        return {}
    clean = np.isin(labels, keep_ids)

    ys, xs = np.where(clean)
    top, bot = int(ys.min()), int(ys.max())
    left, right = int(xs.min()), int(xs.max())
    subject_h = bot - top

    # scan down from top: head = narrow region; shoulders = wide jump
    widths = []
    for y in range(top, min(bot, top + int(subject_h * 0.30))):
        runs = np.where(clean[y])[0]
        if len(runs) < 2:
            widths.append((y, 0, 0, 0))
            continue
        width = runs[-1] - runs[0]
        cx = (runs[0] + runs[-1]) // 2
        widths.append((y, width, cx, len(runs)))

    if not widths:
        return {}

    # head width = median of the first few measurable rows
    measurable = [(y, wd, cx) for y, wd, cx, nr in widths if wd > 4]
    if not measurable:
        return {}
    head_w_est = int(np.median([wd for _, wd, _ in measurable[:6]]))

    # find where shoulders start (width jump)
    head_bottom = None
    for y, wd, cx in measurable:
        if y > top + subject_h * 0.25:
            break
        if wd > head_w_est * 1.9:
            head_bottom = y
            break
    if head_bottom is None:
        head_bottom = top + int(subject_h * 0.14)  # fallback: anatomical ratio

    head_h = head_bottom - top
    # head centroid x: average cx across the head rows
    head_cxs = [cx for y, wd, cx in measurable if y < head_bottom]
    head_cx = int(np.mean(head_cxs)) if head_cxs else (left + right) // 2

    return {"cx": head_cx, "cy": top + head_h // 2, "w": head_w_est, "h": head_h}


import os  # noqa: E402


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    args = sys.argv[1:]

    def arg(name: str, default: str = "") -> str:
        return args[args.index(name) + 1] if name in args and args.index(name) + 1 < len(args) else default

    in_path, out_path = arg("--in"), arg("--out")
    if not in_path or not out_path:
        print(__doc__)
        return 1
    _load_env()
    out = Path(out_path)
    out.parent.mkdir(parents=True, exist_ok=True)

    img = Image.open(in_path)
    already_cut = "--bg-already-removed" in args

    # 1. AI bg removal (or use provided cutout)
    if not already_cut:
        from rembg import remove, new_session
        chain = [m for m in ("isnet-general-use", "bria-rmbg", "birefnet-general")]
        result = None
        for model in chain:
            model_file = Path.home() / ".rembg" / "models" / model / f"{model}.onnx"
            if not model_file.exists():
                continue
            try:
                session_cache_key = f"_sess_{model}"
                if session_cache_key not in globals():
                    globals()[session_cache_key] = new_session(model)
                result = remove(img, session=globals()[session_cache_key])
                break
            except Exception:
                continue
        if result is None:
            result = flood_fill_background(img)
        work = result.convert("RGBA")
    else:
        work = img.convert("RGBA")

    # 2. detect original head zone
    alpha = np.asarray(work.getchannel("A"))
    head = detect_head_zone(alpha)
    if not head:
        print("ERROR: could not detect head zone")
        return 1

    # 3. normalize: fit into 800x1300 canvas (extra headroom above for big head)
    ys, xs = np.where(alpha > 0)
    bx0, by0, bx1, by1 = int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1
    body_full = work.crop((bx0, by0, bx1, by1))
    scale = min(CANVAS_W / body_full.width, CANVAS_H / body_full.height)
    new_size = (int(body_full.width * scale), int(body_full.height * scale))
    body_scaled = body_full.resize(new_size, Image.LANCZOS)
    canvas = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
    paste_x = (CANVAS_W - new_size[0]) // 2
    canvas.paste(body_scaled, (paste_x, CANVAS_H - new_size[1]), body_scaled)

    # head coords mapped into canvas space
    head_cx_canvas = int(paste_x + head["cx"] * scale)
    head_cy_canvas = int(CANVAS_H - new_size[1] + head["cy"] * scale)
    head_w_canvas = int(head["w"] * scale)
    head_h_canvas = int(head["h"] * scale)

    anchor = {
        "headCX": head_cx_canvas,
        "headCY": head_cy_canvas,
        "headW": head_w_canvas,
        "headH": head_h_canvas,
        "source": Path(in_path).name,
    }
    canvas.save(out)
    Path(out).with_suffix(".json").write_text(json.dumps(anchor, indent=2), encoding="utf-8")
    print(f"processed {out.name}: head zone cx={head_cx_canvas} cy={head_cy_canvas} w={head_w_canvas} h={head_h_canvas}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

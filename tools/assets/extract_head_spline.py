"""Extract head using SPLINE through jaw landmarks + outward offset.

User feedback 2026-08-24:
- 3/4 view: green dots (landmarks) are CORRECT → offset 2px outward = perfect
- Front view: green dots cut into flesh → need larger offset (auto-detect)

Method:
1. MediaPipe jaw landmarks (18 points, left to right)
2. Offset each point OUTWARD (away from face center) by N pixels
3. Connect with cubic spline (follows exact jaw shape, not parabola)
4. Cut: everything below the spline = transparent
"""
import sys, os
sys.path.insert(0, 'tools/assets')
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from process_body import _load_env
_load_env()

import numpy as np
from PIL import Image as PILImage, ImageDraw
from rembg import remove, new_session
from pathlib import Path
from scipy import ndimage
from scipy.interpolate import CubicSpline

from mediapipe import Image as MPImage, ImageFormat as MPImageFormat
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision

model_path = os.path.expanduser("~/.mediapipe/face_landmarker.task")

JAW_IDS = [132, 58, 172, 136, 150, 149, 176, 148, 152, 377, 400, 378, 379, 365, 397, 288, 361, 323]


def offset_landmarks_outward(jaw_pts, face_cx, face_cy, offset_px):
    """Shift each jaw landmark away from face center by offset_px."""
    offset_pts = []
    for px, py in jaw_pts:
        dx = px - face_cx
        dy = py - face_cy
        dist = np.sqrt(dx**2 + dy**2)
        if dist < 1:
            ux, uy = 0, 1  # straight down for center points
        else:
            ux, uy = dx / dist, dy / dist
        offset_pts.append((px + ux * offset_px, py + uy * offset_px))
    return offset_pts


def auto_detect_offset(alpha, jaw_pts, face_cx, face_cy, chin_x, chin_y, h):
    """For front view: detect how far the skin surface is below the landmarks.
    
    Method: at the chin level, find where the alpha width starts narrowing
    (jaw→neck transition). The distance from chin landmark to that point
    = average offset needed.
    """
    # Width at chin landmark level
    chin_row = alpha[chin_y]
    chin_cols = np.where(chin_row > 24)[0]
    if len(chin_cols) < 2:
        return 4  # default
    chin_width = chin_cols[-1] - chin_cols[0]
    
    # Scan downward from chin to find where width drops (neck starts)
    for y in range(chin_y + 1, min(chin_y + 80, h)):
        row = alpha[y]
        cols = np.where(row > 24)[0]
        if len(cols) < 2:
            continue
        width = cols[-1] - cols[0]
        if width < chin_width * 0.75:  # 25% narrower = neck
            return max(2, y - chin_y)  # offset = distance from chin to neck start
    
    return 4  # fallback


def extract_head_spline(src_path, out_path, vis_path, offset_override=None):
    img = PILImage.open(src_path).convert("RGB")
    img_array = np.asarray(img)
    h, w = img_array.shape[:2]

    # --- MediaPipe ---
    options = vision.FaceLandmarkerOptions(
        base_options=mp_python.BaseOptions(model_asset_path=model_path),
        running_mode=vision.RunningMode.IMAGE, num_faces=1)
    landmarker = vision.FaceLandmarker.create_from_options(options)
    result = landmarker.detect(MPImage(image_format=MPImageFormat.SRGB, data=img_array))
    landmarker.close()
    if not result.face_landmarks:
        return None
    face = result.face_landmarks[0]

    chin_x = int(face[152].x * w)
    chin_y = int(face[152].y * h)

    jaw_pts = [(int(face[i].x * w), int(face[i].y * h)) for i in JAW_IDS]
    face_cx = sum(p[0] for p in jaw_pts) / len(jaw_pts)
    face_cy = sum(p[1] for p in jaw_pts) / len(jaw_pts)

    # --- rembg ---
    session = new_session("isnet-general-use")
    cutout = remove(img, session=session)
    alpha = np.asarray(cutout.getchannel("A"))
    mask = alpha > 10
    labels, n = ndimage.label(mask)
    sizes = ndimage.sum(mask, labels, range(1, n + 1))
    keep = [i + 1 for i, s in enumerate(sizes) if s >= 500]
    if keep:
        cutout.putalpha(PILImage.fromarray(np.where(np.isin(labels, keep), alpha, 0)))
    alpha = np.asarray(cutout.getchannel("A"))

    # --- Determine offset ---
    if offset_override is not None:
        offset_px = offset_override
        method = f"manual-{offset_px}px"
    else:
        offset_px = auto_detect_offset(alpha, jaw_pts, face_cx, face_cy, chin_x, chin_y, h)
        method = f"auto-{offset_px}px"

    print(f"  Offset: {offset_px}px ({method})")

    # --- Offset landmarks outward ---
    offset_pts = offset_landmarks_outward(jaw_pts, face_cx, face_cy, offset_px)

    # --- Build spline through offset points ---
    # Sort by x (landmarks go left to right)
    xs = np.array([p[0] for p in offset_pts])
    ys = np.array([p[1] for p in offset_pts])
    sort_idx = np.argsort(xs)
    xs_s, ys_s = xs[sort_idx], ys[sort_idx]

    # Cubic spline follows the exact jaw shape
    spline = CubicSpline(xs_s, ys_s)

    # --- Apply curved mask ---
    alpha_new = alpha.copy()
    x_min, x_max = int(xs_s.min()), int(xs_s.max())
    for x in range(w):
        if x < x_min or x > x_max:
            # Outside the jaw span: check if we're below the spline extrapolation
            # Use edge values
            y_cut = int(ys_s[0] if x < x_min else ys_s[-1])
        else:
            y_cut = int(spline(x))
        y_cut = max(0, min(y_cut, h))
        alpha_new[y_cut:, x] = 0  # everything below spline = transparent

    cutout.putalpha(PILImage.fromarray(alpha_new))

    # --- Crop ---
    final_alpha = np.asarray(cutout.getchannel("A"))
    ys_c, xs_c = np.where(final_alpha > 10)
    if len(ys_c) == 0:
        return None
    x0, y0, x1, y1 = int(xs_c.min()), int(ys_c.min()), int(xs_c.max()) + 1, int(ys_c.max()) + 1
    head_only = cutout.crop((x0, y0, x1, y1))
    print(f"  Head: {head_only.width}x{head_only.height}")

    # --- Normalize ---
    box = int(512 * 0.90)
    scale = min(box / head_only.width, box / head_only.height)
    new_size = (int(head_only.width * scale), int(head_only.height * scale))
    final = head_only.resize(new_size, PILImage.LANCZOS)
    canvas = PILImage.new("RGBA", (512, 512), (0, 0, 0, 0))
    canvas.paste(final, ((512 - new_size[0]) // 2, (512 - new_size[1]) // 2), final)
    canvas.save(out_path)

    # --- Visualization ---
    vis = img.copy()
    vd = ImageDraw.Draw(vis)

    # Original landmarks (green)
    for px, py in jaw_pts:
        vd.ellipse([px - 4, py - 4, px + 4, py + 4], fill=(0, 255, 100))

    # Offset landmarks (cyan)
    for px, py in offset_pts:
        vd.ellipse([px - 4, py - 4, px + 4, py + 4], fill=(0, 200, 255))

    # Spline curve (yellow)
    curve_pts = []
    for x in range(int(xs_s.min()), int(xs_s.max()), 3):
        y_curve = int(spline(x))
        curve_pts.append((x, max(0, min(y_curve, h))))
    vd.line(curve_pts, fill=(255, 255, 0), width=4)

    # Chin (red)
    vd.ellipse([chin_x - 10, chin_y - 10, chin_x + 10, chin_y + 10],
               fill=(255, 0, 0), outline="white", width=3)

    vd.text((20, 20), f"Offset: {offset_px}px ({method})", fill=(255, 255, 0))
    vd.text((20, 40), "Green=landmarks, Cyan=offset, Yellow=spline cut", fill=(0, 255, 100))

    vis.save(vis_path)
    print(f"  Vis: {vis_path}")

    return {"offset": offset_px, "method": method}


# --- Process both views ---
print("=== FRONT VIEW (auto-detect offset) ===")
r1 = extract_head_spline(
    "projects/isaacverse-final/assets/character/head-candidates/4b-friendly.png",
    "remotion-composer/public/isaacverse-final/character/head.png",
    "projects/isaacverse-final/assets/character/head-vis-front.png")

print("\n=== 3/4 VIEW (offset=2px, user confirmed) ===")
r2 = extract_head_spline(
    "projects/isaacverse-final/assets/character/head-candidates/4b-34-v2.png",
    "remotion-composer/public/isaacverse-final/character/head-3q.png",
    "projects/isaacverse-final/assets/character/head-vis-3q.png",
    offset_override=2)

print("\n=== RESULTS ===")
for name, r in [("front", r1), ("3/4", r2)]:
    if r:
        print(f"  {name}: offset={r['offset']}px ({r['method']})")

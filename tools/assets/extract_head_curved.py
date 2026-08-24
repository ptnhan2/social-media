"""Extract head using CURVED jawline cut (not straight horizontal).

Method:
1. MediaPipe detects 478 landmarks → jaw contour (18 points) + chin anchor
2. Fit a parabola to the jaw contour points
3. Offset the parabola so it passes exactly through chin_y + 2px
4. Everything BELOW the curve = transparent (neck removed)
5. Everything ABOVE the curve = kept (full head with jaw curve)
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

from mediapipe import Image as MPImage, ImageFormat as MPImageFormat
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision

model_path = os.path.expanduser("~/.mediapipe/face_landmarker.task")


def extract_head_curved(src_path, out_path, vis_path):
    img = PILImage.open(src_path).convert("RGB")
    img_array = np.asarray(img)
    h, w = img_array.shape[:2]

    # --- MediaPipe landmarks ---
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

    # Jaw contour landmarks (left to right along the jaw)
    jaw_ids = [132, 58, 172, 136, 150, 149, 176, 148, 152, 377, 400, 378, 379, 365, 397, 288, 361, 323]
    jaw_pts = [(int(face[i].x * w), int(face[i].y * h)) for i in jaw_ids]

    print(f"  Chin: ({chin_x}, {chin_y})")
    print(f"  Jaw contour: {len(jaw_pts)} points, x from {min(p[0] for p in jaw_pts)} to {max(p[0] for p in jaw_pts)}")

    # --- Fit parabola to jaw contour ---
    jaw_x_arr = np.array([p[0] for p in jaw_pts])
    jaw_y_arr = np.array([p[1] for p in jaw_pts])

    # Fit 2nd degree polynomial (parabola = jaw shape)
    coeffs = np.polyfit(jaw_x_arr, jaw_y_arr, 2)

    # Evaluate the parabola at the chin x position
    y_at_chin = np.polyval(coeffs, chin_x)

    # Offset so the curve passes through chin_y + 2px (just below chin tip)
    # This preserves the jaw SHAPE while anchoring at the confirmed chin position
    offset = (chin_y + 2) - y_at_chin
    print(f"  Parabola at chin x: y={y_at_chin:.0f}, offset={offset:.0f}px")

    # The curved cut line: y_cut(x) = polyval(coeffs, x) + offset
    # This curves UP on the sides (following the jaw) and is lowest at the chin

    # --- rembg cutout ---
    session = new_session("isnet-general-use")
    cutout = remove(img, session=session)

    # Clean noise
    alpha = np.asarray(cutout.getchannel("A"))
    mask = alpha > 10
    labels, n = ndimage.label(mask)
    sizes = ndimage.sum(mask, labels, range(1, n + 1))
    keep = [i + 1 for i, s in enumerate(sizes) if s >= 500]
    if keep:
        cutout.putalpha(PILImage.fromarray(np.where(np.isin(labels, keep), alpha, 0)))
    alpha = np.asarray(cutout.getchannel("A")).copy()

    # --- Apply curved mask ---
    # For each x-column: find y_cut(x), zero out everything below it
    alpha_new = alpha.copy()
    for x in range(w):
        y_cut = int(np.polyval(coeffs, x) + offset)
        y_cut = max(0, min(y_cut, h))
        # Everything below the jaw curve = transparent (neck/shoulders)
        alpha_new[y_cut:, x] = 0

    cutout.putalpha(PILImage.fromarray(alpha_new))

    # --- Crop to content bbox ---
    final_alpha = np.asarray(cutout.getchannel("A"))
    ys, xs = np.where(final_alpha > 10)
    if len(ys) == 0:
        return None
    x0, y0, x1, y1 = int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1
    head_only = cutout.crop((x0, y0, x1, y1))
    print(f"  Head: {head_only.width}x{head_only.height}")

    # --- Normalize 512×512 ---
    box = int(512 * 0.90)
    scale = min(box / head_only.width, box / head_only.height)
    new_size = (int(head_only.width * scale), int(head_only.height * scale))
    final = head_only.resize(new_size, PILImage.LANCZOS)
    canvas = PILImage.new("RGBA", (512, 512), (0, 0, 0, 0))
    canvas.paste(final, ((512 - new_size[0]) // 2, (512 - new_size[1]) // 2), final)
    canvas.save(out_path)
    print(f"  Saved: {out_path}")

    # --- Visualization ---
    vis = img.copy()
    vd = ImageDraw.Draw(vis)

    # Draw the CURVED cut line (yellow)
    curve_pts = []
    for x in range(0, w, 4):
        y_curve = int(np.polyval(coeffs, x) + offset)
        y_curve = max(0, min(y_curve, h))
        curve_pts.append((x, y_curve))
    vd.line(curve_pts, fill=(255, 255, 0), width=4)

    # Chin point (red)
    vd.ellipse([chin_x - 10, chin_y - 10, chin_x + 10, chin_y + 10],
               fill=(255, 0, 0), outline="white", width=3)

    # Jaw contour landmarks (green dots)
    for px, py in jaw_pts:
        vd.ellipse([px - 4, py - 4, px + 4, py + 4], fill=(0, 255, 100))

    vd.text((20, 20), f"CURVED cut (parabola through jaw landmarks)", fill=(255, 255, 0))
    vd.text((20, 40), f"Chin anchor: ({chin_x}, {chin_y}+2)", fill=(255, 100, 100))
    vd.text((20, 60), f"Green = jaw landmarks, Yellow = cut curve", fill=(0, 255, 100))

    vis.save(vis_path)
    print(f"  Visualization: {vis_path}")

    return {"chin": (chin_x, chin_y), "offset": offset}


# Process both views
print("=== FRONT VIEW ===")
r1 = extract_head_curved(
    "projects/isaacverse-final/assets/character/head-candidates/4b-friendly.png",
    "remotion-composer/public/isaacverse-final/character/head.png",
    "projects/isaacverse-final/assets/character/head-vis-front.png")

print("\n=== 3/4 VIEW ===")
r2 = extract_head_curved(
    "projects/isaacverse-final/assets/character/head-candidates/4c-focused-glasses.png",
    "remotion-composer/public/isaacverse-final/character/head-3q.png",
    "projects/isaacverse-final/assets/character/head-vis-3q.png")

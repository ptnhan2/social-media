"""Extract head using Meta SAM (Segment Anything Model) with point prompts.

This replaces all previous approaches (MediaPipe landmarks + spline +
width-profile). SAM segments ANY object given a single point prompt,
regardless of angle or style. Works perfectly on cartoon faces at any view.

Pipeline:
1. MediaPipe FaceLandmarker → nose tip = prompt point
2. SAM predictor → precise head mask from point prompt
3. Apply mask → clean head cutout
"""
import os, sys, json
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, 'tools/assets')
from process_body import _load_env
_load_env()

import numpy as np
from PIL import Image as PILImage, ImageDraw
from pathlib import Path
from rembg import remove, new_session

import torch
from segment_anything import sam_model_registry, SamPredictor


def _get_sam():
    ckpt = Path.home() / ".sam" / "sam_vit_b_01ec64.pth"
    sam = sam_model_registry["vit_b"](checkpoint=str(ckpt))
    return SamPredictor(sam)


def _find_nose_tip(img_array):
    """Find nose tip via MediaPipe (fallback: image upper center)."""
    h, w = img_array.shape[:2]
    try:
        from mediapipe import Image as MPImage, ImageFormat as MPImageFormat
        from mediapipe.tasks import python as mp_python
        from mediapipe.tasks.python import vision

        model_path = os.path.expanduser("~/.mediapipe/face_landmarker.task")
        options = vision.FaceLandmarkerOptions(
            base_options=mp_python.BaseOptions(model_asset_path=model_path),
            running_mode=vision.RunningMode.IMAGE, num_faces=1)
        landmarker = vision.FaceLandmarker.create_from_options(options)
        result = landmarker.detect(MPImage(image_format=MPImageFormat.SRGB, data=img_array))
        landmarker.close()
        if result.face_landmarks:
            # Nose tip = landmark 1
            return int(result.face_landmarks[0][1].x * w), int(result.face_landmarks[0][1].y * h)
    except Exception:
        pass
    return w // 2, int(h * 0.15)


def extract_head_sam(src_path, out_path, vis_path, sam_predictor=None):
    img = PILImage.open(src_path).convert("RGB")
    img_array = np.asarray(img)
    h, w = img_array.shape[:2]

    # 1. Find prompt point (nose tip)
    px, py = _find_nose_tip(img_array)

    # 2. First pass: rembg to remove background → clean subject cutout
    session = new_session("isnet-general-use")
    cutout = remove(img, session=session)

    # Clean noise in alpha
    alpha = np.asarray(cutout.getchannel("A"))
    mask_bg = alpha > 10
    labels, n = __import__('scipy.ndimage', fromlist=['label']).label(mask_bg)
    sizes = __import__('scipy.ndimage', fromlist=['sum']).sum(mask_bg, labels, range(1, n + 1))
    keep = [i + 1 for i, s in enumerate(sizes) if s >= 500]
    if keep:
        clean_alpha = np.where(np.isin(labels, keep), alpha, 0)
        cutout.putalpha(PILImage.fromarray(clean_alpha))

    # 3. SAM on the CUTOUT (background already removed → SAM focuses on subject)
    cutout_rgb = np.asarray(cutout.convert("RGB"))

    predictor = sam_predictor or _get_sam()
    predictor.set_image(cutout_rgb)

    # Point prompt: nose tip (positive label = part of object we want)
    input_point = np.array([[px, py]])
    input_label = np.array([1])  # 1 = foreground

    masks, scores, logits = predictor.predict(
        point_coords=input_point,
        point_labels=input_label,
        multimask_output=True,  # returns 3 candidate masks
    )

    # Pick best mask (highest score)
    best_idx = int(np.argmax(scores))
    best_mask = masks[best_idx]
    print(f"  SAM scores: {[f'{s:.3f}' for s in scores]}, best idx={best_idx}")

    # 4. Apply SAM mask to the ORIGINAL image (not cutout — keep original quality)
    rgba = img.convert("RGBA")
    orig_alpha = np.asarray(rgba.getchannel("A")).copy()
    # Set alpha = 255 where SAM mask is positive
    new_alpha = np.where(best_mask, 255, 0)
    # Combine: keep original alpha where SAM says foreground
    final_alpha = np.where(new_alpha > 0, np.maximum(orig_alpha, 255), 0)
    rgba.putalpha(PILImage.fromarray(final_alpha.astype(np.uint8)))

    # 5. Crop to content bbox
    fa = np.asarray(rgba.getchannel("A"))
    ys, xs = np.where(fa > 10)
    if len(ys) == 0:
        print("  ERROR: empty")
        return None
    x0, y0, x1, y1 = int(xs.min()), int(ys.min()), int(xs.max())+1, int(ys.max())+1
    head_only = rgba.crop((x0, y0, x1, y1))
    print(f"  Head: {head_only.width}x{head_only.height}")

    # 6. Normalize 512×512
    box = int(512 * 0.90)
    scale = min(box / head_only.width, box / head_only.height)
    new_size = (int(head_only.width * scale), int(head_only.height * scale))
    final = head_only.resize(new_size, PILImage.LANCZOS)
    canvas = PILImage.new("RGBA", (512, 512), (0, 0, 0, 0))
    canvas.paste(final, ((512-new_size[0])//2, (512-new_size[1])//2), final)
    canvas.save(out_path)

    # 7. Visualization
    vis = img.copy()
    vd = ImageDraw.Draw(vis)
    # Mask boundary (green outline)
    edges = __import__('scipy.ndimage', fromlist=['binary_erosion']).binary_erosion(best_mask, iterations=2)
    boundary = best_mask & ~edges
    bpts = np.where(boundary)
    for i in range(0, len(bpts[0]), 6):
        vd.point((bpts[1][i], bpts[0][i]), fill=(0, 255, 100))
    # Point prompt (red cross)
    vd.line([(px-18, py), (px+18, py)], fill=(255, 0, 0), width=3)
    vd.line([(px, py-18), (px, py+18)], fill=(255, 0, 0), width=3)
    vd.text((20, 20), f"SAM extraction — score={scores[best_idx]:.3f}", fill=(0, 255, 100))
    vis.save(vis_path)
    print(f"  Vis: {vis_path}")

    return {"size": (head_only.width, head_only.height), "score": float(scores[best_idx]), "mask_px": int(best_mask.sum())}


if __name__ == "__main__":
    print("Loading SAM...")
    predictor = _get_sam()
    print("SAM loaded.")

    print("\n=== FRONT VIEW ===")
    r1 = extract_head_sam(
        "projects/isaacverse-final/assets/character/head-candidates/4b-friendly.png",
        "remotion-composer/public/isaacverse-final/character/head.png",
        "projects/isaacverse-final/assets/character/head-sam-front.png",
        sam_predictor=predictor)

    print("\n=== 3/4 VIEW ===")
    r2 = extract_head_sam(
        "projects/isaacverse-final/assets/character/head-candidates/4b-34-v2.png",
        "remotion-composer/public/isaacverse-final/character/head-3q.png",
        "projects/isaacverse-final/assets/character/head-sam-3q.png",
        sam_predictor=predictor)

    print("\n=== RESULTS ===")
    for name, r in [("front", r1), ("3/4", r2)]:
        if r:
            print(f"  {name}: {r['size']}, SAM score={r['score']:.3f}")

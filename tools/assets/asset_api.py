"""Asset Studio processing bridge — one JSON command per invocation.

Called by the composer-app API middleware (vite.config.ts) via subprocess:
  python tools/assets/asset_api.py '<json command>'

Commands (JSON): {"op": "...", ...}
  remove-bg    {in, algo: auto|birefnet-general|bria-rmbg|isnet-general-use|flood, out}
  detect-neck  {in}                        -> {neckX, neckY, neckWidth, method}
  composite    {body, head, anchor, out}   -> bakes pose PNG (800x1100)
  coverage     {body, head, anchor}        -> {covered: bool, exposedPx}
  list-poses   {project}                   -> [{name, anchor}]
  save-pose    {project, name, png (b64), anchor}
  save-head    {project, png (b64)}
  crop-neck    {in, neckY, out}            -> crop above neckY + normalize

All results print as JSON to stdout. Model sessions are cached per-process
(rembg loads once); the API server keeps this stateless per call for now —
rembg model cache lives on disk after first download.
"""
from __future__ import annotations

import base64
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(ROOT / "tools" / "assets"))

from process_body import CANVAS_W, CANVAS_H, flood_fill_background, detect_head_zone  # noqa: E402

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402
from scipy import ndimage  # noqa: E402


def _load_env() -> None:
    env_file = ROOT / ".env"
    if not env_file.exists():
        return
    for line in env_file.read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.strip()
        if "=" in line and not line.startswith("#"):
            key, _, value = line.partition("=")
            value = value.strip()
            if "#" in value and not (value.startswith('"') or value.startswith("'")):
                value = value.split("#")[0].strip()
            import os
            if value and not os.environ.get(key.strip()):
                os.environ[key.strip()] = value


_session_cache: dict[str, object] = {}


def _model_cached(model: str) -> bool:
    """Only use models whose weights are already on disk — NEVER download
    inside a request (a 1GB download blocks the API for minutes; downloads
    happen via tools/assets/compare_bg_models.py or first-use warmup)."""
    home = Path.home()
    if model == "u2net":
        f = home / ".u2net" / "u2net.onnx"
        return f.exists() and f.stat().st_size > 50_000_000
    f = home / ".rembg" / "models" / model / f"{model}.onnx"
    return f.exists() and f.stat().st_size > 50_000_000


def _rembg_session(model: str):
    if model not in _session_cache:
        from rembg import new_session
        _session_cache[model] = new_session(model)
    return _session_cache[model]


def op_remove_bg(cmd: dict) -> dict:
    src = Path(cmd["in"])
    img = Image.open(src)
    algo = cmd.get("algo", "auto")
    # quality-passed models only (user verdict 2026-08-23), LIGHTEST FIRST:
    # isnet-general-use (170MB) > bria-rmbg (977MB) > birefnet-general (973MB).
    # flood-fill REMOVED from options (fails on dark clothing — user verdict).
    # Only cached models — no in-request downloads.
    chain = [m for m in ("isnet-general-use", "bria-rmbg", "birefnet-general") if _model_cached(m)]
    if algo in ("isnet-general-use", "bria-rmbg", "birefnet-general"):
        chain = [algo] + [m for m in chain if m != algo]
    if not chain:
        return {"ok": False, "error": "no bg-removal model cached yet — run tools/assets/compare_bg_models.py once to warm the cache"}
    result = None
    errors = []
    for model in chain:
        try:
            from rembg import remove
            result = remove(img, session=_rembg_session(model))
            used = model
            break
        except Exception as error:
            errors.append(f"{model}: {str(error)[:80]}")
    out = Path(cmd["out"])
    out.parent.mkdir(parents=True, exist_ok=True)
    result.save(out)
    return {"ok": True, "out": str(out), "algoUsed": used, "fallbacks": errors}


def op_detect_neck(cmd: dict) -> dict:
    img = Image.open(cmd["in"]).convert("RGBA")
    alpha = np.asarray(img.getchannel("A"))
    mask = alpha > 0
    if not mask.any():
        return {"ok": False, "error": "no subject"}
    ys, xs = np.where(mask)
    x0, y0 = int(xs.min()), int(ys.min())
    subject = img.crop((x0, y0, int(xs.max()) + 1, int(ys.max()) + 1))
    detection = detect_neck(np.asarray(subject.getchannel("A")))
    if not detection:
        return {"ok": False, "error": "neck not found"}
    neck_y, neck_x, neck_w = detection
    return {"ok": True, "neckX": neck_x + x0, "neckY": neck_y + y0, "neckWidth": neck_w, "method": "detected"}


def op_crop_neck(cmd: dict) -> dict:
    """Crop the original head OFF at neckY (with coverage margin) and normalize
    to the pose canvas. Returns the neck anchor in CANVAS coordinates."""
    img = Image.open(cmd["in"]).convert("RGBA")
    alpha = np.asarray(img.getchannel("A"))
    mask = alpha > 0
    ys, xs = np.where(mask)
    if not len(ys):
        return {"ok": False, "error": "empty"}
    x0, y0, x1, y1 = int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1
    subject = img.crop((x0, y0, x1, y1))
    neck_y = int(cmd.get("neckY", subject.height * 0.22)) - y0
    neck_x = int(cmd.get("neckX", subject.width // 2 + x0)) - x0
    neck_w = int(cmd.get("neckWidth", max(20, subject.width // 8)))
    # coverage margin: crop LOWER than the neck line so no chin remnants stay
    margin = int(subject.height * 0.06)
    crop_at = max(0, min(neck_y + margin, subject.height - 10))
    body = subject.crop((0, crop_at, subject.width, subject.height))
    scale = min(CANVAS_W / body.width, CANVAS_H / body.height)
    new_size = (int(body.width * scale), int(body.height * scale))
    body = body.resize(new_size, Image.LANCZOS)
    canvas = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
    offset_x = (CANVAS_W - new_size[0]) // 2
    canvas.paste(body, (offset_x, 0), body)
    out = Path(cmd["out"])
    out.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(out)
    return {
        "ok": True, "out": str(out),
        "neckX": int(offset_x + neck_x * scale),
        "neckWidth": max(6, int(neck_w * scale)),
        "cropAt": crop_at, "scale": scale, "offsetX": offset_x,
    }


def _head_transform(head: Image.Image, anchor: dict):
    """Returns (head_rgba_resized, paste_x, paste_y) on the 800x1100 canvas."""
    neck_w = max(8, int(anchor.get("neckWidth", 60)))
    neck_x = int(anchor.get("neckX", CANVAS_W // 2))
    ratio = float(anchor.get("headWidthRatio", 2.6))
    rotate = float(anchor.get("headRotate", 0))
    overlap = float(anchor.get("headOverlap", 0.18))
    head_w = int(neck_w * ratio)
    head_h = int(head.height * (head_w / head.width))
    head_scaled = head.resize((head_w, head_h), Image.LANCZOS)
    if abs(rotate) > 0.5:
        head_scaled = head_scaled.rotate(rotate, expand=True, resample=Image.BICUBIC)
    x = neck_x - head_scaled.width // 2
    y = -int(head_scaled.height * overlap)
    return head_scaled, x, y


def op_composite(cmd: dict) -> dict:
    body = Image.open(cmd["body"]).convert("RGBA")
    head = Image.open(cmd["head"]).convert("RGBA")
    anchor = cmd.get("anchor", {})
    head_scaled, x, y = _head_transform(head, anchor)
    canvas = body.copy()
    canvas.alpha_composite(head_scaled, (int(x), int(y)))
    out = Path(cmd["out"])
    out.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(out)
    return {"ok": True, "out": str(out)}


def op_coverage(cmd: dict) -> dict:
    """Check: does the head cover every subject pixel above the neck line?"""
    body = Image.open(cmd["body"]).convert("RGBA")
    head = Image.open(cmd["head"]).convert("RGBA")
    anchor = cmd.get("anchor", {})
    head_scaled, x, y = _head_transform(head, anchor)
    neck_w = max(8, int(anchor.get("neckWidth", 60)))
    neck_x = int(anchor.get("neckX", CANVAS_W // 2))
    # subject pixels above y=0 (canvas top) don't exist post-crop; the check is
    # about the composite: any BODY pixels visible above the head bottom edge
    # that are horizontally INSIDE the head span = exposed remnants.
    body_alpha = np.asarray(body.getchannel("A"))
    head_mask = np.zeros_like(body_alpha, dtype=bool)
    hx0, hy0 = max(0, x), max(0, y)
    hx1 = min(CANVAS_W, x + head_scaled.width)
    hy1 = min(CANVAS_H, y + head_scaled.height)
    head_arr = np.asarray(head_scaled.getchannel("A"))
    head_mask[hy0:hy1, hx0:hx1] = head_arr[hy0 - y:hy1 - y, hx0 - x:hx1 - x] > 24
    # exposed = body pixels that are visible AND in the head column zone AND above the neck join (y < 60)
    join_zone = body_alpha > 24
    column_zone = np.zeros_like(body_alpha, dtype=bool)
    col0 = max(0, neck_x - neck_w)
    col1 = min(CANVAS_W, neck_x + neck_w)
    column_zone[:70, col0:col1] = True
    exposed = join_zone & column_zone & ~head_mask
    exposed_px = int(exposed.sum())
    return {"ok": True, "covered": exposed_px < 120, "exposedPx": exposed_px}


def op_list_poses(cmd: dict) -> dict:
    project = cmd.get("project", "isaacverse-final")
    poses_dir = ROOT / "remotion-composer" / "public" / project / "character" / "poses"
    poses = []
    if poses_dir.exists():
        for png in sorted(poses_dir.glob("*.png")):
            anchor_file = png.with_suffix(".json")
            anchor = json.loads(anchor_file.read_text(encoding="utf-8")) if anchor_file.exists() else {}
            poses.append({"name": png.stem, "anchor": anchor})
    return {"ok": True, "poses": poses}


def op_save_pose(cmd: dict) -> dict:
    project = cmd.get("project", "isaacverse-final")
    name = "".join(c for c in cmd["name"].strip() if c.isalnum() or c in "-_").lower() or "pose"
    poses_dir = ROOT / "remotion-composer" / "public" / project / "character" / "poses"
    poses_dir.mkdir(parents=True, exist_ok=True)
    target = poses_dir / f"{name}.png"
    if target.exists():
        backup_dir = poses_dir / ".backups"
        backup_dir.mkdir(exist_ok=True)
        import time as _t
        target.rename(backup_dir / f"{name}-{int(_t.time())}.png")
    source = Path(cmd["from"])
    import shutil as _sh
    _sh.copy2(source, target)
    anchor_file = poses_dir / f"{name}.json"
    anchor_file.write_text(json.dumps(cmd.get("anchor", {}), indent=2), encoding="utf-8")
    return {"ok": True, "name": name, "out": str(target)}


def op_save_head(cmd: dict) -> dict:
    project = cmd.get("project", "isaacverse-final")
    head_dir = ROOT / "remotion-composer" / "public" / project / "character"
    head_dir.mkdir(parents=True, exist_ok=True)
    png_data = base64.b64decode(cmd["png"])
    (head_dir / "head.png").write_bytes(png_data)
    return {"ok": True, "out": str(head_dir / "head.png")}


def op_polygon_mask(cmd: dict) -> dict:
    """Apply a polygon mask to an image — keep or remove inside the polygon.
    This is the MANUAL cut tool: user draws the polygon in the web UI.
    """
    from PIL import Image, ImageDraw, ImageOps
    img = Image.open(cmd["in"]).convert("RGBA")
    w, h = img.size
    polygon = [(int(p["x"]), int(p["y"])) for p in cmd["polygon"]]
    mode = cmd.get("mode", "keep")  # "keep" = keep inside, "remove" = remove inside

    if len(polygon) < 3:
        return {"ok": False, "error": "polygon needs at least 3 points"}

    # Create mask
    mask = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(mask)
    draw.polygon(polygon, fill=255)

    if mode == "remove":
        mask = ImageOps.invert(mask)

    # Apply mask to alpha channel (intersect with existing alpha)
    alpha = np.asarray(img.getchannel("A"))
    new_alpha = np.minimum(alpha, np.asarray(mask))
    img.putalpha(Image.fromarray(new_alpha))

    # Crop to content
    ys, xs = np.where(new_alpha > 10)
    if len(ys) > 0:
        img = img.crop((int(xs.min()), int(ys.min()), int(xs.max())+1, int(ys.max())+1))

    # Normalize if requested
    if cmd.get("normalize"):
        box_size = 512
        box = int(box_size * 0.90)
        scale = min(box / img.width, box / img.height)
        ns = (int(img.width * scale), int(img.height * scale))
        img = img.resize(ns, Image.LANCZOS)
        canvas = Image.new("RGBA", (box_size, box_size), (0, 0, 0, 0))
        canvas.paste(img, ((box_size-ns[0])//2, (box_size-ns[1])//2), img)
        img = canvas

    out = Path(cmd["out"])
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out)
    return {"ok": True, "out": str(out), "size": f"{img.width}x{img.height}"}


def op_generate(cmd: dict) -> dict:
    """Generate image via Stability AI using a recipe or direct prompt.
    Auto post-process: bg removal + normalize 512×512.
    """
    import uuid as _uuid
    import urllib.request as _ur
    import urllib.parse as _up

    _load_env()
    recipes_file = ROOT / "libraries" / "asset-studio" / "recipes.json"
    recipes = json.loads(recipes_file.read_text(encoding="utf-8-sig")) if recipes_file.exists() else {}

    recipe_name = cmd.get("recipe", "")
    fields = cmd.get("fields", {})

    if recipe_name and recipe_name in recipes:
        recipe = recipes[recipe_name]
        template = recipe["promptTemplate"]
        # simple template substitution
        prompt = template
        for key, value in fields.items():
            prompt = prompt.replace("{{" + key + "}}", str(value))
        # handle optional blocks {{#accessory}}...{{/accessory}}
        import re as _re
        def _optional_block(match):
            inner = match.group(1)
            field_name = inner.split("Wearing ")[-1].split(".")[0].strip() if "Wearing" in inner else ""
            if fields.get(field_name, "none") != "none" and fields.get("accessory", "none") != "none":
                return inner
            return ""
        prompt = _re.sub(r"\{\{#(\w+)\}\}(.*?)\{\{/\1\}\}", _optional_block, prompt)
        # clean up none values
        prompt = prompt.replace("Wearing none.", "").replace("  ", " ")
    elif cmd.get("prompt"):
        prompt = cmd["prompt"]
    else:
        return {"ok": False, "error": "recipe or prompt required"}

    # Generate via Stability AI
    key = os.environ.get("STABILITY_API_KEY", "")
    if not key:
        return {"ok": False, "error": "STABILITY_API_KEY not set"}

    boundary = _uuid.uuid4().hex
    form = _up.urlencode({
        "prompt": prompt,
        "output_format": "png",
        "aspect_ratio": "1:1",
    }).encode()
    # Use multipart form
    body = b""
    for name, value in [("prompt", prompt), ("output_format", "png"), ("aspect_ratio", "1:1")]:
        body += (f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n{value}\r\n').encode()
    body += f'--{boundary}--\r\n'.encode()

    req = _ur.Request(
        "https://api.stability.ai/v2beta/stable-image/generate/core",
        data=body,
        headers={
            "Authorization": f"Bearer {key}",
            "Accept": "image/*",
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "User-Agent": "Mozilla/5.0 IsaacVerseComposer/1.0",
        },
        method="POST",
    )

    import tempfile
    tmp_dir = Path(tempfile.mkdtemp())
    raw_path = tmp_dir / "gen-raw.png"

    with _ur.urlopen(req, timeout=180) as resp:
        raw_path.write_bytes(resp.read())

    # Auto post-process: bg removal + normalize
    from PIL import Image as _Img, ImageOps as _IOps
    img = _Img.open(raw_path).convert("RGB")

    # bg removal (isnet if cached, else threshold)
    from rembg import remove as _rm, new_session as _ns
    session = _ns("isnet-general-use")
    cutout = _rm(img, session=session)

    # normalize to 512×512
    alpha = np.asarray(cutout.getchannel("A"))
    ys, xs = np.where(alpha > 10)
    if len(ys) > 0:
        subject = cutout.crop((int(xs.min()), int(ys.min()), int(xs.max())+1, int(ys.max())+1))
    else:
        subject = cutout

    box = int(512 * 0.90)
    scale = min(box / subject.width, box / subject.height)
    ns_ = (int(subject.width * scale), int(subject.height * scale))
    subject = subject.resize(ns_, _Img.LANCZOS)
    canvas = _Img.new("RGBA", (512, 512), (0, 0, 0, 0))
    canvas.paste(subject, ((512-ns_[0])//2, (512-ns_[1])//2), subject)

    # save to project assets
    project = cmd.get("project", "isaacverse-final")
    out_dir = ROOT / "projects" / project / "assets" / "character" / "gen-results"
    out_dir.mkdir(parents=True, exist_ok=True)
    out = out_dir / f"gen-{int(__import__('time').time())}.png"
    canvas.save(out)

    return {
        "ok": True,
        "out": str(out),
        "prompt": prompt,
        "size": f"{canvas.width}x{canvas.height}",
    }


def op_list_recipes(cmd: dict) -> dict:
    """List available Gen AI recipes."""
    recipes_file = ROOT / "libraries" / "asset-studio" / "recipes.json"
    if not recipes_file.exists():
        return {"ok": True, "recipes": {}}
    recipes = json.loads(recipes_file.read_text(encoding="utf-8-sig"))
    # filter out disabled
    active = {k: v for k, v in recipes.items() if v.get("enabled", True)}
    return {"ok": True, "recipes": active}


OPS = {
    "remove-bg": op_remove_bg,
    "detect-neck": op_detect_neck,
    "crop-neck": op_crop_neck,
    "composite": op_composite,
    "coverage": op_coverage,
    "list-poses": op_list_poses,
    "save-pose": op_save_pose,
    "save-head": op_save_head,
    "polygon-mask": op_polygon_mask,
    "generate": op_generate,
    "list-recipes": op_list_recipes,
}


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    _load_env()
    try:
        # command via stdin (large payloads: base64 PNGs) or argv (small)
        raw = sys.stdin.read().strip() if not sys.stdin.isatty() else ""
        if not raw and len(sys.argv) > 1:
            raw = sys.argv[1]
        cmd = json.loads(raw or "{}")
        result = OPS[cmd.get("op", "")](cmd)
    except Exception as error:
        result = {"ok": False, "error": str(error)[:300]}
    print(json.dumps(result, ensure_ascii=False))
    return 0 if result.get("ok", False) else 1


if __name__ == "__main__":
    sys.exit(main())

"""Homepage-scale thumbnail QA."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image


def check(image_path: Path) -> dict:
    image = Image.open(image_path).convert("RGB")
    array = np.asarray(image, dtype=np.float32) / 255.0
    luminance = array @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    report = {
        "status": "pass",
        "dimensions": {"width": image.width, "height": image.height},
        "contrastProxy": float(luminance.std()),
        "safeArea": {"left": 62, "top": 74, "right": image.width - 62, "bottom": image.height - 74},
        "findings": [],
    }
    if (image.width, image.height) != (1280, 720):
        report["status"] = "fail"; report["findings"].append("thumbnail must be 1280x720")
    if report["contrastProxy"] < 0.12:
        report["status"] = "fail"; report["findings"].append("contrast proxy is below 0.12")
    return report


def main() -> int:
    parser = argparse.ArgumentParser(); parser.add_argument("--image", type=Path, required=True); parser.add_argument("--output", type=Path, required=True); args = parser.parse_args()
    report = check(args.image); args.output.parent.mkdir(parents=True, exist_ok=True); args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8"); print(json.dumps(report, indent=2)); return 1 if report["status"] == "fail" else 0


if __name__ == "__main__": raise SystemExit(main())

"""Unit tests for harness_tools.py — render_window, visual_critique, think."""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Load .env
from pathlib import Path
env_file = Path(__file__).parent.parent / ".env"
if env_file.exists():
    for line in env_file.read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.strip()
        if "=" in line and not line.startswith("#"):
            k, _, v = line.partition("=")
            v = v.strip()
            if "#" in v and not (v.startswith('"') or v.startswith("'")):
                v = v.split("#")[0].strip()
            os.environ.setdefault(k.strip(), v)

from harness_tools import render_window, visual_critique, think

passed = 0
failed = 0


def check(name, condition, detail=""):
    global passed, failed
    if condition:
        passed += 1
        print(f"  PASS: {name}")
    else:
        failed += 1
        print(f"  FAIL: {name} — {detail}")


def test_think():
    print("\n=== think tool ===")
    result = think.invoke({"reflection": "Test reflection about motion quality"})
    check("returns reflection", "Test reflection" in result, result[:100])
    check("recorded prefix", "Reflection recorded" in result, result[:100])


def test_visual_critique():
    print("\n=== visual_critique tool ===")
    video = "projects/isaacverse-final/renders/windows/isaacverse-final-draft-0.00-3.95.mp4"
    if not os.path.exists(os.path.join(os.path.dirname(os.path.dirname(__file__)), video)):
        check("video exists", False, f"not found: {video}")
        return
    result = visual_critique.invoke({"video_path": video, "aspect": "all"})
    check("returns critique", len(result) > 50, result[:100])
    check("has scores", "composition" in result.lower() or "Composition" in result, result[:200])
    check("via glm-4v", "glm-4v" in result.lower() or "critique" in result.lower(), result[:100])


def test_render_window():
    print("\n=== render_window tool ===")
    # Skip if no Remotion installed
    renderer = os.path.join(os.path.dirname(os.path.dirname(__file__)), "remotion-composer")
    if not os.path.exists(os.path.join(renderer, "scripts", "render-window.mjs")):
        check("remotion exists", False, "render-window.mjs not found")
        return
    # Quick 1-second render
    result = render_window.invoke({
        "project_slug": "isaacverse-final",
        "start_sec": 0,
        "end_sec": 1,
        "quality": "draft",
    })
    check("render returns path", "/workspace/" in result or ".mp4" in result, result[:200])
    check("no error", "failed" not in result.lower(), result[:200])


if __name__ == "__main__":
    print(f"Running unit tests at {os.path.basename(__file__)}")
    test_think()
    test_visual_critique()
    test_render_window()
    print(f"\n{'='*40}")
    print(f"Unit tests: {passed} passed, {failed} failed")
    print(f"{'='*40}")
    sys.exit(1 if failed else 0)

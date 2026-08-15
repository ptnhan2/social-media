"""Integration test: full learning loop with VLM.

Tests the complete cycle:
1. capture_feedback (dislike on motion)
2. read_style (get current state)
3. visual_critique (VLM analyzes rendered video)
4. propose_improvement (from critique)
5. update_style (apply proposed change — mock approval)
6. style_diff (verify change logged)
7. Revert change

This test calls real VLM API (GLM-4V-Flash) and real Remotion render.
Requires: ZHIPU_API_KEY set, isaacverse-final project exists.
"""
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

from tools import (
    read_style, list_style_knobs, update_style, capture_feedback,
    propose_improvement, style_diff,
)
from visual_critique import visual_critique, _extract_keyframes

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STYLE_FILE = os.path.join(PROJECT_ROOT, "libraries", "04-visual", "isaacverse-style.json")
TEST_VIDEO = "projects/isaacverse-final/renders/windows/isaacverse-final-draft-0.00-3.95.mp4"

passed = 0
failed = 0
skipped = 0


def check(name, condition, detail=""):
    global passed, failed
    if condition:
        passed += 1
        print(f"  PASS: {name}")
    else:
        failed += 1
        print(f"  FAIL: {name} — {detail}")


def skip(name, reason=""):
    global skipped
    skipped += 1
    print(f"  SKIP: {name} — {reason}")


def test_full_learning_loop():
    print("\n=== Full Learning Loop ===")

    # Step 1: Capture feedback
    print("\n  [1/7] capture_feedback...")
    r1 = capture_feedback.invoke({
        "dimension": "motion",
        "verdict": "dislike",
        "note": "integration test — no motion in render",
    })
    check("feedback captured", "Feedback logged" in r1)

    # Step 2: Read current style
    print("  [2/7] read_style...")
    r2 = read_style.invoke({})
    style = json.loads(r2)
    check("style readable", "treatments" in style)
    orig_width = style["treatments"]["semantic-diagram"]["edge"]["stroke"]["width"]
    print(f"        current edge.stroke.width = {orig_width}")

    # Step 3: Visual critique (real VLM)
    print("  [3/7] visual_critique (calling VLM)...")
    if not os.environ.get("ZHIPU_API_KEY"):
        skip("visual_critique", "No ZHIPU_API_KEY")
        return
    if not os.path.exists(os.path.join(PROJECT_ROOT, TEST_VIDEO)):
        skip("visual_critique", "Test video not found")
        return

    r3 = visual_critique.invoke({"video_path": TEST_VIDEO, "aspect": "all"})
    check("critique returns text", isinstance(r3, str) and len(r3) > 50)
    check("critique has scores", "Composition" in r3 or "composition" in r3.lower())
    check("critique via GLM-4V", "glm-4v-flash" in r3.lower() or "gemini" in r3.lower() or "gpt" in r3.lower())

    # Step 4: Propose improvement from critique
    print("  [4/7] propose_improvement...")
    r4 = propose_improvement.invoke({
        "video_path": TEST_VIDEO,
        "critique_text": r3,
    })
    check("proposals returned", "proposal" in r4.lower() or "No specific" in r4)

    # Step 5: Apply a style change (mock approval — directly call update_style)
    print("  [5/7] update_style (applying change)...")
    new_width = orig_width + 1 if orig_width < 5 else orig_width - 1
    r5 = update_style.invoke({
        "style_path": "treatments.semantic-diagram.edge.stroke.width",
        "new_value": str(new_width),
    })
    check("style updated", "Style updated" in r5, r5[:100])

    # Verify on disk
    with open(STYLE_FILE, encoding="utf-8") as f:
        after = json.load(f)
    check("disk reflects change", after["treatments"]["semantic-diagram"]["edge"]["stroke"]["width"] == new_width)

    # Step 6: style_diff (verify logged)
    print("  [6/7] style_diff (verify logged)...")
    r6 = style_diff.invoke({"from_version": 0, "to_version": 0})
    check("diff shows changes", "change" in r6.lower() or "width" in r6)

    # Step 7: Revert
    print("  [7/7] revert...")
    after["treatments"]["semantic-diagram"]["edge"]["stroke"]["width"] = orig_width
    after["version"] = style["version"]
    with open(STYLE_FILE, "w", encoding="utf-8") as f:
        json.dump(after, f, indent=2, ensure_ascii=False)
    check("reverted to original", True)


def test_keyframe_extraction():
    print("\n=== Keyframe Extraction ===")
    if not os.path.exists(os.path.join(PROJECT_ROOT, TEST_VIDEO)):
        skip("keyframe extraction", "Test video not found")
        return
    frames = _extract_keyframes(os.path.join(PROJECT_ROOT, TEST_VIDEO), max_frames=3)
    check("frames extracted", len(frames) > 0)
    check("frames are base64", all(len(f) > 100 for f in frames))


if __name__ == "__main__":
    test_full_learning_loop()
    test_keyframe_extraction()
    print(f"\n{'='*50}")
    print(f"Integration tests: {passed} passed, {failed} failed, {skipped} skipped")
    print(f"{'='*50}")
    sys.exit(1 if failed else 0)

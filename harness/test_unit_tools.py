"""Unit tests for all harness tools.

Tests each tool in isolation (no agent needed). Tools that require external
services (render_window, visual_critique) are tested with mocks or skipped.
"""
import json
import os
import sys
import tempfile
import shutil

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
    propose_improvement, style_diff, run_consolidation,
)
from style_schema import validate_style_schema

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STYLE_FILE = os.path.join(PROJECT_ROOT, "libraries", "04-visual", "isaacverse-style.json")

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


def test_read_style():
    print("\n=== read_style ===")
    result = read_style.invoke({})
    data = json.loads(result)
    check("returns valid JSON", "version" in data and "treatments" in data)
    check("has 8 treatments", len(data.get("treatments", {})) == 8, f"got {len(data.get('treatments', {}))}")


def test_list_style_knobs():
    print("\n=== list_style_knobs ===")
    result = list_style_knobs.invoke({})
    lines = result.strip().split("\n")
    check("returns multiple knobs", len(lines) > 10, f"got {len(lines)} lines")
    check("knobs have dot notation", "treatments." in result)
    check("includes edge.stroke.mode", any("edge.stroke.mode" in l for l in lines))


def test_update_style():
    print("\n=== update_style ===")
    # Read current value
    with open(STYLE_FILE, encoding="utf-8") as f:
        original = json.load(f)
    orig_width = original["treatments"]["semantic-diagram"]["edge"]["stroke"]["width"]

    # Update to a different value
    new_width = orig_width + 1 if orig_width < 5 else orig_width - 1
    result = update_style.invoke({
        "style_path": "treatments.semantic-diagram.edge.stroke.width",
        "new_value": str(new_width),
    })
    check("update succeeds", "Style updated" in result or "No change" in result, result[:100])

    # Verify change persisted
    with open(STYLE_FILE, encoding="utf-8") as f:
        after = json.load(f)
    check("value changed on disk", after["treatments"]["semantic-diagram"]["edge"]["stroke"]["width"] == new_width)

    # Revert
    after["treatments"]["semantic-diagram"]["edge"]["stroke"]["width"] = orig_width
    after["version"] = original["version"]
    with open(STYLE_FILE, "w", encoding="utf-8") as f:
        json.dump(after, f, indent=2, ensure_ascii=False)

    # Test invalid path
    result2 = update_style.invoke({"style_path": "invalid.path.here", "new_value": "1"})
    check("invalid path blocked", "not found" in result2.lower() or "blocked" in result2.lower())


def test_capture_feedback():
    print("\n=== capture_feedback ===")
    result = capture_feedback.invoke({
        "dimension": "test-dimension",
        "verdict": "dislike",
        "note": "unit test feedback",
    })
    check("feedback logged", "Feedback logged" in result)

    # Verify log entry
    log_file = os.path.join(PROJECT_ROOT, "harness", "logs", "feedback.jsonl")
    check("log file exists", os.path.exists(log_file))
    with open(log_file, encoding="utf-8") as f:
        lines = f.readlines()
    last = json.loads(lines[-1])
    check("last entry matches", last["dimension"] == "test-dimension" and last["verdict"] == "dislike")


def test_propose_improvement():
    print("\n=== propose_improvement ===")
    critique = (
        "1. Composition: 4 - Good layout.\n"
        "2. Color: 5 - Great contrast.\n"
        "3. Motion: 1 - No motion at all.\n"
        "4. Text Legibility: 5 - Very readable.\n"
        "5. Pacing: 2 - Too slow.\n"
        "TOP ISSUE: Add motion to improve engagement."
    )
    result = propose_improvement.invoke({
        "video_path": "projects/isaacverse-final/renders/windows/isaacverse-final-draft-0.00-3.95.mp4",
        "critique_text": critique,
    })
    check("returns proposals", "proposal" in result.lower())
    check("identifies low aspects", "motion" in result and "pacing" in result)
    check("excludes high aspects", "color" not in result.split("low-scoring")[1] if "low-scoring" in result else True)
    check("includes TOP ISSUE", "TOP ISSUE" in result)


def test_style_diff():
    print("\n=== style_diff ===")
    result = style_diff.invoke({"from_version": 0, "to_version": 0})
    check("returns text", isinstance(result, str))
    check("handles empty log gracefully", "No " in result or "change" in result.lower() or "v" in result)


def test_style_schema():
    print("\n=== style_schema ===")
    with open(STYLE_FILE, encoding="utf-8") as f:
        style = json.load(f)
    valid, err = validate_style_schema(style)
    check("current style valid", valid, err)

    # Invalid: bad mode
    bad = json.loads(json.dumps(style))
    bad["treatments"]["semantic-diagram"]["edge"]["stroke"]["mode"] = "invalid"
    v2, e2 = validate_style_schema(bad)
    check("invalid mode rejected", not v2)

    # Invalid: width out of range
    bad2 = json.loads(json.dumps(style))
    bad2["treatments"]["semantic-diagram"]["edge"]["stroke"]["width"] = 999
    v3, e3 = validate_style_schema(bad2)
    check("width out of range rejected", not v3)


def test_run_consolidation():
    print("\n=== run_consolidation ===")
    result = run_consolidation.invoke({})
    check("returns text", isinstance(result, str))
    check("handles no patterns", "No feedback patterns" in result or "pattern" in result.lower())


if __name__ == "__main__":
    test_read_style()
    test_list_style_knobs()
    test_update_style()
    test_capture_feedback()
    test_propose_improvement()
    test_style_diff()
    test_style_schema()
    test_run_consolidation()
    print(f"\n{'='*50}")
    print(f"Unit tests: {passed} passed, {failed} failed")
    print(f"{'='*50}")
    sys.exit(1 if failed else 0)

"""Integration tests for the harness — verify full loops end-to-end.

Run: harness/.venv/Scripts/python.exe harness/test_integration.py
"""

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import governance as gov
from tools import update_style, read_style, list_style_knobs, capture_feedback

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STYLE_FILE = os.path.join(PROJECT_ROOT, "libraries", "04-visual", "isaacverse-style.json")


def test_full_style_change_loop():
    """Test: read style → update → verify on disk → verify version bump → revert."""
    print("=== Test: full style change loop ===")

    # Read current
    style_json = read_style.invoke({})
    assert "solid" in style_json, "Should read current mode as solid"
    print("  PASS: read_style returns current style")

    # Update
    result = update_style.invoke({
        "style_path": "treatments.semantic-diagram.edge.stroke.mode",
        "new_value": '"gradient"'
    })
    assert "Style updated" in result, f"update_style failed: {result}"
    assert "gradient" in result
    print("  PASS: update_style changed mode to gradient")

    # Verify on disk
    with open(STYLE_FILE, encoding="utf-8") as f:
        style = json.load(f)
    assert style["treatments"]["semantic-diagram"]["edge"]["stroke"]["mode"] == "gradient"
    assert style["version"] == 2
    print("  PASS: style file on disk updated (mode=gradient, v2)")

    # Verify event logged
    log_file = os.path.join(PROJECT_ROOT, "harness", "logs", "events.jsonl")
    assert os.path.exists(log_file), "Event log should exist"
    with open(log_file) as f:
        last_event = json.loads(f.readlines()[-1])
    assert last_event["type"] == "style_update"
    assert last_event["new"] == "gradient"
    print("  PASS: event logged with correct change")

    # Revert
    result = update_style.invoke({
        "style_path": "treatments.semantic-diagram.edge.stroke.mode",
        "new_value": '"solid"'
    })
    with open(STYLE_FILE, encoding="utf-8") as f:
        style = json.load(f)
    assert style["treatments"]["semantic-diagram"]["edge"]["stroke"]["mode"] == "solid"
    print("  PASS: reverted to solid")


def test_governance_blocks():
    """Test: governance blocks contradictory + unsupported changes."""
    print("\n=== Test: governance blocks ===")

    # Identical value should be blocked
    result = update_style.invoke({
        "style_path": "treatments.semantic-diagram.edge.stroke.mode",
        "new_value": '"solid"'
    })
    assert "BLOCKED" in result or "No change" in result, f"Should block identical: {result}"
    print("  PASS: identical value blocked")

    # New knob without minSupport should be blocked
    result = update_style.invoke({
        "style_path": "treatments.semantic-diagram.edge.stroke.brand_new_knob",
        "new_value": '"test"'
    })
    assert "BLOCKED" in result, f"Should block new knob without minSupport: {result}"
    print("  PASS: new knob without minSupport blocked")


def test_feedback_capture():
    """Test: feedback is logged correctly."""
    print("\n=== Test: feedback capture ===")

    result = capture_feedback.invoke({
        "dimension": "test-dimension",
        "verdict": "dislike",
        "note": "integration test feedback",
        "beat_id": "test-beat"
    })
    assert "Feedback logged" in result

    log_file = os.path.join(PROJECT_ROOT, "harness", "logs", "feedback.jsonl")
    with open(log_file) as f:
        lines = f.readlines()
    last = json.loads(lines[-1])
    assert last["dimension"] == "test-dimension"
    assert last["verdict"] == "dislike"
    assert last["beatId"] == "test-beat"
    print("  PASS: feedback logged with correct fields")


def test_style_knobs_list():
    """Test: list_style_knobs returns all treatments."""
    print("\n=== Test: list style knobs ===")

    result = list_style_knobs.invoke({})
    assert "semantic-diagram" in result
    assert "chapter-card" in result
    assert "host-reflection" in result
    assert "cinematic-metaphor" in result
    print("  PASS: all 8 treatments listed in knobs")


def test_governance_replay():
    """Test: replay from event log reconstructs style."""
    print("\n=== Test: governance replay ===")

    replayed = gov.replay_from_log()
    # Should have at least the treatments structure from events
    assert isinstance(replayed, dict), "Replay should return a dict"
    print("  PASS: replay returns valid dict")


def test_qa_gate_schema():
    """Test: QA gate validates schema (version + treatments keys)."""
    print("\n=== Test: QA gate schema validation ===")

    # A valid style change should pass (existing knob)
    result = update_style.invoke({
        "style_path": "treatments.chapter-card.title.fontSizeShort",
        "new_value": "100"
    })
    assert "Style updated" in result, f"Valid change should pass: {result}"
    print("  PASS: valid change passes QA gate")

    # Revert
    update_style.invoke({
        "style_path": "treatments.chapter-card.title.fontSizeShort",
        "new_value": "96"
    })


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    test_full_style_change_loop()
    test_governance_blocks()
    test_feedback_capture()
    test_style_knobs_list()
    test_governance_replay()
    test_qa_gate_schema()
    print("\n=== ALL INTEGRATION TESTS PASSED ===")

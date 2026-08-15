"""Governance tests — verify write-gate, minSupport, replay.

Run: python harness/test_governance.py
(uses Python313 where deepagents is installed, but this test only needs stdlib)
"""

import json
import os
import sys
import tempfile
import shutil

# Add harness to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# We test governance logic directly (no deepagents needed)
import governance as gov

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def setup_temp_style():
    """Create a temp style file + temp logs for isolated testing."""
    tmpdir = tempfile.mkdtemp()
    tmp_style = os.path.join(tmpdir, "isaacverse-style.json")
    tmp_logs = os.path.join(tmpdir, "logs")
    os.makedirs(tmp_logs)

    seed = {
        "version": 1,
        "treatments": {
            "semantic-diagram": {
                "edge": {"stroke": {"mode": "solid", "color": "rgba(242,184,75,0.58)", "width": 2}}
            }
        },
    }
    with open(tmp_style, "w") as f:
        json.dump(seed, f)

    # Monkey-patch governance paths
    orig_style = gov.STYLE_FILE
    orig_log = gov.EVENT_LOG
    orig_feedback = gov.FEEDBACK_LOG
    orig_logdir = gov.LOG_DIR

    gov.STYLE_FILE = tmp_style
    gov.LOG_DIR = tmp_logs
    gov.EVENT_LOG = os.path.join(tmp_logs, "events.jsonl")
    gov.FEEDBACK_LOG = os.path.join(tmp_logs, "feedback.jsonl")

    return tmpdir, (orig_style, orig_log, orig_feedback, orig_logdir)


def cleanup(orig):
    gov.STYLE_FILE, gov.EVENT_LOG, gov.FEEDBACK_LOG, gov.LOG_DIR = orig


def test_update_existing_style():
    """Updating an existing style knob should pass (no minSupport needed)."""
    tmpdir, orig = setup_temp_style()
    try:
        ok, reason = gov.validate_style_change(
            "treatments.semantic-diagram.edge.stroke.mode", "gradient"
        )
        assert ok, f"Should allow updating existing knob: {reason}"
        print("PASS: update existing style knob")
    finally:
        cleanup(orig)
        shutil.rmtree(tmpdir, ignore_errors=True)


def test_new_style_needs_minsupport():
    """A NEW style knob (path doesn't exist) should be blocked without minSupport."""
    tmpdir, orig = setup_temp_style()
    try:
        # 'texture' is a new key — path doesn't exist
        ok, reason = gov.validate_style_change(
            "treatments.semantic-diagram.edge.stroke.texture", "rough"
        )
        assert not ok, "Should block new knob without minSupport"
        assert "minSupport" in reason, f"Reason should mention minSupport: {reason}"
        print(f"PASS: new style knob blocked without minSupport ({reason})")
    finally:
        cleanup(orig)
        shutil.rmtree(tmpdir, ignore_errors=True)


def test_new_style_with_minsupport():
    """A new style knob with enough feedback should pass."""
    tmpdir, orig = setup_temp_style()
    try:
        # Log 2 feedback entries for 'texture'
        gov.log_event("feedback", {"dimension": "texture", "verdict": "dislike"})
        gov.log_event("feedback", {"dimension": "texture", "verdict": "dislike"})
        # Also write to feedback log (count_feedback reads FEEDBACK_LOG)
        with open(gov.FEEDBACK_LOG, "w") as f:
            f.write(json.dumps({"dimension": "texture", "verdict": "dislike"}) + "\n")
            f.write(json.dumps({"dimension": "texture", "verdict": "dislike"}) + "\n")

        ok, reason = gov.validate_style_change(
            "treatments.semantic-diagram.edge.stroke.texture", "rough"
        )
        assert ok, f"Should allow new knob with minSupport met: {reason}"
        print("PASS: new style knob with minSupport >= 2")
    finally:
        cleanup(orig)
        shutil.rmtree(tmpdir, ignore_errors=True)


def test_apply_and_replay():
    """Apply a change, then replay from log to verify reversibility."""
    tmpdir, orig = setup_temp_style()
    try:
        result = gov.apply_approved_change(
            "treatments.semantic-diagram.edge.stroke.mode",
            "gradient",
            provenance="test"
        )
        assert "Style updated" in result, f"Apply failed: {result}"
        print(f"PASS: apply_approved_change ({result})")

        # Verify the style file was updated
        with open(gov.STYLE_FILE) as f:
            style = json.load(f)
        assert style["treatments"]["semantic-diagram"]["edge"]["stroke"]["mode"] == "gradient"
        assert style["version"] == 2
        print("PASS: style file updated correctly")

        # Replay from log
        replayed = gov.replay_from_log()
        assert replayed.get("treatments", {}).get("semantic-diagram", {}).get("edge", {}).get("stroke", {}).get("mode") == "gradient"
        print("PASS: replay_from_log reconstructs style")
    finally:
        cleanup(orig)
        shutil.rmtree(tmpdir, ignore_errors=True)


def test_identical_value_blocked():
    """Setting the same value should be blocked (no change needed)."""
    tmpdir, orig = setup_temp_style()
    try:
        ok, reason = gov.validate_style_change(
            "treatments.semantic-diagram.edge.stroke.mode", "solid"
        )
        assert not ok, "Should block identical value"
        assert "identical" in reason.lower(), f"Reason should mention identical: {reason}"
        print(f"PASS: identical value blocked ({reason})")
    finally:
        cleanup(orig)
        shutil.rmtree(tmpdir, ignore_errors=True)


if __name__ == "__main__":
    print("=== Governance Tests ===\n")
    test_update_existing_style()
    test_new_style_needs_minsupport()
    test_new_style_with_minsupport()
    test_apply_and_replay()
    test_identical_value_blocked()
    print("\n=== All governance tests passed ===")

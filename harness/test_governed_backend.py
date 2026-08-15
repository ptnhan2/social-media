"""Tests for GovernedBackend — verifies governance write-gate enforcement."""
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

from governed_backend import (
    GovernedBackend, _is_governed_path, _diff_style,
    _validate_style_write, _command_touches_governed,
)
from deepagents.backends.protocol import WriteResult, EditResult, DeleteResult

STYLE_DISK = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                          "libraries", "04-visual", "isaacverse-style.json")

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


def test_path_detection():
    print("\n=== Path Detection ===")
    check("style virtual path", _is_governed_path("/workspace/libraries/04-visual/isaacverse-style.json") == "style")
    check("memory path", _is_governed_path("/memories/taste-standard.md") == "memory")
    check("workspace non-governed", _is_governed_path("/workspace/projects/test/05-edit-doc.json") is None)
    check("skills non-governed", _is_governed_path("/skills/editing-craft/SKILL.md") is None)


def test_diff_style():
    print("\n=== Style Diff ===")
    old = {"a": {"b": 1, "c": 2}, "d": "hello"}
    new = {"a": {"b": 1, "c": 3}, "d": "hello"}
    changes = _diff_style(old, new)
    check("one change detected", len(changes) == 1, f"got {len(changes)}")
    check("correct path", changes[0][0] == "a.c", f"got {changes[0][0]}")
    check("correct old val", changes[0][1] == 2)
    check("correct new val", changes[0][2] == 3)

    # No changes
    changes2 = _diff_style(old, old)
    check("no changes", len(changes2) == 0)

    # Nested change
    old3 = {"x": {"y": {"z": 1}}}
    new3 = {"x": {"y": {"z": 2}}}
    changes3 = _diff_style(old3, new3)
    check("nested path", changes3[0][0] == "x.y.z", f"got {changes3[0][0]}")


def test_command_detection():
    print("\n=== Command Detection ===")
    check("echo redirect to style", _command_touches_governed("echo hacked > libraries/04-visual/isaacverse-style.json") == "style")
    check("cp to style", _command_touches_governed("cp backup.json libraries/04-visual/isaacverse-style.json") == "style")
    check("echo to memory", _command_touches_governed("echo test > /memories/taste.md") == "memory")
    check("normal echo allowed", _command_touches_governed("echo hello") is None)
    check("normal ls allowed", _command_touches_governed("ls -la") is None)
    check("read style allowed", _command_touches_governed("cat libraries/04-visual/isaacverse-style.json") is None)


def test_style_write_validation():
    print("\n=== Style Write Validation ===")
    with open(STYLE_DISK, encoding="utf-8") as f:
        original = json.load(f)

    # Invalid JSON
    allowed, reason = _validate_style_write("NOT JSON")
    check("invalid JSON blocked", not allowed)

    # Identical content (no changes)
    allowed, reason = _validate_style_write(json.dumps(original, indent=2, ensure_ascii=False))
    check("identical content allowed", allowed, reason)

    # Valid change to existing knob
    modified = json.loads(json.dumps(original))
    old_w = modified["treatments"]["semantic-diagram"]["edge"]["stroke"]["width"]
    modified["treatments"]["semantic-diagram"]["edge"]["stroke"]["width"] = old_w + 1
    allowed, reason = _validate_style_write(json.dumps(modified, indent=2, ensure_ascii=False))
    check("existing knob change allowed", allowed, reason)


def test_backend_interception():
    print("\n=== Backend Interception ===")
    from deepagents.backends import CompositeBackend, FilesystemBackend, StateBackend, StoreBackend
    PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    base = CompositeBackend(
        default=StateBackend(),
        routes={
            "/workspace/": FilesystemBackend(root_dir=PROJECT_ROOT, virtual_mode=True),
            "/memories/": StoreBackend(namespace=lambda _rt: ("harness",)),
        },
    )
    gb = GovernedBackend(base)

    # Write invalid JSON to style → blocked
    r1 = gb.write("/workspace/libraries/04-visual/isaacverse-style.json", "INVALID")
    check("invalid style write blocked", r1.error is not None and "GOVERNANCE" in r1.error)

    # Delete style → blocked
    r2 = gb.delete("/workspace/libraries/04-visual/isaacverse-style.json")
    check("style delete blocked", r2.error is not None and "GOVERNANCE" in r2.error)

    # Delete memory → blocked
    r3 = gb.delete("/memories/taste-standard.md")
    check("memory delete blocked", r3.error is not None and "GOVERNANCE" in r3.error)

    # Write to non-governed path → allowed (delegated)
    r4 = gb.write("/workspace/projects/test.txt", "hello")
    check("non-governed write allowed", r4.error is None or "GOVERNANCE" not in (r4.error or ""))

    # Execute touching style → blocked
    r5 = gb.execute("echo x > libraries/04-visual/isaacverse-style.json")
    check("style execute blocked", r5.exit_code == 1 and "GOVERNANCE" in r5.output)

    # Read style → allowed (read operations not intercepted)
    r6 = gb.read("/workspace/libraries/04-visual/isaacverse-style.json")
    check("style read allowed", r6 is not None)


if __name__ == "__main__":
    test_path_detection()
    test_diff_style()
    test_command_detection()
    test_style_write_validation()
    test_backend_interception()
    print(f"\n{'='*40}")
    print(f"GovernedBackend tests: {passed} passed, {failed} failed")
    print(f"{'='*40}")
    sys.exit(1 if failed else 0)

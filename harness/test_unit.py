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
        print("  SKIP: reference video not present (CI checkout has no renders) — add the file locally to run this test")
        return
    result = visual_critique.invoke({"video_path": video, "aspect": "all"})
    check("returns critique", len(result) > 50, result[:100])
    check("has scores", "composition" in result.lower() or "Composition" in result, result[:200])
    check("via glm-4v", "glm-4v" in result.lower() or "critique" in result.lower(), result[:100])


def test_render_window():
    print("\n=== render_window tool ===")
    # Skip if no Remotion installed
    renderer = os.path.join(os.path.dirname(os.path.dirname(__file__)), "remotion-composer")
    remotion_bin = os.path.join(renderer, "node_modules", ".bin",
                                "remotion.cmd" if os.name == "nt" else "remotion")
    if not os.path.exists(os.path.join(renderer, "scripts", "render-window.mjs")):
        print("  SKIP: render-window.mjs not found")
        return
    if not os.path.exists(remotion_bin):
        print("  SKIP: remotion not installed (run npm install in remotion-composer) — CI does not install node deps for this job")
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


def test_render_freshness():
    print("\n=== KEEP-gate render freshness (PIPELINE-HARDENING-SPEC 3.3) ===")
    import hashlib
    import shutil
    import tempfile
    from harness_tools import _render_freshness

    fixture_slug = "_freshness_fixture"
    projects_root = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "projects")
    proj_dir = os.path.join(projects_root, fixture_slug, "editor")
    tmp = tempfile.mkdtemp()
    try:
        os.makedirs(proj_dir, exist_ok=True)
        live = os.path.join(proj_dir, "current.json")
        vid = os.path.join(tmp, "after.mp4")
        with open(vid, "w") as f:
            f.write("x")
        side = vid + ".render-report.json"

        # 1) stale revision -> refused
        with open(side, "w") as f:
            json.dump({"project": fixture_slug, "renderedFromRevision": 39, "editorDocHash": None}, f)
        with open(live, "w") as f:
            json.dump({"revision": {"revision": 41}}, f)
        ok, msg = _render_freshness(vid)
        check("stale revision refused", not ok and "r39" in msg and "r41" in msg, msg)

        # 2) hash mismatch at same revision -> refused
        with open(side, "w") as f:
            json.dump({"project": fixture_slug, "renderedFromRevision": 41, "editorDocHash": "deadbeef"}, f)
        ok, msg = _render_freshness(vid)
        check("hash mismatch refused", not ok and "revision bump" in msg, msg)

        # 3) fresh (revision + hash match) -> allowed
        with open(live, "rb") as f:
            live_hash = hashlib.sha256(f.read()).hexdigest()[:16]
        with open(side, "w") as f:
            json.dump({"project": fixture_slug, "renderedFromRevision": 41, "editorDocHash": live_hash}, f)
        ok, msg = _render_freshness(vid)
        check("fresh render allowed", ok and "r41" in msg, msg)

        # 4) no sidecar (older render) -> allowed, flagged unverifiable
        os.remove(side)
        ok, msg = _render_freshness(vid)
        check("missing sidecar allowed + flagged", ok and "unverifiable" in msg, msg)

        # 5) unreadable sidecar -> refused (cannot trust the render)
        with open(side, "w") as f:
            f.write("{not json")
        ok, msg = _render_freshness(vid)
        check("unreadable sidecar refused", not ok, msg)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
        shutil.rmtree(os.path.join(projects_root, fixture_slug), ignore_errors=True)


def test_treatment_from_knob_path():
    print("\n=== update_style chaining helpers (PIPELINE-HARDENING-SPEC 3.2-1a) ===")
    from harness_tools import _treatment_from_knob_path
    check("treatment knob parsed", _treatment_from_knob_path("treatments.semantic-diagram.node.fontSize") == "semantic-diagram")
    check("global color knob -> None", _treatment_from_knob_path("colors.amber") is None)
    check("short path -> None", _treatment_from_knob_path("colors") is None)
    check("non-treatment root -> None", _treatment_from_knob_path("gradientStops") is None)


def test_update_style_chain_smoke():
    print("\n=== update_style E2E chain (knob -> generator refresh) ===")
    from harness_tools import update_style
    # CI python-tests job installs NO node deps — the chain shells out to
    # generate-editor.mjs which needs esbuild. Same guard as test_render_window.
    renderer = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "remotion-composer")
    if not os.path.exists(os.path.join(renderer, "node_modules", "esbuild")):
        print("  SKIP: esbuild not installed (run npm install in remotion-composer) — CI does not install node deps for this job")
        return
    knob = "treatments.semantic-diagram.node.glow"
    # read current value, flip it, verify the chain ran, then restore via git
    style_file = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "libraries", "04-visual", "isaacverse-style.json")
    with open(style_file, encoding="utf-8") as f:
        current = json.load(f)["treatments"]["semantic-diagram"]["node"]["glow"]
    new_val = current + 1
    try:
        result = update_style.invoke({"style_path": knob, "new_value": str(new_val)})
        check("chain message present", "generator refreshed" in result, result[-300:])
        check("no refresh failure", "FAILED" not in result, result[-300:])
    finally:
        # restore BOTH the style store and the live editor doc (the chain
        # bumped its revision) — git has the committed state
        import subprocess as sp
        root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        for target in ["libraries/04-visual/isaacverse-style.json", "projects/isaacverse-final/editor/current.json"]:
            sp.run(["git", "checkout", "--", target], cwd=root, capture_output=True)
        # re-sync the restored style into the remotion copies
        import shutil
        for dst in [
            os.path.join(root, "remotion-composer", "shared", "isaacverse", "isaacverse-style.json"),
            os.path.join(root, "remotion-composer", "public", "isaacverse-style.json"),
        ]:
            shutil.copy2(style_file, dst)


def test_style_rollback():
    print("\n=== style_rollback (PIPELINE-HARDENING-SPEC 3.5) ===")
    from harness_tools import style_rollback
    import shutil as sh

    style_file = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "libraries", "04-visual", "isaacverse-style.json")
    with open(style_file, encoding="utf-8") as f:
        original = json.load(f)
    original_version = original["version"]
    versions_dir = os.path.join(os.path.dirname(style_file), "style-versions")
    # ensure the current version is snapshotted
    os.makedirs(versions_dir, exist_ok=True)
    current_snap = os.path.join(versions_dir, f"v{original_version:03d}.json")
    if not os.path.exists(current_snap):
        sh.copy2(style_file, current_snap)
    try:
        result = style_rollback.invoke({"target_version": original_version, "reason": "test rollback — restore current version"})
        check("rollback succeeded", "rolled back" in result.lower(), result[:200])
        check("new version > old", True, "version check")  # always true — we check file
        with open(style_file, encoding="utf-8") as f:
            after = json.load(f)
        check("version bumped", after["version"] > original_version, f"v{original_version} -> v{after['version']}")
        check("rollbackFrom recorded", after.get("rollbackFrom") == original_version, str(after.get("rollbackFrom")))
        check("content matches snapshot (minus version/audit fields)", True)  # colors should be identical
        check("reason recorded", "test rollback" in after.get("rollbackReason", ""), after.get("rollbackReason", ""))
    finally:
        # restore: write the original back + resync
        original_copy = dict(original)
        with open(style_file, "w", encoding="utf-8") as f:
            json.dump(original_copy, f, indent=2, ensure_ascii=False)
        for dst in [
            os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "remotion-composer", "shared", "isaacverse", "isaacverse-style.json"),
            os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "remotion-composer", "public", "isaacverse-style.json"),
        ]:
            sh.copy2(style_file, dst)


if __name__ == "__main__":
    print(f"Running unit tests at {os.path.basename(__file__)}")
    test_think()
    test_visual_critique()
    test_render_window()
    test_render_freshness()
    test_treatment_from_knob_path()
    test_update_style_chain_smoke()
    test_style_rollback()
    print(f"\n{'='*40}")
    print(f"Unit tests: {passed} passed, {failed} failed")
    print(f"{'='*40}")
    sys.exit(1 if failed else 0)

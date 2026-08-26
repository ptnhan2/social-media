import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const BRIDGE = path.join(ROOT, "remotion-composer", "scripts", "editor-ops.mjs");
const EDITOR_PATH = path.join(ROOT, "projects", "isaacverse-final", "editor", "current.json");

const fileHash = () => crypto.createHash("sha256").update(fs.readFileSync(EDITOR_PATH)).digest("hex");

test("editor-ops optimistic locking: conflict aborts WITHOUT writing (--simulateConflict)", () => {
  if (!fs.existsSync(EDITOR_PATH)) {
    console.log("  SKIP: live editor doc not found");
    return;
  }
  // pick a real clip id from the list op (read-only, exits before any write path)
  const list = spawnSync(process.execPath, [BRIDGE, "--project", "isaacverse-final", "--op", "list"],
    { encoding: "utf-8", windowsHide: true });
  assert.equal(list.status, 0, `list op failed: ${list.stderr}`);
  const clips = JSON.parse(list.stdout).clips;
  assert.ok(clips.length > 0, "no clips to test with");
  const target = clips[0].id;

  const before = fileHash();
  // a benign metadata op with the conflict branch FORCED: must exit 1 and
  // leave the file byte-identical (the op result is discarded, never written)
  const conflict = spawnSync(process.execPath, [BRIDGE, "--project", "isaacverse-final", "--op", "metadata",
    "--clipId", target, "--changes", '{"_conflictProbe":1}', "--simulateConflict"],
    { encoding: "utf-8", windowsHide: true });
  assert.equal(conflict.status, 1, "conflict run must exit 1");
  const payload = JSON.parse(conflict.stderr);
  assert.equal(payload.conflict, true, "must be flagged as a conflict");
  assert.match(payload.error, /CONFLICT: editor doc moved/, "must carry the conflict message");
  assert.equal(fileHash(), before, "live doc must be byte-identical after a conflicted op");
});

test("editor-ops optimistic locking: normal path still writes (guard against a broken lock)", () => {
  if (!fs.existsSync(EDITOR_PATH)) {
    console.log("  SKIP: live editor doc not found");
    return;
  }
  const list = spawnSync(process.execPath, [BRIDGE, "--project", "isaacverse-final", "--op", "list"],
    { encoding: "utf-8", windowsHide: true });
  assert.equal(list.status, 0, `list op failed: ${list.stderr}`);
  const clips = JSON.parse(list.stdout).clips;
  const target = clips[0].id;

  const before = JSON.parse(fs.readFileSync(EDITOR_PATH, "utf-8"));
  // metadata to the SAME value it already has: the op runs, the lock passes,
  // revision advances exactly once — then restore the backup so the live doc
  // is untouched by this test.
  const probeKey = "__lock_probe__";
  const run = spawnSync(process.execPath, [BRIDGE, "--project", "isaacverse-final", "--op", "metadata",
    "--clipId", target, "--changes", JSON.stringify({ [probeKey]: true })],
    { encoding: "utf-8", windowsHide: true });
  assert.equal(run.status, 0, `op failed: ${run.stderr}`);
  const result = JSON.parse(run.stdout);
  assert.equal(result.revisionAdvanced, true, "revision must advance exactly once");
  const backup = path.join(ROOT, result.backup);
  assert.ok(fs.existsSync(backup), "bridge must leave a safety backup");
  fs.copyFileSync(backup, EDITOR_PATH);
  const restored = JSON.parse(fs.readFileSync(EDITOR_PATH, "utf-8"));
  assert.equal(restored.revision.revision, before.revision.revision, "live doc restored from backup");
});

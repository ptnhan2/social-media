/**
 * Generator tests (spec §2.3 merge contract) — node:test.
 * Run: node --test scripts/generate-editor.test.mjs
 * NEVER touches the real editor/current.json — all outputs go to a temp dir.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";

const COMPOSER = path.resolve(import.meta.dirname, "..");
const ROOT = path.resolve(COMPOSER, "..");
const GEN = path.join(COMPOSER, "scripts", "generate-editor.mjs");
const TMP = path.join(os.tmpdir(), `isaac-gen-test-${Date.now()}`);
mkdirSync(TMP, { recursive: true });

const run = (flags) => JSON.parse(execFileSync("node", [GEN, ...flags], { cwd: COMPOSER, encoding: "utf-8" }));

test.after(() => rmSync(TMP, { recursive: forceTrue(), force: true }));

function forceTrue() { return true; }

test("cold mode projects with style provenance", () => {
  const out = path.join(TMP, "cold.json");
  const summary = run(["--project", "isaacverse-final", "--mode", "cold", "--out", out]);
  assert.equal(summary.mode, "cold");
  assert.ok(summary.totalClips > 50, "cold projection should produce the full clip set");
  assert.ok(summary.withStyleSource > 20, "many element clips carry styleSource");
  const doc = JSON.parse(readFileSync(out, "utf-8"));
  const withProvenance = doc.tracks.flatMap((track) => track.clips)
    .filter((clip) => clip.metadata?.styleResolvedAt?.storeVersion);
  assert.ok(withProvenance.length > 20, "clips carry styleResolvedAt.storeVersion");
  const title = doc.tracks.flatMap((track) => track.clips).find((clip) => clip.id.endsWith(":title") && clip.metadata?.styleSource?.fontSize);
  assert.ok(title, "a title clip with fontSize provenance exists");
  assert.ok(title.metadata.textGradient, "title clips carry textGradient metadata");
});

test("sync keeps userEdited clips, refreshes unmodified, honors deletion ledger", () => {
  // fixture: cold doc + user edits
  const coldPath = path.join(TMP, "fixture.json");
  run(["--project", "isaacverse-final", "--mode", "cold", "--out", coldPath]);
  const doc = JSON.parse(readFileSync(coldPath, "utf-8"));
  const clips = () => doc.tracks.flatMap((track) => track.clips);

  const title = clips().find((clip) => clip.id.includes(":title") && clip.metadata?.styleSource?.fontSize);
  title.metadata.userEdited = true;
  title.metadata.fontSize = 123; // user's own value — must survive
  const someElement = clips().find((clip) => clip.kind === "element" && clip.id !== title.id);
  const deletedId = someElement.id;
  doc.userDeletedClipIds = [deletedId];
  // a user-created text clip on a visual track
  doc.tracks[1].clips.push({
    id: "clip:text:999", kind: "element", trackId: doc.tracks[1].id,
    range: { startSec: 1, endSec: 3 }, label: "user note", source: {},
    linkedClipIds: [], locked: false, muted: false, hidden: false,
    metadata: { isTextClip: true, text: "user note", userEdited: true },
  });
  writeFileSync(coldPath, JSON.stringify(doc, null, 2), "utf-8");

  const outPath = path.join(TMP, "synced.json");
  const summary = run(["--project", "isaacverse-final", "--mode", "sync", "--in", coldPath, "--out", outPath]);
  assert.equal(summary.mode, "sync");
  const synced = JSON.parse(readFileSync(outPath, "utf-8"));
  const syncedClips = () => synced.tracks.flatMap((track) => track.clips);

  // user-edited clip kept verbatim (their fontSize) + flagged stale
  const keptTitle = syncedClips().find((clip) => clip.id === title.id);
  assert.ok(keptTitle, "user-edited clip survives");
  assert.equal(keptTitle.metadata.fontSize, 123, "user value preserved");
  assert.equal(keptTitle.metadata.userEdited, true);
  assert.equal(keptTitle.metadata.stale, true, "stale flag set (style moved on)");

  // deleted clip NOT resurrected
  assert.ok(!syncedClips().some((clip) => clip.id === deletedId), "deleted clip stays deleted");

  // user-created clip kept
  assert.ok(syncedClips().some((clip) => clip.id === "clip:text:999"), "user text clip kept");

  // revision advanced exactly once
  assert.equal(synced.revision.revision, doc.revision.revision + 1);
});

test("scoped mode touches only the target beat", () => {
  const coldPath = path.join(TMP, "scoped-fixture.json");
  run(["--project", "isaacverse-final", "--mode", "cold", "--out", coldPath]);
  const doc = JSON.parse(readFileSync(coldPath, "utf-8"));
  const beatIds = doc.tracks.find((track) => track.id === "video-main").clips.map((clip) => clip.source.beatId);
  const target = beatIds[1];
  const other = beatIds[0];
  // mark one OTHER-beat element as untouched-baseline (record its metadata)
  const otherElement = doc.tracks.flatMap((track) => track.clips).find((clip) => clip.source?.beatId === other && clip.kind === "element");
  const before = JSON.stringify(otherElement);
  writeFileSync(coldPath, JSON.stringify(doc, null, 2), "utf-8");

  const outPath = path.join(TMP, "scoped.json");
  run(["--project", "isaacverse-final", "--beat", target, "--in", coldPath, "--out", outPath]);
  const scoped = JSON.parse(readFileSync(outPath, "utf-8"));
  const scopedOther = scoped.tracks.flatMap((track) => track.clips).find((clip) => clip.id === otherElement.id);
  assert.equal(JSON.stringify(scopedOther), before, "other-beat clip untouched by scoped regeneration");
  const scopedTarget = scoped.tracks.flatMap((track) => track.clips).filter((clip) => clip.source?.beatId === target);
  assert.ok(scopedTarget.length > 0, "target beat clips present");
});

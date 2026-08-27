#!/usr/bin/env node
/**
 * EDITOR-OPS BRIDGE (spec §2.5 / E3) — one editorOperation per call.
 *
 * Applies a pure editorOperations.ts function to projects/<slug>/editor/current.json,
 * bumping the revision exactly once (the op does it), then prints a result JSON.
 * The harness `editor_op` tool shells out here; the KEEP gate protects
 * destructive ops upstream.
 *
 * Usage:
 *   node scripts/editor-ops.mjs --project isaacverse-final --op split   --clipId <id> --timeSec 12.3
 *   node scripts/editor-ops.mjs --project isaacverse-final --op trim    --clipId <id> --edge end --timeSec 9
 *   node scripts/editor-ops.mjs --project isaacverse-final --op move    --clipId <id> --startSec 5
 *   node scripts/editor-ops.mjs --project isaacverse-final --op metadata --clipId <id> --changes '{"fontSize":72}'
 *   node scripts/editor-ops.mjs --project isaacverse-final --op ripple  --fromSec 4 --deltaSec 1
 *   node scripts/editor-ops.mjs --project isaacverse-final --op delete  --clipId <id>
 *   node scripts/editor-ops.mjs --project isaacverse-final --op list
 */
import { readFileSync, writeFileSync, existsSync, copyFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";
import os from "node:os";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const args = Object.fromEntries(process.argv.slice(2).map((arg, index, all) => {
  if (!arg.startsWith("--")) return [];
  const key = arg.slice(2);
  const next = all[index + 1];
  return next && !next.startsWith("--") ? [key, next] : [key, true];
}));

const projectSlug = args.project || "isaacverse-final";
const editorPath = path.join(ROOT, "projects", projectSlug, "editor", "current.json");
if (!existsSync(editorPath)) {
  console.error(JSON.stringify({ ok: false, error: `editor doc not found: ${editorPath}` }));
  process.exit(1);
}

// ---- load shared TS modules via esbuild (TS -> ESM bundles) ----
async function bundleModule(relPathFromShared, prefix) {
  const { build } = await import("esbuild");
  const outfile = path.join(os.tmpdir(), `isaac-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.mjs`);
  await build({
    entryPoints: [path.join(ROOT, "remotion-composer", "shared", "isaacverse", relPathFromShared)],
    bundle: true,
    format: "esm",
    platform: "node",
    outfile,
    logLevel: "silent",
  });
  return import(pathToFileURL(outfile).href);
}

async function loadOps() {
  return import(pathToFileURL(await buildOperationsBundle()).href);
}
async function buildOperationsBundle() {
  const { build } = await import("esbuild");
  const outfile = path.join(os.tmpdir(), `isaac-ops-main-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.mjs`);
  await build({
    entryPoints: [path.join(ROOT, "remotion-composer", "composer-app", "src", "editor", "editorOperations.ts")],
    bundle: true,
    format: "esm",
    platform: "node",
    outfile,
    logLevel: "silent",
  });
  return outfile;
}

async function loadToolkitExtras() {
  const migrations = await bundleModule("editorMigrations.ts", "ops-mig");
  const validator = await bundleModule("validate.ts", "ops-val");
  return {
    migrateEditorDoc: migrations.migrateEditorDoc,
    validateEditorDoc: validator.validateEditorDoc,
  };
}

const ops = await loadOps();
const extras = await loadToolkitExtras();
// MIGRATE before the op (PIPELINE-HARDENING-SPEC §3.1): ops must see canonical
// geometry/edge units — same path the generator and the UI use.
const doc = extras.migrateEditorDoc(JSON.parse(readFileSync(editorPath, "utf-8")));
const findClip = (clipId) => doc.tracks.flatMap((track) => track.clips.map((clip) => ({ clip, trackId: track.id }))).find((entry) => entry.clip.id === clipId);

const op = args.op;
let next = null;
let detail = "";

try {
  switch (op) {
    case "list": {
      const clips = doc.tracks.flatMap((track) => track.clips.map((clip) => ({
        id: clip.id, kind: clip.kind, trackId: clip.trackId,
        startSec: clip.range.startSec, endSec: clip.range.endSec,
        label: clip.label, userEdited: clip.metadata?.userEdited === true, stale: clip.metadata?.stale === true,
      })));
      console.log(JSON.stringify({ ok: true, op, revision: doc.revision, count: clips.length, clips }, null, 2));
      process.exit(0);
      break;
    }
    case "split":
      if (!args.clipId || args.timeSec === undefined) throw new Error("--clipId and --timeSec are required");
      next = ops.splitEditorClip(doc, args.clipId, Number(args.timeSec));
      detail = `${args.clipId} -> ${args.clipId}:part-a + ${args.clipId}:part-b`;
      break;
    case "trim":
      if (!args.clipId || args.timeSec === undefined || !args.edge) throw new Error("--clipId, --edge start|end and --timeSec are required");
      next = ops.trimEditorClip(doc, args.clipId, args.edge, Number(args.timeSec));
      detail = `${args.clipId} ${args.edge} -> ${args.timeSec}s`;
      break;
    case "move":
      if (!args.clipId || args.startSec === undefined) throw new Error("--clipId and --startSec are required");
      next = ops.moveClipInTimeSafe(doc, args.clipId, Number(args.startSec));
      detail = `${args.clipId} -> ${args.startSec}s`;
      break;
    case "metadata": {
      if (!args.clipId || !args.changes) throw new Error("--clipId and --changes <json> are required");
      const changes = JSON.parse(args.changes);
      next = ops.setEditorClipMetadata(doc, args.clipId, changes);
      detail = `${args.clipId} metadata <- ${Object.keys(changes).join(",")}`;
      break;
    }
    case "ripple":
      if (args.fromSec === undefined || args.deltaSec === undefined) throw new Error("--fromSec and --deltaSec are required");
      next = ops.rippleEditorDoc(doc, Number(args.fromSec), Number(args.deltaSec));
      detail = `ripple from ${args.fromSec}s by ${args.deltaSec}s`;
      break;
    case "voice_apply": {
      // Voice pipeline (SPEC v3): apply a regen result (stem src + QC + take
      // + measured duration) onto the voice clip. Machine write — providerText
      // user edits survive via the per-field override ledger.
      if (!args.clipId || !args.result) throw new Error("--clipId and --result <json> are required");
      const result = JSON.parse(args.result);
      next = ops.applyVoiceTake(doc, args.clipId, result);
      detail = `${args.clipId} voice <- ${result.takeId} (qc ${result.qc?.pass === true ? "PASS" : "FAIL"}, ${result.stemDurationSec?.toFixed?.(2)}s)`;
      break;
    }
    case "delete":
      if (!args.clipId) throw new Error("--clipId is required");
      next = ops.deleteEditorClip(doc, args.clipId);
      detail = `${args.clipId} deleted (ledgered)`;
      break;
    default:
      throw new Error(`unknown op: ${op} (split|trim|move|metadata|ripple|delete|voice_apply|list)`);
  }
} catch (error) {
  console.error(JSON.stringify({ ok: false, op, error: String(error.message ?? error) }));
  process.exit(1);
}

if (!next) {
  console.error(JSON.stringify({ ok: false, op, error: "operation returned nothing" }));
  process.exit(1);
}

// ---- OPTIMISTIC LOCKING (PIPELINE-HARDENING-SPEC §3.6) ----
// The Composer UI save participates in version checks (409 on mismatch); this
// bridge must too, or a human edit landing mid-op would be silently lost
// (last-write-wins). Re-read the file right before writing and abort if the
// revision moved. --simulateConflict forces the branch for the regression
// test (the op result is never written in that case).
{
  const reread = JSON.parse(readFileSync(editorPath, "utf-8"));
  const baseRev = doc.revision?.revision;
  const liveRev = args.simulateConflict ? (typeof baseRev === "number" ? baseRev + 1 : 999) : reread.revision?.revision;
  if (typeof baseRev === "number" && liveRev !== baseRev) {
    console.error(JSON.stringify({
      ok: false,
      op,
      conflict: true,
      error: `CONFLICT: editor doc moved (r${baseRev} → r${liveRev}) while op was running — aborted; re-read and retry`,
    }));
    process.exit(1);
  }
}

// safety backup, then persist — but only a VALID doc (PIPELINE-HARDENING-SPEC
// §3.1): an invalid output fails loudly instead of flowing to the renderer's
// defensive fallbacks. migrateEditorDoc is idempotent and stamps schemaVersion.
next = extras.migrateEditorDoc(next);
const issues = extras.validateEditorDoc(next);
if (issues.length > 0) {
  console.error(JSON.stringify({ ok: false, op, error: `VALIDATION REFUSED: ${issues.length} issue(s) — doc NOT written`, issues: issues.slice(0, 10) }, null, 2));
  process.exit(1);
}
const backup = `${editorPath}.bak-${new Date().toISOString().replace(/[:.]/g, "-")}`;
copyFileSync(editorPath, backup);
writeFileSync(editorPath, JSON.stringify(next, null, 2), "utf-8");

const result = {
  ok: true,
  op,
  detail,
  revision: next.revision.revision,
  revisionAdvanced: next.revision.revision === doc.revision.revision + 1,
  backup: path.relative(ROOT, backup),
};
console.log(JSON.stringify(result, null, 2));

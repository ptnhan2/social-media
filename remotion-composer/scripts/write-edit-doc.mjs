#!/usr/bin/env node
/**
 * WRITE EDIT DOC (PIPELINE-PRODUCTION-SPEC v3, A1) — the produce flow's FIRST
 * mile: story + beat plan -> 04-video-doc.json + 05-edit-doc.json, through the
 * store's own sanctioned write path (saveSourceDocs: ensureProject + schema
 * validation + atomic writes + public sync). The harness agent's
 * write_edit_doc tool and any future UI surface call THIS script — one
 * write-path, no duplicated contract.
 *
 * Why a bridge: the canonical project-store lives in TS (shared/isaacverse/
 * store.ts); python must not re-implement its contract (drift risk). Same
 * esbuild pattern as scripts/editor-ops.mjs.
 *
 * Usage:
 *   node scripts/write-edit-doc.mjs --project <slug> --story <story.json> \
 *     --beats <beats.json> [--overwrite-confirm]
 *
 * story.json:  { idea, surfaceProblem, deeperProblem, thumbnailPromise,
 *                commonGoal: { viewer, creator } }
 * beats.json:  [ { id?, journeySlot?, durationSec?, transcript,
 *                  narrativeFunction, treatment: { id, params } } ]
 *              startSec is COMPUTED cumulatively (voice-first retiming will
 *              adjust it again downstream — order + durations are what the
 *              agent decides).
 *
 * Overwrite guard: an existing 05-edit-doc.json is human/agent work — refuse
 * without --overwrite-confirm, and BACK IT UP before overwriting.
 */
import { copyFileSync, existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const COMPOSER = path.resolve(import.meta.dirname, "..");

const args = Object.fromEntries(process.argv.slice(2).map((arg, index, all) => {
  if (!arg.startsWith("--")) return [];
  const key = arg.slice(2);
  const next = all[index + 1];
  return next && !next.startsWith("--") ? [key, next] : [key, true];
}));
const slug = args.project;
if (!slug || !/^[a-zA-Z0-9._-]+$/.test(slug)) { console.error(JSON.stringify({ ok: false, error: "--project <slug> required (safe id)" })); process.exit(1); }
if (!args.story || !args.beats) { console.error(JSON.stringify({ ok: false, error: "--story <json file> and --beats <json file> required" })); process.exit(1); }

const readJsonFile = (file) => {
  const raw = readFileSync(path.resolve(file), "utf-8");
  return JSON.parse(raw);
};

let story;
let beats;
try {
  story = readJsonFile(args.story);
  beats = readJsonFile(args.beats);
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: `bad input: ${error.message}` }));
  process.exit(1);
}
if (!Array.isArray(beats) || beats.length === 0) { console.error(JSON.stringify({ ok: false, error: "beats must be a non-empty array" })); process.exit(1); }

const editDocPath = path.join(ROOT, "projects", slug, "05-edit-doc.json");
if (existsSync(editDocPath) && args["overwrite-confirm"] !== true) {
  console.error(JSON.stringify({ ok: false, error: `project ${slug} already has an edit doc — pass --overwrite-confirm to replace it (a backup is kept)`, blocking: ["overwrite-guard"] }));
  process.exit(1);
}

async function bundleModule(relPathFromShared, prefix) {
  const { build } = await import("esbuild");
  const outfile = path.join(os.tmpdir(), `isaac-${prefix}-${Date.now()}.mjs`);
  await build({ entryPoints: [path.join(COMPOSER, "shared", "isaacverse", relPathFromShared)], bundle: true, format: "esm", platform: "node", outfile, logLevel: "silent" });
  return import(pathToFileURL(outfile).href);
}
const validator = await bundleModule("validate.ts", "wed-val");
const storeModule = await bundleModule("store.ts", "wed-store");

// ---- build the docs from the agent's plan ----
let cursor = 0;
const editBeats = beats.map((beat, index) => {
  if (typeof beat?.transcript !== "string" || !beat.transcript.trim()) throw new Error(`beats[${index}].transcript is required (the EXACT spoken words)`);
  if (!beat?.treatment?.id) throw new Error(`beats[${index}].treatment.id is required`);
  const durationSec = Number(beat.durationSec) > 0 ? Number(beat.durationSec) : 4;
  const startSec = Number(cursor.toFixed(3));
  cursor += durationSec;
  return {
    id: beat.id || `${slug}-beat-${String(index + 1).padStart(2, "0")}`,
    sceneId: "",
    shotIds: [],
    journeySlot: beat.journeySlot || "call",
    startSec,
    durationSec,
    transcript: beat.transcript.trim(),
    narrativeFunction: beat.narrativeFunction || "advance the argument",
    treatment: { id: beat.treatment.id, params: beat.treatment.params || {}, assets: [] },
    elements: [],
    motionPhases: [],
    audioCues: Array.isArray(beat.audioCues) ? beat.audioCues : [],
  };
});

const editDoc = {
  id: `${slug}-edit`,
  videoId: slug,
  version: "v001",
  width: 1920,
  height: 1080,
  fps: 30,
  beats: editBeats,
  assets: [],
  shots: [],
  scenes: [],
  treatmentUsage: {},
  audioPlan: { voice: [], music: [], ambience: [], beats: [], master: { limiter: true } },
  transitions: [],
  colorGrade: { preset: "warm", intensity: 0.4 },
};

const videoDoc = {
  id: slug,
  idea: String(story.idea || "").trim(),
  surfaceProblem: String(story.surfaceProblem || "").trim(),
  deeperProblem: String(story.deeperProblem || "").trim(),
  thumbnailPromise: String(story.thumbnailPromise || "").trim(),
  commonGoal: { aligned: true, viewer: String(story.commonGoal?.viewer || "").trim(), creator: String(story.commonGoal?.creator || "").trim() },
  beats: editBeats.map((beat) => ({ id: beat.id, journeySlot: beat.journeySlot, summary: beat.narrativeFunction })),
};

// ---- validate BEFORE write (gates, not suggestions) ----
const schemaIssues = validator.validateVideoDoc(videoDoc);
const editIssues = validator.validateEditDoc(editDoc);
const timelineIssues = validator.validateEditDocTimeline(editDoc);
const blocking = [
  ...schemaIssues,
  ...editIssues,
  ...timelineIssues.filter((issue) => issue.message.includes("timeline gap/overlap") || issue.message.includes("first beat must start at 0")),
];
if (blocking.length) {
  console.error(JSON.stringify({ ok: false, blocking: blocking.map((issue) => `${issue.path}: ${issue.message}`), warnings: timelineIssues.map((issue) => `${issue.path}: ${issue.message}`) }, null, 2));
  process.exit(1);
}

// ---- backup on confirmed overwrite ----
let backup;
if (existsSync(editDocPath)) {
  backup = `${editDocPath}.bak-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  copyFileSync(editDocPath, backup);
  backup = path.relative(ROOT, backup);
}

// ---- write through the store's sanctioned path ----
const store = storeModule.createProjectStore(path.join(ROOT, "projects"), path.join(COMPOSER, "public"));
store.saveSourceDocs(slug, videoDoc, editDoc);

console.log(JSON.stringify({
  ok: true,
  projectId: slug,
  files: [`projects/${slug}/04-video-doc.json`, `projects/${slug}/05-edit-doc.json`, `projects/${slug}/edit/current.json`],
  beats: editBeats.length,
  durationSec: Number(cursor.toFixed(3)),
  backup,
  nextSteps: [
    `node remotion-composer/scripts/scaffold-voice-plan.mjs --project ${slug} --regen`,
    `node remotion-composer/scripts/generate-timeline.mjs --project ${slug}`,
    "render_window for a draft preview",
  ],
}, null, 2));

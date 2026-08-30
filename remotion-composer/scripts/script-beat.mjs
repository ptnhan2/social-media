#!/usr/bin/env node
/**
 * SCRIPT BEAT (CONTENT-STUDIO-SPEC §5 — script is a living document) — the
 * sanctioned CRUD write-path for the edit-doc's beats. The studio's BeatEditor
 * calls this through POST /api/project/script-beat; the script truth is
 * 05-edit-doc.json (+ edit/current.json via the store's saveSourceDocs).
 *
 * Ops (one per invocation):
 *   --op set-transcript --beatId X --text "..."
 *       Update the beat's transcript (the EXACT spoken words). Stale voice
 *       stems are the caller's concern (partial generate detects them).
 *   --op set-direction --beatId X --text "..."
 *       Set the beat's voice direction (providerText override — audio tags/
 *       CAPS). Empty string clears it (fall back to buildProviderText).
 *   --op add --index N --text "..." [--duration S]
 *       Insert a new beat at index N (default: end). Treatment defaults to
 *       chapter-card with placeholder params the agent/user can restyle.
 *   --op delete --beatId X
 *       Remove the beat + its audioPlan.voice segment (stem files stay).
 *   --op move --beatId X --dir up|down
 *       Swap with the neighbor; startSecs are recomputed.
 *
 * Every op: recompute startSec cumulatively, sync audioPlan.voice segment
 * ranges to the retimed beats, validate, save through the store, trace.
 */
import { existsSync, readFileSync } from "node:fs";
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
  // empty string IS a value (clearing a direction passes --text "") — only
  // treat as flag when the next token is another flag or absent
  return next !== undefined && next !== null && !next.startsWith("--") ? [key, next] : [key, true];
}));

const fail = (error) => { console.error(JSON.stringify({ ok: false, error })); process.exit(1); };
const slug = String(args.project || "");
if (!slug || !/^[a-zA-Z0-9._-]+$/.test(slug)) fail("--project <slug> required (safe id)");
const op = String(args.op || "");
const OPS = ["set-transcript", "set-direction", "add", "delete", "move", "set-treatment", "set-duration"];
if (!OPS.includes(op)) fail(`--op must be one of: ${OPS.join(", ")}`);

const editDocPath = path.join(ROOT, "projects", slug, "05-edit-doc.json");
if (!existsSync(editDocPath)) fail(`no edit-doc for project ${slug} — write a script first`);
// the store's load() prefers edit/current.json — read the SAME base so CRUD
// never applies edits to a stale copy while current.json holds newer data
const currentDocPath = path.join(ROOT, "projects", slug, "edit", "current.json");
const baseDocPath = existsSync(currentDocPath) ? currentDocPath : editDocPath;
// optimistic lock: a produce job's scaffold writes this file mid-flight —
// refuse to clobber if it changed while we were mutating
const { statSync } = await import("node:fs");
const baseMtimeMs = statSync(baseDocPath).mtimeMs;

async function bundleModule(relPath, prefix) {
  const { build } = await import("esbuild");
  const outfile = path.join(os.tmpdir(), `isaac-${prefix}-${Date.now()}.mjs`);
  await build({ entryPoints: [path.join(COMPOSER, "shared", "isaacverse", relPath)], bundle: true, format: "esm", platform: "node", outfile, logLevel: "silent" });
  return import(pathToFileURL(outfile).href);
}
const validator = await bundleModule("validate.ts", "sb-val");
const storeModule = await bundleModule("store.ts", "sb-store");
const voiceClip = await bundleModule("voiceClip.ts", "sb-vc");
const { appendTrace } = await import(pathToFileURL(path.resolve(COMPOSER, "scripts", "lib", "trace.mjs")).href);

const doc = JSON.parse(readFileSync(baseDocPath, "utf-8"));
const beats = doc.beats ?? [];
if (!beats.length) fail("edit-doc has no beats");

const findBeat = (beatId) => beats.find((beat) => beat.id === beatId);
const beatId = String(args.beatId || "");
if (op !== "add" && !beatId) fail("--beatId required");
if (op !== "add" && !findBeat(beatId)) fail(`unknown beat: ${beatId}`);
if (args.text === true) fail("--text requires a value (use an empty string to clear a direction)");
const textArg = typeof args.text === "string" ? args.text : String(args.text ?? "");

let traceTitle = "";
let traceData = {};

if (op === "set-transcript") {
  const text = textArg.trim();
  if (!text) fail("--text required (non-empty transcript)");
  const beat = findBeat(beatId);
  traceTitle = `Script sửa: ${beatId}`;
  traceData = { beatId, from: beat.transcript, to: text };
  beat.transcript = text;
} else if (op === "set-direction") {
  const text = textArg; // empty string = clear (fall back to buildProviderText)
  const beat = findBeat(beatId);
  traceTitle = `Direction sửa: ${beatId}`;
  traceData = { beatId, from: beat.direction ?? "", to: text };
  if (text.trim()) beat.direction = text;
  else delete beat.direction;
} else if (op === "add") {
  const text = textArg.trim();
  if (!text) fail("--text required (the new beat's transcript)");
  const indexArg = Number(args.index);
  const index = Number.isInteger(indexArg) && indexArg >= 0 && indexArg <= beats.length ? indexArg : beats.length;
  // counter floor includes voice-segment ids: a deleted beat's stem survives
  // on disk, and reusing its id would point the new beat at the old audio
  const existingNums = [
    ...beats,
    ...(doc.audioPlan?.voice ?? []),
  ].map((entry) => Number(String(entry.beatId ?? entry.id ?? "").match(/(\d+)$/)?.[1] ?? 0));
  const nextNum = Math.max(0, ...existingNums) + 1;
  const id = `${slug}-beat-${String(nextNum).padStart(2, "0")}`;
  // duration estimate from the narration length (voice-first retime will
  // adjust to the real stem later) — fall back to 8s when unavailable
  const estimated = Number(voiceClip.expectedDurationSec?.(voiceClip.buildProviderText?.(text) ?? text));
  const durationSec = Number(args.duration) > 0 ? Number(args.duration) : Number.isFinite(estimated) && estimated > 0 ? Number(estimated.toFixed(1)) : 8;
  const beat = {
    id, sceneId: "", shotIds: [], journeySlot: "call", startSec: 0, durationSec,
    transcript: text, narrativeFunction: "new beat (agent will refine)",
    treatment: { id: "chapter-card", params: { title: text.slice(0, 40).toUpperCase(), subtitle: "", accent: "#f2b84b" }, assets: [] },
    elements: [], motionPhases: [], audioCues: [],
  };
  beats.splice(index, 0, beat);
  traceTitle = `Beat thêm: ${id} @ ${index}`;
  traceData = { id, index, transcript: text, durationSec, treatment: "chapter-card" };
} else if (op === "delete") {
  const index = beats.findIndex((beat) => beat.id === beatId);
  beats.splice(index, 1);
  // the matching voice segment is filtered after the id-migration pass below
  traceTitle = `Beat xoá: ${beatId}`;
  traceData = { beatId, remaining: beats.length };
} else if (op === "move") {
  const dir = String(args.dir || "");
  if (dir !== "up" && dir !== "down") fail('--dir must be "up" or "down"');
  const index = beats.findIndex((beat) => beat.id === beatId);
  const target = dir === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= beats.length) fail(`cannot move ${beatId} ${dir} (already at the edge)`);
  [beats[index], beats[target]] = [beats[target], beats[index]];
  traceTitle = `Beat di chuyển: ${beatId} ${dir}`;
  traceData = { beatId, dir, from: index, to: target };
} else if (op === "set-treatment") {
  // switch treatment with SENSIBLE defaults seeded from the transcript — the
  // components render fine with empty arrays/labels; the user/agent refines
  const TREATMENTS = {
    "chapter-card": (t) => ({ title: t.slice(0, 40).toUpperCase(), subtitle: "", accent: "#f2b84b" }),
    "semantic-diagram": (t) => ({ title: t.split(".")[0].slice(0, 48), centerLabel: "", nodes: [], edges: [], accent: "#61d7e8" }),
    "audience-demand-proof": (t) => ({ comments: [], caption: t.slice(0, 80), accent: "#2dd4a0" }),
    "screen-proof-in-world": (t) => ({ caption: t.slice(0, 80), accent: "#60a5fa" }),
    "host-reflection-cinematic": (t) => ({ subtitle: t.slice(0, 80), lightSide: "left", accent: "#ff9b9b" }),
    "cinematic-metaphor": (t) => ({ subtitle: t.slice(0, 80), label: "", mode: "cinematic", accent: "#c084fc" }),
    "candidate-comparison": (t) => ({ title: t.split(".")[0].slice(0, 48), criteria: "", candidates: [], selectedIndex: 0, accent: "#f2b84b" }),
    "process-timeline": (t) => ({ title: t.split(".")[0].slice(0, 48), steps: [], activeStep: 0, accent: "#61d7e8" }),
  };
  const treatmentId = String(args.treatment || "");
  if (!TREATMENTS[treatmentId]) fail(`--treatment must be one of: ${Object.keys(TREATMENTS).join(", ")}`);
  const beat = findBeat(beatId);
  const transcript = String(beat.transcript ?? "");
  const fromTreatment = beat.treatment?.id;
  // keep the existing accent when switching (visual continuity across beats)
  const prevAccent = typeof beat.treatment?.params?.accent === "string" ? beat.treatment.params.accent : undefined;
  const params = TREATMENTS[treatmentId](transcript);
  beat.treatment = { id: treatmentId, params: { ...params, ...(prevAccent ? { accent: prevAccent } : {}) }, assets: beat.treatment?.assets ?? [] };
  traceTitle = `Treatment đổi: ${beatId}`;
  traceData = { beatId, from: fromTreatment, to: treatmentId };
} else if (op === "set-duration") {
  const durationSec = Number(args.duration);
  if (!Number.isFinite(durationSec) || durationSec < 1 || durationSec > 600) fail("--duration must be 1-600 seconds");
  const beat = findBeat(beatId);
  traceTitle = `Duration sửa: ${beatId}`;
  traceData = { beatId, from: beat.durationSec, to: durationSec };
  beat.durationSec = Number(durationSec.toFixed(3));
}

// ---- retime + sync audioPlan.voice to the new beat layout ----
let cursor = 0;
for (const beat of beats) {
  beat.startSec = Number(cursor.toFixed(3));
  cursor += beat.durationSec;
}
if (doc.audioPlan?.voice) {
  for (const segment of doc.audioPlan.voice) {
    // legacy segments embed the beat id inside `id` ("slug:voice:beatId")
    const segBeatId = segment.beatId ?? String(segment.id ?? "").split(":").pop();
    const beat = findBeat(segBeatId);
    if (beat) {
      segment.beatId = segBeatId; // migrate: explicit field from now on
      segment.startSec = beat.startSec;
      segment.endSec = Number((beat.startSec + beat.durationSec).toFixed(3));
      // NOTE: segment.transcript is intentionally NOT synced — it records the
      // words the existing stem actually SAYS; a mismatch with beat.transcript
      // (the words that SHOULD be said) is exactly the stale signal the
      // partial generate detector reads
    }
  }
  if (op === "delete") doc.audioPlan.voice = doc.audioPlan.voice.filter((segment) => (segment.beatId ?? String(segment.id ?? "").split(":").pop()) !== beatId);
}

// ---- validate BEFORE write ----
const editIssues = validator.validateEditDoc(doc);
// treatment-shape warnings are non-blocking, but only for the beat THIS op
// touched — masking them on unrelated beats would hide real corruption
const touchedPath = op === "add" ? `beats[${beats.findIndex((b) => b.id === traceData.id)}]` : `beats[${beats.findIndex((b) => b.id === beatId)}]`;
const blocking = editIssues.filter((issue) => {
  const isTreatmentWarning = issue.message.includes("treatment params are empty") || issue.message.includes("unknown treatment");
  return !(isTreatmentWarning && issue.path.startsWith(touchedPath));
});
if (blocking.length) fail(`validation failed: ${blocking.map((issue) => `${issue.path}: ${issue.message}`).join("; ")}`);

// ---- optimistic lock: refuse to clobber a concurrent write (e.g. an
// in-flight produce scaffold finishing while this op was mutating) ----
if (statSync(baseDocPath).mtimeMs !== baseMtimeMs) fail("edit-doc changed while this op was running — retry the operation");

// ---- backup before write (delete/set-transcript are destructive) ----
const { copyFileSync } = await import("node:fs");
const backupPath = `${editDocPath}.bak-${new Date().toISOString().replace(/[:.]/g, "-")}`;
copyFileSync(editDocPath, backupPath);

// ---- write through the store's sanctioned path ----
const store = storeModule.createProjectStore(path.join(ROOT, "projects"), path.join(COMPOSER, "public"));
const snapshot = store.load(slug);
if (snapshot.videoDoc) {
  // keep videoDoc beats MERGED per-id (journeySlot/summary refresh; full
  // SemanticBeat data survives) — a wholesale shell replacement would destroy
  // transcript/treatment/elements on projects whose story doc is rich
  const videoDoc = { ...snapshot.videoDoc };
  if (Array.isArray(videoDoc.beats)) {
    const byId = new Map(videoDoc.beats.map((beat) => [beat.id, beat]));
    videoDoc.beats = beats.map((beat) => {
      const existing = byId.get(beat.id);
      return existing ? { ...existing, journeySlot: beat.journeySlot, summary: existing.summary ?? beat.narrativeFunction } : { id: beat.id, journeySlot: beat.journeySlot, summary: beat.narrativeFunction };
    });
  }
  store.saveSourceDocs(slug, videoDoc, doc);
} else {
  // no video-doc yet (rare; scaffold-only project) — write the edit docs
  // directly: saveSourceDocs would fail assertValidVideoDoc on a stub.
  // syncPublicEditDoc is private, so mirror its public copy location.
  const { writeFileSync, mkdirSync } = await import("node:fs");
  const currentPath = path.join(ROOT, "projects", slug, "edit", "current.json");
  const publicPath = path.join(COMPOSER, "public", slug, "05-edit-doc.json");
  const payload = JSON.stringify(doc, null, 2);
  writeFileSync(editDocPath, payload, "utf-8");
  writeFileSync(currentPath, payload, "utf-8");
  mkdirSync(path.dirname(publicPath), { recursive: true });
  writeFileSync(publicPath, payload, "utf-8");
}

appendTrace(ROOT, slug, "plan", traceTitle, traceData);

const total = beats.reduce((sum, beat) => Math.max(sum, beat.startSec + beat.durationSec), 0);
console.log(JSON.stringify({
  ok: true, projectId: slug, op, beatId: beatId || undefined,
  beats: beats.length, durationSec: Number(total.toFixed(3)),
  voiceSegments: doc.audioPlan?.voice?.length ?? 0,
}));

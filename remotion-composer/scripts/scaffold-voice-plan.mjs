#!/usr/bin/env node
/**
 * VOICE PLAN SCAFFOLD (PIPELINE-PRODUCTION-SPEC v3, stage A+H) — the produce
 * flow's voice step, reusable for any project:
 *
 *   1. Read edit-doc beats -> one audioPlan.voice segment PER BEAT
 *      (batch = beat; providerText = buildProviderText(transcript)).
 *   2. --regen: run tools/audio/voice_regen.py per segment (TTS takes + QC +
 *      post-chain -> stem WAV), then VOICE-FIRST RETIME each beat:
 *      durationSec = max(planned, stemDuration + breathPad), startSecs
 *      recomputed cumulatively. Narration > planned * 1.05 is flagged.
 *   3. Backup the edit-doc, write, and the normal generate-editor sync
 *      projects the new segments into timeline clips.
 *
 * Usage:
 *   node scripts/scaffold-voice-plan.mjs --project <slug> [--regen] [--takes 2] [--pad 0.35]
 */
import { readFileSync, writeFileSync, existsSync, copyFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const COMPOSER = path.resolve(import.meta.dirname, "..");
const PY = path.join(ROOT, "harness", ".venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
const { appendTrace } = await import(pathToFileURL(path.resolve(COMPOSER, "scripts", "lib", "trace.mjs")).href);

const args = Object.fromEntries(process.argv.slice(2).map((arg, index, all) => {
  if (!arg.startsWith("--")) return [];
  const key = arg.slice(2);
  const next = all[index + 1];
  return next && !next.startsWith("--") ? [key, next] : [key, true];
}));
const slug = args.project;
if (!slug) { console.error("--project <slug> required"); process.exit(1); }

const docPath = path.join(ROOT, "projects", slug, "05-edit-doc.json");
if (!existsSync(docPath)) { console.error(`edit-doc not found: ${docPath}`); process.exit(1); }

async function bundleVoiceClip() {
  const { build } = await import("esbuild");
  const outfile = path.join(os.tmpdir(), `isaac-voiceclip-${Date.now()}.mjs`);
  await build({
    entryPoints: [path.join(COMPOSER, "shared", "isaacverse", "voiceClip.ts")],
    bundle: true, format: "esm", platform: "node", outfile, logLevel: "silent",
  });
  return import(pathToFileURL(outfile).href);
}

const doc = JSON.parse(readFileSync(docPath, "utf-8"));
const { buildProviderText, expectedDurationSec } = await bundleVoiceClip();
const pad = Number(args.pad ?? 0.35);
const takeCount = Number(args.takes ?? 2);
const doRegen = args.regen === true;
// PARTIAL REGEN: --only beatId1,beatId2 (or --only changed) regenerates ONLY
// those beats' voices; every other beat keeps its existing audioPlan.voice
// segment (qc/takes/stem) — script edits no longer re-bill the whole video.
// Legacy segments carry the beat id inside `id` ("slug:voice:beatId") — parse
// it when the explicit field is missing.
const segmentBeatId = (segment) => segment.beatId ?? String(segment.id ?? "").split(":").pop();
const existingSegments = new Map((doc.audioPlan?.voice ?? []).map((segment) => [segmentBeatId(segment), segment]));
const onlyChanged = args.only === "changed";
const onlyIds = onlyChanged
  // "changed" = transcript/direction no longer matches the recorded segment —
  // the stale-stem detector the studio's partial Generate uses
  ? doc.beats.filter((beat) => {
    const segment = existingSegments.get(beat.id);
    if (!segment) return true;
    // whitespace-collapsed comparison, same normalization as the studio's
    // stale detector — a double-space edit must not re-bill TTS
    if (buildProviderText(String(segment.transcript ?? "")) !== buildProviderText(String(beat.transcript ?? ""))) return true;
    const segmentDirection = typeof segment.providerText === "string" ? segment.providerText : buildProviderText(String(segment.transcript ?? ""));
    return segmentDirection !== (beat.direction ?? buildProviderText(String(beat.transcript ?? "")));
  }).map((beat) => beat.id)
  : typeof args.only === "string" && args.only
    ? String(args.only).split(",").map((id) => id.trim()).filter(Boolean)
    : null; // null = full regen (previous behavior)

const planned = doc.beats.map((beat) => {
  const existing = existingSegments.get(beat.id);
  const regenSet = doRegen ? (onlyIds ? new Set(onlyIds) : null) : new Set(); // null = all
  const isKept = existing && (regenSet === null ? false : !regenSet.has(beat.id));
  return {
    id: `${slug}:voice:${beat.id}`,
    beatId: beat.id,
    src: `${slug}/voice/stems/${beat.id}.wav`,
    transcript: String(beat.transcript ?? "").trim(),
    providerText: beat.direction ?? buildProviderText(String(beat.transcript ?? "")),
    // carried over when this beat is NOT being regenerated: retime reuses the
    // old stem duration, qc/takes survive untouched
    ...(isKept ? {
      // as-voiced transcript of the EXISTING stem — must NOT refresh to the
      // beat's current transcript: a kept beat whose script changed (explicit
      // --only list) keeps its stale signal so a later run can re-bill it
      transcript: String(existing.transcript ?? ""),
      stemDurationSec: Number((existing.endSec - existing.startSec).toFixed(3)),
      qc: existing.qc,
      takeId: existing.takeId,
      takes: existing.takes,
      kept: true,
    } : {}),
  };
});

if (doRegen) {
  const regenTargets = onlyIds ? planned.filter((segment) => onlyIds.includes(segment.beatId)) : planned;
  console.log(`[voice] regenerating ${regenTargets.length}/${planned.length} segment(s), ${takeCount} take(s) each${onlyIds ? ` (partial: ${onlyIds.length} kept)` : ""}...`);
  for (const segment of regenTargets) {
    if (!segment.transcript) { console.log(`  SKIP ${segment.beatId} (no transcript)`); continue; }
    const payload = JSON.stringify({
      projectId: slug, clipId: segment.beatId, providerText: segment.providerText,
      voiceSettings: {}, expectedSec: expectedDurationSec(segment.providerText), takes: takeCount,
    });
    const proc = spawnSync(PY, [path.join(ROOT, "tools", "audio", "voice_regen.py")], {
      input: payload, cwd: ROOT, windowsHide: true, encoding: "utf-8", timeout: 600000,
      maxBuffer: 16 * 1024 * 1024,
    });
    if (proc.status !== 0) {
      console.error(`  FAIL ${segment.beatId}: ${(proc.stderr || proc.stdout || "").slice(0, 240)}`);
      process.exit(1);
    }
    const result = JSON.parse(proc.stdout.slice(proc.stdout.indexOf("{"), proc.stdout.lastIndexOf("}") + 1));
    segment.stemDurationSec = result.stemDurationSec;
    segment.qcPass = result.qc?.pass === true;
    // QC + take provenance flow into the audioPlan so the projection carries
    // them onto the voice clips (the QC badge + beat cards read these) —
    // otherwise validated QC data dies inside this script.
    segment.qc = result.qc;
    segment.takeId = result.takeId;
    // takes (lean) — the studio's take list reads them; `path` keeps the
    // play button alive for scaffold-produced projects (cold-diff MINOR #6)
    segment.takes = (result.takes ?? [])
      .filter((take) => take && take.id)
      .map((take) => ({ id: take.id, pass: take.pass === true, durationSec: take.metrics?.durationSec, path: take.path }));
    appendTrace(ROOT, slug, "voice", `Voice: ${segment.beatId}`, {
      providerText: segment.providerText,
      takes: (result.takes ?? []).map((take) => ({ id: take.id, pass: take.pass, durationSec: take.metrics?.durationSec?.toFixed?.(2) })),
      selectedTake: result.takeId,
      qc: { pass: result.qc?.pass, checks: (result.qc?.checks ?? []).map((check) => `${check.pass ? "✓" : "✗"} ${check.label}: ${check.value}`) },
      stemDurationSec: result.stemDurationSec,
    });
    console.log(`  ${segment.beatId}: ${result.stemDurationSec?.toFixed(2)}s (take ${result.takeId}, QC ${result.qc?.pass ? "PASS" : "FAIL"})`);
  }
}

// VOICE-FIRST RETIME (stage H): beats must fit their narration; the video
// grows instead of squeezing the VO. >1.05x over the planned duration is a
// script-rewrite flag, reported — never silently absorbed.
let cursor = doc.beats[0]?.startSec ?? 0;
const flags = [];
for (let index = 0; index < doc.beats.length; index += 1) {
  const beat = doc.beats[index];
  const stem = planned.find((segment) => segment.beatId === beat.id);
  // kept beats already include their breath pad from the last regen — re-adding
  // pad would grow the video on every partial run
  const needed = doRegen && stem?.stemDurationSec ? (stem.kept ? stem.stemDurationSec : stem.stemDurationSec + pad) : null;
  if (needed !== null && needed > beat.durationSec * 1.05) {
    flags.push(`${beat.id}: narration ${needed.toFixed(2)}s vs planned ${beat.durationSec}s`);
  }
  beat.durationSec = needed !== null ? Math.max(beat.durationSec, Number(needed.toFixed(3))) : beat.durationSec;
  beat.startSec = Number(cursor.toFixed(3));
  cursor += beat.durationSec;
}
const voiceSegments = planned.map((segment) => {
  const beat = doc.beats.find((b) => b.id === segment.beatId);
  return {
    id: segment.id, src: segment.src, beatId: segment.beatId,
    startSec: beat.startSec, endSec: Number((beat.startSec + beat.durationSec).toFixed(3)),
    transcript: segment.transcript,
    // direction (providerText override) survives the mapping — the projection
    // prefers it over rebuilding from transcript (beat.direction = truth)
    ...(segment.providerText ? { providerText: segment.providerText } : {}),
    ...(segment.kept ? { kept: true } : {}),
    // QC + take provenance survive the mapping (beat cards + QC badge read them)
    ...(segment.qc ? { qc: segment.qc } : {}),
    ...(segment.takeId ? { takeId: segment.takeId } : {}),
    ...(segment.takes ? { takes: segment.takes } : {}),
  };
});
doc.audioPlan = doc.audioPlan ?? {};
doc.audioPlan.voice = voiceSegments;
// keep the doc's total duration honest
const total = doc.beats.reduce((sum, beat) => Math.max(sum, beat.startSec + beat.durationSec), 0);
if (typeof doc.durationSec === "number") doc.durationSec = Number(total.toFixed(3));

const backup = `${docPath}.bak-${new Date().toISOString().replace(/[:.]/g, "-")}`;
copyFileSync(docPath, backup);
const payload = JSON.stringify(doc, null, 2);
writeFileSync(docPath, payload, "utf-8");
// keep edit/current.json in lockstep: the store's load() PREFERS it over
// 05-edit-doc.json — writing only the source would leave every studio read
// serving the pre-produce voice plan (stale-segment false positives)
const currentPath = path.join(ROOT, "projects", slug, "edit", "current.json");
if (existsSync(path.dirname(currentPath))) writeFileSync(currentPath, payload, "utf-8");
console.log(`[voice] ${voiceSegments.length} segment(s) written; beats retimed; total ${total.toFixed(2)}s`);
if (flags.length) console.log(`[voice] REWRITE FLAGS:\n  - ${flags.join("\n  - ")}`);
console.log(`[voice] backup: ${path.relative(ROOT, backup)}`);
console.log(`[voice] next: node scripts/generate-editor.mjs --project ${slug} (sync)`);

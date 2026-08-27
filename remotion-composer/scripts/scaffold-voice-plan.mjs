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

const planned = doc.beats.map((beat) => ({
  id: `${slug}:voice:${beat.id}`,
  beatId: beat.id,
  src: `${slug}/voice/stems/${beat.id}.wav`,
  transcript: String(beat.transcript ?? "").trim(),
  providerText: buildProviderText(String(beat.transcript ?? "")),
}));

if (doRegen) {
  console.log(`[voice] regenerating ${planned.length} segment(s), ${takeCount} take(s) each...`);
  for (const segment of planned) {
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
  const needed = doRegen && stem?.stemDurationSec ? stem.stemDurationSec + pad : null;
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
    id: segment.id, src: segment.src,
    startSec: beat.startSec, endSec: Number((beat.startSec + beat.durationSec).toFixed(3)),
    transcript: segment.transcript,
  };
});
doc.audioPlan = doc.audioPlan ?? {};
doc.audioPlan.voice = voiceSegments;
// keep the doc's total duration honest
const total = doc.beats.reduce((sum, beat) => Math.max(sum, beat.startSec + beat.durationSec), 0);
if (typeof doc.durationSec === "number") doc.durationSec = Number(total.toFixed(3));

const backup = `${docPath}.bak-${new Date().toISOString().replace(/[:.]/g, "-")}`;
copyFileSync(docPath, backup);
writeFileSync(docPath, JSON.stringify(doc, null, 2), "utf-8");
console.log(`[voice] ${voiceSegments.length} segment(s) written; beats retimed; total ${total.toFixed(2)}s`);
if (flags.length) console.log(`[voice] REWRITE FLAGS:\n  - ${flags.join("\n  - ")}`);
console.log(`[voice] backup: ${path.relative(ROOT, backup)}`);
console.log(`[voice] next: node scripts/generate-editor.mjs --project ${slug} (sync)`);

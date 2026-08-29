#!/usr/bin/env node
/**
 * PRODUCE (CONTENT-STUDIO-SPEC §5 — the deterministic back-half in ONE job):
 * voice (TTS takes + QC + voice-first retime) -> timeline (validate +
 * generate + report) -> draft render. The studio's [Generate] button and the
 * agent call the SAME script through POST /api/project/produce.
 *
 * Emits one JSON line per step ({"step":...}) for live progress, and one
 * final result JSON: { ok, projectId, renderPath, durationSec, checks }.
 *
 * Usage: node scripts/produce.mjs --project <slug> [--takes 2] [--pad 0.35]
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { readFileSync, existsSync } from "node:fs";

const COMPOSER = path.resolve(import.meta.dirname, "..");
const ROOT = path.resolve(COMPOSER, "..");

const args = Object.fromEntries(process.argv.slice(2).map((arg, index, all) => {
  if (!arg.startsWith("--")) return [];
  const key = arg.slice(2);
  const next = all[index + 1];
  return next && !next.startsWith("--") ? [key, next] : [key, true];
}));
const slug = args.project;
if (!slug) { console.error(JSON.stringify({ ok: false, error: "--project <slug> required" })); process.exit(1); }
const takes = Number(args.takes ?? 2);
const pad = Number(args.pad ?? 0.35);

const editDocPath = path.join(ROOT, "projects", slug, "05-edit-doc.json");
if (!existsSync(editDocPath)) { console.error(JSON.stringify({ ok: false, error: "no edit-doc — write a script first" })); process.exit(1); }

const run = (label, cmd) => {
  console.log(JSON.stringify({ step: label }));
  const proc = spawnSync(process.execPath, cmd, {
    cwd: COMPOSER, windowsHide: true, encoding: "utf-8", timeout: 900000, maxBuffer: 32 * 1024 * 1024,
  });
  return proc;
};

// ---- step 1: voice (TTS per beat + QC + voice-first retime) ----
const voice = run("voice", ["scripts/scaffold-voice-plan.mjs", "--project", slug, "--regen", "--takes", String(takes), "--pad", String(pad)]);
if (voice.status !== 0) {
  console.error(JSON.stringify({ ok: false, error: `voice step failed: ${String(voice.stderr || voice.stdout).slice(0, 300)}` }));
  process.exit(1);
}

// ---- step 2: timeline (validate pre-flight -> generate -> report) ----
const timeline = run("timeline", ["scripts/generate-timeline.mjs", "--project", slug]);
if (timeline.status !== 0) {
  console.error(JSON.stringify({ ok: false, error: `timeline step failed: ${String(timeline.stderr || timeline.stdout).slice(0, 300)}` }));
  process.exit(1);
}

// ---- step 3: draft render (full duration from the fresh edit-doc) ----
const editDoc = JSON.parse(readFileSync(editDocPath, "utf-8"));
const beatEnds = (editDoc.beats ?? [])
  .filter((beat) => Number.isFinite(beat.startSec) && Number.isFinite(beat.durationSec))
  .map((beat) => beat.startSec + beat.durationSec);
if (!beatEnds.length) { console.error(JSON.stringify({ ok: false, error: "edit-doc has no valid beats (startSec/durationSec)" })); process.exit(1); }
const durationSec = Math.max(...beatEnds, 0.1);
const renderName = `auto-${new Date().toISOString().replace(/[:.]/g, "-")}.mp4`;
const outputPath = path.join(ROOT, "projects", slug, "renders", renderName);
const render = run("render", ["scripts/render-window.mjs", "--project", slug, "--start", "0", "--end", String(durationSec + 0.2), "--quality", "draft", "--padding", "0", "--output", path.relative(ROOT, outputPath).replace(/\\/g, "/")]);
if (render.status !== 0) {
  console.error(JSON.stringify({ ok: false, error: `render step failed: ${String(render.stderr || render.stdout).slice(0, 300)}` }));
  process.exit(1);
}

// ---- result ----
const reportPath = path.join(ROOT, "projects", slug, "qa", "timeline-report.json");
const report = existsSync(reportPath) ? JSON.parse(readFileSync(reportPath, "utf-8")) : {};
console.log(JSON.stringify({
  ok: true,
  projectId: slug,
  renderPath: path.relative(ROOT, outputPath).replace(/\\/g, "/"),
  durationSec: Number(durationSec.toFixed(3)),
  timelineOk: report.ok === true,
  warnings: report.warnings ?? [],
}));

#!/usr/bin/env node
/**
 * GENERATE TIMELINE (PIPELINE-PRODUCTION-SPEC v3, M3) — the produce flow's
 * timeline step, reusable by the UI button and the agent's generate_timeline
 * tool (SAME script, parity by construction):
 *
 *   1. PRE-FLIGHT validate the edit-doc: schema (validateEditDoc) + timeline
 *      semantics (validateEditDocTimeline: contiguity, cues, params) + asset
 *      existence on disk. Blocking issues stop generation — nothing is
 *      written, the report says why.
 *   2. Generate the editor doc (generate-editor.mjs, sync mode by default —
 *      the ledger keeps user edits).
 *   3. POST-CHECK the generated editor doc: voice clips have src + QC pass
 *      (warning-level — a FAIL does not un-generate, it surfaces).
 *   4. Write projects/<slug>/qa/timeline-report.json (the report BOTH the
 *      Composer Timeline-QA panel and the agent read — one artifact, two
 *      surfaces) + sync public for the preview.
 *
 * Usage: node scripts/generate-timeline.mjs --project <slug> [--mode sync|cold] [--dry-run]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
if (!slug) { console.error("--project <slug> required"); process.exit(1); }
const mode = args.mode === "cold" ? "cold" : "sync";
const dryRun = args["dry-run"] === true;

const projectDir = path.join(ROOT, "projects", slug);
const editDocPath = path.join(projectDir, "05-edit-doc.json");
if (!existsSync(editDocPath)) { console.error(`edit-doc not found: ${editDocPath}`); process.exit(1); }
const editDoc = JSON.parse(readFileSync(editDocPath, "utf-8"));

async function bundleModule(relPathFromShared, prefix) {
  const { build } = await import("esbuild");
  const outfile = path.join(os.tmpdir(), `isaac-${prefix}-${Date.now()}.mjs`);
  await build({ entryPoints: [path.join(COMPOSER, "shared", "isaacverse", relPathFromShared)], bundle: true, format: "esm", platform: "node", outfile, logLevel: "silent" });
  return import(pathToFileURL(outfile).href);
}

/** Asset srcs are public-relative ("<project>/..." or "<project-independent>/...").
 *  Resolvable when the file exists under public/ (preview truth). */
const assetExists = (src) => {
  if (typeof src !== "string" || !src) return false;
  return existsSync(path.join(COMPOSER, "public", src));
};

const report = {
  ok: false,
  projectId: slug,
  mode,
  generatedAt: new Date().toISOString(),
  styleVersion: null,
  checks: [],
  warnings: [],
  blocking: [],
};

const validator = await bundleModule("validate.ts", "gentl-val");
const schemaIssues = validator.validateEditDoc(editDoc);
const timelineIssues = validator.validateEditDocTimeline(editDoc);
report.checks.push({ id: "schema", label: "Edit-doc schema", pass: schemaIssues.length === 0, detail: schemaIssues.map((i) => `${i.path}: ${i.message}`) });
report.checks.push({ id: "timeline", label: "Timeline semantics (contiguity, cues, params)", pass: timelineIssues.length === 0, detail: timelineIssues.map((i) => `${i.path}: ${i.message}`) });

// BLOCKING = the generation would be structurally broken (gap/overlap tiling,
// missing asset files). Schema discipline issues are WARNINGS — the generator
// is deliberately lenient on inputs; the report surfaces them for fixing
// instead of swallowing them (spec: "không nuốt warning trong stdout").
const blockingIssues = [
  ...timelineIssues.filter((i) => i.message.includes("timeline gap/overlap") || i.message.includes("first beat must start at 0")),
  ...schemaIssues.filter((i) => i.message.includes("durationSec") || i.message.includes("startSec")),
];

// asset existence: element srcs + declared assets
const referencedSrcs = new Set();
for (const beat of editDoc.beats ?? []) {
  for (const element of beat.elements ?? []) if (typeof element?.src === "string" && element.src) referencedSrcs.add(element.src);
}
for (const asset of editDoc.assets ?? []) if (typeof asset?.src === "string" && asset.src) referencedSrcs.add(asset.src);
const missingAssets = [...referencedSrcs].filter((src) => !assetExists(src));
report.checks.push({ id: "assets", label: "Assets exist on disk", pass: missingAssets.length === 0, detail: missingAssets.map((src) => `missing: ${src}`) });

report.blocking = blockingIssues.map((i) => `${i.path}: ${i.message}`);
report.blocking.push(...missingAssets.map((src) => `missing asset: ${src}`));

if (report.blocking.length) {
  report.ok = false;
  const reportPath = path.join(projectDir, "qa", "timeline-report.json");
  mkdirSync(path.dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf-8");
  console.error(JSON.stringify({ ok: false, blocking: report.blocking.length, report: path.relative(ROOT, reportPath) }, null, 2));
  process.exit(1);
}

// ---- generate (blocking issues are gone) ----
const gen = spawnSync(process.execPath, [
  "scripts/generate-editor.mjs", "--project", slug, "--mode", mode,
  ...(dryRun ? ["--dry-run"] : []),
], { cwd: COMPOSER, windowsHide: true, encoding: "utf-8", timeout: 300000, maxBuffer: 32 * 1024 * 1024 });
if (gen.status !== 0) {
  report.ok = false;
  report.blocking.push(`generate-editor exited ${gen.status}: ${String(gen.stderr || gen.stdout).slice(0, 400)}`);
  const reportPath = path.join(projectDir, "qa", "timeline-report.json");
  mkdirSync(path.dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf-8");
  console.error(JSON.stringify({ ok: false, blocking: 1, report: path.relative(ROOT, reportPath) }, null, 2));
  process.exit(1);
}
const genSummary = JSON.parse(gen.stdout.slice(gen.stdout.indexOf("{"), gen.stdout.lastIndexOf("}") + 1) || "{}");
report.styleVersion = genSummary.styleStoreVersion ?? genSummary.styleVersion ?? null;
report.stats = genSummary.stats ?? { refreshed: genSummary.refreshed, keptUser: genSummary.keptUser, added: genSummary.added, dropped: genSummary.dropped };
report.checks.push({ id: "generate", label: `Editor doc generated (${mode})`, pass: true, detail: [`refreshed=${genSummary.refreshed ?? "?"} keptUser=${genSummary.keptUser ?? "?"} added=${genSummary.added ?? "?"} dropped=${genSummary.dropped ?? "?"}`] });
// non-blocking discipline issues surface as warnings — never swallowed
for (const issue of schemaIssues) report.warnings.push(`schema: ${issue.path}: ${issue.message}`);
for (const issue of timelineIssues) if (!report.blocking.includes(`${issue.path}: ${issue.message}`)) report.warnings.push(`timeline: ${issue.path}: ${issue.message}`);
for (const warning of genSummary.warnings ?? []) report.warnings.push(`generator: ${String(warning)}`);

// ---- post-check: editor doc voice clips have src + QC ----
if (!dryRun) {
  const editorDocPath = path.join(projectDir, "editor", "current.json");
  if (existsSync(editorDocPath)) {
    const editorDoc = JSON.parse(readFileSync(editorDocPath, "utf-8"));
    const voiceClips = editorDoc.tracks?.flatMap((track) => track.clips ?? []).filter((clip) => clip.kind === "voice") ?? [];
    const noSrc = voiceClips.filter((clip) => typeof clip.metadata?.src !== "string" || !clip.metadata.src);
    const qcFail = voiceClips.filter((clip) => clip.metadata?.qc && clip.metadata.qc.pass !== true);
    report.checks.push({
      id: "voice",
      label: "Voice clips have src + QC pass",
      pass: noSrc.length === 0 && qcFail.length === 0,
      detail: [
        ...noSrc.map((clip) => `no stem: ${clip.id}`),
        ...qcFail.map((clip) => `QC fail: ${clip.id}`),
        ...(voiceClips.length === 0 ? ["no voice track (voice-first pipeline not run yet — scaffold-voice-plan --regen)"] : []),
      ],
    });
    if (noSrc.length || qcFail.length) report.warnings.push(`voice issues: ${noSrc.length} no-src, ${qcFail.length} QC-fail`);
  }
}

// ok = generated + nothing needs attention; warnings keep exit 0 (the
// timeline IS generated — the agent/human reads warnings for the next fix
// cycle) while blocking issues exited earlier with code 1.
report.ok = report.warnings.length === 0 && report.checks.every((check) => check.pass) && report.blocking.length === 0;
const reportPath = path.join(projectDir, "qa", "timeline-report.json");
mkdirSync(path.dirname(reportPath), { recursive: true });
if (!dryRun) writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf-8");

// sync public so the preview sees the fresh editor doc
if (!dryRun) {
  const sync = spawnSync(process.execPath, ["scripts/sync-project-public.mjs", slug], { cwd: COMPOSER, windowsHide: true, stdio: "ignore", timeout: 60000 });
  if (sync.status !== 0) report.warnings.push("public sync failed — preview may be stale");
}

console.log(JSON.stringify({
  ok: report.ok,
  generated: true,
  projectId: slug,
  mode,
  styleVersion: report.styleVersion,
  checks: report.checks.map((c) => ({ id: c.id, pass: c.pass })),
  warnings: report.warnings,
  report: dryRun ? undefined : path.relative(ROOT, reportPath),
}, null, 2));
process.exit(0);

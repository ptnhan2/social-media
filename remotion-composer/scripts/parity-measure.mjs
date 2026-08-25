#!/usr/bin/env node
/**
 * PARITY MEASUREMENT — treatment path vs editor path on a COLD projection
 * (GENERATOR-SPEC E2 gate, spec §2.6: mean abs diff < 2.0 on window interior).
 *
 * Pipeline: cold-generate editor doc (no user edits) → render both paths on
 * the same frame window → pixel-diff via tools/quality/parity_diff.py →
 * JSON report under projects/<slug>/qa/parity/.
 *
 * Usage:
 *   node scripts/parity-measure.mjs --project isaacverse-final --start 3.5 --end 7 \
 *        [--quality draft] [--label semantic-diagram] [--step 0.25]
 *
 * Frame alignment: pass --start/--end on frame boundaries (e.g. 3.5 @ 30fps =
 * frame 105) and padding is forced to 0 so both paths render identical frames.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildWindowRender } from "./render-window.mjs";

const composerRoot = path.resolve(import.meta.dirname, "..");
const workspaceRoot = path.resolve(composerRoot, "..");

const parseArgs = (argv) => {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) result[key] = true;
    else { result[key] = next; index += 1; }
  }
  return result;
};

const slug = args => args.project || "isaacverse-final";
const pythonBin = () => {
  const candidate = path.join(workspaceRoot, "harness", ".venv", "Scripts", "python.exe");
  if (fs.existsSync(candidate)) return candidate;
  return "python";
};

const run = (cmd, cmdArgs, opts = {}) => {
  const result = spawnSync(cmd, cmdArgs, { stdio: "inherit", windowsHide: true, shell: process.platform === "win32", ...opts });
  if (result.status !== 0) throw new Error(`command failed (${result.status}): ${cmd} ${cmdArgs.join(" ")}`);
  return result;
};

const args = parseArgs(process.argv.slice(2));
if (args.start === undefined || args.end === undefined) {
  console.error("usage: node scripts/parity-measure.mjs --project isaacverse-final --start 3.5 --end 7 [--label name] [--quality draft] [--step 0.25]");
  process.exit(1);
}
const project = slug(args);
const label = args.label || `w${Number(args.start)}-${Number(args.end)}`;
const quality = args.quality || "draft";
const step = args.step === undefined ? 0.25 : Number(args.step);
const startSec = Number(args.start);
const endSec = Number(args.end);
const projectDir = path.join(workspaceRoot, "projects", project);
const coldDocPath = path.join(projectDir, "editor", "parity-cold.json");
const rendersDir = path.join(projectDir, "renders", "windows");
const qaDir = path.join(projectDir, "qa", "parity");
fs.mkdirSync(rendersDir, { recursive: true });
fs.mkdirSync(qaDir, { recursive: true });

// 1. cold projection (NEVER the live editor doc — user edits would pollute the diff)
run(process.execPath, [path.join(composerRoot, "scripts", "generate-editor.mjs"), "--project", project, "--mode", "cold", "--out", coldDocPath], { cwd: composerRoot });
console.log(`[parity] cold editor doc -> ${path.relative(workspaceRoot, coldDocPath)}`);

// 2. render both paths on identical frames (padding 0)
const treatmentOut = path.join(rendersDir, `parity-${label}-treatment.mp4`);
const editorOut = path.join(rendersDir, `parity-${label}-editor.mp4`);
buildWindowRender({ slug: project, startSec, endSec, quality, output: treatmentOut, paddingSec: 0 });
console.log(`[parity] treatment render -> ${path.relative(workspaceRoot, treatmentOut)}`);
buildWindowRender({ slug: project, composition: `${project}-30s-editor`, startSec, endSec, quality, output: editorOut, paddingSec: 0, editorDocPath: coldDocPath });
console.log(`[parity] editor render -> ${path.relative(workspaceRoot, editorOut)}`);

// 3. pixel-diff (interior sweep, skips 0.1s head/tail)
const duration = endSec - startSec;
const times = [];
for (let t = 0.1; t <= duration - 0.1 + 1e-9; t += step) times.push(Number(t.toFixed(2)));
const diff = spawnSync(pythonBin(), [path.join(workspaceRoot, "tools", "quality", "parity_diff.py"), "--a", treatmentOut, "--b", editorOut, "--times", times.join(","), "--json"], { encoding: "utf8", windowsHide: true });
// parity_diff exits 1 when the gate FAILS (a valid measurement, not a tool
// error) — only treat crashes/output-parse failures as errors here.
if (diff.status !== null && diff.status > 1) {
  console.error(diff.stdout || diff.stderr || "parity_diff failed");
  process.exit(1);
}
const report = { label, project, window: { startSec, endSec, quality, step }, ...JSON.parse(diff.stdout) };

// 4. persist + summarize
const reportPath = path.join(qaDir, `${label}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
console.log(`\n[parity] ${label}: gate=${report.gate} meanOfMeans=${report.meanOfMeans} maxMean=${report.maxMean} (threshold ${report.gateThreshold})`);
console.log(`[parity] frames: ${report.frames.map((f) => `t=${f.t}: ${f.mean ?? f.error}`).join(" | ")}`);
console.log(`[parity] report -> ${path.relative(workspaceRoot, reportPath)}`);
if (import.meta.url === pathToFileURLStr()) process.exit(0);
function pathToFileURLStr() { return fileURLToPath(import.meta.url); }
process.exit(report.gate === "PASS" ? 0 : 2);

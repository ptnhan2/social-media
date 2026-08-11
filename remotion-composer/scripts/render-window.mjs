import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { preset } from "./render-presets.mjs";

const composerRoot = path.resolve(import.meta.dirname, "..");
const workspaceRoot = path.resolve(composerRoot, "..");

export function computeFrameRange({ startSec, endSec, fps, durationSec }) {
  if (!Number.isFinite(startSec) || startSec < 0) throw new Error("startSec must be non-negative");
  if (!Number.isFinite(endSec) || endSec <= startSec) throw new Error("endSec must be greater than startSec");
  if (!Number.isFinite(fps) || fps <= 0) throw new Error("fps must be positive");
  if (!Number.isFinite(durationSec) || durationSec <= 0) throw new Error("durationSec must be positive");
  if (startSec >= durationSec || endSec <= 0) throw new Error("window is outside the document duration");
  const start = Math.max(0, startSec);
  const end = Math.min(durationSec, endSec);
  if (end <= start) throw new Error("window does not overlap the document");
  return { startFrame: Math.floor(start * fps), endFrame: Math.max(0, Math.ceil(end * fps) - 1), startSec: start, endSec: end };
}

export function computeWindow({ startSec, endSec, fps, durationSec, paddingSec = 0.45 }) {
  return computeFrameRange({ startSec: Math.max(0, startSec - paddingSec), endSec: Math.min(durationSec, endSec + paddingSec), fps, durationSec });
}

export const editDurationSec = (doc) => Math.max(
  0,
  ...(doc.beats || []).map((beat) => beat.startSec + beat.durationSec),
  ...(doc.transitions || []).map((transition) => transition.atSec + transition.durationSec),
);

export const parseArgs = (argv) => {
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

export const projectInfo = (slug, editDocPath = path.join(workspaceRoot, "projects", slug, "05-edit-doc.json")) => {
  const editDoc = JSON.parse(fs.readFileSync(editDocPath, "utf8"));
  return { slug, editDoc, editDocPath, durationSec: editDurationSec(editDoc), fps: editDoc.fps || 30 };
};

export const remotionBinary = () => path.join(composerRoot, "node_modules", ".bin", process.platform === "win32" ? "remotion.cmd" : "remotion");

export const runRemotion = (args, { dryRun = false } = {}) => {
  const command = remotionBinary();
  if (dryRun) return { command, args, status: 0 };
  const result = spawnSync(command, args, { cwd: composerRoot, stdio: "inherit", windowsHide: true, shell: process.platform === "win32" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Remotion render failed with status ${result.status}`);
  return { command, args, status: result.status ?? 0 };
};

export function buildWindowRender({ slug, composition, entry, editDocPath, startSec, endSec, quality = "draft", output, paddingSec = 0.45, dryRun = false }) {
  const info = projectInfo(slug, editDocPath);
  const window = computeWindow({ startSec, endSec, fps: info.fps, durationSec: info.durationSec, paddingSec });
  const qualityPreset = preset(quality);
  const outputPath = output || path.join(workspaceRoot, "projects", slug, "renders", "windows", `${slug}-${quality}-${window.startSec.toFixed(2)}-${window.endSec.toFixed(2)}.mp4`);
  const args = ["render", entry || `projects/${slug}/index.tsx`, composition || `${slug}-30s`, outputPath, `--frames=${window.startFrame}-${window.endFrame}`, `--scale=${qualityPreset.scale}`, `--concurrency=${qualityPreset.concurrency}`, `--x264-preset=${qualityPreset.x264Preset}`, `--crf=${qualityPreset.crf}`, "--gl=angle"];
  return { ...window, outputPath, command: runRemotion(args, { dryRun }), args };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h) {
    console.log("Usage: node scripts/render-window.mjs --project isaacverse-final --start 4 --end 8 [--quality draft] [--dry-run]");
    process.exit(0);
  }
  if (args.start === undefined || args.end === undefined) throw new Error("--start and --end are required");
  const result = buildWindowRender({
    slug: args.project || "isaacverse-final",
    composition: args.composition,
    entry: args.entry,
    editDocPath: args.editDoc,
    startSec: Number(args.start),
    endSec: Number(args.end),
    quality: args.quality || "draft",
    output: args.output,
    paddingSec: args.padding === undefined ? 0.45 : Number(args.padding),
    dryRun: Boolean(args.dryRun),
  });
  console.log(JSON.stringify(result, null, 2));
}

import fs from "node:fs";
import os from "node:os";
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

// Build a fresh bundle to a stable temp dir, then render from it.
// We CANNOT pass the entry point directly to `remotion render` because Remotion
// caches its internal render-time bundle in %TEMP%/remotion-webpack-bundle-* and
// reuses it even when source/style files change — so style-knob edits never
// reached the render (every "VLM can't detect changes" A/B had identical videos).
// `remotion bundle <entry> <out>` always rebuilds to the named path, bypassing
// that cache; rendering from the bundle dir then uses the fresh code.
const bundleCacheDir = () => {
  // RELATIVE path inside composerRoot — avoids .cmd-shim + shell quoting issues
  // with absolute temp paths (backslashes/spaces) on Windows. `build` is the
  // remotion default and is reliably accepted as both bundle-out and render-input.
  return process.env.REMOTION_BUNDLE_DIR || "build";
};

export function buildBundle(entry) {
  const entryPoint = entry || `projects/isaacverse-final/index.tsx`;
  const outDir = bundleCacheDir();
  // wipe the bundle dir, webpack filesystem cache, AND remotion's render-time
  // bundle temp dirs so source/style-JSON edits are GUARANTEED to reach the
  // render. Without all three, a stale cache silently serves old modules
  // (including the imported isaacverse-style.json) and style-knob changes never
  // affect the output — every prior "VLM can't detect changes" A/B had identical
  // videos because of this.
  try { fs.rmSync(path.join(composerRoot, outDir), { recursive: true, force: true }); } catch {}
  try { fs.rmSync(path.join(composerRoot, "node_modules", ".cache", "webpack"), { recursive: true, force: true }); } catch {}
  try {
    const tmp = os.tmpdir();
    for (const name of fs.readdirSync(tmp)) {
      if (name.startsWith("remotion-webpack-bundle-")) fs.rmSync(path.join(tmp, name), { recursive: true, force: true });
    }
  } catch {}
  const r = runRemotion(["bundle", entryPoint, outDir]);
  return outDir;
}

export function buildWindowRender({ slug, composition, entry, editDocPath, startSec, endSec, quality = "draft", output, paddingSec = 0.45, scale, dryRun = false }) {
  const info = projectInfo(slug, editDocPath);
  const window = computeWindow({ startSec, endSec, fps: info.fps, durationSec: info.durationSec, paddingSec });
  const qualityPreset = preset(quality);
  const outputPath = output || path.join(workspaceRoot, "projects", slug, "renders", "windows", `${slug}-${quality}-${window.startSec.toFixed(2)}-${window.endSec.toFixed(2)}.mp4`);
  // Step 1: fresh bundle (picks up style/source edits). Step 2: render from it.
  const bundleDir = dryRun ? "<bundle>" : buildBundle(entry);
  const args = ["render", bundleDir, composition || `${slug}-30s`, outputPath, `--frames=${window.startFrame}-${window.endFrame}`, `--scale=${typeof scale === "number" && scale > 0 ? scale : qualityPreset.scale}`, `--concurrency=${qualityPreset.concurrency}`, `--x264-preset=${qualityPreset.x264Preset}`, `--crf=${qualityPreset.crf}`, "--gl=angle"];
  return { ...window, outputPath, bundleDir, command: runRemotion(args, { dryRun }), args };
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
    scale: args.scale === undefined ? undefined : Number(args.scale),
    dryRun: Boolean(args.dryRun),
  });
  console.log(JSON.stringify(result, null, 2));
}

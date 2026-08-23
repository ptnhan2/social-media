import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
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

// Build a fresh bundle to a stable dir, then render from it.
//
// Why not pass the entry point directly to `remotion render`? Remotion caches
// its internal render-time bundle in %TEMP%/remotion-webpack-bundle-* and can
// reuse it after source edits, so changes silently never reached the render.
// `remotion bundle <entry> <out>` always rebuilds to the named path.
//
// The style store (`shared/isaacverse/isaacverse-style.json`) and edit docs are
// fetched at RUNTIME from the bundle's public/ folder (styleLoader.ts /
// ProjectLoader.tsx) — they are NOT webpack-bundled. So style/doc changes only
// need a public/ sync, not a bundle rebuild. We rebuild ONLY when TS/TSX source
// files change (tracked via a hash), which keeps style-iteration renders fast.
const bundleCacheDir = () => {
  // RELATIVE path inside composerRoot — avoids .cmd-shim + shell quoting issues
  // with absolute temp paths (backslashes/spaces) on Windows. `build` is the
  // remotion default and is reliably accepted as both bundle-out and render-input.
  return process.env.REMOTION_BUNDLE_DIR || "build";
};

const sourceHash = (entryPoint) => {
  const hash = crypto.createHash("sha256");
  const dirs = [
    path.join(composerRoot, "shared", "isaacverse"),
    path.join(composerRoot, path.dirname(entryPoint)),
  ];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir, { recursive: true })) {
      const fp = path.join(dir, file);
      try {
        if (fs.statSync(fp).isFile() && /\.(ts|tsx)$/.test(fp)) {
          hash.update(fp);
          hash.update(fs.readFileSync(fp));
        }
      } catch {}
    }
  }
  return hash.digest("hex");
};

export function syncRuntimePublic(slug) {
  // Pull the LIVE editor doc into the repo public dir first — clip edits
  // (editor_op / generator) write projects/<slug>/editor/current.json and the
  // render must see them without a manual sync step.
  const liveEditor = path.join(workspaceRoot, "projects", slug, "editor", "current.json");
  const publicEditor = path.join(composerRoot, "public", slug, "editor", "current.json");
  if (fs.existsSync(liveEditor)) {
    fs.mkdirSync(path.dirname(publicEditor), { recursive: true });
    fs.copyFileSync(liveEditor, publicEditor);
  }
  // Copy the runtime-fetched JSONs into the bundle's public dir so renders
  // pick up style/edit-doc changes WITHOUT a bundle rebuild.
  const srcs = [
    ["public/isaacverse-style.json", "isaacverse-style.json"],
    [`public/${slug}/05-edit-doc.json`, `${slug}/05-edit-doc.json`],
    [`public/${slug}/editor/current.json`, `${slug}/editor/current.json`],
  ];
  for (const [src, rel] of srcs) {
    const from = path.join(composerRoot, src);
    const to = path.join(composerRoot, bundleCacheDir(), "public", rel);
    if (fs.existsSync(from)) {
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.copyFileSync(from, to);
    }
  }
}

export function buildBundle(entry, { slug = "isaacverse-final" } = {}) {
  const entryPoint = entry || `projects/isaacverse-final/index.tsx`;
  const outDir = bundleCacheDir();
  const hashFile = path.join(composerRoot, outDir, ".source-hash");
  const currentHash = sourceHash(entryPoint);
  const bundleExists = fs.existsSync(path.join(composerRoot, outDir, "bundle.js"));
  if (bundleExists && fs.existsSync(hashFile) && fs.readFileSync(hashFile, "utf8") === currentHash) {
    // source unchanged — reuse bundle, just sync runtime-fetched JSONs
    syncRuntimePublic(slug);
    return outDir;
  }
  // source changed (or first run): wipe bundle + ALL caches and rebuild, so
  // stale cached modules can never leak into the render.
  try { fs.rmSync(path.join(composerRoot, outDir), { recursive: true, force: true }); } catch {}
  try { fs.rmSync(path.join(composerRoot, "node_modules", ".cache", "webpack"), { recursive: true, force: true }); } catch {}
  try {
    const tmp = os.tmpdir();
    for (const name of fs.readdirSync(tmp)) {
      if (name.startsWith("remotion-webpack-bundle-")) fs.rmSync(path.join(tmp, name), { recursive: true, force: true });
    }
  } catch {}
  const r = runRemotion(["bundle", entryPoint, outDir]);
  fs.mkdirSync(path.join(composerRoot, outDir), { recursive: true });
  fs.writeFileSync(hashFile, currentHash);
  syncRuntimePublic(slug);
  return outDir;
}

export function buildWindowRender({ slug, composition, entry, editDocPath, startSec, endSec, quality = "draft", output, paddingSec = 0.45, scale, dryRun = false }) {
  const info = projectInfo(slug, editDocPath);
  const window = computeWindow({ startSec, endSec, fps: info.fps, durationSec: info.durationSec, paddingSec });
  const qualityPreset = preset(quality);
  const outputPath = output || path.join(workspaceRoot, "projects", slug, "renders", "windows", `${slug}-${quality}-${window.startSec.toFixed(2)}-${window.endSec.toFixed(2)}.mp4`);
  // Step 1: bundle (rebuild only if TS/TSX source changed; always sync runtime JSONs).
  // Step 2: render from the bundle dir.
  const bundleDir = dryRun ? "<bundle>" : buildBundle(entry, { slug });
  const args = ["render", bundleDir, composition || `${slug}-30s`, outputPath, `--frames=${window.startFrame}-${window.endFrame}`, `--scale=${typeof scale === "number" && scale > 0 ? scale : qualityPreset.scale}`, `--concurrency=${qualityPreset.concurrency}`, `--x264-preset=${qualityPreset.x264Preset}`, `--crf=${qualityPreset.crf}`, "--gl=angle"];
  return { ...window, outputPath, bundleDir, command: runRemotion(args, { dryRun }), args };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h) {
    console.log("Usage: node scripts/render-window.mjs --project isaacverse-final --start 4 --end 8 [--quality draft] [--path treatment|editor] [--dry-run]");
    process.exit(0);
  }
  if (args.start === undefined || args.end === undefined) throw new Error("--start and --end are required");
  // --path editor renders the clip-first flow (composition <slug>-30s-editor);
  // default treatment keeps the v009-master flow (BeatTreatment + style store).
  const pathMode = args.path === "editor" ? "editor" : "treatment";
  const result = buildWindowRender({
    slug: args.project || "isaacverse-final",
    composition: args.composition || (pathMode === "editor" ? `${args.project || "isaacverse-final"}-30s-editor` : undefined),
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

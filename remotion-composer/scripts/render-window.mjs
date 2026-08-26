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

export function syncRuntimePublic(slug, editorDocPath) {
  // LIVE editor doc → public: projects/<slug>/editor/current.json is the
  // single source of truth (editor_op + generator write there); the render
  // reads the public copy. Without this pull, clip edits never reach renders.
  // editorDocPath: optional override for parity measurement (cold projection)
  // — syncs the given doc instead of the live one, so parity renders never
  // pick up user edits that exist only in current.json.
  const liveEditor = editorDocPath ?? path.join(composerRoot, "..", "projects", slug, "editor", "current.json");
  const publicEditor = path.join(composerRoot, "public", slug, "editor", "current.json");
  if (fs.existsSync(liveEditor)) {
    fs.mkdirSync(path.dirname(publicEditor), { recursive: true });
    fs.copyFileSync(liveEditor, publicEditor);
  }
  // Character assets live in public/<slug>/character/ (bake_poses.py writes
  // there directly). Sync head + whole poses dir into the bundle so renders
  // pick up re-baked art WITHOUT a bundle rebuild.
  const charFrom = path.join(composerRoot, "public", slug, "character");
  const charTo = path.join(composerRoot, bundleCacheDir(), "public", slug, "character");
  if (fs.existsSync(charFrom)) {
    fs.mkdirSync(charTo, { recursive: true });
    for (const f of fs.readdirSync(path.join(charFrom))) {
      const s = path.join(charFrom, f);
      if (!f.startsWith(".") && fs.statSync(s).isFile()) fs.copyFileSync(s, path.join(charTo, f));
    }
    const posesFrom = path.join(charFrom, "poses");
    const posesTo = path.join(charTo, "poses");
    if (fs.existsSync(posesFrom)) {
      fs.mkdirSync(posesTo, { recursive: true });
      for (const f of fs.readdirSync(posesFrom)) {
        if (!f.startsWith(".")) fs.copyFileSync(path.join(posesFrom, f), path.join(posesTo, f));
      }
    }
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

export function buildBundle(entry, { slug = "isaacverse-final", editorDocPath } = {}) {
  const entryPoint = entry || `projects/isaacverse-final/index.tsx`;
  const outDir = bundleCacheDir();
  const hashFile = path.join(composerRoot, outDir, ".source-hash");
  const currentHash = sourceHash(entryPoint);
  const bundleExists = fs.existsSync(path.join(composerRoot, outDir, "bundle.js"));
  if (bundleExists && fs.existsSync(hashFile) && fs.readFileSync(hashFile, "utf8") === currentHash) {
    // source unchanged - reuse bundle, just sync runtime-fetched JSONs
    syncRuntimePublic(slug, editorDocPath);
    return outDir;
  }
  // source changed (or first run): wipe bundle + ALL caches and rebuild
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
  syncRuntimePublic(slug, editorDocPath);
  return outDir;
}

/** Render-freshness sidecar (PIPELINE-HARDENING-SPEC §3.3): records EXACTLY
 *  what doc versions the render consumed, read from the bundle's public dir
 *  (the bytes Remotion actually fetched). The KEEP gate compares
 *  renderedFromRevision + editorDocHash against the live editor doc and
 *  REFUSES approvals of stale renders — humans must never approve fiction. */
export function buildRenderReport({ slug, bundleDir, outputPath, composition, window, quality }) {
  const readJson = (rel) => {
    try {
      return JSON.parse(fs.readFileSync(path.join(composerRoot, bundleDir, "public", rel), "utf8"));
    } catch {
      return null;
    }
  };
  const hashFile = (rel) => {
    try {
      return crypto.createHash("sha256").update(fs.readFileSync(path.join(composerRoot, bundleDir, "public", rel))).digest("hex").slice(0, 16);
    } catch {
      return null;
    }
  };
  const editorDoc = readJson(path.join(slug, "editor", "current.json"));
  return {
    outputPath,
    project: slug,
    composition: composition || `${slug}-30s`,
    renderedFromRevision: editorDoc?.revision?.revision ?? null,
    editorDocHash: hashFile(path.join(slug, "editor", "current.json")),
    editDocVersion: readJson(path.join(slug, "05-edit-doc.json"))?.version ?? null,
    styleVersion: readJson("isaacverse-style.json")?.version ?? null,
    window,
    quality,
    renderedAt: new Date().toISOString(),
  };
}

export function buildWindowRender({ slug, composition, entry, editDocPath, editorDocPath, startSec, endSec, quality = "draft", output, paddingSec = 0.45, scale, dryRun = false }) {
  const info = projectInfo(slug, editDocPath);
  const window = computeWindow({ startSec, endSec, fps: info.fps, durationSec: info.durationSec, paddingSec });
  const qualityPreset = preset(quality);
  const outputPath = output || path.join(workspaceRoot, "projects", slug, "renders", "windows", `${slug}-${quality}-${window.startSec.toFixed(2)}-${window.endSec.toFixed(2)}.mp4`);
  // Step 1: bundle (rebuild only if TS/TSX source changed; always sync runtime JSONs).
  // Step 2: render from the bundle dir.
  const bundleDir = dryRun ? "<bundle>" : buildBundle(entry, { slug, editorDocPath });
  const args = ["render", bundleDir, composition || `${slug}-30s`, outputPath, `--frames=${window.startFrame}-${window.endFrame}`, `--scale=${typeof scale === "number" && scale > 0 ? scale : qualityPreset.scale}`, `--concurrency=${qualityPreset.concurrency}`, `--x264-preset=${qualityPreset.x264Preset}`, `--crf=${qualityPreset.crf}`, "--gl=angle"];
  const command = runRemotion(args, { dryRun });
  // freshness sidecar — written next to the output whenever the render succeeded
  let renderReport = null;
  if (!dryRun && command.status === 0) {
    renderReport = buildRenderReport({ slug, bundleDir, outputPath, composition, window, quality });
    try {
      fs.writeFileSync(`${outputPath}.render-report.json`, JSON.stringify(renderReport, null, 2), "utf-8");
    } catch {
      /* sidecar is best-effort — the render itself already succeeded */
    }
  }
  return { ...window, outputPath, bundleDir, command, args, renderReport };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h) {
    console.log("Usage: node scripts/render-window.mjs --project isaacverse-final --start 4 --end 8 [--quality draft] [--path treatment|editor] [--editor-doc <path>] [--dry-run]");
    process.exit(0);
  }
  if (args.start === undefined || args.end === undefined) throw new Error("--start and --end are required");
  // --path selects the render flow. DEFAULT: editor (E2 gate PASSED 2026-08-25
  // — both measurement windows < 2.0 mean abs diff, cold projection; see
  // projects/<slug>/qa/parity/*.json + GENERATOR-SPEC). The treatment flow
  // stays available as the GENERATOR PREVIEW (--path treatment) for cheap
  // knob A/B without an EditorDoc dependency.
  const pathMode = args.path === "treatment" ? "treatment" : "editor";
  const result = buildWindowRender({
    slug: args.project || "isaacverse-final",
    composition: args.composition || (pathMode === "editor" ? `${args.project || "isaacverse-final"}-30s-editor` : undefined),
    entry: args.entry,
    editDocPath: args.editDoc,
    editorDocPath: args.editorDoc ? path.resolve(args.editorDoc) : undefined,
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

import fs from "node:fs";
import path from "node:path";
import { preset } from "./render-presets.mjs";
import { computeFrameRange, editDurationSec, parseArgs, projectInfo, runRemotion } from "./render-window.mjs";

const composerRoot = path.resolve(import.meta.dirname, "..");
const workspaceRoot = path.resolve(composerRoot, "..");

const args = parseArgs(process.argv.slice(2));
const slug = args.project || "isaacverse-final";
const quality = args.quality || "draft";
const info = projectInfo(slug, args.editDoc || path.join(workspaceRoot, "projects", slug, "05-edit-doc.json"));
const frames = computeFrameRange({ startSec: 0, endSec: editDurationSec(info.editDoc), fps: info.fps, durationSec: info.durationSec });
const qualityPreset = preset(quality);
const output = args.output || path.join(workspaceRoot, "projects", slug, "renders", `${quality === "master" ? "master_1080p" : "draft_360p"}.mp4`);
fs.mkdirSync(path.dirname(output), { recursive: true });
const renderArgs = ["render", args.entry || `projects/${slug}/index.tsx`, args.composition || `${slug}-30s`, output, `--frames=${frames.startFrame}-${frames.endFrame}`, `--scale=${qualityPreset.scale}`, `--concurrency=${qualityPreset.concurrency}`, `--x264-preset=${qualityPreset.x264Preset}`, `--crf=${qualityPreset.crf}`, "--gl=angle"];
const result = runRemotion(renderArgs, { dryRun: Boolean(args.dryRun) });
console.log(JSON.stringify({ slug, quality, output, startFrame: frames.startFrame, endFrame: frames.endFrame, result }, null, 2));

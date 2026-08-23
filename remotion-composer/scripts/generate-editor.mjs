#!/usr/bin/env node
/**
 * GENERATOR — EditDoc (+ style store) -> EditorDoc (spec: docs/GENERATOR-SPEC.md §2)
 *
 * Modes:
 *   cold    (no existing editor doc / --mode cold): pure projection + provenance
 *   sync    (default when editor/current.json exists): three-way merge —
 *           regenerate unmodified clips, KEEP userEdited clips (stale flags),
 *           never resurrect userDeletedClipIds, never touch user tracks.
 *   scoped  (--beat <beatId>): re-project ONE beat's clips only.
 *
 * Usage:
 *   node scripts/generate-editor.mjs --project isaacverse-final [--mode cold|sync]
 *        [--beat <beatId>] [--out <path>] [--dry-run]
 *
 * Provenance: every generated element clip carries metadata.styleSource
 * (prop -> knob path) + metadata.styleResolvedAt {storeVersion}.
 */
import { readFileSync, writeFileSync, existsSync, copyFileSync, mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";
import os from "node:os";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const args = Object.fromEntries(process.argv.slice(2).map((arg, index, all) => {
  if (!arg.startsWith("--")) return [];
  const key = arg.slice(2);
  const next = all[index + 1];
  return next && !next.startsWith("--") ? [key, next] : [key, true];
}));

const projectSlug = args.project;
if (!projectSlug) {
  console.error("usage: node scripts/generate-editor.mjs --project <slug> [--mode cold|sync] [--beat <id>] [--out <path>] [--dry-run]");
  process.exit(1);
}

const projectDir = path.join(ROOT, "projects", projectSlug);
const editDocPath = path.join(projectDir, "05-edit-doc.json");
const stylePath = path.join(ROOT, "libraries", "04-visual", "isaacverse-style.json");
const editorPath = path.join(projectDir, "editor", "current.json");
const inPath = args.in ? path.resolve(args.in) : editorPath;
const outPath = args.out ? path.resolve(args.out) : inPath;

for (const [label, file] of [["edit doc", editDocPath], ["style store", stylePath]]) {
  if (!existsSync(file)) {
    console.error(`ERROR: ${label} not found: ${file}`);
    process.exit(1);
  }
}

const editDoc = JSON.parse(readFileSync(editDocPath, "utf-8"));
const styleStore = JSON.parse(readFileSync(stylePath, "utf-8"));
const styleResolvedAt = { storeVersion: styleStore.version ?? 0, seed: "isaac-forensic-2026-08" };
const hasExisting = existsSync(inPath);
const existing = existsSync(inPath) ? JSON.parse(readFileSync(inPath, "utf-8")) : null;
const mode = args.beat ? "scoped" : (args.mode === "cold" ? "cold" : (existsSync(inPath) ? "sync" : "cold"));

// ---- load the shared projection via esbuild (TS -> ESM bundle) ----
async function loadProjection() {
  const { build } = await import("esbuild");
  const outfile = path.join(os.tmpdir(), `isaac-gen-proj-${Date.now()}.mjs`);
  await build({
    entryPoints: [path.join(ROOT, "remotion-composer", "shared", "isaacverse", "editorProjection.ts")],
    bundle: true,
    format: "esm",
    platform: "node",
    outfile,
    logLevel: "silent",
  });
  const mod = await import(pathToFileURL(outfile).href);
  return mod.projectEditDocToEditor;
}

const projectEditDocToEditor = await loadProjection();

const fresh = projectEditDocToEditor(editDoc, {
  projectId: projectSlug,
  style: styleStore,
  styleResolvedAt,
});

// ---- helpers ----
const USER_CLIP_PREFIXES = ["clip:text:", "clip:asset:", "clip:transition:", "paste-", "clip:beat:"]; // last one: never generated for elements; dup parts carry suffixes
const isUserCreatedId = (id) => USER_CLIP_PREFIXES.some((prefix) => id.startsWith(prefix)) || id.includes(":dup:") || id.includes(":part-");
const clipKey = (clip) => clip.id;
const trackOf = (doc, trackId) => doc.tracks.find((track) => track.id === trackId);
const allClips = (doc) => doc.tracks.flatMap((track) => track.clips.map((clip) => ({ clip, track })));

const freshBeatIds = new Set(editDoc.beats.map((beat) => beat.id));

function countUpdates(doc) {
  const clips = allClips(doc);
  return {
    totalClips: clips.length,
    userEdited: clips.filter(({ clip }) => clip.metadata?.userEdited === true).length,
    stale: clips.filter(({ clip }) => clip.metadata?.stale === true).length,
    withStyleSource: clips.filter(({ clip }) => clip.metadata?.styleSource && Object.keys(clip.metadata.styleSource).length > 0).length,
  };
}

// ---- SYNC: three-way merge (spec §2.3) ----
function syncEditor(existingDoc, freshDoc, onlyBeatId = null) {
  const deleted = new Set(existingDoc.userDeletedClipIds ?? []);
  const existingByTrack = new Map(existingDoc.tracks.map((track) => [track.id, track]));
  const existingClips = new Map(allClips(existingDoc).map(({ clip, track }) => [clipKey(clip), { clip, trackId: track.id }]));

  const stats = { refreshed: 0, keptUser: 0, keptStale: 0, added: 0, dropped: 0, skippedDeleted: 0 };

  // start from the existing TRACK structure (user tracks preserved verbatim)
  // with EMPTY clip lists — clips are placed by the walk below. This guarantees
  // deleted/unproduced clips can never survive by virtue of the initial copy.
  const tracks = existingDoc.tracks.map((track) => ({
    ...track,
    clips: track.metadata?.userCreated === true ? track.clips.map((clip) => ({ ...clip })) : [],
  }));

  const replaceOrKeep = (freshClip) => {
    const id = clipKey(freshClip);
    if (deleted.has(id)) { stats.skippedDeleted += 1; return null; }
    const existingEntry = existingClips.get(id);
    if (existingEntry) {
      const existingClip = existingEntry.clip;
      if (existingClip.metadata?.userEdited === true) {
        // KEEP user version; flag staleness when style or editdoc moved on
        const staleReason = (existingClip.metadata?.styleResolvedAt?.storeVersion ?? 0) !== styleResolvedAt.storeVersion ? "style" : "editdoc";
        stats.keptUser += 1;
        return { ...existingClip, metadata: { ...existingClip.metadata, stale: true, staleReason } };
      }
      // unmodified -> refresh in place (keep its track placement)
      stats.refreshed += 1;
      return { ...freshClip, trackId: existingEntry.trackId };
    }
    stats.added += 1;
    return { ...freshClip };
  };

  // walk FRESH generated clips (video-main beats, visual elements, audio, transitions)
  const freshPlaced = new Map(); // clipId -> trackId
  for (const freshTrack of freshDoc.tracks) {
    for (const freshClip of freshTrack.clips) {
      if (onlyBeatId && freshClip.source?.beatId !== onlyBeatId) continue;
      const resolved = replaceOrKeep(freshClip);
      if (!resolved) continue;
      const targetTrackId = existingClips.get(clipKey(freshClip))?.trackId
        ?? (trackOf(existingDoc, freshTrack.id) ? freshTrack.id : defaultTrackFor(freshClip, existingDoc));
      freshPlaced.set(clipKey(freshClip), targetTrackId);
      const target = tracks.find((track) => track.id === targetTrackId) ?? ensureTrack(tracks, targetTrackId, freshTrack, existingDoc);
      // remove any existing copy of this id on other tracks first
      for (const track of tracks) track.clips = track.clips.filter((clip) => clip.id !== resolved.id);
      target.clips.push(resolved);
    }
  }

  // existing clips NOT placed by the fresh walk:
  for (const { clip, trackId } of existingClips.values()) {
    if (freshPlaced.has(clipKey(clip))) continue;
    if (onlyBeatId && clip.source?.beatId !== onlyBeatId) {
      // scoped: other beats are untouched — keep verbatim
      const target = tracks.find((track) => track.id === trackId);
      if (target) target.clips.push(clip);
      continue;
    }
    const isUser = clip.metadata?.userEdited === true || isUserCreatedId(clip.id);
    const beatGone = clip.source?.beatId && !freshBeatIds.has(clip.source.beatId);
    if (isUser) {
      // user clip: keep (mark stale if its beat disappeared)
      const target = tracks.find((track) => track.id === trackId);
      if (target) target.clips.push(clip);
      if (beatGone) clip.metadata = { ...clip.metadata, stale: true, staleReason: "editdoc" };
      stats.keptStale += 1;
      continue;
    }
    // generated clip no longer produced: beat removed -> drop; element dropped -> drop
    stats.dropped += 1;
  }

  const durationSec = Math.max(0, ...tracks.flatMap((track) => track.clips.map((clip) => clip.range.endSec)), 0.1);
  return [{
    ...existingDoc,
    tracks: tracks.map((track, order) => ({ ...track, order })),
    markers: freshDoc.markers,
    durationSec,
    revision: {
      ...existingDoc.revision,
      baseEditVersion: editDoc.version ?? existingDoc.revision.baseEditVersion,
      revision: existingDoc.revision.revision + 1,
      updatedAt: new Date().toISOString(),
    },
  }, stats];
}

function defaultTrackFor(clip, existingDoc) {
  if (clip.kind === "beat") return "video-main";
  if (clip.kind === "voice") return "voice";
  if (clip.kind === "music") return "music";
  if (clip.kind === "audio-event") return "sfx";
  const visual = existingDoc.tracks.find((track) => track.kind === "overlay" || track.kind === "text");
  return visual?.id ?? "visual-1";
}

function ensureTrack(tracks, trackId, freshTrack, existingDoc) {
  let target = tracks.find((track) => track.id === trackId);
  if (!target) {
    target = { ...freshTrack, id: trackId, order: tracks.length, clips: [] };
    tracks.push(target);
  }
  return target;
}

// ---- run ----
let result;
let stats;
if (mode === "cold") {
  result = fresh;
  stats = { mode, ...countUpdates(fresh) };
} else if (mode === "sync") {
  const [mergedDoc, mergeStats] = syncEditor(existing, fresh);
  result = mergedDoc;
  stats = { mode, ...mergeStats, ...countUpdates(result) };
} else { // scoped
  if (!hasExisting) {
    console.error("ERROR: scoped mode needs an existing editor doc (--in defaults to editor/current.json)");
    process.exit(1);
  }
  const [mergedDoc, mergeStats] = syncEditor(existing, fresh, args.beat);
  result = mergedDoc;
  stats = { mode: `scoped:${args.beat}`, ...mergeStats, ...countUpdates(result) };
}

const summary = {
  mode: stats.mode ?? mode,
  project: projectSlug,
  styleStoreVersion: styleResolvedAt.storeVersion,
  editorPath: path.relative(ROOT, outPath),
  ...stats,
};

if (args["dry-run"]) {
  console.log(JSON.stringify({ ...summary, dryRun: true }, null, 2));
} else {
  if (existsSync(outPath) && outPath === inPath && !args.out) {
    // safety backup before any real overwrite of the live editor doc
    const backup = `${outPath}.bak-${new Date().toISOString().replace(/[:.]/g, "-")}`;
    copyFileSync(outPath, backup);
    summary.backup = path.relative(ROOT, backup);
  }
  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(result, null, 2), "utf-8");
  console.log(JSON.stringify(summary, null, 2));
}

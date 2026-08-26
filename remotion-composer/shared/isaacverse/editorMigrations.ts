import type { EditorDoc } from "./editor";

/**
 * EditorDoc schema versioning + migration registry
 * (PIPELINE-HARDENING-SPEC §3.1, pattern: Redux Persist createMigrate).
 *
 * Every persisted `editor/current.json` carries a `schemaVersion`. When a
 * reader at ANY boundary (generate-editor sync, editor-ops bridge, render
 * ProjectLoader, Composer UI) sees an older version it walks the registry
 * SEQUENTIALLY from the persisted version to CURRENT. One canonical function
 * for all consumers — this closes the "migrations ran at UI load-time while
 * sync read raw JSON" divergence (GENERATOR-SPEC risk #3) and gives semantic
 * drift (e.g. the edge px→viewBox unit change) an explicit, testable home.
 *
 * Rules:
 * - migrations must be IDEMPOTENT: migrate(migrate(x)) === migrate(x)
 * - a migration must never DROP user data — only reshape it
 * - bump CURRENT and add a registry entry when clip METADATA SEMANTICS change
 */
export const CURRENT_EDITOR_SCHEMA = 3;

/** v1: fold the two historical load-time fixups into the canonical path. */
const migrateV1 = (doc: EditorDoc): EditorDoc => normalizeTrackNames(migrateElementGeometry(doc, doc.width || 1920, doc.height || 1080));

/**
 * v2: edge clips switched from frame-px coordinates to viewBox units
 * (0-100, matching the treatment's non-uniform-stretch svg — E2 parity
 * night 2026-08-25). Old px edges (x from node.x% × 1920 → always > 100 for
 * real layouts, y likewise) render ~8.8× off-screen under the new renderer.
 * Discriminator: any x/y > 100 ⇒ px-era clip ⇒ convert per-axis
 * (x / 19.2, y / 10.8). viewBox-era values are 0-100 and stay untouched.
 */
const migrateV2 = (doc: EditorDoc): EditorDoc => {
  let changed = false;
  const tracks = doc.tracks.map((track) => ({
    ...track,
    clips: track.clips.map((clip) => {
      const md = clip.metadata as Record<string, unknown> | undefined;
      if (clip.kind !== "element" || md?.elementType !== "edge") return clip;
      const x1 = md.x1, y1 = md.y1, x2 = md.x2, y2 = md.y2;
      if (![x1, y1, x2, y2].every((v) => typeof v === "number")) return clip;
      if ((x1 as number) <= 100 && (y1 as number) <= 100 && (x2 as number) <= 100 && (y2 as number) <= 100) return clip;
      changed = true;
      return {
        ...clip,
        metadata: {
          ...md,
          x1: (x1 as number) / 19.2,
          y1: (y1 as number) / 10.8,
          x2: (x2 as number) / 19.2,
          y2: (y2 as number) / 10.8,
        },
      };
    }),
  }));
  return changed ? { ...doc, tracks } : doc;
};

/** v3: convert legacy `userEdited: true` to `overridden: { all: true }` — the
 *  per-field override ledger (Figma overriddenFields pattern, spec §3.2-1b).
 *  `all: true` preserves the old "keep entire clip" semantics for clips
 *  that were marked before per-field tracking existed. New ops set specific
 *  fields, enabling the sync merge to refresh non-overridden fields while
 *  keeping the hand-edited ones. */
const migrateV3 = (doc: EditorDoc): EditorDoc => {
  let changed = false;
  const tracks = doc.tracks.map((track) => ({
    ...track,
    clips: track.clips.map((clip) => {
      const md = clip.metadata;
      if (md.userEdited === true && !md.overridden) {
        changed = true;
        return { ...clip, metadata: { ...md, overridden: { all: true } } };
      }
      return clip;
    }),
  }));
  return changed ? { ...doc, tracks } : doc;
};

const MIGRATIONS: Record<number, (doc: EditorDoc) => EditorDoc> = {
  1: migrateV1,
  2: migrateV2,
  3: migrateV3,
};

/** Apply migrations sequentially from the doc's schemaVersion to CURRENT,
 *  then stamp. Docs without a schemaVersion are treated as v1 (the format
 *  that existed before this field was introduced). */
export function migrateEditorDoc(doc: EditorDoc): EditorDoc {
  let current = doc;
  let version = typeof doc.schemaVersion === "number" ? doc.schemaVersion : 1;
  while (version < CURRENT_EDITOR_SCHEMA) {
    const step = MIGRATIONS[version];
    if (!step) break; // unknown intermediate version — stamp and continue
    current = step(current);
    version += 1;
  }
  return { ...current, schemaVersion: CURRENT_EDITOR_SCHEMA };
}

// ---- v1 helpers (moved verbatim from composer-app editorOperations.ts so
// shared consumers and the UI share ONE implementation; re-exported there) ----

export const normalizeTrackNames = (editor: EditorDoc): EditorDoc => {
  let overlayCount = 0;
  let audioCount = 0;
  const renamed = editor.tracks.map((track) => {
    if (track.metadata?.userNamed === true) return track;
    if (track.kind === "video") return track.name === "Main track" ? track : { ...track, name: "Main track" };
    if (track.kind === "overlay" || track.kind === "text") {
      overlayCount += 1;
      return { ...track, name: `Overlay ${overlayCount}` };
    }
    audioCount += 1;
    return { ...track, name: `Audio ${audioCount}` };
  });
  const changed = renamed.some((track, index) => track.name !== editor.tracks[index].name);
  return changed ? { ...editor, tracks: renamed } : editor;
};

export const migrateElementGeometry = (editor: EditorDoc, docWidth: number, docHeight: number): EditorDoc => {
  let changed = false;
  const tracks = editor.tracks.map((track) => ({
    ...track,
    clips: track.clips.map((clip) => {
      if (clip.kind !== "element") return clip;
      const md = clip.metadata;
      if (typeof md.x === "number") return clip;
      const geometry = md.geometry as { x?: number; y?: number; width?: number; height?: number; rotation?: number } | undefined;
      if (!geometry || typeof geometry.x !== "number" || typeof geometry.width !== "number") return clip;
      changed = true;
      return {
        ...clip,
        metadata: {
          ...md,
          x: geometry.x / docWidth,
          y: (typeof geometry.y === "number" ? geometry.y : 0) / docHeight,
          w: Math.max(0.01, geometry.width / docWidth),
          h: Math.max(0.01, (typeof geometry.height === "number" ? geometry.height : geometry.width) / docHeight),
          rotation: geometry.rotation || 0,
          opacity: typeof md.opacity === "number" ? md.opacity : 1,
          z: typeof md.z === "number" ? md.z : 5,
        },
      };
    }),
  }));
  return changed ? { ...editor, tracks, revision: { ...editor.revision, revision: editor.revision.revision + 1 } } : editor;
};

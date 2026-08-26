import { describe, expect, it } from "vitest";
import { CURRENT_EDITOR_SCHEMA, migrateEditorDoc, migrateElementGeometry, normalizeTrackNames } from "../../../shared/isaacverse/editorMigrations";
import { validateEditorDoc } from "../../../shared/isaacverse/validate";
import type { EditorDoc } from "../../../shared/isaacverse/editor";

const baseDoc = (overrides: Partial<EditorDoc> = {}): EditorDoc => ({
  id: "editor:test",
  projectId: "test",
  width: 1920,
  height: 1080,
  fps: 30,
  durationSec: 10,
  tracks: [{
    id: "video-main",
    kind: "video",
    name: "weird old name",
    order: 0,
    locked: false,
    muted: false,
    solo: false,
    hidden: false,
    source: { kind: "project" as const, projectRef: "semantic-beats" },
    accepts: ["image" as const, "video" as const],
    capabilities: { visual: true, audio: false, canvas: true, trim: true, split: true, gain: false, fade: false, mute: false, solo: false },
    clips: [],
  }],
  revision: { baseEditVersion: "v001", revision: 1, updatedAt: "2026-08-26T00:00:00Z" },
  ...overrides,
});

const clip = (id: string, metadata: Record<string, unknown> = {}, kind: "element" | "beat" = "element") => ({
  id,
  kind,
  trackId: "video-main",
  range: { startSec: 0, endSec: 2 },
  label: id,
  source: {},
  linkedClipIds: [],
  locked: false,
  muted: false,
  hidden: false,
  metadata,
});

describe("migrateEditorDoc (PIPELINE-HARDENING-SPEC §3.1)", () => {
  it("stamps the current schema version on a v1 doc (no schemaVersion field)", () => {
    const doc = baseDoc();
    const migrated = migrateEditorDoc(doc);
    expect(migrated.schemaVersion).toBe(CURRENT_EDITOR_SCHEMA);
  });

  it("is idempotent: migrate(migrate(x)) === migrate(x)", () => {
    const doc = baseDoc({
      tracks: [{
        ...baseDoc().tracks[0],
        clips: [clip("legacy-geo", { geometry: { x: 960, y: 540, width: 480, height: 270 } })],
      }],
    });
    const once = migrateEditorDoc(doc);
    const twice = migrateEditorDoc(once);
    expect(twoceSafe(twice)).toEqual(twoceSafe(once));
  });

  it("v1 folds migrateElementGeometry: legacy px geometry metadata → fraction x/y/w/h", () => {
    const doc = baseDoc({
      tracks: [{
        ...baseDoc().tracks[0],
        clips: [clip("legacy-geo", { geometry: { x: 960, y: 540, width: 480, height: 270 } })],
      }],
    });
    const migrated = migrateEditorDoc(doc);
    const md = migrated.tracks[0].clips[0].metadata as Record<string, number>;
    expect(md.x).toBeCloseTo(0.5, 5);
    expect(md.y).toBeCloseTo(0.5, 5);
    expect(md.w).toBeCloseTo(0.25, 5);
    expect(md.h).toBeCloseTo(0.25, 5);
    // the geometry-bump revision advance happened exactly once
    expect(migrated.revision.revision).toBe(doc.revision.revision + 1);
  });

  it("v1 folds normalizeTrackNames: non-user-named tracks get canonical names", () => {
    const doc = baseDoc();
    const migrated = migrateEditorDoc(doc);
    expect(migrated.tracks[0].name).toBe("Main track");
  });

  it("v2 converts px-era edge clips to viewBox units (x>100 discriminator)", () => {
    const doc = baseDoc({
      tracks: [{
        ...baseDoc().tracks[0],
        clips: [clip("edge-px", { elementType: "edge", x1: 460.8, y1: 561.6, x2: 960, y2: 561.6 })],
      }],
    });
    const migrated = migrateEditorDoc(doc);
    const md = migrated.tracks[0].clips[0].metadata as Record<string, number>;
    expect(md.x1).toBeCloseTo(24, 3);
    expect(md.y1).toBeCloseTo(52, 3);
    expect(md.x2).toBeCloseTo(50, 3);
  });

  it("v2 leaves viewBox-era edges untouched (all values 0-100)", () => {
    const doc = baseDoc({
      tracks: [{
        ...baseDoc().tracks[0],
        clips: [clip("edge-vb", { elementType: "edge", x1: 24, y1: 52, x2: 50, y2: 52 })],
      }],
    });
    const migrated = migrateEditorDoc(doc);
    const md = migrated.tracks[0].clips[0].metadata as Record<string, number>;
    expect(md.x1).toBe(24);
    expect(md.y1).toBe(52);
  });

  it("migration output passes validateEditorDoc (structural validity invariant)", () => {
    const doc = baseDoc({
      tracks: [{
        ...baseDoc().tracks[0],
        clips: [
          clip("edge-px", { elementType: "edge", x1: 460.8, y1: 561.6, x2: 960, y2: 561.6 }),
          clip("legacy-geo", { geometry: { x: 100, y: 100, width: 200, height: 100 } }),
        ],
      }],
    });
    const migrated = migrateEditorDoc(doc);
    expect(validateEditorDoc(migrated)).toEqual([]);
  });

  it("already-current docs pass through unchanged apart from the stamp", () => {
    const doc = baseDoc({ schemaVersion: CURRENT_EDITOR_SCHEMA });
    const migrated = migrateEditorDoc(doc);
    expect(migrated).toEqual(doc);
  });
});

describe("validateEditorDoc refuses broken outputs (the fail-loudly gate)", () => {
  it("flags a clip with an inverted range", () => {
    const doc = baseDoc({
      tracks: [{
        ...baseDoc().tracks[0],
        clips: [clip("broken", {})],
      }],
    });
    doc.tracks[0].clips[0].range = { startSec: 5, endSec: 2 };
    const issues = validateEditorDoc(doc);
    expect(issues.some((i) => i.path.includes("range"))).toBe(true);
  });

  it("flags duplicate track ids", () => {
    const t = baseDoc().tracks[0];
    const doc = baseDoc({ tracks: [t, { ...t }] });
    const issues = validateEditorDoc(doc);
    expect(issues.some((i) => i.path.includes("tracks[1].id"))).toBe(true);
  });
});

// strip nothing currently — kept as a helper in case future fields need
// normalization before deep-equal (e.g. volatile timestamps)
function twoceSafe(doc: EditorDoc): EditorDoc {
  return doc;
}

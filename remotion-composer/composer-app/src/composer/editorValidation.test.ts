import { describe, expect, it } from "vitest";
import type { EditorDoc } from "../../../shared/isaacverse/editor";
import { validateEditorDoc } from "../../../shared/isaacverse/validate";

const validEditor = (): EditorDoc => ({
  id: "editor:video-01",
  projectId: "video-01",
  width: 1920,
  height: 1080,
  fps: 30,
  durationSec: 4,
  tracks: [{
    id: "video-main",
    kind: "video",
    name: "Main video",
    order: 0,
    locked: false,
    muted: false,
    solo: false,
    hidden: false,
    source: { kind: "project", projectRef: "semantic-beats" },
    accepts: ["image", "video"],
    capabilities: { visual: true, audio: false, canvas: true, trim: true, split: true, gain: false, fade: false, mute: false, solo: false },
    clips: [{ id: "clip-01", kind: "beat", trackId: "video-main", range: { startSec: 0, endSec: 4 }, label: "Proof", source: { beatId: "beat-01" }, linkedClipIds: [], locked: false, muted: false, hidden: false, metadata: {} }],
  }],
  revision: { baseEditVersion: "v001", revision: 0, updatedAt: "2026-08-12T00:00:00.000Z" },
});

describe("validateEditorDoc", () => {
  it("accepts a source-backed non-empty track", () => {
    expect(validateEditorDoc(validEditor())).toEqual([]);
  });

  it("rejects empty phantom tracks", () => {
    const editor = validEditor();
    editor.tracks.push({ ...editor.tracks[0], id: "graphics-1", clips: [] });

    expect(validateEditorDoc(editor).some((issue) => issue.message.includes("empty phantom"))).toBe(true);
  });

  it("rejects an asset-bound track that references a missing asset", () => {
    const editor = validEditor();
    editor.tracks[0].source = { kind: "asset", assetId: "missing-asset" };

    expect(validateEditorDoc(editor).some((issue) => issue.message.includes("existing editor asset"))).toBe(true);
  });
});

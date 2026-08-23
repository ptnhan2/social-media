import { describe, expect, it } from "vitest";
import type { EditorDoc } from "../../../shared/isaacverse/editor";
import {
  deleteEditorClip, duplicateEditorClip, moveClipInTime, rippleDeleteClip, rippleEditorDoc,
  setEditorClipMetadata, setEditorClipRange, splitEditorClip, trimEditorClip,
} from "./editorOperations";

const makeEditor = (): EditorDoc => ({
  id: "editor:video-ledger",
  projectId: "video-ledger",
  width: 1920,
  height: 1080,
  fps: 30,
  durationSec: 8,
  revision: { baseEditVersion: "v001", revision: 1, updatedAt: "2026-08-23T00:00:00.000Z" },
  tracks: [
    { id: "video-main", kind: "video", name: "Main track", order: 0, locked: false, muted: false, solo: false, hidden: false, clips: [
      { id: "clip-a", kind: "beat", trackId: "video-main", range: { startSec: 0, endSec: 4 }, label: "A", source: { beatId: "beat-a" }, linkedClipIds: [], locked: false, muted: false, hidden: false, metadata: {} },
      { id: "clip-b", kind: "beat", trackId: "video-main", range: { startSec: 4, endSec: 8 }, label: "B", source: { beatId: "beat-b" }, linkedClipIds: [], locked: false, muted: false, hidden: false, metadata: {} },
    ] },
    { id: "overlay-1", kind: "overlay", name: "Visual 1", order: 1, locked: false, muted: false, solo: false, hidden: false, source: { kind: "project", projectRef: "treatment-elements" }, accepts: ["text"], capabilities: { visual: true, audio: false, canvas: true, trim: true, split: true, gain: false, fade: false, mute: false, solo: false }, clips: [
      { id: "clip-el-1", kind: "element", trackId: "overlay-1", range: { startSec: 0, endSec: 4 }, label: "Title", source: { beatId: "beat-a", elementId: "beat-a:title" }, linkedClipIds: [], locked: false, muted: false, hidden: false, metadata: { isTextClip: true, text: "Hello" } },
      { id: "clip-el-2", kind: "element", trackId: "overlay-1", range: { startSec: 4, endSec: 8 }, label: "Accent", source: { beatId: "beat-b", elementId: "beat-b:accent-line" }, linkedClipIds: [], locked: false, muted: false, hidden: false, metadata: {} },
    ] },
  ],
});

const findClip = (doc: EditorDoc, clipId: string) => {
  for (const track of doc.tracks) {
    const clip = track.clips.find((candidate) => candidate.id === clipId);
    if (clip) return clip;
  }
  throw new Error(`clip not found: ${clipId}`);
};

describe("userEdited ledger (generator merge contract, spec §2.3)", () => {
  it("trim marks the clip userEdited", () => {
    const next = trimEditorClip(makeEditor(), "clip-el-1", "end", 3);
    expect(findClip(next, "clip-el-1").metadata.userEdited).toBe(true);
    expect(findClip(next, "clip-el-2").metadata.userEdited).toBeUndefined();
  });

  it("split parts are userEdited (both halves survive regeneration)", () => {
    const next = splitEditorClip(makeEditor(), "clip-el-1", 2);
    expect(findClip(next, "clip-el-1:part-a").metadata.userEdited).toBe(true);
    expect(findClip(next, "clip-el-1:part-b").metadata.userEdited).toBe(true);
  });

  it("setEditorClipMetadata marks userEdited", () => {
    const next = setEditorClipMetadata(makeEditor(), "clip-el-1", { fontSize: 99 });
    expect(findClip(next, "clip-el-1").metadata.fontSize).toBe(99);
    expect(findClip(next, "clip-el-1").metadata.userEdited).toBe(true);
  });

  it("setEditorClipRange marks userEdited", () => {
    const next = setEditorClipRange(makeEditor(), "clip-el-1", { endSec: 2.5 });
    expect(findClip(next, "clip-el-1").metadata.userEdited).toBe(true);
  });

  it("moveClipInTime marks userEdited", () => {
    const next = moveClipInTime(makeEditor(), "clip-el-1", 1.5);
    expect(findClip(next, "clip-el-1").metadata.userEdited).toBe(true);
  });

  it("duplicate creates a userEdited clip", () => {
    const next = duplicateEditorClip(makeEditor(), "clip-el-1", 5);
    const dup = next.tracks.flatMap((track) => track.clips).find((clip) => clip.id.startsWith("clip-el-1:dup:"));
    expect(dup?.metadata.userEdited).toBe(true);
  });

  it("ripple marks shifted clips userEdited only", () => {
    const next = rippleEditorDoc(makeEditor(), 4, 1);
    expect(findClip(next, "clip-b").metadata.userEdited).toBe(true);
    expect(findClip(next, "clip-a").metadata.userEdited).toBeUndefined();
  });

  it("delete records the id in userDeletedClipIds (no resurrection by the generator)", () => {
    const next = deleteEditorClip(makeEditor(), "clip-el-1");
    expect(next.userDeletedClipIds).toEqual(["clip-el-1"]);
    expect(next.tracks.flatMap((track) => track.clips.map((clip) => clip.id))).not.toContain("clip-el-1");
  });

  it("rippleDelete records the ledger id and marks shifted siblings", () => {
    const base = makeEditor();
    const withSibling = { ...base, durationSec: 12, tracks: base.tracks.map((track) => track.id === "overlay-1" ? { ...track, clips: [...track.clips, { ...findClip(base, "clip-el-2"), id: "clip-el-3", range: { startSec: 8, endSec: 12 } }] } : track) };
    const next = rippleDeleteClip(withSibling, "clip-el-2");
    expect(next.userDeletedClipIds).toEqual(["clip-el-2"]);
    expect(findClip(next, "clip-el-3").metadata.userEdited).toBe(true);
  });

  it("deleting the same id twice keeps the ledger deduplicated", () => {
    const once = deleteEditorClip(makeEditor(), "clip-el-1");
    const again = deleteEditorClip(once, "clip-el-2");
    expect(again.userDeletedClipIds).toEqual(["clip-el-1", "clip-el-2"]);
  });
});

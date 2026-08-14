import { describe, expect, it } from "vitest";
import type { EditorClip, EditorDoc } from "../../../shared/isaacverse/editor";
import {
  addClipKeyframe,
  addOverlayClip,
  addTextClip,
  addTrackLayer,
  duplicateEditorClip,
  moveClipInTime,
  normalizeTrackNames,
  removeClipKeyframe,
  renameEditorTrack,
  setEditorClipSpeed,
} from "./editorOperations";
import { keyframeValueAt } from "../../../shared/isaacverse/clipStyle";

const baseEditor = (tracks: EditorDoc["tracks"] = [], assets: EditorDoc["assets"] = []): EditorDoc => ({
  id: "editor:test",
  projectId: "test",
  width: 1920,
  height: 1080,
  fps: 30,
  durationSec: 30,
  revision: { baseEditVersion: "v001", revision: 0, updatedAt: "2026-08-13T00:00:00.000Z" },
  tracks,
  assets,
});

const clip = (id: string, trackId: string, startSec = 0, endSec = 3, metadata: Record<string, unknown> = {}): EditorClip => ({
  id, kind: "element", trackId, range: { startSec, endSec }, label: id, source: {}, linkedClipIds: [], locked: false, muted: false, hidden: false, metadata,
});

const overlayTrack = (id: string, name: string, clips: EditorClip[]): EditorDoc["tracks"][number] => ({
  id, kind: "overlay", name, order: 0, locked: false, muted: false, solo: false, hidden: false,
  source: { kind: "project" }, accepts: ["image", "video"],
  capabilities: { visual: true, audio: false, canvas: true, trim: true, split: true, gain: false, fade: false, mute: false, solo: false },
  clips,
});

describe("track naming", () => {
  it("normalizes semantic names to generic Main/Overlay/Audio", () => {
    const editor = baseEditor([
      { ...overlayTrack("video-main", "Main video", [clip("c1", "video-main")]), kind: "video" as const },
      { ...overlayTrack("g1", "Graphics 1", [clip("c2", "g1")]) },
      { ...overlayTrack("t1", "Text 2", [clip("c3", "t1")]), kind: "text" as const },
      { ...overlayTrack("v", "Voiceover", [clip("c4", "v")]), kind: "voice" as const },
      { ...overlayTrack("m", "Music", [clip("c5", "m")]), kind: "music" as const },
      { ...overlayTrack("s", "Sound effects", [clip("c6", "s")]), kind: "sfx" as const },
    ]);
    const normalized = normalizeTrackNames(editor);
    expect(normalized.tracks.map((t) => t.name)).toEqual(["Main track", "Overlay 1", "Overlay 2", "Audio 1", "Audio 2", "Audio 3"]);
  });

  it("keeps user-named tracks on normalize", () => {
    const editor = baseEditor([
      { ...overlayTrack("g1", "My custom name", [clip("c2", "g1")]), metadata: { userNamed: true } },
    ]);
    expect(normalizeTrackNames(editor).tracks[0].name).toBe("My custom name");
  });

  it("renames a track and marks it user-named", () => {
    const editor = baseEditor([overlayTrack("g1", "Overlay 1", [clip("c2", "g1")])]);
    const renamed = renameEditorTrack(editor, "g1", "B-roll");
    expect(renamed.tracks[0].name).toBe("B-roll");
    expect(renamed.tracks[0].metadata?.userNamed).toBe(true);
    expect(normalizeTrackNames(renamed).tracks[0].name).toBe("B-roll");
  });
});

describe("track layers", () => {
  it("adds an empty overlay layer with generic name", () => {
    const editor = baseEditor([overlayTrack("g1", "Overlay 1", [clip("c2", "g1")])]);
    const next = addTrackLayer(editor, "overlay");
    expect(next.tracks.length).toBe(2);
    expect(next.tracks[1].name).toBe("Overlay 2");
    expect(next.tracks[1].clips.length).toBe(0);
    expect(next.tracks[1].metadata?.userCreated).toBe(true);
  });

  it("adds an empty audio layer", () => {
    const editor = baseEditor([overlayTrack("g1", "Overlay 1", [clip("c2", "g1")])]);
    const next = addTrackLayer(editor, "audio");
    expect(next.tracks[1].kind).toBe("music");
    expect(next.tracks[1].name).toBe("Audio 1");
    expect(next.tracks[1].capabilities.audio).toBe(true);
  });
});

describe("clip operations", () => {
  it("moves a clip in time without changing duration", () => {
    const editor = baseEditor([overlayTrack("g1", "Overlay 1", [clip("c2", "g1", 1, 4)])]);
    const next = moveClipInTime(editor, "c2", 8);
    expect(next.tracks[0].clips[0].range).toEqual({ startSec: 8, endSec: 11 });
  });

  it("duplicates a clip at the playhead", () => {
    const editor = baseEditor([overlayTrack("g1", "Overlay 1", [clip("c2", "g1", 1, 4, { text: "hi" })])]);
    const next = duplicateEditorClip(editor, "c2", 10);
    expect(next.tracks[0].clips.length).toBe(2);
    expect(next.tracks[0].clips[1].range).toEqual({ startSec: 10, endSec: 13 });
    expect(next.tracks[0].clips[1].metadata.text).toBe("hi");
    expect(next.tracks[0].clips[1].id).not.toBe("c2");
  });

  it("sets speed and re-times the clip", () => {
    const editor = baseEditor([overlayTrack("g1", "Overlay 1", [clip("c2", "g1", 0, 4)])]);
    const next = setEditorClipSpeed(editor, "c2", 2);
    expect(next.tracks[0].clips[0].range).toEqual({ startSec: 0, endSec: 2 });
    expect(next.tracks[0].clips[0].metadata.speed).toBe(2);
  });

  it("rejects invalid speed", () => {
    const editor = baseEditor([overlayTrack("g1", "Overlay 1", [clip("c2", "g1", 0, 4)])]);
    expect(() => setEditorClipSpeed(editor, "c2", 9)).toThrow();
  });
});

describe("keyframes", () => {
  const withText = () => baseEditor([overlayTrack("t", "Overlay 1", [clip("c1", "t", 0, 6, { x: 0.1, y: 0.2, isTextClip: true })])]);

  it("adds a keyframe at the playhead (clip-relative time)", () => {
    const editor = withText();
    const next = addClipKeyframe(editor, "c1", "x", 2, 0.5);
    const keys = (next.tracks[0].clips[0].metadata.keyframes as Record<string, { t: number; v: number }[]>).x;
    expect(keys).toEqual([{ t: 2, v: 0.5 }]);
  });

  it("interpolates keyframed values over time", () => {
    const editor = withText();
    let next = addClipKeyframe(editor, "c1", "x", 0, 0.1);
    next = addClipKeyframe(next, "c1", "x", 4, 0.9);
    const clipWithKeys = next.tracks[0].clips[0];
    const keys = (clipWithKeys.metadata.keyframes as Record<string, { t: number; v: number }[]>).x;
    expect(keyframeValueAt(keys, 0, 0)).toBe(0.1);
    expect(keyframeValueAt(keys, 2, 0)).toBeCloseTo(0.5);
    expect(keyframeValueAt(keys, 4, 0)).toBe(0.9);
  });

  it("replaces a keyframe at the same time", () => {
    const editor = withText();
    let next = addClipKeyframe(editor, "c1", "x", 2, 0.5);
    next = addClipKeyframe(next, "c1", "x", 2, 0.7);
    const keys = (next.tracks[0].clips[0].metadata.keyframes as Record<string, { t: number; v: number }[]>).x;
    expect(keys.length).toBe(1);
    expect(keys[0].v).toBe(0.7);
  });

  it("removes a keyframe", () => {
    const editor = withText();
    let next = addClipKeyframe(editor, "c1", "x", 2, 0.5);
    next = removeClipKeyframe(next, "c1", "x", 2);
    const keys = (next.tracks[0].clips[0].metadata.keyframes as Record<string, { t: number; v: number }[]> | undefined);
    expect(keys?.x).toBeUndefined();
  });
});

describe("text and overlay clips", () => {
  it("adds a text clip with heading preset", () => {
    const editor = baseEditor([overlayTrack("video-main", "Main track", [clip("b", "video-main", 0, 30)])], [{ id: "a1", name: "img", src: "/img.png", kind: "image", provenance: "local-upload" }]);
    const next = addTextClip(editor, "Hello", 5, 3, "heading");
    const textClip = next.tracks.flatMap((t) => t.clips).find((c) => c.metadata.isTextClip);
    expect(textClip).toBeTruthy();
    expect(textClip!.metadata.text).toBe("Hello");
    expect(textClip!.metadata.fontSize).toBe(72);
    expect(textClip!.range).toEqual({ startSec: 5, endSec: 8 });
  });

  it("adds an overlay clip from an editor asset", () => {
    const editor = baseEditor([overlayTrack("video-main", "Main track", [clip("b", "video-main", 0, 30)])], [{ id: "a1", name: "img.png", src: "/img.png", kind: "image", provenance: "local-upload" }]);
    const next = addOverlayClip(editor, "a1", 4, { x: 0.2, y: 0.3 });
    const added = next.tracks.flatMap((t) => t.clips).find((c) => c.metadata.assetId === "a1");
    expect(added).toBeTruthy();
    expect(added!.metadata.x).toBe(0.2);
    expect(added!.metadata.y).toBe(0.3);
    expect(added!.range.startSec).toBe(4);
  });
});

import { describe, expect, it } from "vitest";
import type { EditorDoc } from "../../../shared/isaacverse/editor";
import { addAssetTrack, addEditorTrack, deleteEditorTrack, reorderEditorTrack, rippleEditorDoc, setEditorClipAudioState, setEditorTrackState, setEditorTransitionState, splitEditorClip, trimEditorClip } from "./editorOperations";

const editor: EditorDoc = {
  id: "editor:video-01",
  projectId: "video-01",
  width: 1920,
  height: 1080,
  fps: 30,
  durationSec: 8,
  assets: [{ id: "asset-01", name: "Asset", src: "/uploads/asset.png", kind: "image", provenance: "local-upload" }],
  revision: { baseEditVersion: "v001", revision: 2, updatedAt: "2026-08-12T00:00:00.000Z" },
  tracks: [
    { id: "video-main", kind: "video", name: "Main video", order: 0, locked: false, muted: false, solo: false, hidden: false, clips: [
      { id: "clip-a", kind: "beat", trackId: "video-main", range: { startSec: 0, endSec: 4 }, label: "A", source: { beatId: "beat-a" }, linkedClipIds: [], locked: false, muted: false, hidden: false, metadata: {} },
      { id: "clip-b", kind: "beat", trackId: "video-main", range: { startSec: 4, endSec: 8 }, label: "B", source: { beatId: "beat-b" }, linkedClipIds: [], locked: false, muted: false, hidden: false, metadata: {} },
    ] },
    { id: "transitions", kind: "transition", name: "Transitions", order: 1, locked: false, muted: false, solo: false, hidden: false, clips: [{ id: "transition-1", kind: "transition", trackId: "transitions", range: { startSec: 3.8, endSec: 4.2 }, label: "fade", source: { transitionId: "transition-1" }, linkedClipIds: [], locked: false, muted: false, hidden: false, metadata: {} }] },
  ],
};

describe("trimEditorClip", () => {
  it("trims an edge immutably and increments the editor revision", () => {
    const next = trimEditorClip(editor, "clip-a", "end", 3);

    expect(next.tracks[0].clips[0].range).toEqual({ startSec: 0, endSec: 3 });
    expect(next.revision.revision).toBe(3);
    expect(editor.tracks[0].clips[0].range.endSec).toBe(4);
    expect(next.tracks[1].clips[0].range).toEqual({ startSec: 3.8, endSec: 4.2 });
  });

  it("allows trimming toward the interior minimum duration but rejects a neighbor collision", () => {
    expect(trimEditorClip(editor, "clip-b", "start", 5).tracks[0].clips[1].range).toEqual({ startSec: 5, endSec: 8 });
    expect(() => trimEditorClip(editor, "clip-a", "end", 5)).toThrow("overlap");
    expect(() => trimEditorClip(editor, "clip-b", "start", 3)).toThrow("overlap");
  });
});

describe("splitEditorClip", () => {
  it("splits a clip into stable source-linked parts and preserves other tracks", () => {
    const next = splitEditorClip(editor, "clip-a", 2);
    const clips = next.tracks[0].clips;

    expect(clips.map((clip) => clip.id)).toEqual(["clip-a:part-a", "clip-a:part-b", "clip-b"]);
    expect(clips[0].range).toEqual({ startSec: 0, endSec: 2 });
    expect(clips[1].range).toEqual({ startSec: 2, endSec: 4 });
    expect(clips[0].source.beatId).toBe("beat-a");
    expect(next.tracks[1].clips[0].id).toBe("transition-1");
  });

  it("rejects a split at either clip boundary", () => {
    expect(() => splitEditorClip(editor, "clip-a", 0)).toThrow("inside");
    expect(() => splitEditorClip(editor, "clip-a", 4)).toThrow("inside");
  });
});

describe("rippleEditorDoc", () => {
  it("moves downstream clips and transitions while preserving earlier content", () => {
    const withTransitionAtBoundary = { ...editor, tracks: editor.tracks.map((track) => track.id === "transitions" ? { ...track, clips: [{ ...track.clips[0], range: { startSec: 4, endSec: 4.2 } }] } : track) };
    const next = rippleEditorDoc(withTransitionAtBoundary, 4, 1);

    expect(next.tracks[0].clips[0].range).toEqual({ startSec: 0, endSec: 4 });
    expect(next.tracks[0].clips[1].range).toEqual({ startSec: 5, endSec: 9 });
    expect(next.tracks[1].clips[0].range).toEqual({ startSec: 5, endSec: 5.2 });
    expect(next.durationSec).toBe(9);
  });

  it("supports closing a gap on selected tracks without moving unrelated tracks", () => {
    const next = rippleEditorDoc(editor, 4, -1, ["video-main"]);

    expect(next.tracks[0].clips[1].range).toEqual({ startSec: 3, endSec: 7 });
    expect(next.tracks[1].clips[0].range).toEqual({ startSec: 3.8, endSec: 4.2 });
  });
});

describe("editor track controls", () => {
  it("updates mute/lock state without changing clip timing", () => {
    const next = setEditorTrackState(editor, "video-main", { muted: true, locked: true });

    expect(next.tracks[0].muted).toBe(true);
    expect(next.tracks[0].locked).toBe(true);
    expect(next.tracks[0].clips[0].range).toEqual(editor.tracks[0].clips[0].range);
  });

  it("reorders tracks and rewrites order values", () => {
    const next = reorderEditorTrack(editor, "transitions", 0);

    expect(next.tracks.map((track) => track.id)).toEqual(["transitions", "video-main"]);
    expect(next.tracks.map((track) => track.order)).toEqual([0, 1]);
  });
});

describe("editor audio controls", () => {
  it("updates gain and fades on an audio clip without changing its range", () => {
    const withAudio = { ...editor, tracks: [...editor.tracks, { id: "music", kind: "music" as const, name: "Music", order: 2, locked: false, muted: false, solo: false, hidden: false, clips: [{ id: "music-clip", kind: "music" as const, trackId: "music", range: { startSec: 0, endSec: 8 }, label: "Music", source: {}, linkedClipIds: [], locked: false, muted: false, hidden: false, metadata: {} }] }] };
    const next = setEditorClipAudioState(withAudio, "music-clip", { gainDb: -12, fadeInSec: 0.2, fadeOutSec: 0.4, muted: true });
    const clip = next.tracks[2].clips[0];

    expect(clip.metadata).toMatchObject({ gainDb: -12, fadeInSec: 0.2, fadeOutSec: 0.4 });
    expect(clip.muted).toBe(true);
    expect(clip.range).toEqual({ startSec: 0, endSec: 8 });
  });
});

describe("editor transition controls", () => {
  it("updates transition type and duration without touching video clips", () => {
    const next = setEditorTransitionState(editor, "transition-1", { transitionType: "blur", durationSec: 0.7 });
    const transition = next.tracks[1].clips[0];

    expect(transition.metadata.transitionType).toBe("blur");
    expect(transition.range).toEqual({ startSec: 3.8, endSec: 4.5 });
    expect(next.tracks[0].clips[0].range).toEqual(editor.tracks[0].clips[0].range);
  });
});

describe("editor track lifecycle", () => {
  it("creates a visual track only from an existing asset source", () => {
    const next = addAssetTrack(editor, "image", "asset-01", 1);
    const track = next.tracks.find((item) => item.source?.assetId === "asset-01");

    expect(track?.source.kind).toBe("asset");
    expect(track?.clips).toHaveLength(1);
    expect(track?.clips[0].metadata.src).toBe("/uploads/asset.png");
  });

  it("adds a source-bound track with clips and deletes it explicitly", () => {
    const track = { id: "graphics-1", kind: "overlay" as const, name: "Graphics 1", order: 2, locked: false, muted: false, solo: false, hidden: false, source: { kind: "asset" as const, assetId: "asset-01" }, accepts: ["image" as const], capabilities: { visual: true, audio: false, canvas: true, trim: true, split: true, gain: false, fade: false, mute: false, solo: false }, clips: [{ id: "asset-clip", kind: "element" as const, trackId: "graphics-1", range: { startSec: 1, endSec: 3 }, label: "Asset", source: { elementId: "asset-element" }, linkedClipIds: [], locked: false, muted: false, hidden: false, metadata: {} }] };
    const added = addEditorTrack(editor, track);
    const deleted = deleteEditorTrack(added, "graphics-1", "delete-clips");

    expect(added.tracks.some((item) => item.id === "graphics-1")).toBe(true);
    expect(deleted.tracks.some((item) => item.id === "graphics-1")).toBe(false);
  });

  it("requires an explicit move target before deleting a populated track", () => {
    expect(() => deleteEditorTrack(editor, "video-main", "delete-clips")).toThrow("main video");
    expect(() => deleteEditorTrack(editor, "video-main", "move-clips")).toThrow("main video");
  });
});

import { describe, expect, it } from "vitest";
import type { IsaacVerseEditDoc } from "../../../shared/isaacverse/types";
import { projectEditDocToEditor } from "../../../shared/isaacverse/editorProjection";

const sourceDoc: IsaacVerseEditDoc = {
  id: "edit-01",
  videoId: "video-01",
  version: "v004",
  width: 1920,
  height: 1080,
  fps: 30,
  beats: [{
    id: "beat-01",
    shotIds: ["shot-01"],
    journeySlot: "call",
    startSec: 2,
    durationSec: 4,
    transcript: "The decision is visible.",
    narrativeFunction: "show proof",
    treatment: { id: "chapter-card", params: { title: "Proof" }, assets: [] },
    elements: [],
    audioCues: [{ id: "cue-01", atSec: 2.8, durationSec: 0.3, reason: "reveal" }],
    voiceSegment: { src: "voice.wav", startSec: 2, endSec: 6 },
  }],
  shots: [{ id: "shot-01", beatId: "beat-01", startSec: 2, durationSec: 4, purpose: "proof", elementIds: [] }],
  transitions: [{ id: "transition-01", atSec: 6, durationSec: 0.5, type: "fade" }],
  audioPlan: {
    voice: [{ id: "voice-01", src: "voice.wav", startSec: 2, endSec: 6, transcript: "The decision is visible." }],
    music: [{ id: "music-01", src: "music.wav", startSec: 0, endSec: 10, gainDb: -18, density: "normal" }],
    ambience: [],
    beats: [{ beatId: "beat-01", density: "normal", sfx: [], duckZones: [], preservePauses: true }],
    master: { limiter: true },
  },
};

describe("projectEditDocToEditor", () => {
  it("projects semantic beats, treatment elements, audio, and transitions into source-linked clips", () => {
    const editor = projectEditDocToEditor(sourceDoc, { projectId: "video-01", now: "2026-08-12T00:00:00.000Z" });

    expect(editor.durationSec).toBe(10);
    expect(editor.revision).toEqual({ baseEditVersion: "v004", revision: 0, updatedAt: "2026-08-12T00:00:00.000Z" });
    const trackIds = editor.tracks.map((track) => track.id);
    expect(trackIds).toContain("video-main");
    expect(trackIds).toContain("voice");
    expect(trackIds).toContain("music");
    expect(trackIds).toContain("sfx");
    expect(trackIds.some((id) => id.startsWith("visual-"))).toBe(true);
    expect(editor.tracks.find((track) => track.id === "video-main")?.clips[0].source).toEqual({ beatId: "beat-01" });
    expect(editor.tracks.find((track) => track.id === "music")?.capabilities.audio).toBe(true);
    expect(editor.tracks.find((track) => track.id === "music")?.capabilities.canvas).toBe(false);
    const visualTracks = editor.tracks.filter((track) => track.kind === "overlay");
    expect(visualTracks.length).toBeGreaterThan(0);
    const allVisualClips = visualTracks.flatMap((track) => track.clips);
    expect(allVisualClips.length).toBeGreaterThan(0);
    const textClip = allVisualClips.find((c) => c.metadata.isTextClip === true);
    expect(textClip).toBeTruthy();
    expect(textClip?.metadata.text).toBe("Proof");
    expect(textClip?.parentClipId).toBe("clip:beat:beat-01");
    expect(editor.tracks.find((track) => track.id === "voice")?.clips[0].source.audioCueId).toBeUndefined();
    expect(editor.tracks.find((track) => track.id === "music")?.clips[0].metadata.src).toBe("music.wav");
    expect(editor.tracks.find((track) => track.id === "sfx")?.clips[0].source.audioCueId).toBe("cue-01");
    expect(editor.markers?.find((marker) => marker.kind === "transition")?.source.transitionId).toBe("transition-01");
    expect(editor.tracks.every((track) => track.clips.length > 0)).toBe(true);
  });
});

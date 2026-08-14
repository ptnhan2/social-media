import { describe, expect, it } from "vitest";
import type { IsaacVerseEditDoc } from "../../../shared/isaacverse/types";
import { deriveReviewSlices, frameRangeForReviewSlice, getReviewSelection, reviewRollup } from "../../../shared/isaacverse/review";

const doc: IsaacVerseEditDoc = {
  id: "review-edit",
  videoId: "review-video",
  version: "v004",
  width: 1920,
  height: 1080,
  fps: 30,
  beats: [{
    id: "beat-01",
    sceneId: "scene-01",
    shotIds: ["shot-01"],
    journeySlot: "call",
    startSec: 2,
    durationSec: 4,
    transcript: "The frame answers the question.",
    narrativeFunction: "make the decision visible",
    treatment: { id: "screen-proof-in-world", params: {}, assets: [{ id: "screen-01", kind: "screen", src: "screen.svg" }] },
    elements: [{ id: "beat-01:screen", role: "proof screen", kind: "image", sourcePath: "treatment.assets[0]" }, { id: "beat-01:caption", role: "caption", kind: "text", sourcePath: "treatment.params.caption" }],
    motionPhases: [{ id: "beat-01:push", name: "push to proof", startSec: 0.4, durationSec: 1.2, purpose: "move to the evidence" }],
    audioCues: [{ id: "cue-01", atSec: 2.6, durationSec: 0.4, reason: "reveal" }],
    voiceSegment: { src: "voice.wav", startSec: 2, endSec: 6 },
  }],
  shots: [{ id: "shot-01", beatId: "beat-01", startSec: 2, durationSec: 4, purpose: "proof", elementIds: ["beat-01:screen", "beat-01:caption"] }],
  scenes: [{ id: "scene-01", index: 1, startSec: 2, durationSec: 4, beatIds: ["beat-01"], shotIds: ["shot-01"] }],
  transitions: [{ id: "transition-01", atSec: 6, durationSec: 0.45, type: "flash" }],
  audioPlan: {
    voice: [{ id: "voice-01", src: "voice.wav", startSec: 2, endSec: 6, transcript: "The frame answers the question." }],
    music: [{ id: "music-01", src: "music.wav", startSec: 0, endSec: 10, gainDb: -18, density: "normal" }],
    ambience: [],
    beats: [{ beatId: "beat-01", density: "normal", sfx: [], duckZones: [], preservePauses: true }],
    master: { limiter: true },
  },
};

describe("ReviewSlice derivation", () => {
  it("derives atomic slices from beat, shot, motion, element, audio, voice, music, and transition sources", () => {
    const slices = deriveReviewSlices(doc);
    const sources = new Set(slices.map((slice) => slice.source));

    expect(sources).toEqual(new Set(["beat", "shot", "motion-phase", "element", "audio-event", "voice", "music", "transition"]));
    expect(slices.every((slice) => slice.endSec > slice.startSec)).toBe(true);
    expect(slices.find((slice) => slice.id === "review-video:beat-01:element:beat-01:caption")?.modalities).toContain("caption");
  });

  it("returns an exact selection context for a slice without making the whole beat the target", () => {
    const selection = getReviewSelection(doc, "review-video:beat-01:element:beat-01:caption");

    expect(selection.slice.source).toBe("element");
    expect(selection.slice.target.elementId).toBe("beat-01:caption");
    expect(selection.beat.id).toBe("beat-01");
    expect(selection.shot?.id).toBe("shot-01");
    expect(selection.transcript).toBe("The frame answers the question.");
  });

  it("derives stable IDs across repeated calls", () => {
    expect(deriveReviewSlices(doc).map((slice) => slice.id)).toEqual(deriveReviewSlices(doc).map((slice) => slice.id));
  });

  it("uses the atomic target ID before a parent shot ID", () => {
    const slices = deriveReviewSlices(doc);

    expect(slices.find((slice) => slice.source === "motion-phase")?.id).toBe("review-video:beat-01:motion-phase:beat-01:push");
    expect(slices.find((slice) => slice.source === "audio-event")?.id).toBe("review-video:beat-01:audio-event:cue-01");
    expect(slices.find((slice) => slice.source === "voice")?.id).toBe("review-video:beat-01:voice:shot-01");
  });

  it("converts a selected live range to inclusive Player frames", () => {
    const slice = deriveReviewSlices(doc).find((candidate) => candidate.source === "shot")!;
    expect(frameRangeForReviewSlice(slice, 30, 10)).toEqual({ inFrame: 60, outFrame: 179 });
  });

  it("rolls slice statuses up without treating unreviewed beats as approved", () => {
    const slices = deriveReviewSlices(doc);
    const rollup = reviewRollup(slices, [{ sliceId: slices[0].id, status: "approved", updatedAt: "2026-08-12T00:00:00.000Z" }]);
    expect(rollup.approved).toBe(1);
    expect(rollup.unreviewed).toBe(slices.length - 1);
    expect(rollup.needsFix).toBe(0);
  });
});

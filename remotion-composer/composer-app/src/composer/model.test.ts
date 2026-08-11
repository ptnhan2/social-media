import { describe, expect, it } from "vitest";
import type { IsaacVerseEditDoc, SemanticBeat } from "../../../shared/isaacverse/types";
import { beatQaStatus, createFeedbackRecord, createPatch } from "./model";

const beat: SemanticBeat = {
  id: "beat-proof",
  journeySlot: "trials",
  startSec: 4,
  durationSec: 3,
  transcript: "This is the editing tutorial.",
  narrativeFunction: "process proof",
  treatment: {
    id: "screen-proof-in-world",
    params: { caption: "the process becomes the scene" },
    assets: [],
  },
  audioCues: [],
};

const doc = { id: "video-fixture", beats: [beat] } as unknown as IsaacVerseEditDoc;

describe("Composer feedback model", () => {
  it("anchors feedback to the selected beat without requiring ids in the UI", () => {
    const record = createFeedbackRecord({
      id: "feedback-1",
      createdAt: "2026-08-11T00:00:00.000Z",
      doc,
      beat,
      category: "text-unreadable",
      note: "Increase contrast",
    });

    expect(record.target).toEqual({ beatId: "beat-proof", startSec: 4, endSec: 7 });
    expect(record.scope).toBe("beat");
    expect(record.status).toBe("open");
  });

  it("creates a local treatment patch for a cinematic complaint", () => {
    const patch = createPatch(beat, "not-cinematic", "Make the proof feel human");

    expect(patch?.affectedRange).toEqual({ startSec: 4, endSec: 7 });
    expect(patch?.operations).toEqual([
      {
        op: "replaceTreatment",
        beatId: "beat-proof",
        treatmentId: "host-reflection-cinematic",
        params: { subtitle: beat.transcript, lightSide: "left" },
      },
    ]);
  });

  it("does not flag a candidate treatment when its visual assets are embedded in params", () => {
    const candidateBeat: SemanticBeat = {
      ...beat,
      id: "beat-candidates",
      treatment: {
        id: "candidate-comparison",
        params: { candidates: [{ label: "Take one", src: "/take-one.jpg" }] },
        assets: [],
      },
    };

    expect(beatQaStatus({ ...doc, beats: [candidateBeat], audioPlan: { voice: [], music: [], ambience: [], beats: [], master: { limiter: true } } }, candidateBeat)).toBe("ready");
  });
});

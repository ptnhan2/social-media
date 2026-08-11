import { describe, expect, it } from "vitest";
import type { IsaacVerseEditDoc } from "../../../shared/isaacverse/types";
import { dispatchLocalOperation, inspectSegment } from "../../../shared/isaacverse/operations";

const doc: IsaacVerseEditDoc = {
  id: "final-edit",
  videoId: "isaacverse-final",
  version: "v001",
  width: 1920,
  height: 1080,
  fps: 30,
  beats: [{
    id: "beat-01",
    sceneId: "scene-01",
    shotIds: ["shot-01"],
    journeySlot: "call",
    startSec: 0,
    durationSec: 4,
    transcript: "A cut is a decision.",
    narrativeFunction: "reframe the edit",
    treatment: { id: "screen-proof-in-world", params: {}, assets: [] },
    elements: [{ id: "beat-01:title", role: "title", kind: "text", sourcePath: "treatment.params.caption" }],
    audioCues: [],
  }],
  shots: [{ id: "shot-01", beatId: "beat-01", startSec: 0, durationSec: 4, purpose: "proof", elementIds: ["beat-01:title"] }],
  scenes: [{ id: "scene-01", index: 1, startSec: 0, durationSec: 4, beatIds: ["beat-01"], shotIds: ["shot-01"] }],
};

describe("local structured agent operations", () => {
  it("inspects a selected element and returns beat, shot, and evidence context", () => {
    const result = inspectSegment(doc, { beatId: "beat-01", shotId: "shot-01", elementId: "beat-01:title" });

    expect(result.status).toBe("ok");
    expect(result.data?.beat.id).toBe("beat-01");
    expect(result.data?.shot?.id).toBe("shot-01");
    expect(result.data?.element?.id).toBe("beat-01:title");
  });

  it("diagnoses and creates a local patch for a selected beat", () => {
    const result = dispatchLocalOperation(doc, {
      operation: "diagnose_feedback",
      projectId: "isaacverse-final",
      target: { beatId: "beat-01", startSec: 0, endSec: 4 },
      category: "not-cinematic",
      note: "Make the proof feel human.",
    });

    expect(result.status).toBe("ok");
    expect(result.diagnosis).toContain("character reflection");
    expect(result.patch?.operations[0]).toMatchObject({ op: "replaceTreatment", beatId: "beat-01" });
  });

  it("returns an explicit approval state when a local patch cannot be inferred", () => {
    const result = dispatchLocalOperation(doc, {
      operation: "diagnose_feedback",
      projectId: "isaacverse-final",
      target: { beatId: "beat-01", startSec: 0, endSec: 4 },
      category: "custom",
      note: "Try something completely new.",
    });

    expect(result.status).toBe("needs_approval");
    expect(result.patch).toBeUndefined();
  });
});

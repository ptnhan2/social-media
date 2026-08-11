import { describe, expect, it } from "vitest";
import type { SemanticBeat } from "../../../shared/isaacverse/types";
import { canvasElementsToPatch, editBeatToCanvas } from "./beatAdapter";

const beat: SemanticBeat = {
  id: "beat-edit",
  journeySlot: "call",
  startSec: 2,
  durationSec: 4,
  transcript: "A choice changes the cut.",
  narrativeFunction: "show the decision",
  treatment: { id: "chapter-card", params: { title: "A choice" }, assets: [] },
  elements: [{ id: "beat-edit:title", role: "title", kind: "text", sourcePath: "treatment.params.title", geometry: { x: 20, y: 20, width: 400, height: 80 } }],
  audioCues: [],
};

describe("SemanticBeat canvas adapter", () => {
  it("creates editable canvas elements with stable source IDs", () => {
    const elements = editBeatToCanvas(beat);
    expect(elements.some((element) => element.sourceElementId === "beat-edit:title")).toBe(true);
    expect(elements.find((element) => element.sourceElementId === "beat-edit:title")?.text).toBe("A choice");
  });

  it("writes geometry changes as a patch scoped to one beat", () => {
    const elements = editBeatToCanvas(beat);
    const title = elements.find((element) => element.sourceElementId === "beat-edit:title")!;
    const patch = canvasElementsToPatch(beat, [{ ...title, x: 42, y: 24 }]);

    expect(patch.operations).toEqual([{ op: "updateElement", beatId: "beat-edit", elementId: "beat-edit:title", path: "geometry", value: { x: 42, y: 24, width: 400, height: 80, rotation: 0 } }]);
    expect(patch.affectedRange).toEqual({ startSec: 2, endSec: 6 });
  });
});

import { describe, expect, it } from "vitest";
import type { EditPatch } from "../../../shared/isaacverse/schema";
import type { IsaacVerseEditDoc } from "../../../shared/isaacverse/types";
import { applyPatch } from "../../../shared/isaacverse/feedback";
import { validateEditDoc, validateEditPatch } from "../../../shared/isaacverse/validate";

const doc = (): IsaacVerseEditDoc => ({
  id: "final-edit-v001",
  width: 1920,
  height: 1080,
  fps: 30,
  version: "v001",
  beats: [
    {
      id: "beat-01",
      sceneId: "scene-01",
      shotIds: ["shot-01"],
      journeySlot: "call",
      startSec: 0,
      durationSec: 4,
      transcript: "The polished demo hides the real bottleneck.",
      narrativeFunction: "surface the problem",
      treatment: { id: "chapter-card", params: {}, assets: [] },
      elements: [{ id: "beat-01:title", role: "title", kind: "text", sourcePath: "treatment.params.title" }],
      audioCues: [],
    },
  ],
  shots: [{ id: "shot-01", beatId: "beat-01", startSec: 0, durationSec: 4, purpose: "hook", elementIds: ["beat-01:title"] }],
  scenes: [{ id: "scene-01", index: 1, startSec: 0, durationSec: 4, beatIds: ["beat-01"] }],
});

describe("canonical IsaacVerse contracts", () => {
  it("accepts stable scene, shot, and element identities", () => {
    expect(validateEditDoc(doc())).toEqual([]);
  });

  it("rejects a duplicate element id and an unknown shot target", () => {
    const invalid = doc();
    invalid.beats[0].elements = [
      { id: "beat-01:title", role: "title", kind: "text" },
      { id: "beat-01:title", role: "subtitle", kind: "text" },
    ];
    invalid.shots![0].elementIds = ["missing-element"];

    const issues = validateEditDoc(invalid);

    expect(issues.some((issue) => issue.path.includes("elements") && issue.message.includes("duplicate"))).toBe(true);
    expect(issues.some((issue) => issue.path.includes("elementIds") && issue.message.includes("unknown"))).toBe(true);
  });

  it("accepts canonical element, asset, and audio patch operations", () => {
    const patch: EditPatch = {
      id: "patch-01",
      videoId: "isaacverse-final",
      baseVersion: "v001",
      reason: "Make the title readable.",
      operations: [
        { op: "updateElement", beatId: "beat-01", elementId: "beat-01:title", path: "color", value: "#f2b84b" },
        { op: "replaceAsset", assetId: "asset-old", replacementAssetId: "asset-new" },
        { op: "updateAudioCue", beatId: "beat-01", cueId: "cue-01", changes: { gain: -12 } },
      ],
      affectedRange: { startSec: 0, endSec: 4 },
      status: "draft",
    };

    expect(validateEditPatch(patch)).toEqual([]);
  });

  it("applies canonical element and beat operations without changing other beats", () => {
    const before = doc();
    const patch: EditPatch = {
      id: "patch-02",
      videoId: "isaacverse-final",
      baseVersion: "v001",
      reason: "Change only the selected title.",
      operations: [{ op: "updateElement", beatId: "beat-01", elementId: "beat-01:title", path: "metadata.color", value: "#61d7e8" }],
      affectedRange: { startSec: 0, endSec: 4 },
      status: "draft",
    };

    const after = applyPatch(before, patch);

    expect(after.beats[0].elements?.[0].metadata?.color).toBe("#61d7e8");
    expect(after.beats).toHaveLength(1);
  });

  it("reflows downstream beats and transitions when a duration patch changes timing", () => {
    const before = doc();
    before.beats.push({ ...before.beats[0], id: "beat-02", startSec: 4, sceneId: "scene-02", shotIds: ["shot-02"] });
    before.transitions = [{ id: "transition-02", atSec: 4, durationSec: 0.4, type: "fade" }];
    const after = applyPatch(before, {
      id: "patch-duration",
      videoId: "isaacverse-final",
      baseVersion: "v001",
      reason: "Shorten first beat.",
      operations: [{ op: "updateBeat", beatId: "beat-01", changes: { durationSec: 3.5 } }],
      affectedRange: { startSec: 0, endSec: 4 },
      status: "draft",
    });

    expect(after.beats.find((beat) => beat.id === "beat-02")?.startSec).toBe(3.5);
    expect(after.transitions?.[0].atSec).toBe(3.5);
  });
});

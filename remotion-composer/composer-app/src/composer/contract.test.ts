import { describe, expect, it } from "vitest";
import type { EditPatch } from "../../../shared/isaacverse/schema";
import type { IsaacVerseEditDoc } from "../../../shared/isaacverse/types";
import { applyPatch } from "../../../shared/isaacverse/feedback";
import { validateEditDoc, validateEditDocTimeline, validateEditPatch } from "../../../shared/isaacverse/validate";

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
        { op: "addElement", beatId: "beat-01", element: { id: "beat-01:uploaded", role: "uploaded asset", kind: "image", geometry: { x: 20, y: 30, width: 200, height: 120 }, metadata: { assetSrc: "/uploads/test.png" } } },
        { op: "replaceAsset", assetId: "asset-old", replacementAssetId: "asset-new" },
        { op: "updateAudioCue", beatId: "beat-01", cueId: "cue-01", changes: { gain: -12 } },
      ],
      affectedRange: { startSec: 0, endSec: 4 },
      status: "draft",
    };

    expect(validateEditPatch(patch)).toEqual([]);
  });

  it("adds a new canvas asset as an override element", () => {
    const after = applyPatch(doc(), {
      id: "patch-add-element",
      videoId: "isaacverse-final",
      baseVersion: "v001",
      reason: "Place uploaded asset.",
      operations: [{ op: "addElement", beatId: "beat-01", element: { id: "beat-01:uploaded", role: "uploaded asset", kind: "image", geometry: { x: 20, y: 30, width: 200, height: 120 }, metadata: { assetSrc: "/uploads/test.png" } } }],
      affectedRange: { startSec: 0, endSec: 4 },
      status: "draft",
    });

    expect(after.beats[0].elements?.find((element) => element.id === "beat-01:uploaded")?.metadata?.canvasOverride).toBe(true);
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

  it("marks nested geometry patches as canvas overrides", () => {
    const before = doc();
    before.beats[0].elements![0].geometry = { x: 10, y: 20, width: 300, height: 80, rotation: 0 };

    const after = applyPatch(before, {
      id: "patch-geometry-field",
      videoId: "isaacverse-final",
      baseVersion: "v001",
      reason: "Nudge the title into the safe area.",
      operations: [{ op: "updateElement", beatId: "beat-01", elementId: "beat-01:title", path: "geometry.x", value: 80 }],
      affectedRange: { startSec: 0, endSec: 4 },
      status: "draft",
    });

    expect(after.beats[0].elements?.[0].geometry?.x).toBe(80);
    expect(after.beats[0].elements?.[0].metadata?.canvasOverride).toBe(true);
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

describe("validateEditDocTimeline (M3 pre-flight semantics)", () => {
  const timelineDoc = () => {
    const base = doc();
    base.beats[0].treatment = { id: "chapter-card", params: { title: "T" }, assets: [] };
    base.beats.push({
      ...base.beats[0], id: "beat-02", startSec: 4, sceneId: "scene-02", shotIds: [],
      audioCues: [{ id: "beat-02:whoosh", atSec: 0.1, reason: "transition" }],
    });
    return base;
  };

  it("accepts a contiguous, well-formed timeline", () => {
    expect(validateEditDocTimeline(timelineDoc())).toEqual([]);
  });

  it("flags a gap between beats (non-contiguous tiling)", () => {
    const gap = timelineDoc();
    gap.beats[1].startSec = 5;
    const issues = validateEditDocTimeline(gap);
    expect(issues.some((i) => i.message.includes("timeline gap/overlap"))).toBe(true);
  });

  it("flags an overlap between beats", () => {
    const overlap = timelineDoc();
    overlap.beats[1].startSec = 3.5;
    expect(validateEditDocTimeline(overlap).some((i) => i.message.includes("timeline gap/overlap"))).toBe(true);
  });

  it("flags a first beat that does not start at zero", () => {
    const late = timelineDoc();
    late.beats[0].startSec = 0.5;
    expect(validateEditDocTimeline(late).some((i) => i.message.includes("first beat must start at 0"))).toBe(true);
  });

  it("flags malformed audio cues and empty treatment params", () => {
    const malformed = timelineDoc();
    malformed.beats[1].audioCues = [{ id: "", atSec: 0.1 }];
    malformed.beats[0].treatment = { id: "chapter-card", params: {}, assets: [] };
    const issues = validateEditDocTimeline(malformed);
    expect(issues.some((i) => i.path.includes("audioCues") && i.message.includes("id"))).toBe(true);
    expect(issues.some((i) => i.path.includes("treatment.params") && i.message.includes("empty"))).toBe(true);
  });
});

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BeatContent, BeatElementOverlay } from "../../../shared/isaacverse/EditVideo";
import { chapterCardTitleLayout } from "../../../shared/isaacverse/treatments";
import type { SemanticBeat } from "../../../shared/isaacverse/types";

describe("semantic element renderer", () => {
  it("renders patched element geometry and text into the live composition overlay", () => {
    const beat: SemanticBeat = {
      id: "beat-render",
      journeySlot: "call",
      startSec: 0,
      durationSec: 3,
      transcript: "A changed title.",
      narrativeFunction: "test renderer write-back",
      treatment: { id: "chapter-card", params: { title: "Original" }, assets: [] },
      elements: [{ id: "beat-render:title", role: "title", kind: "text", sourcePath: "treatment.params.title", geometry: { x: 48, y: 30, width: 420, height: 80 }, metadata: { text: "Patched title", color: "#61d7e8", canvasOverride: true } }],
      audioCues: [],
    };
    const html = renderToStaticMarkup(<BeatElementOverlay beat={beat} />);

    expect(html).toContain("data-element-id=\"beat-render:title\"");
    expect(html).toContain("Patched title");
    expect(html).toMatch(/left:5(?:%|\.0+%)/);
  });

  it("BeatContent returns a background container (treatment elements render via overlay system)", () => {
    const beat: SemanticBeat = {
      id: "beat-single-pass",
      journeySlot: "call",
      startSec: 0,
      durationSec: 3,
      transcript: "A changed title.",
      narrativeFunction: "test single-pass canvas rendering",
      treatment: { id: "chapter-card", params: { title: "Original" }, assets: [] },
      elements: [{ id: "beat-single-pass:title", role: "title", kind: "text", sourcePath: "treatment.params.title", geometry: { x: 48, y: 30, width: 420, height: 80 }, metadata: { text: "Patched title", canvasOverride: true } }],
      audioCues: [],
    };
    const html = renderToStaticMarkup(<BeatContent beat={beat} />);

    expect(html).toContain("background");
    expect(html).not.toContain("Original");
    expect(html).not.toContain("Patched title");
  });

  it("keeps long chapter-card titles inside the composition frame", () => {
    const layout = chapterCardTitleLayout("The timeline is not the edit");

    expect(layout.maxWidth).toBe("86%");
    expect(layout.fontSize).toBeLessThan(96);
    expect(layout.letterSpacing).toBe("0.04em");
  });
});

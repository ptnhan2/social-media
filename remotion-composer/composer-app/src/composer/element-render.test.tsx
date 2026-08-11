import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BeatElementOverlay } from "../../../shared/isaacverse/EditVideo";
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
      elements: [{ id: "beat-render:title", role: "title", kind: "text", sourcePath: "treatment.params.title", geometry: { x: 48, y: 30, width: 420, height: 80 }, metadata: { text: "Patched title", color: "#61d7e8" } }],
      audioCues: [],
    };
    const html = renderToStaticMarkup(<BeatElementOverlay beat={beat} />);

    expect(html).toContain("data-element-id=\"beat-render:title\"");
    expect(html).toContain("Patched title");
    expect(html).toMatch(/left:5(?:%|\.0+%)/);
  });
});

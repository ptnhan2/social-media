import { describe, expect, it } from "vitest";
import type { EditorSourceRef } from "../../../shared/isaacverse/editor";
import { editorReducer, initialEditorState } from "./editorReducer";

const source: EditorSourceRef = {
  beatId: "beat-01",
  shotId: "shot-01",
  elementId: "beat-01:title",
};

describe("editorReducer", () => {
  it("selects a source-linked clip without losing semantic target IDs", () => {
    const next = editorReducer(initialEditorState, { type: "selectClip", trackId: "text", clipId: "clip:element:beat-01:title", source });

    expect(next.selection).toEqual({ mode: "clip", trackId: "text", clipId: "clip:element:beat-01:title", source });
  });

  it("sets a bounded range and playhead state independently", () => {
    const range = { startSec: 2, endSec: 4 };
    const ranged = editorReducer(initialEditorState, { type: "setRange", range });
    const moved = editorReducer(ranged, { type: "setPlayhead", currentSec: 3.5, isPlaying: true });

    expect(moved.selection).toEqual({ mode: "range", range });
    expect(moved.playhead).toEqual({ currentSec: 3.5, isPlaying: true, loopRange: range });
  });

  it("clears selection and changes editing tool without changing the playhead", () => {
    const selected = editorReducer(initialEditorState, { type: "setPlayhead", currentSec: 2, isPlaying: false });
    const cleared = editorReducer(selected, { type: "clearSelection" });
    const split = editorReducer(cleared, { type: "setActiveTool", tool: "split" });

    expect(split.selection).toEqual({ mode: "none" });
    expect(split.activeTool).toBe("split");
    expect(split.playhead.currentSec).toBe(2);
  });
});

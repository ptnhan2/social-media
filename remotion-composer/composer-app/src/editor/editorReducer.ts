import type { ClipRange, EditorSelection, EditorSourceRef, PlayheadState } from "../../../shared/isaacverse/editor";

export type EditorTool = "select" | "trim" | "split" | "ripple";

export type EditorState = {
  selection: EditorSelection;
  playhead: PlayheadState;
  activeTool: EditorTool;
};

export type EditorAction =
  | { type: "selectClip"; trackId: string; clipId: string; source: EditorSourceRef }
  | { type: "setRange"; range: ClipRange }
  | { type: "setPlayhead"; currentSec: number; isPlaying?: boolean }
  | { type: "clearSelection" }
  | { type: "setActiveTool"; tool: EditorTool };

export const initialEditorState: EditorState = {
  selection: { mode: "none" },
  playhead: { currentSec: 0, isPlaying: false },
  activeTool: "select",
};

export const editorReducer = (state: EditorState, action: EditorAction): EditorState => {
  switch (action.type) {
    case "selectClip":
      return { ...state, selection: { mode: "clip", trackId: action.trackId, clipId: action.clipId, source: action.source }, playhead: { ...state.playhead, loopRange: undefined } };
    case "setRange":
      return { ...state, selection: { mode: "range", range: action.range }, playhead: { ...state.playhead, loopRange: action.range } };
    case "setPlayhead":
      return { ...state, playhead: { ...state.playhead, currentSec: Math.max(0, action.currentSec), isPlaying: action.isPlaying ?? state.playhead.isPlaying } };
    case "clearSelection":
      return { ...state, selection: { mode: "none" }, playhead: { ...state.playhead, loopRange: undefined } };
    case "setActiveTool":
      return { ...state, activeTool: action.tool };
    default:
      return state;
  }
};

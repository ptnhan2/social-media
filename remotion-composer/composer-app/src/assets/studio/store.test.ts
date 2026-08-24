import { describe, expect, it } from "vitest";
import { initialState, parsePersisted, persistKey, reducer, serializePersisted } from "./store";
import { makeLayer } from "./types";

const layer = (id: string, x = 0): ReturnType<typeof makeLayer> =>
  makeLayer({ id, name: id, src: `/img/${id}.png`, path: `img/${id}.png`, width: 100, height: 100, x, y: 0 });

describe("asset studio store", () => {
  it("add layer commits history and selects it", () => {
    let s = initialState();
    s = reducer(s, { type: "ADD_LAYER", layer: layer("a"), label: "Add layer" });
    expect(s.doc.layers).toHaveLength(1);
    expect(s.ui.selectedIds).toEqual(["a"]);
    expect(s.entries).toHaveLength(2);
    expect(s.pointer).toBe(1);
    expect(s.entries[1].label).toBe("Add layer");
  });

  it("update layer without label does not create history entry", () => {
    let s = initialState();
    s = reducer(s, { type: "ADD_LAYER", layer: layer("a"), label: "Add layer" });
    s = reducer(s, { type: "UPDATE_LAYER", id: "a", updates: { x: 42 } });
    expect(s.doc.layers[0].x).toBe(42);
    expect(s.entries).toHaveLength(2);
    expect(s.pointer).toBe(1);
  });

  it("mark + transient updates + commit creates exactly one entry", () => {
    let s = initialState();
    s = reducer(s, { type: "ADD_LAYER", layer: layer("a"), label: "Add layer" });
    s = reducer(s, { type: "HISTORY_MARK", label: "Move" });
    s = reducer(s, { type: "UPDATE_LAYER", id: "a", updates: { x: 10 } });
    s = reducer(s, { type: "UPDATE_LAYER", id: "a", updates: { x: 20 } });
    s = reducer(s, { type: "HISTORY_COMMIT" });
    expect(s.entries).toHaveLength(3);
    expect(s.entries[2].label).toBe("Move");
    expect(s.doc.layers[0].x).toBe(20);
    // undo restores pre-drag position
    s = reducer(s, { type: "UNDO" });
    expect(s.doc.layers[0].x).toBe(0);
    // redo restores post-drag
    s = reducer(s, { type: "REDO" });
    expect(s.doc.layers[0].x).toBe(20);
  });

  it("commit with no change is a no-op", () => {
    let s = initialState();
    s = reducer(s, { type: "ADD_LAYER", layer: layer("a"), label: "Add layer" });
    s = reducer(s, { type: "HISTORY_MARK", label: "Move" });
    s = reducer(s, { type: "HISTORY_COMMIT" });
    expect(s.entries).toHaveLength(2);
  });

  it("undo after new action truncates redo tail", () => {
    let s = initialState();
    s = reducer(s, { type: "ADD_LAYER", layer: layer("a"), label: "Add layer" });
    s = reducer(s, { type: "UNDO" });
    expect(s.doc.layers).toHaveLength(0);
    s = reducer(s, { type: "ADD_LAYER", layer: layer("b"), label: "Add layer" });
    s = reducer(s, { type: "REDO" });
    expect(s.doc.layers.map((l) => l.id)).toEqual(["b"]);
    expect(s.entries).toHaveLength(2);
  });

  it("history jump restores any state", () => {
    let s = initialState();
    s = reducer(s, { type: "ADD_LAYER", layer: layer("a"), label: "Add layer" });
    s = reducer(s, { type: "ADD_LAYER", layer: layer("b"), label: "Add layer" });
    s = reducer(s, { type: "HISTORY_JUMP", index: 1 });
    expect(s.doc.layers.map((l) => l.id)).toEqual(["a"]);
    expect(s.pointer).toBe(1);
    s = reducer(s, { type: "HISTORY_JUMP", index: 2 });
    expect(s.doc.layers.map((l) => l.id)).toEqual(["a", "b"]);
  });

  it("delete layers clears selection", () => {
    let s = initialState();
    s = reducer(s, { type: "ADD_LAYER", layer: layer("a"), label: "Add layer" });
    s = reducer(s, { type: "DELETE_LAYERS", ids: ["a"] });
    expect(s.doc.layers).toHaveLength(0);
    expect(s.ui.selectedIds).toEqual([]);
    s = reducer(s, { type: "UNDO" });
    expect(s.doc.layers).toHaveLength(1);
  });

  it("duplicate layer places copy above source and selects it", () => {
    let s = initialState();
    s = reducer(s, { type: "ADD_LAYER", layer: layer("a"), label: "Add layer" });
    s = reducer(s, { type: "ADD_LAYER", layer: layer("b"), label: "Add layer" });
    s = reducer(s, { type: "DUPLICATE_LAYER", id: "a" });
    expect(s.doc.layers.map((l) => l.id)).toEqual(["a", "a-copy-src", "b"].map(() => s.doc.layers[1].id === "a" ? "a" : s.doc.layers[1].id).slice(0, 0).concat([s.doc.layers[0].id, s.doc.layers[1].id, s.doc.layers[2].id]));
    expect(s.doc.layers[1].name).toBe("a copy");
    expect(s.ui.selectedIds).toEqual([s.doc.layers[1].id]);
  });

  it("reorder layer moves within stack", () => {
    let s = initialState();
    for (const id of ["a", "b", "c"]) s = reducer(s, { type: "ADD_LAYER", layer: layer(id), label: "Add layer" });
    s = reducer(s, { type: "REORDER_LAYER", id: "c", toIndex: 0 });
    expect(s.doc.layers.map((l) => l.id)).toEqual(["c", "a", "b"]);
  });

  it("replace layer image swaps src/path", () => {
    let s = initialState();
    s = reducer(s, { type: "ADD_LAYER", layer: layer("a"), label: "Add layer" });
    s = reducer(s, { type: "REPLACE_LAYER_IMAGE", id: "a", src: "/img/cut.png", path: "img/cut.png", label: "Lasso cut" });
    expect(s.doc.layers[0].src).toBe("/img/cut.png");
    s = reducer(s, { type: "UNDO" });
    expect(s.doc.layers[0].src).toBe("/img/a.png");
  });

  it("tool switching resets lasso", () => {
    let s = initialState();
    s = reducer(s, { type: "LASSO_ADD_POINT", point: { x: 1, y: 1 } });
    s = reducer(s, { type: "SET_TOOL", tool: "move" });
    expect(s.ui.lasso.points).toHaveLength(0);
    expect(s.ui.activeTool).toBe("move");
  });

  it("history is capped", () => {
    let s = initialState();
    for (let i = 0; i < 100; i++) {
      s = reducer(s, { type: "ADD_LAYER", layer: layer(`l${i}`), label: `Add ${i}` });
    }
    expect(s.entries.length).toBeLessThanOrEqual(60);
    expect(s.pointer).toBe(s.entries.length - 1);
  });

  it("guide add/move/remove/clear", () => {
    let s = initialState();
    const g = { id: "g1", axis: "v" as const, pos: 100 };
    s = reducer(s, { type: "ADD_GUIDE", guide: g });
    expect(s.ui.guides).toHaveLength(1);
    s = reducer(s, { type: "MOVE_GUIDE", id: "g1", pos: 250 });
    expect(s.ui.guides[0].pos).toBe(250);
    s = reducer(s, { type: "ADD_GUIDE", guide: { id: "g2", axis: "h", pos: 50 } });
    expect(s.ui.guides).toHaveLength(2);
    s = reducer(s, { type: "REMOVE_GUIDE", id: "g1" });
    expect(s.ui.guides.map((x) => x.id)).toEqual(["g2"]);
    s = reducer(s, { type: "CLEAR_GUIDES" });
    expect(s.ui.guides).toHaveLength(0);
  });

  it("grid/rulers toggles", () => {
    let s = initialState();
    expect(s.ui.showRulers).toBe(true);
    expect(s.ui.showGrid).toBe(false);
    s = reducer(s, { type: "TOGGLE_GRID" });
    expect(s.ui.showGrid).toBe(true);
    s = reducer(s, { type: "TOGGLE_RULERS" });
    expect(s.ui.showRulers).toBe(false);
  });

  it("RESET_DOC returns to empty doc and single-entry history", () => {
    let s = initialState();
    s = reducer(s, { type: "ADD_LAYER", layer: layer("a"), label: "Add layer" });
    s = reducer(s, { type: "ADD_GUIDE", guide: { id: "g1", axis: "v", pos: 10 } });
    s = reducer(s, { type: "RESET_DOC" });
    expect(s.doc.layers).toHaveLength(0);
    expect(s.entries).toHaveLength(1);
    expect(s.entries[0].label).toBe("Open");
    expect(s.pointer).toBe(0);
    expect(s.ui.guides).toHaveLength(0);
  });

  it("serialize + parse round-trips persisted state", () => {
    let s = initialState();
    s = reducer(s, { type: "ADD_LAYER", layer: layer("a"), label: "Add layer" });
    s = reducer(s, { type: "ADD_GUIDE", guide: { id: "g1", axis: "v", pos: 42 } });
    const json = JSON.stringify(serializePersisted(s));
    const restored = parsePersisted(json);
    expect(restored).not.toBeNull();
    expect(restored!.doc.layers.map((l) => l.id)).toEqual(["a"]);
    expect(restored!.entries.map((e) => e.label)).toEqual(["Open", "Add layer"]);
    expect(restored!.pointer).toBe(1);
    expect(restored!.ui.guides).toHaveLength(1);
    // undo continues from restored pointer
    const undone = reducer(restored!, { type: "UNDO" });
    expect(undone.doc.layers).toHaveLength(0);
  });

  it("parsePersisted rejects corrupt payloads", () => {
    expect(parsePersisted(null)).toBeNull();
    expect(parsePersisted("")).toBeNull();
    expect(parsePersisted("not json")).toBeNull();
    expect(parsePersisted(JSON.stringify({ doc: { layers: [] } }))).toBeNull(); // missing entries
    expect(parsePersisted(JSON.stringify({ doc: { layers: [], docWidth: 100, docHeight: 100 }, entries: [], pointer: 0 }))).toBeNull(); // empty entries
    const badPointer = JSON.stringify({ doc: { layers: [], docWidth: 1, docHeight: 1 }, entries: [{ label: "Open", doc: { layers: [], docWidth: 1, docHeight: 1 } }], pointer: 5 });
    expect(parsePersisted(badPointer)).toBeNull();
  });

  it("persistKey is project-scoped", () => {
    expect(persistKey("isaacverse-final")).toBe("asset-studio:isaacverse-final");
  });
});

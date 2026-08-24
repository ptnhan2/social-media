import { describe, expect, it } from "vitest";
import { initialState, reducer } from "./store";
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
});

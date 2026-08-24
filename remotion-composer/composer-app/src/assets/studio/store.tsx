import React from "react";
import {
  DEFAULT_TOOL_OPTIONS,
  DocState,
  Guide,
  HistoryEntry,
  Layer,
  LassoState,
  Pt,
  ToolId,
  ToolOptions,
  UiState,
  Viewport,
} from "./types";

/**
 * Editor store: reducer + React context.
 * - `doc` (layers + doc size) is snapshotted in a linear history list.
 * - `ui` (selection, tool, lasso, wand, status) is NOT snapshotted.
 * - `viewport` (zoom/pan) lives alongside but is never part of history.
 *
 * History protocol:
 * - Discrete actions pass a `label` → committed in one reducer pass.
 * - Continuous interactions (drag / transform / slider) dispatch:
 *   HISTORY_MARK {label} at interaction start, transient updates without
 *   label during, HISTORY_COMMIT at interaction end (no-op when nothing
 *   changed).
 */

export interface StoreState {
  doc: DocState;
  ui: UiState;
  viewport: Viewport;
  entries: HistoryEntry[]; // entries[0] = initial "Open"; pointer = current
  pointer: number;
  pending: { label: string; before: DocState } | null;
}

export type Action =
  | { type: "ADD_LAYER"; layer: Layer; label?: string }
  | { type: "UPDATE_LAYER"; id: string; updates: Partial<Layer>; label?: string }
  | { type: "UPDATE_LAYERS"; updates: { id: string; updates: Partial<Layer> }[]; label?: string }
  | { type: "REPLACE_LAYER_IMAGE"; id: string; src: string; path: string; width?: number; height?: number; label?: string }
  | { type: "DELETE_LAYERS"; ids: string[]; label?: string }
  | { type: "DUPLICATE_LAYER"; id: string; label?: string }
  | { type: "REORDER_LAYER"; id: string; toIndex: number; label?: string }
  | { type: "SET_DOC_SIZE"; width: number; height: number; label?: string }
  | { type: "SELECT"; ids: string[]; additive?: boolean }
  | { type: "SET_TOOL"; tool: ToolId }
  | { type: "SET_TOOL_OPTION"; tool: keyof ToolOptions; key: string; value: unknown }
  | { type: "LASSO_SET"; lasso: LassoState }
  | { type: "LASSO_ADD_POINT"; point: Pt }
  | { type: "LASSO_POP_POINT" }
  | { type: "LASSO_CLOSE" }
  | { type: "LASSO_CLEAR" }
  | { type: "SET_WAND"; wand: UiState["wand"] }
  | { type: "SET_STATUS"; status: string }
  | { type: "SET_BUSY"; busy: boolean }
  | { type: "SET_VIEWPORT"; viewport: Partial<Viewport> }
  | { type: "ADD_GUIDE"; guide: Guide }
  | { type: "MOVE_GUIDE"; id: string; pos: number }
  | { type: "REMOVE_GUIDE"; id: string }
  | { type: "CLEAR_GUIDES" }
  | { type: "TOGGLE_GRID" }
  | { type: "TOGGLE_RULERS" }
  | { type: "RESET_DOC" }
  | { type: "SET_ENTRY_THUMB"; index: number; thumb: string }
  | { type: "HISTORY_MARK"; label: string }
  | { type: "HISTORY_COMMIT" }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "HISTORY_JUMP"; index: number };

const HISTORY_LIMIT = 60;

function initialDoc(): DocState {
  return { layers: [], docWidth: 1024, docHeight: 1024 };
}

export function initialState(): StoreState {
  const doc = initialDoc();
  return freshUiState(doc);
}

function freshUiState(doc: DocState): StoreState {
  return {
    doc,
    ui: {
      selectedIds: [],
      activeTool: "move",
      lasso: { points: [], closed: false },
      wand: null,
      toolOptions: DEFAULT_TOOL_OPTIONS,
      status: "Import body → tách nền → gen head → ghép → save pose",
      busy: false,
      guides: [],
      showGrid: false,
      showRulers: true,
    },
    viewport: { scale: 1, x: 0, y: 0 },
    entries: [{ label: "Open", doc }],
    pointer: 0,
    pending: null,
  };
}

// --- session persistence (localStorage, per project) ---

export interface PersistPayload {
  doc: DocState;
  entries: HistoryEntry[];
  pointer: number;
  guides: Guide[];
  showGrid: boolean;
  showRulers: boolean;
}

/** Serialize the persist-relevant parts of a store state. */
export function serializePersisted(state: StoreState): PersistPayload {
  return {
    doc: state.doc,
    entries: state.entries,
    pointer: state.pointer,
    guides: state.ui.guides,
    showGrid: state.ui.showGrid,
    showRulers: state.ui.showRulers,
  };
}

/**
 * Parse a persisted payload (JSON string) back into a StoreState.
 * Returns null when the payload is missing/corrupt/shape-mismatched.
 */
export function parsePersisted(json: string | null): StoreState | null {
  if (!json) return null;
  try {
    const p = JSON.parse(json) as PersistPayload;
    const shapeOk =
      p &&
      Array.isArray(p.doc?.layers) &&
      Number.isFinite(p.doc?.docWidth) &&
      Number.isFinite(p.doc?.docHeight) &&
      Array.isArray(p.entries) &&
      p.entries.length > 0 &&
      p.entries.every((e) => e && typeof e.label === "string" && Array.isArray(e.doc?.layers)) &&
      Number.isInteger(p.pointer) &&
      p.pointer >= 0 &&
      p.pointer < p.entries.length &&
      Array.isArray(p.guides) &&
      p.guides.every((g) => g && (g.axis === "v" || g.axis === "h") && Number.isFinite(g.pos));
    if (!shapeOk) return null;
    const base = freshUiState(p.doc);
    return {
      ...base,
      doc: p.doc,
      entries: p.entries,
      pointer: p.pointer,
      ui: {
        ...base.ui,
        guides: p.guides,
        showGrid: Boolean(p.showGrid),
        showRulers: p.showRulers !== false,
      },
    };
  } catch {
    return null;
  }
}

export function persistKey(projectId: string): string {
  return `asset-studio:${projectId}`;
}

/** Push a committed doc into the history, truncating the redo tail. */
function commit(state: StoreState, label: string, doc: DocState): StoreState {
  const unchanged = state.entries[state.pointer] && docsEqual(state.entries[state.pointer].doc, doc);
  if (unchanged) return { ...state, pending: null };
  const entries = [...state.entries.slice(0, state.pointer + 1), { label, doc }].slice(-HISTORY_LIMIT);
  return { ...state, doc, entries, pointer: entries.length - 1, pending: null };
}

function docsEqual(a: DocState, b: DocState): boolean {
  if (a.docWidth !== b.docWidth || a.docHeight !== b.docHeight) return false;
  if (a.layers.length !== b.layers.length) return false;
  return a.layers.every((la, i) => {
    const lb = b.layers[i];
    return la.id === lb.id && la.src === lb.src && la.x === lb.x && la.y === lb.y &&
      la.scaleX === lb.scaleX && la.scaleY === lb.scaleY && la.rotation === lb.rotation &&
      la.opacity === lb.opacity && la.visible === lb.visible;
  });
}

/** Apply a doc mutation with optional history commit. */
function withDoc(state: StoreState, label: string | undefined, fn: (doc: DocState) => DocState): StoreState {
  const doc = fn(state.doc);
  if (label) return commit({ ...state, doc }, label, doc);
  return { ...state, doc };
}

function updateLayers(doc: DocState, fn: (layers: Layer[]) => Layer[]): DocState {
  return { ...doc, layers: fn(doc.layers) };
}

export function reducer(state: StoreState, action: Action): StoreState {
  switch (action.type) {
    case "ADD_LAYER":
      return {
        ...withDoc(state, action.label ?? "Add layer", (doc) =>
          updateLayers(doc, (layers) => [...layers, action.layer])),
        ui: { ...state.ui, selectedIds: [action.layer.id], wand: null },
      };

    case "UPDATE_LAYER":
      return withDoc(state, action.label, (doc) =>
        updateLayers(doc, (layers) => layers.map((l) => (l.id === action.id ? { ...l, ...action.updates } : l))));

    case "UPDATE_LAYERS": {
      const map = new Map(action.updates.map((u) => [u.id, u.updates]));
      return withDoc(state, action.label, (doc) =>
        updateLayers(doc, (layers) => layers.map((l) => (map.has(l.id) ? { ...l, ...map.get(l.id)! } : l))));
    }

    case "REPLACE_LAYER_IMAGE":
      return withDoc(state, action.label ?? "Edit pixels", (doc) =>
        updateLayers(doc, (layers) =>
          layers.map((l) =>
            l.id === action.id
              ? { ...l, src: action.src, path: action.path, width: action.width ?? l.width, height: action.height ?? l.height }
              : l)));

    case "DELETE_LAYERS": {
      const ids = new Set(action.ids);
      const removed = state.doc.layers.filter((l) => ids.has(l.id));
      const label = action.label ?? (removed.length === 1 ? `Delete ${removed[0].name}` : `Delete ${removed.length} layers`);
      return {
        ...withDoc(state, label, (doc) => updateLayers(doc, (layers) => layers.filter((l) => !ids.has(l.id)))),
        ui: { ...state.ui, selectedIds: state.ui.selectedIds.filter((id) => !ids.has(id)) },
      };
    }

    case "DUPLICATE_LAYER": {
      const src = state.doc.layers.find((l) => l.id === action.id);
      if (!src) return state;
      const copy: Layer = {
        ...src,
        id: `layer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: `${src.name} copy`,
        x: src.x + 20,
        y: src.y + 20,
      };
      return {
        ...withDoc(state, action.label ?? `Duplicate ${src.name}`, (doc) =>
          updateLayers(doc, (layers) => {
            const idx = layers.findIndex((l) => l.id === src.id);
            const next = [...layers];
            next.splice(idx + 1, 0, copy);
            return next;
          })),
        ui: { ...state.ui, selectedIds: [copy.id] },
      };
    }

    case "REORDER_LAYER": {
      const idx = state.doc.layers.findIndex((l) => l.id === action.id);
      if (idx < 0) return state;
      const label = action.label ?? `Reorder ${state.doc.layers[idx].name}`;
      return withDoc(state, label, (doc) =>
        updateLayers(doc, (layers) => {
          const next = [...layers];
          const [item] = next.splice(idx, 1);
          next.splice(Math.max(0, Math.min(next.length, action.toIndex)), 0, item);
          return next;
        }));
    }

    case "SET_DOC_SIZE":
      return withDoc(state, action.label ?? "Doc size", (doc) => ({ ...doc, docWidth: action.width, docHeight: action.height }));

    case "SELECT": {
      const ids = action.additive
        ? Array.from(new Set([...state.ui.selectedIds, ...action.ids]))
        : action.ids;
      return { ...state, ui: { ...state.ui, selectedIds: ids } };
    }

    case "SET_TOOL":
      return { ...state, ui: { ...state.ui, activeTool: action.tool, lasso: { points: [], closed: false } } };

    case "SET_TOOL_OPTION":
      return {
        ...state,
        ui: {
          ...state.ui,
          toolOptions: {
            ...state.ui.toolOptions,
            [action.tool]: { ...(state.ui.toolOptions[action.tool] as Record<string, unknown>), [action.key]: action.value },
          },
        },
      };

    case "LASSO_SET":
      return { ...state, ui: { ...state.ui, lasso: action.lasso } };

    case "LASSO_ADD_POINT":
      return { ...state, ui: { ...state.ui, lasso: { ...state.ui.lasso, points: [...state.ui.lasso.points, action.point] } } };

    case "LASSO_POP_POINT":
      return { ...state, ui: { ...state.ui, lasso: { ...state.ui.lasso, points: state.ui.lasso.points.slice(0, -1) } } };

    case "LASSO_CLOSE":
      if (state.ui.lasso.points.length < 3 || state.ui.lasso.closed) return state;
      return { ...state, ui: { ...state.ui, lasso: { ...state.ui.lasso, closed: true } } };

    case "LASSO_CLEAR":
      return { ...state, ui: { ...state.ui, lasso: { points: [], closed: false } } };

    case "SET_WAND":
      return { ...state, ui: { ...state.ui, wand: action.wand } };

    case "SET_STATUS":
      return { ...state, ui: { ...state.ui, status: action.status } };

    case "SET_BUSY":
      return { ...state, ui: { ...state.ui, busy: action.busy } };

    case "SET_VIEWPORT":
      return { ...state, viewport: { ...state.viewport, ...action.viewport } };

    case "ADD_GUIDE":
      return {
        ...state,
        ui: {
          ...state.ui,
          guides: [...state.ui.guides, action.guide],
        },
      };

    case "MOVE_GUIDE":
      return {
        ...state,
        ui: { ...state.ui, guides: state.ui.guides.map((g) => (g.id === action.id ? { ...g, pos: action.pos } : g)) },
      };

    case "REMOVE_GUIDE":
      return { ...state, ui: { ...state.ui, guides: state.ui.guides.filter((g) => g.id !== action.id) } };

    case "CLEAR_GUIDES":
      return { ...state, ui: { ...state.ui, guides: [] } };

    case "TOGGLE_GRID":
      return { ...state, ui: { ...state.ui, showGrid: !state.ui.showGrid } };

    case "TOGGLE_RULERS":
      return { ...state, ui: { ...state.ui, showRulers: !state.ui.showRulers } };

    case "RESET_DOC": {
      const fresh = initialState();
      return { ...fresh, viewport: state.viewport };
    }

    case "SET_ENTRY_THUMB": {
      const i = Math.max(0, Math.min(state.entries.length - 1, action.index));
      if (state.entries[i].thumb === action.thumb) return state;
      const entries = state.entries.map((e, idx) => (idx === i ? { ...e, thumb: action.thumb } : e));
      return { ...state, entries };
    }

    case "HISTORY_MARK":
      return { ...state, pending: { label: action.label, before: state.doc } };

    case "HISTORY_COMMIT": {
      if (!state.pending) return state;
      if (docsEqual(state.pending.before, state.doc)) return { ...state, pending: null };
      return commit(state, state.pending.label, state.doc);
    }

    case "UNDO":
      if (state.pointer <= 0) return state;
      return { ...state, pointer: state.pointer - 1, doc: state.entries[state.pointer - 1].doc, pending: null };

    case "REDO":
      if (state.pointer >= state.entries.length - 1) return state;
      return { ...state, pointer: state.pointer + 1, doc: state.entries[state.pointer + 1].doc, pending: null };

    case "HISTORY_JUMP": {
      const i = Math.max(0, Math.min(state.entries.length - 1, action.index));
      return { ...state, pointer: i, doc: state.entries[i].doc, pending: null };
    }

    default:
      return state;
  }
}

// --- React context wiring ---

const StoreContext = React.createContext<{ state: StoreState; dispatch: React.Dispatch<Action> } | null>(null);

export function StoreProvider({
  children,
  projectId,
}: {
  children: React.ReactNode;
  projectId: string;
}) {
  const [state, dispatch] = React.useReducer(reducer, undefined, () => {
    try {
      return parsePersisted(window.localStorage.getItem(persistKey(projectId))) ?? initialState();
    } catch {
      return initialState();
    }
  });
  const value = React.useMemo(() => ({ state, dispatch }), [state]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): { state: StoreState; dispatch: React.Dispatch<Action> } {
  const ctx = React.useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

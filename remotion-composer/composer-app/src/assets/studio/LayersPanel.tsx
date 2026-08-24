import React from "react";
import { useStore } from "./store";

/**
 * Layers panel (Photopea pattern): topmost layer first, eye/lock toggles,
 * double-click rename, drag to reorder, thumbnail, delete.
 */
export const LayersPanel: React.FC = () => {
  const { state, dispatch } = useStore();
  const { layers } = state.doc;
  const [renamingId, setRenamingId] = React.useState<string | null>(null);
  const [dragId, setDragId] = React.useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = React.useState<string | null>(null);

  // display topmost first
  const ordered = [...layers].reverse();
  const indexOf = (id: string) => layers.findIndex((l) => l.id === id);

  const onDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const from = indexOf(dragId);
    // dropping ABOVE target in the reversed list = inserting above it in the stack
    const targetVisualIndex = ordered.findIndex((l) => l.id === targetId);
    const stackPosAbove = layers.length - 1 - targetVisualIndex;
    const to = from < stackPosAbove ? stackPosAbove : stackPosAbove + 1;
    dispatch({ type: "REORDER_LAYER", id: dragId, toIndex: to });
    setDragId(null);
    setDropTargetId(null);
  };

  return (
    <section className="as4-panel as4-layers-panel">
      <header className="as4-panel-header">
        <h4>Layers</h4>
        <div className="as4-panel-actions">
          <button type="button" className="as4-icon-btn" title="Duplicate (Ctrl+J)"
            disabled={state.ui.selectedIds.length !== 1}
            onClick={() => dispatch({ type: "DUPLICATE_LAYER", id: state.ui.selectedIds[0] })}>
            ⧉
          </button>
          <button type="button" className="as4-icon-btn danger" title="Delete (Del)"
            disabled={state.ui.selectedIds.length === 0}
            onClick={() => dispatch({ type: "DELETE_LAYERS", ids: state.ui.selectedIds })}>
            🗑
          </button>
        </div>
      </header>

      <div className="as4-layer-list">
        {ordered.length === 0 && <p className="as4-hint">Chưa có layer — import ở panel Import bên phải</p>}
        {ordered.map((layer) => {
          const selected = state.ui.selectedIds.includes(layer.id);
          return (
            <div
              key={layer.id}
              className={`as4-layer-item ${selected ? "selected" : ""} ${dropTargetId === layer.id ? "drop-target" : ""} ${layer.locked ? "locked" : ""}`}
              draggable={!renamingId}
              onClick={(e) => {
                if (renamingId) return;
                dispatch({ type: "SELECT", ids: [layer.id], additive: e.shiftKey });
              }}
              onDoubleClick={() => setRenamingId(layer.id)}
              onDragStart={() => setDragId(layer.id)}
              onDragOver={(e) => {
                e.preventDefault();
                setDropTargetId(layer.id);
              }}
              onDragLeave={() => setDropTargetId((t) => (t === layer.id ? null : t))}
              onDrop={() => onDrop(layer.id)}
            >
              <button
                type="button"
                className={`as4-icon-btn eye ${layer.visible ? "" : "off"}`}
                title={layer.visible ? "Ẩn layer" : "Hiện layer"}
                onClick={(e) => {
                  e.stopPropagation();
                  dispatch({ type: "UPDATE_LAYER", id: layer.id, updates: { visible: !layer.visible }, label: `${layer.visible ? "Hide" : "Show"} ${layer.name}` });
                }}
              >
                {layer.visible ? "👁" : "—"}
              </button>
              <img className="as4-layer-thumb" src={layer.src} alt="" draggable={false} />
              {renamingId === layer.id ? (
                <input
                  autoFocus
                  className="as4-rename-input"
                  defaultValue={layer.name}
                  onBlur={(e) => {
                    const name = e.target.value.trim();
                    if (name && name !== layer.name) {
                      dispatch({ type: "UPDATE_LAYER", id: layer.id, updates: { name }, label: `Rename ${layer.name}` });
                    }
                    setRenamingId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    if (e.key === "Escape") setRenamingId(null);
                  }}
                />
              ) : (
                <span className="as4-layer-name" title={layer.name}>
                  {layer.name}
                </span>
              )}
              <button
                type="button"
                className={`as4-icon-btn lock ${layer.locked ? "on" : ""}`}
                title={layer.locked ? "Mở khoá layer" : "Khoá layer"}
                onClick={(e) => {
                  e.stopPropagation();
                  dispatch({ type: "UPDATE_LAYER", id: layer.id, updates: { locked: !layer.locked }, label: `${layer.locked ? "Unlock" : "Lock"} ${layer.name}` });
                }}
              >
                {layer.locked ? "🔒" : "🔓"}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
};

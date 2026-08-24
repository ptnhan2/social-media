import React from "react";
import { useStore } from "./store";
import { TOOL_BY_ID } from "./tools";

/**
 * Contextual tool options bar (Photopea pattern): parameters of the
 * currently active tool, directly under the menu bar.
 */
export const ToolOptionsBar: React.FC<{ onLassoApply: () => void; onFit: () => void; onZoom: (f: number) => void; onZoomToSelection?: () => void }> = ({
  onLassoApply,
  onFit,
  onZoom,
  onZoomToSelection,
}) => {
  const { state, dispatch } = useStore();
  const { ui, doc } = state;
  const tool = ui.activeTool;
  const def = TOOL_BY_ID[tool];
  const selectedLayer = doc.layers.find((l) => l.id === ui.selectedIds[0]) || null;

  const opt = (toolKey: "eraser" | "wand" | "lasso", key: string, value: unknown) =>
    dispatch({ type: "SET_TOOL_OPTION", tool: toolKey, key, value });

  return (
    <div className="as4-options-bar">
      <span className="as4-options-tool">
        {def.icon} {def.label}
      </span>

      {tool === "move" && (
        <>
          <span className="as4-opt-info">
            {ui.selectedIds.length === 0
              ? "Không chọn layer nào — click layer để chọn, kéo để di chuyển"
              : `Đã chọn ${ui.selectedIds.length} layer${ui.selectedIds.length > 1 ? "s" : ""}`}
          </span>
          {selectedLayer && (
            <button
              type="button"
              className="as4-btn ghost"
              onClick={() => dispatch({ type: "DUPLICATE_LAYER", id: selectedLayer.id })}
              title="Ctrl+J"
            >
              ⧉ Duplicate
            </button>
          )}
          {ui.selectedIds.length > 0 && (
            <>
              {onZoomToSelection ? (
                <button type="button" className="as4-btn ghost" onClick={onZoomToSelection} title="Zoom to selection">
                  🔍→ Selection
                </button>
              ) : null}
              <button
                type="button"
                className="as4-btn ghost danger"
                onClick={() => dispatch({ type: "DELETE_LAYERS", ids: ui.selectedIds })}
                title="Delete"
              >
                🗑 Delete
              </button>
            </>
          )}
        </>
      )}

      {tool === "lasso" && (
        <>
          <span className="as4-opt-info">
            {selectedLayer ? (
              <>
                Trên <b>{selectedLayer.name}</b> — {ui.lasso.points.length} điểm
                {ui.lasso.closed ? " (đã khép)" : " — click điểm đầu (cam) hoặc Enter để khép"}
              </>
            ) : (
              "Chọn layer trước (V → click layer) rồi quay lại Lasso"
            )}
          </span>
          <label className="as4-opt-field">
            Mode
            <select value={ui.toolOptions.lasso.mode} onChange={(e) => opt("lasso", "mode", e.target.value)}>
              <option value="keep">Keep (giữ trong polygon)</option>
              <option value="remove">Delete (xoá trong polygon)</option>
            </select>
          </label>
          <button type="button" className="as4-btn ghost" disabled={!ui.lasso.points.length}
            onClick={() => dispatch({ type: "LASSO_POP_POINT" })} title="Backspace">
            ↶ Point
          </button>
          <button type="button" className="as4-btn ghost" disabled={ui.lasso.points.length < 3 || ui.lasso.closed}
            onClick={() => dispatch({ type: "LASSO_CLOSE" })}>
            Khép
          </button>
          <button type="button" className="as4-btn ghost" disabled={!ui.lasso.points.length}
            onClick={() => dispatch({ type: "LASSO_CLEAR" })} title="Esc">
            ✕ Clear
          </button>
          <button
            type="button"
            className="as4-btn primary"
            disabled={!ui.lasso.closed || !selectedLayer || state.ui.busy}
            onClick={onLassoApply}
          >
            ✂️ Apply cut
          </button>
        </>
      )}

      {tool === "wand" && (
        <>
          <label className="as4-opt-field">
            Tolerance
            <input
              type="range"
              min={1}
              max={100}
              value={ui.toolOptions.wand.tolerance}
              onChange={(e) => opt("wand", "tolerance", Number(e.target.value))}
            />
            <b>{ui.toolOptions.wand.tolerance}</b>
          </label>
          <label className="as4-opt-field">
            <input
              type="checkbox"
              checked={ui.toolOptions.wand.contiguous}
              onChange={(e) => opt("wand", "contiguous", e.target.checked)}
            />
            Contiguous
          </label>
          <span className="as4-opt-info">Click vùng màu → Delete để xoá vùng chọn</span>
          {ui.wand && (
            <button type="button" className="as4-btn ghost" onClick={() => dispatch({ type: "SET_WAND", wand: null })}>
              ✕ Bỏ chọn (Ctrl+D)
            </button>
          )}
        </>
      )}

      {tool === "eraser" && (
        <>
          <label className="as4-opt-field">
            Size
            <input
              type="range"
              min={4}
              max={300}
              value={ui.toolOptions.eraser.size}
              onChange={(e) => opt("eraser", "size", Number(e.target.value))}
            />
            <b>{ui.toolOptions.eraser.size}px</b>
          </label>
          <label className="as4-opt-field">
            Hardness
            <input
              type="range"
              min={0.05}
              max={1}
              step={0.05}
              value={ui.toolOptions.eraser.hardness}
              onChange={(e) => opt("eraser", "hardness", Number(e.target.value))}
            />
            <b>{Math.round(ui.toolOptions.eraser.hardness * 100)}%</b>
          </label>
          <span className="as4-opt-info">
            {selectedLayer ? `Chà trên "${selectedLayer.name}"` : "Chọn layer trước (V → click layer)"}
          </span>
        </>
      )}

      {tool === "bgremove" && (
        <span className="as4-opt-info">Click vào layer bất kỳ để tách nền bằng AI (rembg)</span>
      )}

      {tool === "zoom" && (
        <>
          <button type="button" className="as4-btn ghost" onClick={() => onZoom(1.25)}>＋</button>
          <button type="button" className="as4-btn ghost" onClick={() => onZoom(0.8)}>－</button>
          <button type="button" className="as4-btn ghost" onClick={onFit}>Fit (Ctrl+0)</button>
          <span className="as4-opt-info">Click zoom in • Alt+click zoom out • wheel zoom mọi lúc</span>
        </>
      )}

      {tool === "hand" && <span className="as4-opt-info">Kéo để pan — Space giữ để pan với tool bất kỳ</span>}
    </div>
  );
};

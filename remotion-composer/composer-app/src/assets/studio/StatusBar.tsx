import React from "react";
import { useStore } from "./store";
import { TOOL_BY_ID } from "./tools";

const ZOOM_STEPS = [0.25, 0.5, 1, 2, 4];

export const StatusBar: React.FC<{ onFit: () => void }> = ({ onFit }) => {
  const { state, dispatch } = useStore();
  const { viewport, doc, ui } = state;
  const toolDef = TOOL_BY_ID[ui.activeTool];

  return (
    <footer className="as4-statusbar">
      <span className="as4-status-item">
        Zoom
        <select
          value=""
          onChange={(e) => {
            if (e.target.value === "fit") onFit();
            else if (e.target.value) {
              const scale = Number(e.target.value);
              dispatch({ type: "SET_VIEWPORT", viewport: { scale } });
            }
          }}
          title="Ctrl+0 = Fit"
        >
          <option value="">{Math.round(viewport.scale * 100)}%</option>
          {ZOOM_STEPS.map((z) => (
            <option key={z} value={z}>
              {Math.round(z * 100)}%
            </option>
          ))}
          <option value="fit">Fit</option>
        </select>
      </span>
      <span className="as4-status-item">
        Doc {doc.docWidth}×{doc.docHeight}
      </span>
      <span className="as4-status-item">
        {doc.layers.length} layer{doc.layers.length === 1 ? "" : "s"}
      </span>
      <span className="as4-status-item grow">{toolDef ? `${toolDef.icon} ${toolDef.label} — ${toolDef.hint}` : ""}</span>
      {ui.busy && <span className="as4-status-item busy">● Đang xử lý…</span>}
      <span className={`as4-status-item ${ui.status.startsWith("❌") ? "error" : ""}`}>{ui.status}</span>
    </footer>
  );
};

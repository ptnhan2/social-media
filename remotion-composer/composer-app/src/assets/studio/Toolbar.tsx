import React from "react";
import { useStore } from "./store";
import { TOOLS } from "./tools";

export const Toolbar: React.FC = () => {
  const { state, dispatch } = useStore();
  const active = state.ui.activeTool;

  return (
    <div className="as4-toolbar">
      {TOOLS.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`as4-tool-btn ${active === t.id ? "active" : ""}`}
          data-testid={`tool-${t.id}`}
          data-active={active === t.id ? "true" : "false"}
          title={`${t.label} (${t.shortcut}) — ${t.hint}`}
          onClick={() => dispatch({ type: "SET_TOOL", tool: t.id })}
        >
          {t.icon}
          <span className="as4-tool-key">{t.shortcut}</span>
        </button>
      ))}
    </div>
  );
};

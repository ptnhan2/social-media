import React from "react";
import { useStore } from "./store";

/** History panel (Photopea pattern): linear named actions, click to jump. */
export const HistoryPanel: React.FC = () => {
  const { state, dispatch } = useStore();
  const listRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [state.entries.length]);

  return (
    <section className="as4-panel as4-history-panel">
      <header className="as4-panel-header">
        <h4>History</h4>
        <span className="as4-panel-meta">
          {state.pointer + 1}/{state.entries.length}
        </span>
      </header>
      <div className="as4-history-list" ref={listRef} data-testid="history-list">
        {state.entries.map((entry, i) => (
          <button
            key={i}
            type="button"
            className={`as4-history-item ${i === state.pointer ? "current" : ""} ${i > state.pointer ? "future" : ""}`}
            onClick={() => dispatch({ type: "HISTORY_JUMP", index: i })}
          >
            {entry.thumb ? <img className="as4-history-thumb" src={entry.thumb} alt="" /> : <span className="as4-history-thumb as4-history-thumb-empty" />}
            <span className="as4-history-label">{entry.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
};

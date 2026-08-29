import React from "react";
import { AgentPanel } from "./AgentPanel";

/**
 * APP-LEVEL AGENT SURFACE (2026-08-29 — the agent is not an editor tab).
 *
 * The harness agent accompanies the WHOLE pipeline: idea → research →
 * script → produce → critique → evolve. Only being reachable inside the
 * video editor trapped it in one stage of its own pipeline. The drawer
 * mounts ABOVE the router, so the conversation SURVIVES navigation —
 * start talking on the project picker (research/script stage), keep the
 * thread while reviewing the timeline, continue in the asset studio.
 *
 * Context: routes feed the provider (project, view); the editor feeds the
 * playhead through a MUTABLE REF (a context value per frame would re-render
 * the whole drawer at 30fps — the ref is polled at 500ms while open).
 */

export type AgentView = "picker" | "editor" | "studio";

export type AgentUiContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  projectId?: string;
  setProjectId: (projectId?: string) => void;
  view: AgentView;
  setView: (view: AgentView) => void;
  /** Editor playhead — written by VideoEditor every render (ref mutation, no re-render). */
  currentSecRef: React.MutableRefObject<number>;
};

const AgentUiContext = React.createContext<AgentUiContextValue | null>(null);

export const useAgentUi = (): AgentUiContextValue => {
  const value = React.useContext(AgentUiContext);
  if (!value) throw new Error("useAgentUi must be used inside <AgentProvider>");
  return value;
};

export const AgentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = React.useState(false);
  const [projectId, setProjectId] = React.useState<string | undefined>(undefined);
  const [view, setView] = React.useState<AgentView>("picker");
  const currentSecRef = React.useRef(0);
  const value = React.useMemo<AgentUiContextValue>(
    () => ({ open, setOpen, toggle: () => setOpen((v) => !v), projectId, setProjectId, view, setView, currentSecRef }),
    [open, projectId, view],
  );
  return <AgentUiContext.Provider value={value}>{children}</AgentUiContext.Provider>;
};

export const AgentDrawer: React.FC = () => {
  const { open, setOpen, projectId, view, currentSecRef } = useAgentUi();
  const [currentSec, setCurrentSec] = React.useState(0);

  // Poll the editor playhead ref while the drawer is open — cheap (2Hz) and
  // decoupled from the editor's 30fps render loop.
  React.useEffect(() => {
    if (!open) return;
    setCurrentSec(currentSecRef.current);
    const timer = window.setInterval(() => setCurrentSec(currentSecRef.current), 500);
    return () => window.clearInterval(timer);
  }, [open, currentSecRef]);

  // Escape closes the drawer (typing focus returns to the page).
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  return (
    <>
      <button
        type="button"
        className="ap-fab"
        aria-label={open ? "Close agent drawer" : "Open agent drawer"}
        title="Agent — đồng hành toàn pipeline (idea → research → script → produce → critique)"
        onClick={() => setOpen(!open)}
      >{open ? "✕" : "🤖"}</button>
      {open ? (
        <aside className="ap-drawer" aria-label="Agent drawer">
          <div className="ap-drawer-header">
            <strong>Agent</strong>
            <small>{view === "editor" ? (projectId ?? "editor") : view === "studio" ? `studio · ${projectId ?? ""}` : "no project"}</small>
            <button type="button" aria-label="Close agent drawer" className="ap-drawer-close" onClick={() => setOpen(false)}>✕</button>
          </div>
          <div className="ap-drawer-body">
            <AgentPanel projectId={projectId} currentSec={currentSec} />
          </div>
        </aside>
      ) : null}
    </>
  );
};

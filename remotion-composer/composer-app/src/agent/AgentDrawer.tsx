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
 * Lifecycle rules (learned from the toggle-stall bug, 2026-08-29):
 * 1. AgentPanel is mounted ONCE for the app's lifetime — open/close only
 *    toggles a CSS class. Unmount/remount per toggle churned the
 *    useStream connection (mount -> abort -> mount...) and lost input /
 *    scroll state.
 * 2. The FAB hides while the drawer is open — the drawer (z-index above
 *    the FAB) covered it, so "click FAB to close" silently clicked the
 *    drawer body instead. Closing is the header ✕ (standard drawer UX).
 * 3. The editor playhead flows through the MODULE-LEVEL singleton ref
 *    below (NOT through context): a context value would re-render every
 *    consumer — including the 1000-line VideoEditor — on every toggle.
 *    The drawer polls the ref at 2Hz while open.
 */

/** Editor playhead — written by VideoEditor every render (plain mutation). */
export const agentPlayheadRef: { current: number } = { current: 0 };

export type AgentView = "picker" | "editor" | "studio";

export type AgentUiContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  projectId?: string;
  setProjectId: (projectId?: string) => void;
  view: AgentView;
  setView: (view: AgentView) => void;
  /** Prompt-layer bridge: the studio's re-run button drops the script's
   *  generating instruction here — the drawer opens with it prefilled so the
   *  user can tweak the prompt and send it to the agent. */
  draftPrompt?: string;
  setDraftPrompt: (prompt?: string) => void;
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
  const [draftPrompt, setDraftPrompt] = React.useState<string | undefined>(undefined);
  const value = React.useMemo<AgentUiContextValue>(
    () => ({ open, setOpen, toggle: () => setOpen((v) => !v), projectId, setProjectId, view, setView, draftPrompt, setDraftPrompt }),
    [open, projectId, view, draftPrompt],
  );
  return <AgentUiContext.Provider value={value}>{children}</AgentUiContext.Provider>;
};

export const AgentDrawer: React.FC = () => {
  const { open, setOpen, projectId, view } = useAgentUi();
  const [currentSec, setCurrentSec] = React.useState(0);

  // Poll the playhead ref while the drawer is open — cheap (2Hz) and
  // decoupled from the editor's 30fps render loop.
  React.useEffect(() => {
    if (!open) return;
    setCurrentSec(agentPlayheadRef.current);
    const timer = window.setInterval(() => setCurrentSec(agentPlayheadRef.current), 500);
    return () => window.clearInterval(timer);
  }, [open]);

  // Escape closes the drawer (typing focus returns to the page).
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  return (
    <>
      {!open ? (
        <button
          type="button"
          className="ap-fab"
          aria-label="Open agent drawer"
          title="Agent — đồng hành toàn pipeline (idea → research → script → produce → critique)"
          onClick={() => setOpen(true)}
        >🤖</button>
      ) : null}
      {open ? <div className="ap-drawer-backdrop" aria-hidden="true" onClick={() => setOpen(false)} /> : null}
      <aside className={`ap-drawer ${open ? "" : "ap-drawer-closed"}`} aria-label="Agent drawer" aria-hidden={!open}>
        <div className="ap-drawer-header">
          <strong>Agent</strong>
          <small>{view === "editor" ? (projectId ?? "editor") : view === "studio" ? `studio · ${projectId ?? ""}` : "no project"}</small>
          <button type="button" aria-label="Close agent drawer" className="ap-drawer-close" onClick={() => setOpen(false)}>✕</button>
        </div>
        <div className="ap-drawer-body">
          <AgentPanel projectId={projectId} currentSec={currentSec} />
        </div>
      </aside>
    </>
  );
};

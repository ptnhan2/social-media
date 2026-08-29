import React from "react";
import { listProjects, createProject, type ProjectListItem } from "./api";

const formatDate = (iso: string) => {
  const d = new Date(iso);
  if (d.getTime() === 0) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};

const stageColor: Record<string, string> = {
  scaffold: "#6b7280",
  edit: "#61d7e8",
  produce: "#f2b84b",
  draft: "#a98bff",
  master: "#6cb84b",
  unknown: "#6b7280",
};

export const ProjectPicker: React.FC<{ onOpen: (projectId: string) => void; onOpenPage?: (projectId: string) => void }> = ({ onOpen, onOpenPage }) => {
  const [projects, setProjects] = React.useState<ProjectListItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [newId, setNewId] = React.useState("");

  const refresh = React.useCallback(async () => {
    try {
      const list = await listProjects();
      setProjects(list);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void refresh(); }, [refresh]);

  const handleCreate = async () => {
    const id = newId.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "-").replace(/^-+|-+$/g, "");
    if (!id) return;
    setCreating(true);
    try {
      await createProject(id);
      setNewId("");
      await refresh();
      onOpen(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="project-picker">
      <div className="project-picker-header">
        <div>
          <h1>IsaacVerse Composer</h1>
          <p>Select a project to edit, or create a new one.</p>
        </div>
        <div className="project-picker-create">
          <input
            type="text"
            placeholder="new-project-slug"
            value={newId}
            onChange={(e) => setNewId(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void handleCreate(); }}
            aria-label="New project ID"
          />
          <button type="button" className="ve-btn primary" onClick={() => void handleCreate()} disabled={creating || !newId.trim()}>
            {creating ? "Creating…" : "+ New Project"}
          </button>
        </div>
      </div>

      {error ? <div className="project-picker-error">{error}</div> : null}

      {loading ? (
        <div className="project-picker-loading">Loading projects…</div>
      ) : projects.length === 0 ? (
        <div className="project-picker-empty">No projects yet. Create one above.</div>
      ) : (
        <div className="project-picker-grid">
          {projects.map((p) => (
            <div key={p.id} className="project-card-wrap">
              <button
                type="button"
                className="project-card"
                onClick={() => onOpen(p.id)}
                disabled={!p.hasEditDoc}
              >
                <div className="project-card-title">{p.title}</div>
                <div className="project-card-id">{p.id}</div>
                <div className="project-card-meta">
                  <span className="project-card-stage" style={{ color: stageColor[p.stage] || stageColor.unknown }}>{p.stage}</span>
                  <span>{p.version}</span>
                  <span>{p.hasEditDoc ? `${p.hasVideoDoc ? "Video + Edit" : "Edit only"}` : "No edit doc"}</span>
                  <span>{formatDate(p.updatedAt)}</span>
                </div>
              </button>
              {onOpenPage && p.hasEditDoc ? (
                <button type="button" className="project-card-page" aria-label={`Open project page for ${p.id}`} title="Trang trình bày & duyệt" onClick={() => onOpenPage(p.id)}>📄</button>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

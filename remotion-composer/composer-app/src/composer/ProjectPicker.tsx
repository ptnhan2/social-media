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

export const ProjectPicker: React.FC<{ onOpen: (projectId: string) => void; onOpenPage?: (projectId: string) => void; onNewIdea?: () => void }> = ({ onOpen, onOpenPage, onNewIdea }) => {
  const [projects, setProjects] = React.useState<ProjectListItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [newId, setNewId] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [deleteConfirm, setDeleteConfirm] = React.useState<string | null>(null);

  const refresh = React.useCallback(() => {
    setLoading(true);
    listProjects().then((list) => { setProjects(list); setError(null); }).catch((e) => setError(e instanceof Error ? e.message : String(e))).finally(() => setLoading(false));
  }, []);
  React.useEffect(() => { refresh(); }, [refresh]);

  const handleDelete = async (id: string) => {
    try {
      await fetch("/api/projects/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: id, confirm: true }) }).then((r) => r.json());
      setDeleteConfirm(null);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setDeleteConfirm(null);
    }
  };

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
          {onNewIdea ? (
            <button type="button" className="ve-btn primary pp-newidea-btn" onClick={onNewIdea}>🎬 Video mới từ ý tưởng</button>
          ) : null}
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
              {deleteConfirm === p.id ? (
                <button type="button" className="project-card-delete confirm" aria-label={`Confirm delete ${p.id}`} title="Xoá vĩnh viễn — không thể hoàn tác" onClick={() => void handleDelete(p.id)}>✕ Xoá?</button>
              ) : (
                <button type="button" className="project-card-delete" aria-label={`Delete ${p.id}`} title="Xoá project" onClick={() => setDeleteConfirm(p.id)}>🗑</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

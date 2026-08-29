import React from "react";
import { BrowserRouter, Routes, Route, useNavigate, useSearchParams } from "react-router-dom";
import { VideoEditor } from "./composer/VideoEditor";
import { ProjectPicker } from "./composer/ProjectPicker";
import { AssetStudio } from "./assets/AssetStudio";
import { ProjectPage } from "./project/ProjectPage";
import { createProject } from "./composer/api";
import { AgentDrawer, AgentProvider, useAgentUi } from "./agent/AgentDrawer";
import "./styles.css";

/** Routes feed the app-level agent context: which project is open, which
 *  pipeline surface the user is standing on. The drawer itself lives above
 *  the router so the conversation survives navigation. */
const RouteContextReporter: React.FC<{ view: "picker" | "editor" | "studio" | "project"; projectId?: string }> = ({ view, projectId }) => {
  const agent = useAgentUi();
  React.useEffect(() => { agent.setView(view); }, [agent, view]);
  React.useEffect(() => { agent.setProjectId(projectId); }, [agent, projectId]);
  return null;
};

const EditorRoute: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const projectId = params.get("project");
  if (!projectId) return <>
    <RouteContextReporter view="picker" />
    <ProjectPicker onOpen={(id) => navigate(`/editor?project=${encodeURIComponent(id)}`)} onOpenPage={(id) => navigate(`/project?project=${encodeURIComponent(id)}`)} />
  </>;
  return (
    <>
      <RouteContextReporter view="editor" projectId={projectId} />
      <VideoEditor
        projectId={projectId}
        onExit={() => navigate("/")}
        onOpenStudio={() => navigate(`/assets?project=${encodeURIComponent(projectId)}`)}
        onOpenPage={() => navigate(`/project?project=${encodeURIComponent(projectId)}`)}
      />
    </>
  );
};

const StudioRoute: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const projectId = params.get("project") || "isaacverse-final";
  return (
    <>
      <RouteContextReporter view="studio" projectId={projectId} />
      <AssetStudio projectId={projectId} onBack={() => navigate(`/editor?project=${encodeURIComponent(projectId)}`)} />
    </>
  );
};

const ProjectRoute: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const projectId = params.get("project");
  const mode = params.get("mode");
  if (!projectId) return <>
    <RouteContextReporter view="picker" />
    <ProjectPicker onOpen={(id) => navigate(`/editor?project=${encodeURIComponent(id)}`)} onOpenPage={(id) => navigate(`/project?project=${encodeURIComponent(id)}`)} />
  </>;
  // Creation Flow: "new" is a virtual slug — create the blank project on
  // entry so draft_story/write_edit_doc have a home, then land in the studio
  // create mode (idea input first, never a dead blank page)
  if (projectId === "new") {
    return <NewIdeaRoute mode={mode} navigate={navigate} />;
  }
  return (
    <>
      <RouteContextReporter view="project" projectId={projectId} />
      <ProjectPage projectId={projectId} onOpenEditor={() => navigate(`/editor?project=${encodeURIComponent(projectId)}`)} />
    </>
  );
};

const NewIdeaRoute: React.FC<{ mode?: string | null; navigate: (path: string) => void }> = ({ mode, navigate }) => {
  const [slug, setSlug] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);
  const [created, setCreated] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (created) navigate(`/project?project=${encodeURIComponent(created)}`);
  }, [created, navigate]);
  if (mode !== "create") {
    return <ProjectPicker onOpen={(id) => navigate(`/editor?project=${encodeURIComponent(id)}`)} onOpenPage={(id) => navigate(`/project?project=${encodeURIComponent(id)}`)} />;
  }
  const create = async () => {
    const id = slug.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "-").replace(/^-+|-+$/g, "");
    if (!id) return;
    setCreating(true);
    setCreateError(null);
    try {
      await createProject(id);
      setCreated(id);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  };
  return (
    <div className="pp-page">
      <header className="pp-appbar">
        <div>
          <h1>🎬 Video mới từ ý tưởng</h1>
          <small>đặt tên project — rồi nhập ý tưởng trong studio</small>
        </div>
      </header>
      <section className="pp-card pp-create">
        <div className="pp-card-title">Tên project <small>— slug, vd: rhythm-editing</small></div>
        <div className="pp-slug-row">
          <input type="text" placeholder="my-video-slug" value={slug} aria-label="New project slug"
            onChange={(e) => setSlug(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void create(); }} />
          <button type="button" className="ve-btn primary" disabled={creating || !slug.trim()} onClick={() => void create()}>
            {creating ? "Đang tạo…" : "Tạo & bắt đầu →"}
          </button>
        </div>
        {createError ? <p className="ve-hint" style={{ color: "#ff9b9b" }}>{createError}</p> : null}
      </section>
    </div>
  );
};

const PickerRoute: React.FC = () => {
  const navigate = useNavigate();
  // CLIENT-SIDE navigation: the agent drawer (and its conversation) must
  // survive picker → editor — a full reload would kill the thread state.
  return (
    <>
      <RouteContextReporter view="picker" />
      <ProjectPicker
        onOpen={(id) => navigate(`/editor?project=${encodeURIComponent(id)}`)}
        onOpenPage={(id) => navigate(`/project?project=${encodeURIComponent(id)}`)}
        onNewIdea={() => navigate("/project?project=new&mode=create")}
      />
    </>
  );
};

export function App() {
  return (
    <BrowserRouter>
      <AgentProvider>
        <Routes>
          <Route path="/" element={<PickerRoute />} />
          <Route path="/editor" element={<EditorRoute />} />
          <Route path="/assets" element={<StudioRoute />} />
          <Route path="/project" element={<ProjectRoute />} />
        </Routes>
        <AgentDrawer />
      </AgentProvider>
    </BrowserRouter>
  );
}

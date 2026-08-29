import React from "react";
import { BrowserRouter, Routes, Route, useNavigate, useSearchParams } from "react-router-dom";
import { VideoEditor } from "./composer/VideoEditor";
import { ProjectPicker } from "./composer/ProjectPicker";
import { AssetStudio } from "./assets/AssetStudio";
import { ProjectPage } from "./project/ProjectPage";
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
  if (!projectId) return <>
    <RouteContextReporter view="picker" />
    <ProjectPicker onOpen={(id) => navigate(`/editor?project=${encodeURIComponent(id)}`)} onOpenPage={(id) => navigate(`/project?project=${encodeURIComponent(id)}`)} />
  </>;
  return (
    <>
      <RouteContextReporter view="project" projectId={projectId} />
      <ProjectPage projectId={projectId} onOpenEditor={() => navigate(`/editor?project=${encodeURIComponent(projectId)}`)} />
    </>
  );
};

const PickerRoute: React.FC = () => {
  const navigate = useNavigate();
  // CLIENT-SIDE navigation: the agent drawer (and its conversation) must
  // survive picker → editor — a full reload would kill the thread state.
  return (
    <>
      <RouteContextReporter view="picker" />
      <ProjectPicker onOpen={(id) => navigate(`/editor?project=${encodeURIComponent(id)}`)} onOpenPage={(id) => navigate(`/project?project=${encodeURIComponent(id)}`)} />
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

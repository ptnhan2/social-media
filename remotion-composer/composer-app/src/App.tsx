import React from "react";
import { BrowserRouter, Routes, Route, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { VideoEditor } from "./composer/VideoEditor";
import { ProjectPicker } from "./composer/ProjectPicker";
import { AssetStudio } from "./assets/AssetStudio";
import "./styles.css";

const EditorRoute: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const projectId = params.get("project");
  if (!projectId) return <ProjectPicker onOpen={(id) => navigate(`/editor?project=${encodeURIComponent(id)}`)} />;
  return (
    <VideoEditor
      projectId={projectId}
      onExit={() => navigate("/")}
      onOpenStudio={() => navigate(`/assets?project=${encodeURIComponent(projectId)}`)}
    />
  );
};

const StudioRoute: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const projectId = params.get("project") || "isaacverse-final";
  return <AssetStudio projectId={projectId} onBack={() => navigate(`/editor?project=${encodeURIComponent(projectId)}`)} />;
};

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProjectPicker onOpen={(id) => window.location.assign(`/editor?project=${encodeURIComponent(id)}`)} />} />
        <Route path="/editor" element={<EditorRoute />} />
        <Route path="/assets" element={<StudioRoute />} />
      </Routes>
    </BrowserRouter>
  );
}

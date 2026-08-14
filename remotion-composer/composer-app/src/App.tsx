import React from "react";
import { VideoEditor } from "./composer/VideoEditor";
import { ProjectPicker } from "./composer/ProjectPicker";
import "./styles.css";

export function App() {
  const [projectId, setProjectId] = React.useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("project");
  });

  const navigate = (id: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("project", id);
    window.history.pushState({}, "", url);
    setProjectId(id);
  };

  React.useEffect(() => {
    const onPop = () => {
      const params = new URLSearchParams(window.location.search);
      setProjectId(params.get("project"));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  if (!projectId) return <ProjectPicker onOpen={navigate} />;
  return <VideoEditor projectId={projectId} onExit={() => { setProjectId(null); const url = new URL(window.location.href); url.searchParams.delete("project"); window.history.pushState({}, "", url); }} />;
}

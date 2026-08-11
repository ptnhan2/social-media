import React from "react";
import { Composition } from "remotion";
import { ProjectLoader } from "../../shared/isaacverse/ProjectLoader";

const FinalProject = () => <ProjectLoader src="isaacverse-final/05-edit-doc.json" />;

export const Root: React.FC = () => (
  <Composition id="isaacverse-final-30s" component={FinalProject} durationInFrames={900} fps={30} width={1920} height={1080} />
);

import React from "react";
import { Composition, staticFile } from "remotion";
import { ProjectLoader } from "../../shared/isaacverse/ProjectLoader";

const FinalProject = () => <ProjectLoader src="isaacverse-final/05-edit-doc.json" editorSrc="isaacverse-final/editor/current.json" />;

const calculateFinalMetadata = async () => {
  const editDoc = await fetch(staticFile("isaacverse-final/05-edit-doc.json")).then((response) => response.json()) as { beats?: { startSec: number; durationSec: number }[] };
  const editorResponse = await fetch(staticFile("isaacverse-final/editor/current.json"));
  const editor = editorResponse.ok ? await editorResponse.json() as { durationSec?: number } : null;
  const semanticDuration = Math.max(0, ...(editDoc.beats || []).map((beat) => beat.startSec + beat.durationSec));
  return { durationInFrames: Math.ceil(Math.max(semanticDuration, editor?.durationSec || 0) * 30) };
};

export const Root: React.FC = () => (
  <Composition id="isaacverse-final-30s" component={FinalProject} durationInFrames={900} calculateMetadata={calculateFinalMetadata} fps={30} width={1920} height={1080} />
);

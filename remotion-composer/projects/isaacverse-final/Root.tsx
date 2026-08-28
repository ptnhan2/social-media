import React from "react";
import { Composition, staticFile } from "remotion";
import { ProjectLoader } from "../../shared/isaacverse/ProjectLoader";
import extraProjects from "./projects-manifest.json";

// Treatment path — the v009-master render flow (BeatTreatment reads the style store live).
const FinalProject = () => <ProjectLoader src="isaacverse-final/05-edit-doc.json" />;

// Editor path (spec E2) — the clip-first render flow driven by editor/current.json.
// The generator (scripts/generate-editor.mjs) keeps that doc in sync with the
// style store while preserving user edits (userEdited ledger).
const FinalProjectEditor = () => <ProjectLoader src="isaacverse-final/05-edit-doc.json" editorSrc="isaacverse-final/editor/current.json" />;

// ai-dialogue-therapy — first content-plan video (#2: "Why AI Dialogue Sounds
// Like Therapy"). Reuses the isaacverse character poses + music bed.
const TherapyProject = () => <ProjectLoader src="ai-dialogue-therapy/05-edit-doc.json" />;
const TherapyProjectEditor = () => <ProjectLoader src="ai-dialogue-therapy/05-edit-doc.json" editorSrc="ai-dialogue-therapy/editor/current.json" />;

const calculateFinalMetadata = async () => {
  const editDoc = await fetch(staticFile("isaacverse-final/05-edit-doc.json")).then((response) => response.json()) as { beats?: { startSec: number; durationSec: number }[] };
  const editorResponse = await fetch(staticFile("isaacverse-final/editor/current.json"));
  const editor = editorResponse.ok ? await editorResponse.json() as { durationSec?: number } : null;
  const semanticDuration = Math.max(0, ...(editDoc.beats || []).map((beat) => beat.startSec + beat.durationSec));
  return { durationInFrames: Math.ceil(Math.max(semanticDuration, editor?.durationSec || 0) * 30) };
};

const calculateTherapyMetadata = async () => {
  const editDoc = await fetch(staticFile("ai-dialogue-therapy/05-edit-doc.json")).then((response) => response.json()) as { beats?: { startSec: number; durationSec: number }[] };
  const semanticDuration = Math.max(0, ...(editDoc.beats || []).map((beat) => beat.startSec + beat.durationSec));
  return { durationInFrames: Math.ceil(Math.max(semanticDuration, 0.1) * 30) };
};

// Manifest-registered projects (auto-registration, TODO A2 closed): the
// produce flow's generate-timeline.mjs appends new project slugs to
// projects-manifest.json — no manual Root.tsx edit needed for a new video.
// Duration is computed at RENDER time from the project's own edit-doc.
const manifestProjects = (extraProjects as { projects?: { slug?: unknown }[] }).projects ?? [];
const calculateManifestMetadata = (slug: string) => async () => {
  const editDoc = await fetch(staticFile(`${slug}/05-edit-doc.json`)).then((response) => response.json()) as { beats?: { startSec: number; durationSec: number }[] };
  const semanticDuration = Math.max(0, ...(editDoc.beats || []).map((beat) => beat.startSec + beat.durationSec));
  return { durationInFrames: Math.ceil(Math.max(semanticDuration, 0.1) * 30) };
};

export const Root: React.FC = () => (
  <>
    <Composition id="isaacverse-final-30s" component={FinalProject} durationInFrames={900} calculateMetadata={calculateFinalMetadata} fps={30} width={1920} height={1080} />
    <Composition id="isaacverse-final-30s-editor" component={FinalProjectEditor} durationInFrames={900} calculateMetadata={calculateFinalMetadata} fps={30} width={1920} height={1080} />
    <Composition id="ai-dialogue-therapy-30s" component={TherapyProject} durationInFrames={900} calculateMetadata={calculateTherapyMetadata} fps={30} width={1920} height={1080} />
    <Composition id="ai-dialogue-therapy-30s-editor" component={TherapyProjectEditor} durationInFrames={900} calculateMetadata={calculateTherapyMetadata} fps={30} width={1920} height={1080} />
    {manifestProjects.flatMap((entry) => {
      const slug = typeof entry?.slug === "string" ? entry.slug : "";
      if (!slug || slug === "isaacverse-final" || slug === "ai-dialogue-therapy") return [];
      const Project = () => <ProjectLoader src={`${slug}/05-edit-doc.json`} />;
      const ProjectEditor = () => <ProjectLoader src={`${slug}/05-edit-doc.json`} editorSrc={`${slug}/editor/current.json`} />;
      const metadata = calculateManifestMetadata(slug);
      return [
        <Composition key={`${slug}-semantic`} id={`${slug}-30s`} component={Project} durationInFrames={900} calculateMetadata={metadata} fps={30} width={1920} height={1080} />,
        <Composition key={`${slug}-editor`} id={`${slug}-30s-editor`} component={ProjectEditor} durationInFrames={900} calculateMetadata={metadata} fps={30} width={1920} height={1080} />,
      ];
    })}
  </>
);

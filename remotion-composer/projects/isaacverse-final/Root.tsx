import React from "react";
import { Composition, staticFile } from "remotion";
import { ProjectLoader } from "../../shared/isaacverse/ProjectLoader";

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

// mini-loop-test — M3 zero-manual E2E vehicle: a 3-beat mini video produced
// entirely by the harness loop (scaffold-voice-plan -> generate-timeline ->
// render), no editor interaction.
const MiniLoopProject = () => <ProjectLoader src="mini-loop-test/05-edit-doc.json" />;
const MiniLoopProjectEditor = () => <ProjectLoader src="mini-loop-test/05-edit-doc.json" editorSrc="mini-loop-test/editor/current.json" />;

const calculateMiniLoopMetadata = async () => {
  const editDoc = await fetch(staticFile("mini-loop-test/05-edit-doc.json")).then((response) => response.json()) as { beats?: { startSec: number; durationSec: number }[] };
  const semanticDuration = Math.max(0, ...(editDoc.beats || []).map((beat) => beat.startSec + beat.durationSec));
  return { durationInFrames: Math.ceil(Math.max(semanticDuration, 0.1) * 30) };
};

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

export const Root: React.FC = () => (
  <>
    <Composition id="isaacverse-final-30s" component={FinalProject} durationInFrames={900} calculateMetadata={calculateFinalMetadata} fps={30} width={1920} height={1080} />
    <Composition id="isaacverse-final-30s-editor" component={FinalProjectEditor} durationInFrames={900} calculateMetadata={calculateFinalMetadata} fps={30} width={1920} height={1080} />
    <Composition id="ai-dialogue-therapy-30s" component={TherapyProject} durationInFrames={900} calculateMetadata={calculateTherapyMetadata} fps={30} width={1920} height={1080} />
    <Composition id="ai-dialogue-therapy-30s-editor" component={TherapyProjectEditor} durationInFrames={900} calculateMetadata={calculateTherapyMetadata} fps={30} width={1920} height={1080} />
    <Composition id="mini-loop-test-30s" component={MiniLoopProject} durationInFrames={900} calculateMetadata={calculateMiniLoopMetadata} fps={30} width={1920} height={1080} />
    <Composition id="mini-loop-test-30s-editor" component={MiniLoopProjectEditor} durationInFrames={900} calculateMetadata={calculateMiniLoopMetadata} fps={30} width={1920} height={1080} />
  </>
);

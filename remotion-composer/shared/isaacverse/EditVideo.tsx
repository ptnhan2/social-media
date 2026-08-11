import React from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import {
  AudienceDemandProof,
  CandidateComparison,
  ChapterCard,
  CinematicMetaphor,
  HostReflectionShot,
  ProcessTimeline,
  SceneTransition,
  ScreenProofInWorld,
  SemanticDiagram,
} from "./treatments";
import type { IsaacVerseEditDoc, SemanticBeat } from "./types";
import { AudioMixer } from "./audio";

const asString = (value: unknown, fallback = "") => typeof value === "string" ? value : fallback;
const asNumber = (value: unknown, fallback: number) => typeof value === "number" && Number.isFinite(value) ? value : fallback;
const assetSrc = (beat: SemanticBeat, kind: string) => beat.treatment.assets.find((asset) => asset.kind === kind)?.src;

const valueAtPath = (beat: SemanticBeat, sourcePath?: string): unknown => {
  if (!sourcePath) return undefined;
  const tokens = sourcePath.replace(/^treatment\./, "").replace(/\[(\d+)\]/g, ".$1").split(".");
  let current: unknown = beat.treatment;
  for (const token of tokens) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[token];
  }
  return current;
};

const elementText = (value: unknown, fallback: string) => {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.label === "string") return record.label;
    if (typeof record.text === "string") return record.text;
    if (typeof record.detail === "string") return record.detail;
  }
  return fallback;
};

const elementAsset = (beat: SemanticBeat, sourcePath?: string) => {
  const value = valueAtPath(beat, sourcePath);
  if (value && typeof value === "object" && typeof (value as { src?: unknown }).src === "string") return (value as { src: string }).src;
  return undefined;
};

const MissingTreatment: React.FC<{ id: string; beatId: string }> = ({ id, beatId }) => (
  <AbsoluteFill style={{ background: "#090b10", color: "#ec6a5e", alignItems: "center", justifyContent: "center", fontFamily: "Arial, sans-serif" }}>
    <div style={{ border: "1px solid #ec6a5e", padding: 28, textAlign: "center" }}>
      <div style={{ fontSize: 18, fontWeight: 700 }}>Missing treatment</div>
      <div style={{ marginTop: 8, opacity: 0.75 }}>{id}</div>
      <div style={{ marginTop: 4, opacity: 0.55 }}>beat: {beatId}</div>
    </div>
  </AbsoluteFill>
);

/** Resolve a SemanticBeat into a concrete Remotion treatment component. */
export const BeatTreatment: React.FC<{ beat: SemanticBeat }> = ({ beat }) => {
  const params = beat.treatment.params;
  switch (beat.treatment.id) {
    case "semantic-diagram":
      return (
        <SemanticDiagram
          title={asString(params.title, beat.narrativeFunction)}
          kicker={asString(params.kicker)}
          centerLabel={asString(params.centerLabel)}
          nodes={Array.isArray(params.nodes) ? params.nodes as any : []}
          edges={Array.isArray(params.edges) ? params.edges as any : []}
          accent={asString(params.accent, undefined)}
          secondaryAccent={asString(params.secondaryAccent, undefined)}
        />
      );
    case "chapter-card":
      return <ChapterCard title={asString(params.title, beat.narrativeFunction)} subtitle={asString(params.subtitle)} accent={asString(params.accent, undefined)} />;
    case "audience-demand-proof":
      return (
        <AudienceDemandProof
          comments={Array.isArray(params.comments) ? params.comments as any : []}
          contextSrc={assetSrc(beat, "screen")}
          hostSrc={assetSrc(beat, "character")}
          caption={asString(params.caption)}
          accent={asString(params.accent, undefined)}
        />
      );
    case "screen-proof-in-world":
      return (
        <ScreenProofInWorld
          screenSrc={assetSrc(beat, "screen") ?? ""}
          hostSrc={assetSrc(beat, "character")}
          caption={asString(params.caption)}
          accent={asString(params.accent, undefined)}
          focusRect={params.focusRect as any}
        />
      );
    case "host-reflection-cinematic":
      return (
        <HostReflectionShot
          src={assetSrc(beat, "character") ?? assetSrc(beat, "image") ?? ""}
          subtitle={asString(params.subtitle, beat.transcript)}
          accent={asString(params.accent, undefined)}
          lightSide={params.lightSide === "right" ? "right" : "left"}
        />
      );
    case "cinematic-metaphor":
      return (
        <CinematicMetaphor
          src={assetSrc(beat, "image") ?? assetSrc(beat, "video") ?? ""}
          subtitle={asString(params.subtitle, beat.transcript)}
          label={asString(params.label)}
          accent={asString(params.accent, undefined)}
          mode={params.mode === "line-art" || params.mode === "warm" ? params.mode : "cinematic"}
        />
      );
    case "candidate-comparison":
      return (
        <CandidateComparison
          title={asString(params.title, beat.narrativeFunction)}
          criteria={asString(params.criteria)}
          candidates={Array.isArray(params.candidates) ? params.candidates as any : []}
          selectedIndex={asNumber(params.selectedIndex, 0)}
          accent={asString(params.accent, undefined)}
        />
      );
    case "process-timeline":
      return (
        <ProcessTimeline
          title={asString(params.title, beat.narrativeFunction)}
          steps={Array.isArray(params.steps) ? params.steps as any : []}
          activeStep={asNumber(params.activeStep, 0)}
          accent={asString(params.accent, undefined)}
        />
      );
    default:
      return <MissingTreatment id={beat.treatment.id} beatId={beat.id} />;
  }
};

export const BeatElementOverlay: React.FC<{ beat: SemanticBeat }> = ({ beat }) => (
  <AbsoluteFill style={{ pointerEvents: "none", zIndex: 30 }}>
    {beat.elements?.filter((element) => element.geometry).map((element) => {
      const geometry = element.geometry!;
      const metadata = element.metadata || {};
      const isText = element.kind === "text" || element.kind === "node" || element.kind === "step";
      const src = elementAsset(beat, element.sourcePath);
      return (
        <div key={element.id} data-element-id={element.id} style={{ position: "absolute", left: `${geometry.x / 9.6}%`, top: `${geometry.y / 5.4}%`, width: `${geometry.width / 9.6}%`, height: `${geometry.height / 5.4}%`, transform: `rotate(${geometry.rotation || 0}deg)`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", color: typeof metadata.color === "string" ? metadata.color : "#f4f7f7", fontFamily: typeof metadata.fontFamily === "string" ? metadata.fontFamily : "inherit", fontSize: typeof metadata.fontSize === "number" ? metadata.fontSize : 28, fontWeight: typeof metadata.fontWeight === "number" ? metadata.fontWeight : 600, textAlign: "center", textShadow: "0 2px 8px rgba(0,0,0,.55)" }}>
          {isText ? elementText(metadata.text ?? valueAtPath(beat, element.sourcePath), element.role) : src ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : null}
        </div>
      );
    })}
  </AbsoluteFill>
);

const BeatCamera: React.FC<{ beat: SemanticBeat; children: React.ReactNode }> = ({ beat, children }) => {
  const params = beat.treatment.params;
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const phase = beat.motionPhases?.[0];
  const phaseStartFrame = Math.max(0, Math.round((phase?.startSec ?? 0) * fps));
  const phaseEndFrame = Math.max(phaseStartFrame + 1, Math.round(beat.durationSec * fps), Math.round(((phase?.startSec ?? 0) + (phase?.durationSec ?? beat.durationSec)) * fps));
  const requestedScale = typeof params.cameraScale === "number" ? params.cameraScale : typeof phase?.params?.cameraScale === "number" ? phase.params.cameraScale : 1.12;
  const targetScale = Math.max(1.12, requestedScale);
  const scale = interpolate(frame, [phaseStartFrame, phaseEndFrame], [1, targetScale], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const driftX = interpolate(frame, [phaseStartFrame, phaseEndFrame], [0, 18], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const driftY = interpolate(frame, [phaseStartFrame, phaseEndFrame], [0, -10], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const focus = isPoint(params.focusPoint) ? params.focusPoint : { x: 0.5, y: 0.5 };
  return <AbsoluteFill style={{ transform: `translate(${driftX}px, ${driftY}px) scale(${scale})`, transformOrigin: `${focus.x * 100}% ${focus.y * 100}%` }}>{children}</AbsoluteFill>;
};

const isPoint = (value: unknown): value is { x: number; y: number } => {
  if (!value || typeof value !== "object") return false;
  const point = value as { x?: unknown; y?: unknown };
  return typeof point.x === "number" && typeof point.y === "number";
};

const gradeStyle = (plan: IsaacVerseEditDoc["colorGrade"]): React.CSSProperties => {
  if (!plan || plan.preset === "none") return {};
  const intensity = Math.max(0, Math.min(1, plan.intensity));
  if (plan.preset === "warm") return { filter: `saturate(${1 + intensity * 0.18}) sepia(${intensity * 0.18}) contrast(${1 + intensity * 0.08})` };
  if (plan.preset === "cinematic") return { filter: `saturate(${1 - intensity * 0.16}) contrast(${1 + intensity * 0.16}) brightness(${1 - intensity * 0.05})` };
  return { filter: `contrast(${1 + intensity * 0.04}) saturate(${1 + intensity * 0.04})` };
};

/** Render-time composition: VideoDoc beat plan -> ordered timeline. */
export const IsaacVerseEditVideo: React.FC<{ doc: IsaacVerseEditDoc }> = ({ doc }) => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: "#07090d" }}>
      {doc.audioPlan ? <AudioMixer plan={doc.audioPlan} /> : null}
      <AbsoluteFill style={gradeStyle(doc.colorGrade)}>
        {doc.beats.map((beat) => (
          <Sequence key={beat.id} from={Math.round(beat.startSec * fps)} durationInFrames={Math.max(1, Math.round(beat.durationSec * fps))}>
            <BeatCamera beat={beat}><BeatTreatment beat={beat} /><BeatElementOverlay beat={beat} /></BeatCamera>
          </Sequence>
        ))}
        {doc.transitions?.map((transition) => (
          <Sequence key={transition.id} from={Math.round(transition.atSec * fps)} durationInFrames={Math.max(1, Math.round(transition.durationSec * fps))}>
            <SceneTransition type={transition.type} accent={transition.accent} />
          </Sequence>
        ))}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

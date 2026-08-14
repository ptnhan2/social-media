import React from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Video } from "@remotion/media";
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
import type { EditorDoc } from "./editor";
import { AudioMixer } from "./audio";
import { cameraPhaseFrames } from "./motion";
import { clipFilterCss, keyframeValueAt, overlayStyleAt } from "./clipStyle";

const asString = (value: unknown, fallback = "") => typeof value === "string" ? value : fallback;
const asNumber = (value: unknown, fallback: number) => typeof value === "number" && Number.isFinite(value) ? value : fallback;
const assetSrc = (beat: SemanticBeat, kind: string) => beat.treatment.assets.find((asset) => asset.kind === kind)?.src;
const beatEndSec = (beat: SemanticBeat) => beat.startSec + beat.durationSec;

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

const elementAsset = (beat: SemanticBeat, sourcePath?: string, metadata?: Record<string, unknown>) => {
  if (typeof metadata?.assetSrc === "string") return metadata.assetSrc;
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

export const BeatElementOverlay: React.FC<{ beat: SemanticBeat; includeUnmodified?: boolean }> = ({ beat, includeUnmodified = false }) => (
  <AbsoluteFill style={{ pointerEvents: "none", zIndex: 30 }}>
    {beat.elements?.filter((element) => element.geometry && (includeUnmodified || element.metadata?.canvasOverride === true)).map((element) => {
      const geometry = element.geometry!;
      const metadata = element.metadata || {};
      const isText = element.kind === "text" || element.kind === "node" || element.kind === "step";
       const src = elementAsset(beat, element.sourcePath, metadata);
      return (
        <div key={element.id} data-element-id={element.id} style={{ position: "absolute", left: `${geometry.x / 9.6}%`, top: `${geometry.y / 5.4}%`, width: `${geometry.width / 9.6}%`, height: `${geometry.height / 5.4}%`, transform: `rotate(${geometry.rotation || 0}deg)`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", color: typeof metadata.color === "string" ? metadata.color : "#f4f7f7", fontFamily: typeof metadata.fontFamily === "string" ? metadata.fontFamily : "inherit", fontSize: typeof metadata.fontSize === "number" ? metadata.fontSize : 28, fontWeight: typeof metadata.fontWeight === "number" ? metadata.fontWeight : 600, textAlign: "center", textShadow: "0 2px 8px rgba(0,0,0,.55)" }}>
          {isText ? elementText(metadata.text ?? valueAtPath(beat, element.sourcePath), element.role) : src ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: metadata.fit === "cover" ? "cover" : "contain" }} /> : null}
        </div>
      );
    })}
  </AbsoluteFill>
);

const BeatCanvasComposition: React.FC<{ beat: SemanticBeat }> = ({ beat }) => (
  <AbsoluteFill style={{ background: "#07090d", overflow: "hidden" }}>
    <BeatElementOverlay beat={beat} includeUnmodified />
  </AbsoluteFill>
);

export const BeatContent: React.FC<{ beat: SemanticBeat }> = ({ beat }) => {
  return <AbsoluteFill style={{ background: "#07090d", overflow: "hidden" }} />;
};

const BeatCamera: React.FC<{ beat: SemanticBeat; children: React.ReactNode }> = ({ beat, children }) => {
  const params = beat.treatment.params;
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const phase = beat.motionPhases?.[0];
  const { startFrame: phaseStartFrame, endFrame: phaseEndFrame } = cameraPhaseFrames(beat.durationSec, phase, fps);
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
export const IsaacVerseEditVideo: React.FC<{ doc: IsaacVerseEditDoc; editor?: EditorDoc }> = ({ doc, editor }) => {
  const { fps } = useVideoConfig();
  const videoTrack = editor?.tracks.find((track) => track.id === "video-main");
  const videoClips = videoTrack && !videoTrack.hidden ? videoTrack.clips.filter((clip) => Boolean(clip.source.beatId)) : [];
  const timelineBeats = editor && videoTrack ? videoClips.map((clip) => ({ clip, beat: doc.beats.find((candidate) => candidate.id === clip.source.beatId) })).filter((entry): entry is { clip: typeof videoClips[number]; beat: SemanticBeat } => Boolean(entry.beat)) : doc.beats.map((beat) => ({ clip: undefined, beat }));
  const transitionClips = editor?.tracks.find((track) => track.id === "transitions")?.clips.filter((clip) => Boolean(clip.source.transitionId));
  const overlayClips = (editor?.tracks.filter((track) => (track.kind === "text" || track.kind === "overlay" || track.kind === "video") && !track.hidden).flatMap((track) => track.clips.filter((clip) => !clip.hidden && clip.kind === "element")) ?? []).slice().sort((a, b) => (typeof a.metadata.z === "number" ? a.metadata.z : 10) - (typeof b.metadata.z === "number" ? b.metadata.z : 10));
  return (
    <AbsoluteFill style={{ background: "#07090d" }}>
      {doc.audioPlan ? <AudioMixer plan={doc.audioPlan} editor={editor} /> : null}
      <AbsoluteFill style={gradeStyle(doc.colorGrade)}>
        {timelineBeats.map(({ clip, beat }) => (
          <Sequence key={clip?.id ?? beat.id} from={Math.round((clip?.range.startSec ?? beat.startSec) * fps)} durationInFrames={Math.max(1, Math.round(((clip?.range.endSec ?? beatEndSec(beat)) - (clip?.range.startSec ?? beat.startSec)) * fps))}>
            <BeatCamera beat={beat}><BeatContent beat={beat} /></BeatCamera>
          </Sequence>
        ))}
        {(transitionClips?.length ? transitionClips.map((clip) => ({ clip, transition: doc.transitions?.find((candidate) => candidate.id === clip.source.transitionId) })).filter((entry): entry is { clip: typeof transitionClips[number]; transition: NonNullable<typeof doc.transitions>[number] } => Boolean(entry.transition)) : (doc.transitions || []).map((transition) => ({ clip: undefined, transition }))).map(({ clip, transition }) => (
          <Sequence key={clip?.id ?? transition.id} from={Math.round((clip?.range.startSec ?? transition.atSec) * fps)} durationInFrames={Math.max(1, Math.round(((clip?.range.endSec ?? transition.atSec + transition.durationSec) - (clip?.range.startSec ?? transition.atSec)) * fps))}>
            <SceneTransition type={clip && (clip.metadata.transitionType === "flash" || clip.metadata.transitionType === "fade" || clip.metadata.transitionType === "blur" || clip.metadata.transitionType === "light-leak") ? clip.metadata.transitionType : transition.type} accent={transition.accent} />
          </Sequence>
        ))}
        {overlayClips.map((clip) => (
          <Sequence key={clip.id} from={Math.round(clip.range.startSec * fps)} durationInFrames={Math.max(1, Math.round((clip.range.endSec - clip.range.startSec) * fps))}>
            <EditorClipOverlay clip={clip} fps={fps} />
          </Sequence>
        ))}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const EditorClipOverlay: React.FC<{ clip: EditorDoc["tracks"][number]["clips"][number]; fps: number }> = ({ clip }) => {
  const frame = useCurrentFrame();
  const md = clip.metadata;
  const localSec = frame / useVideoConfig().fps;
  const style = overlayStyleAt(clip, clip.range.startSec + localSec);
  const filter = clipFilterCss(md.filter);
  const flipTransform = `${md.flipH ? "scaleX(-1) " : ""}${md.flipV ? "scaleY(-1) " : ""}`;
  const baseStyle: React.CSSProperties = {
    position: "absolute",
    left: `${style.x * 100}%`,
    top: `${style.y * 100}%`,
    width: `${style.w * 100}%`,
    height: `${style.h * 100}%`,
    opacity: style.opacity,
    transform: `${flipTransform}rotate(${style.rotation}deg) scale(${style.scale})`,
    transformOrigin: "center center",
    pointerEvents: "none",
    overflow: "hidden",
    zIndex: typeof md.z === "number" ? Math.round(md.z) : 10,
  };
  if (md.isTextClip) {
    return (
      <div style={baseStyle}>
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center",
          justifyContent: md.textAlign === "left" ? "flex-start" : md.textAlign === "right" ? "flex-end" : "center",
          color: typeof md.color === "string" ? md.color : "#ffffff",
          fontFamily: typeof md.fontFamily === "string" ? md.fontFamily : "Inter, sans-serif",
          fontSize: keyframeValueAt(Array.isArray((md.keyframes as Record<string, unknown> | undefined)?.fontSize) ? (md.keyframes as Record<string, never>).fontSize as never : undefined, localSec, typeof md.fontSize === "number" ? md.fontSize : 48),
          fontWeight: typeof md.fontWeight === "number" ? md.fontWeight : 700,
          fontStyle: md.fontStyle === "italic" ? "italic" : md.italic ? "italic" : "normal",
          textDecoration: md.underline ? "underline" : "none",
          textAlign: typeof md.textAlign === "string" ? md.textAlign as React.CSSProperties["textAlign"] : "center",
          letterSpacing: typeof md.letterSpacing === "number" ? `${md.letterSpacing}px` : undefined,
          lineHeight: typeof md.lineHeight === "number" ? md.lineHeight : undefined,
          textTransform: typeof md.textTransform === "string" ? md.textTransform as React.CSSProperties["textTransform"] : undefined,
          WebkitTextStroke: typeof md.strokeWidth === "number" ? `${md.strokeWidth}px ${typeof md.strokeColor === "string" ? md.strokeColor : "#000"}` : undefined,
          background: typeof md.bgColor === "string" ? md.bgColor : undefined,
          textShadow: typeof md.shadowBlur === "number" ? `0 0 ${md.shadowBlur}px ${typeof md.shadowColor === "string" ? md.shadowColor : "rgba(0,0,0,.7)"}` : (typeof md.textShadow === "string" ? md.textShadow : "0 2px 8px rgba(0,0,0,.55)"),
          filter: typeof md.glowBlur === "number" ? `drop-shadow(0 0 ${md.glowBlur}px ${typeof md.glowColor === "string" ? md.glowColor : "#fff"})` : undefined,
          padding: "0 2%", boxSizing: "border-box", overflow: "hidden",
        }}>
          {String(md.text ?? "")}
        </div>
      </div>
    );
  }
  if (md.elementType === "shape" || (!md.src && !md.isTextClip && typeof md.background === "string")) {
    return (
      <div style={{
        ...baseStyle,
        background: typeof md.background === "string" ? md.background : undefined,
        borderRadius: typeof md.borderRadius === "number" ? md.borderRadius : undefined,
        border: typeof md.borderWidth === "number" ? `${md.borderWidth}px solid ${typeof md.borderColor === "string" ? md.borderColor : "transparent"}` : undefined,
        boxShadow: typeof md.boxShadow === "string" ? md.boxShadow : undefined,
      }} />
    );
  }
  if (typeof md.src === "string") {
    const speed = typeof md.speed === "number" ? md.speed : 1;
    const isVideoAsset = md.assetKind === "video" || /\.(mp4|webm|mov)(\?|$)/i.test(md.src);
    return (
      <div style={{ ...baseStyle, filter }}>
        {isVideoAsset ? (
          <Video src={md.src} playbackRate={speed} style={{ width: "100%", height: "100%", objectFit: md.fit === "cover" ? "cover" : "contain" }} />
        ) : (
          <img src={md.src} alt="" style={{ width: "100%", height: "100%", objectFit: md.fit === "cover" ? "cover" : "contain" }} />
        )}
      </div>
    );
  }
  return null;
};

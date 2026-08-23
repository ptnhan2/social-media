import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { getStyle, defaultStroke, type StrokeStyle } from "./styleLoader";

export type DiagramNode = {
  id: string;
  label: string;
  x: number;
  y: number;
  activeFrom?: number;
  color?: string;
  detail?: string;
};

export type DiagramEdge = {
  from: string;
  to: string;
  revealAt?: number;
  color?: string;
};

export type SemanticDiagramProps = {
  title: string;
  kicker?: string;
  centerLabel?: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  durationInFrames?: number;
  accent?: string;
  secondaryAccent?: string;
};

// Palette reads from the style store (colors.*) so the agent can learn
// palette-level aesthetics; constants remain as fallbacks.
const AMBER = () => getStyle<string>("colors.amber", "#f2b84b");
const CYAN = () => getStyle<string>("colors.cyan", "#61d7e8");
const PAPER = () => getStyle<string>("colors.paper", "#f4e8cf");
const BLACK = () => getStyle<string>("colors.black", "#07090d");

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const nodeMap = (nodes: DiagramNode[]) => new Map(nodes.map((node) => [node.id, node]));

const Edge: React.FC<{
  edge: DiagramEdge;
  nodes: Map<string, DiagramNode>;
  frame: number;
  fps: number;
}> = ({ edge, nodes, frame, fps }) => {
  const from = nodes.get(edge.from);
  const to = nodes.get(edge.to);
  if (!from || !to) return null;

  const ss = getStyle<StrokeStyle>("treatments.semantic-diagram.edge.stroke", defaultStroke);
  const revealDur = getStyle<number>("treatments.semantic-diagram.edge.revealDurationSec", 0.65);
  const revealFrame = (edge.revealAt ?? 0) * fps;
  const progress = interpolate(frame, [revealFrame, revealFrame + revealDur * fps], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const x1 = from.x;
  const y1 = from.y;
  const x2 = to.x;
  const y2 = to.y;
  // organic curve: quadratic bezier with a perpendicular offset at the midpoint
  // (curvature knob, 0 = straight). Draw-on via pathLength normalization.
  const curvature = getStyle<number>("treatments.semantic-diagram.edge.curvature", 0.12);
  const cx = (x1 + x2) / 2 - (y2 - y1) * curvature;
  const cy = (y1 + y2) / 2 + (x2 - x1) * curvature;
  const pathD = `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
  const gradId = `edgeGrad-${edge.from}-${edge.to}`;
  const baseColor = edge.color ?? ss.color;
  const isGradient = ss.mode === "gradient";
  const isBrush = ss.mode === "brush";
  const stroke = isGradient ? `url(#${gradId})` : baseColor;

  return (
    <g>
      {isGradient && (
        <defs>
          <linearGradient id={gradId} x1={`${x1}%`} y1={`${y1}%`} x2={`${x2}%`} y2={`${y2}%`}>
            <stop offset="0%" stopColor={ss.gradientStops[0] ?? "#7fd8e8"} />
            <stop offset="100%" stopColor={ss.gradientStops[1] ?? "#f2d58a"} />
          </linearGradient>
        </defs>
      )}
      <path
        d={pathD}
        pathLength={100}
        fill="none"
        stroke={stroke}
        strokeWidth={ss.width}
        strokeDasharray={isBrush ? ss.brushDasharray : "100"}
        strokeDashoffset={isBrush ? 0 : 100 * (1 - progress)}
        strokeLinecap={ss.linecap as React.SVGProps<SVGPathElement>["strokeLinecap"]}
      />
    </g>
  );
};

const DiagramNodeView: React.FC<{
  node: DiagramNode;
  frame: number;
  fps: number;
  accent: string;
  secondaryAccent: string;
}> = ({ node, frame, fps, accent, secondaryAccent }) => {
  const revealFrame = (node.activeFrom ?? 0) * fps;
  const entDamping = getStyle<number>("treatments.semantic-diagram.entrance.damping", 18);
  const entStiffness = getStyle<number>("treatments.semantic-diagram.entrance.stiffness", 140);
  const entMass = getStyle<number>("treatments.semantic-diagram.entrance.mass", 0.8);
  const entDur = getStyle<number>("treatments.semantic-diagram.entrance.durationSec", 0.75);
  const entrance = spring({
    frame: Math.max(0, frame - revealFrame),
    fps,
    config: { damping: entDamping, stiffness: entStiffness, mass: entMass },
    durationInFrames: Math.round(entDur * fps),
  });
  const activeFrame = frame >= revealFrame ? 1 : 0;
  const activePulse = activeFrame
    ? 1 + 0.08 * Math.sin((frame - revealFrame) / 5)
    : 1;
  const color = node.color ?? accent;

  return (
    <div
      style={{
        position: "absolute",
        left: `${node.x}%`,
        top: `${node.y}%`,
        width: 270,
        transform: `translate(-50%, -50%) scale(${(0.82 + entrance * 0.18) * activePulse})`,
        opacity: entrance,
        transformOrigin: "center",
      }}
    >
      <div
        style={{
          border: `${getStyle<number>("treatments.semantic-diagram.node.borderWidth", 2)}px solid ${color}`,
          borderRadius: getStyle<number>("treatments.semantic-diagram.node.borderRadius", 10),
          padding: getStyle<string>("treatments.semantic-diagram.node.padding", "14px 18px 13px"),
          background: getStyle<string>("treatments.semantic-diagram.node.background", "rgba(7,9,13,0.84)"),
          boxShadow: `0 0 ${getStyle<number>("treatments.semantic-diagram.node.glow", 18)}px ${color}38, inset 0 0 ${getStyle<number>("treatments.semantic-diagram.node.glow", 18)}px ${color}12`,
        }}
      >
        <div style={{ color, fontFamily: "Arial, sans-serif", fontSize: getStyle<number>("treatments.semantic-diagram.node.fontSize", 20), fontWeight: getStyle<number>("treatments.semantic-diagram.node.fontWeight", 900), letterSpacing: "0.04em", textTransform: "uppercase", textShadow: "0 2px 6px rgba(0,0,0,0.7)" }}>
          {node.label}
        </div>
        {node.detail ? <div style={{ color: PAPER(), fontFamily: "Arial, sans-serif", fontSize: getStyle<number>("treatments.semantic-diagram.node.detailFontSize", 13), lineHeight: 1.35, marginTop: 6, opacity: 0.78, fontWeight: 900 }}>{node.detail}</div> : null}
      </div>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: `linear-gradient(135deg, ${secondaryAccent}, ${accent})`, boxShadow: `0 0 12px ${secondaryAccent}`, margin: "-4px auto 0" }} />
    </div>
  );
};

/**
 * Relationship-first diagram treatment observed in the script/thumbnail videos.
 * Nodes reveal in causal order; edges draw before/with their destination node.
 */
export const SemanticDiagram: React.FC<SemanticDiagramProps> = ({
  title,
  kicker,
  centerLabel,
  nodes,
  edges,
  accent = AMBER(),
  secondaryAccent = CYAN(),
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const map = nodeMap(nodes);
  const titleIn = interpolate(frame, [0, 0.55 * fps], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: BLACK(), color: PAPER(), overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 46%, ${accent}12, transparent 42%)` }} />
      <div style={{ position: "absolute", left: 86, top: 62, opacity: titleIn, transform: `translateY(${(1 - titleIn) * 18}px)` }}>
        {kicker ? <div style={{ color: CYAN(), fontFamily: "Arial, sans-serif", fontSize: getStyle<number>("treatments.semantic-diagram.kicker.fontSize", 18), fontWeight: getStyle<number>("treatments.semantic-diagram.kicker.fontWeight", 900), letterSpacing: getStyle<string>("treatments.semantic-diagram.kicker.letterSpacing", "0.18em"), textTransform: "uppercase", marginBottom: 12, textShadow: `0 2px 8px rgba(0,0,0,0.7)` }}>{kicker}</div> : null}
        <div style={{
          color: PAPER(),
          fontFamily: "Arial Black, Arial, sans-serif",
          fontSize: getStyle<number>("treatments.semantic-diagram.title.fontSize", 46),
          fontWeight: getStyle<number>("treatments.semantic-diagram.title.fontWeight", 900),
          letterSpacing: getStyle<string>("treatments.semantic-diagram.title.letterSpacing", "-0.02em"),
          WebkitTextStroke: `1px rgba(0,0,0,0.2)`,
          filter: `drop-shadow(0 3px 10px rgba(0,0,0,0.6)) drop-shadow(0 0 18px ${accent}30)`,
        }}>{title}</div>
        <div style={{ width: 130, height: 5, background: `linear-gradient(90deg, ${accent}, ${CYAN()})`, boxShadow: `0 0 16px ${accent}80`, marginTop: 16, borderRadius: 3 }} />
      </div>
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0 }}>
        {edges.map((edge) => <Edge key={`${edge.from}-${edge.to}`} edge={edge} nodes={map} frame={frame} fps={fps} />)}
      </svg>
      {centerLabel ? (
        <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", width: 250, height: 250, borderRadius: "50%", border: `2px solid ${secondaryAccent}88`, background: "linear-gradient(135deg, rgba(0,212,255,0.10), rgba(255,107,53,0.08))", boxShadow: `0 0 38px ${secondaryAccent}28`, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", color: secondaryAccent, fontFamily: "Arial, sans-serif", fontSize: getStyle<number>("treatments.semantic-diagram.centerLabel.fontSize", 20), fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase", textShadow: "0 2px 8px rgba(0,0,0,0.7)" }}>{centerLabel}</div>
      ) : null}
      {nodes.map((node) => <DiagramNodeView key={node.id} node={node} frame={frame} fps={fps} accent={accent} secondaryAccent={secondaryAccent} />)}
      <div style={{ position: "absolute", right: 70, bottom: 45, color: "rgba(244,232,207,0.45)", fontFamily: "Arial, sans-serif", fontSize: 14, letterSpacing: "0.08em", textTransform: "uppercase" }}>follow the thread</div>
    </AbsoluteFill>
  );
};

export type ChapterCardProps = {
  title: string;
  subtitle?: string;
  accent?: string;
  holdFrom?: number;
};

export const chapterCardTitleLayout = (title: string): React.CSSProperties => {
  const longTitle = title.trim().length > 22;
  const fontSizeLong = getStyle<number>("treatments.chapter-card.title.fontSizeLong", 82);
  const fontSizeShort = getStyle<number>("treatments.chapter-card.title.fontSizeShort", 96);
  const lineHeight = getStyle<number>("treatments.chapter-card.title.lineHeight", 1.08);
  return {
    width: "86%",
    maxWidth: "86%",
    margin: "0 auto",
    fontSize: longTitle ? fontSizeLong : fontSizeShort,
    lineHeight,
    letterSpacing: longTitle ? "0.04em" : "0.08em",
    overflowWrap: "break-word",
  };
};

/** Isaac-style chapter card: bold gradient typography with stroke, depth, and vibrant background. */
export const ChapterCard: React.FC<ChapterCardProps> = ({ title, subtitle, accent = AMBER(), holdFrom = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = Math.max(0, frame - holdFrom * fps);
  const inDur = getStyle<number>("treatments.chapter-card.reveal.inDurationSec", 0.45);
  const lineStart = getStyle<number>("treatments.chapter-card.reveal.lineStartSec", 0.15);
  const lineEnd = getStyle<number>("treatments.chapter-card.reveal.lineEndSec", 0.8);
  const accentHeight = getStyle<number>("treatments.chapter-card.accentLine.height", 8);
  const accentMaxWidth = getStyle<number>("treatments.chapter-card.accentLine.maxWidth", 280);
  const inProgress = interpolate(local, [0, inDur * fps], [0, 1], { easing: Easing.out(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const wordScale = interpolate(inProgress, [0, 1], [0.85, 1]);
  const lineProgress = interpolate(local, [lineStart * fps, lineEnd * fps], [0, 1], { easing: Easing.out(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const gradientStart = getStyle<string>("colors.gradientStart", "#ff6b35");
  const gradientEnd = getStyle<string>("colors.gradientEnd", "#ffd166");
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 42%, #16162e 0%, #0a0a18 55%, ${BLACK()} 100%)`, justifyContent: "center", alignItems: "center" }}>
      {/* ambient glow behind title */}
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 50%, ${accent}18, transparent 55%)`, opacity: inProgress }} />
      <div style={{ textAlign: "center", opacity: inProgress, transform: `scale(${wordScale})` }}>
        <div style={{
          ...chapterCardTitleLayout(title),
          fontFamily: "Arial Black, Arial, sans-serif",
          fontWeight: getStyle<number>("treatments.chapter-card.title.fontWeight", 900),
          textTransform: "uppercase",
          textAlign: "center",
          background: `linear-gradient(135deg, ${gradientStart} 0%, ${gradientEnd} 45%, ${gradientStart} 100%)`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          WebkitTextStroke: `1.5px rgba(0,0,0,0.25)`,
          filter: `drop-shadow(0 4px 14px rgba(0,0,0,0.7)) drop-shadow(0 0 30px ${accent}50)`,
        }}>{title}</div>
        <div style={{
          height: accentHeight,
          background: `linear-gradient(90deg, transparent, ${gradientStart}, ${gradientEnd}, ${gradientStart}, transparent)`,
          boxShadow: `0 0 24px ${gradientStart}80, 0 2px 8px rgba(0,0,0,0.5)`,
          width: `${lineProgress * accentMaxWidth}px`,
          margin: "26px auto 0",
          borderRadius: 4,
        }} />
        {subtitle ? <div style={{
          marginTop: 22,
          fontFamily: "Arial, sans-serif",
          fontSize: getStyle<number>("treatments.chapter-card.subtitle.fontSize", 24),
          fontWeight: 900,
          letterSpacing: "0.08em",
          color: CYAN(),
          textTransform: "uppercase",
          textShadow: `0 2px 10px rgba(0,0,0,0.8)`,
        }}>{subtitle}</div> : null}
      </div>
    </AbsoluteFill>
  );
};

function secondaryColor(accent: string) {
  return accent.toLowerCase() === AMBER().toLowerCase() ? CYAN() : AMBER();
}

export type ScreenProofInWorldProps = {
  screenSrc: string;
  hostSrc?: string;
  caption?: string;
  accent?: string;
  focusRect?: { x: number; y: number; w: number; h: number };
};

/**
 * Screen evidence staged as a world/shot, based on video 04 and video 05.
 * The screen is not a full-frame dump: it has context, depth, focus and response.
 */
export const ScreenProofInWorld: React.FC<ScreenProofInWorldProps> = ({
  screenSrc,
  hostSrc,
  caption,
  accent = AMBER(),
  focusRect = { x: 18, y: 22, w: 52, h: 28 },
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entranceDur = getStyle<number>("treatments.screen-proof.entranceDurationSec", 0.8);
  const camStart = getStyle<number>("treatments.screen-proof.cameraStart", 1.04);
  const camDur = getStyle<number>("treatments.screen-proof.cameraDurationSec", 4);
  const focusStart = getStyle<number>("treatments.screen-proof.focusStartSec", 0.65);
  const focusEnd = getStyle<number>("treatments.screen-proof.focusEndSec", 1.15);
  const entrance = spring({ frame, fps, config: { damping: 18, stiffness: 120 }, durationInFrames: Math.round(entranceDur * fps) });
  const camera = interpolate(frame, [0, camDur * fps], [camStart, 1], { easing: Easing.out(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const focus = interpolate(frame, [focusStart * fps, focusEnd * fps], [0, 1], { easing: Easing.out(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: BLACK(), overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 56% 46%, ${accent}24, transparent 45%)` }} />
      <div style={{ position: "absolute", left: "14%", top: "12%", width: "66%", height: "68%", opacity: 0.2 * entrance, filter: "blur(24px)", transform: `scale(${camera * 1.1})`, transformOrigin: "center" }}>
        <Img src={screenSrc} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
      <div style={{ position: "absolute", left: "13%", top: "12%", width: "68%", height: "68%", opacity: entrance, transform: `perspective(1200px) rotateY(-3deg) rotateX(1deg) scale(${camera})`, transformOrigin: "center", border: `2px solid ${accent}aa`, boxShadow: `0 0 32px ${accent}32, 0 24px 60px rgba(0,0,0,.7)`, background: "#050609", padding: 18 }}>
        <Img src={screenSrc} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        <div style={{ position: "absolute", left: `${focusRect.x}%`, top: `${focusRect.y}%`, width: `${focusRect.w}%`, height: `${focusRect.h}%`, border: `3px solid ${accent}`, boxShadow: `0 0 20px ${accent}`, opacity: focus, pointerEvents: "none" }} />
      </div>
      {hostSrc ? <div style={{ position: "absolute", right: "5%", bottom: "5%", width: "25%", height: "48%", opacity: entrance, transform: `translateY(${(1 - entrance) * 28}px)` }}><Img src={hostSrc} style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "bottom right", filter: "drop-shadow(0 0 12px rgba(242,184,75,.45))" }} /></div> : null}
      {caption ? <div style={{ position: "absolute", left: "8%", right: "8%", bottom: "5%", color: PAPER(), fontFamily: "Arial, sans-serif", fontSize: getStyle<number>("treatments.screen-proof.caption.fontSize", 28), fontStyle: "italic", fontWeight: 900, textAlign: "center", textShadow: "0 3px 12px #000, 0 0 18px rgba(0,0,0,0.7)" }}>{caption}</div> : null}
    </AbsoluteFill>
  );
};

export type HostReflectionShotProps = {
  src: string;
  subtitle: string;
  accent?: string;
  lightSide?: "left" | "right";
};

/** Character close-up treatment: cinematic grade, directional light, letterbox subtitle. */
export const HostReflectionShot: React.FC<HostReflectionShotProps> = ({ src, subtitle, accent = AMBER(), lightSide = "left" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entranceDur = getStyle<number>("treatments.host-reflection.entranceDurationSec", 0.5);
  const pushStart = getStyle<number>("treatments.host-reflection.pushStart", 1.06);
  const pushDur = getStyle<number>("treatments.host-reflection.pushDurationSec", 4);
  const imgFilter = getStyle<string>("treatments.host-reflection.filter", "saturate(1.05) contrast(1.15) brightness(.9)");
  const lbTop = getStyle<number>("treatments.host-reflection.letterboxTopPct", 8);
  const lbBottom = getStyle<number>("treatments.host-reflection.letterboxBottomPct", 12);
  const subFont = getStyle<string>("treatments.host-reflection.subtitle.fontFamily", "Georgia, serif");
  const subStyle = getStyle<string>("treatments.host-reflection.subtitle.fontStyle", "italic");
  const subSize = getStyle<number>("treatments.host-reflection.subtitle.fontSize", 27);
  const entrance = interpolate(frame, [0, entranceDur * fps], [0, 1], { easing: Easing.out(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const push = interpolate(frame, [0, pushDur * fps], [pushStart, 1], { easing: Easing.out(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const light = lightSide === "left" ? "linear-gradient(90deg, rgba(242,184,75,.65), transparent 48%)" : "linear-gradient(270deg, rgba(242,184,75,.65), transparent 48%)";
  return (
    <AbsoluteFill style={{ background: BLACK(), overflow: "hidden", opacity: entrance }}>
      <Img src={src} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transform: `scale(${push})`, filter: imgFilter }} />
      <div style={{ position: "absolute", inset: 0, background: light, mixBlendMode: "screen", opacity: 0.7 }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,.18), transparent 36%, transparent 65%, rgba(0,0,0,.7))" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: `${lbTop}%`, background: BLACK() }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: `${lbBottom}%`, background: BLACK(), display: "flex", alignItems: "center", justifyContent: "center", padding: "0 8%" }}>
        <div style={{ color: accent, fontFamily: subFont, fontStyle: subStyle, fontSize: subSize, fontWeight: getStyle<number>("treatments.host-reflection.subtitle.fontWeight", 900), textAlign: "center", textShadow: "0 3px 12px #000, 0 0 24px rgba(0,0,0,0.8)" }}>{subtitle}</div>
      </div>
    </AbsoluteFill>
  );
};

export type AudienceComment = {
  text: string;
  delay?: number;
  x?: number;
  y?: number;
  rotation?: number;
  color?: string;
};

export type AudienceDemandProofProps = {
  comments: AudienceComment[];
  contextSrc?: string;
  hostSrc?: string;
  caption?: string;
  accent?: string;
};

/**
 * Evidence-backed first treatment from video 04: audience comments accumulate,
 * then become context for a screen/host response. This is a semantic sequence,
 * not a reusable comment-card effect.
 */
export const AudienceDemandProof: React.FC<AudienceDemandProofProps> = ({
  comments,
  contextSrc,
  hostSrc,
  caption,
  accent = AMBER(),
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const contextIn = interpolate(frame, [getStyle<number>("treatments.audience-demand.contextInStartSec", 2.4) * fps, getStyle<number>("treatments.audience-demand.contextInEndSec", 3.3) * fps], [0, 1], { easing: Easing.out(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const responseIn = interpolate(frame, [getStyle<number>("treatments.audience-demand.responseInStartSec", 3.5) * fps, getStyle<number>("treatments.audience-demand.responseInEndSec", 4.2) * fps], [0, 1], { easing: Easing.out(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: BLACK(), overflow: "hidden" }}>
      {contextSrc ? <Img src={contextSrc} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "blur(16px) saturate(.7) brightness(.35)", opacity: contextIn }} /> : null}
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 48%, ${accent}18, transparent 50%)`, opacity: 1 - contextIn * 0.35 }} />
      <div style={{ position: "absolute", left: 70, top: 54, color: accent, fontFamily: "Arial, sans-serif", fontSize: getStyle<number>("treatments.audience-demand.kicker.fontSize", 18), fontWeight: getStyle<number>("treatments.audience-demand.kicker.fontWeight", 900), letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.9, textShadow: "0 2px 8px rgba(0,0,0,0.7)" }}>audience demand</div>
      {comments.map((comment, index) => {
        const delay = (comment.delay ?? index * 0.42) * fps;
        const entrance = spring({ frame: Math.max(0, frame - delay), fps, config: { damping: getStyle<number>("treatments.audience-demand.spring.damping", 17), stiffness: getStyle<number>("treatments.audience-demand.spring.stiffness", 170) }, durationInFrames: Math.round(0.55 * fps) });
        const x = comment.x ?? 50 + ((index % 3) - 1) * 18;
        const y = comment.y ?? 28 + Math.floor(index / 3) * 18;
        const rotation = comment.rotation ?? (index % 2 ? 1.8 : -1.4);
        return (
          <div key={`${comment.text}-${index}`} style={{ position: "absolute", left: `${x}%`, top: `${y}%`, width: 540, transform: `translate(-50%, -50%) rotate(${rotation}deg) translateY(${(1 - entrance) * 24}px) scale(${0.94 + entrance * 0.06})`, opacity: entrance * (contextIn ? 0.66 : 1), zIndex: index + 2 }}>
            <div style={{ background: "rgba(248,248,244,.96)", color: "#14171c", borderRadius: 8, padding: "18px 24px", boxShadow: `0 12px 30px rgba(0,0,0,.38), 0 0 18px ${comment.color ?? accent}30`, fontFamily: "Arial, sans-serif", fontSize: getStyle<number>("treatments.audience-demand.comments.fontSize", 25), lineHeight: 1.2, fontWeight: getStyle<number>("treatments.audience-demand.comments.fontWeight", 900), textShadow: "0 1px 2px rgba(0,0,0,0.25)" }}>
              {comment.text}
            </div>
            <div style={{ width: 10, height: 10, margin: "-5px auto 0", borderRadius: "50%", background: comment.color ?? accent, boxShadow: `0 0 12px ${comment.color ?? accent}` }} />
          </div>
        );
      })}
      {hostSrc ? <div style={{ position: "absolute", right: "4%", bottom: "3%", width: "26%", height: "48%", opacity: responseIn, transform: `translateY(${(1 - responseIn) * 28}px)`, zIndex: comments.length + 3 }}><Img src={hostSrc} style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "bottom right", filter: "drop-shadow(0 0 14px rgba(242,184,75,.42))" }} /></div> : null}
      {caption ? <div style={{ position: "absolute", left: "8%", right: "8%", bottom: "6%", color: "#f4e8cf", fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: getStyle<number>("treatments.audience-demand.caption.fontSize", 28), fontWeight: 900, textAlign: "center", textShadow: "0 3px 12px #000, 0 0 20px rgba(0,0,0,0.7)", opacity: responseIn }}>{caption}</div> : null}
    </AbsoluteFill>
  );
};

export type ProcessStep = {
  label: string;
  detail?: string;
  color?: string;
};

export type ProcessTimelineProps = {
  title: string;
  steps: ProcessStep[];
  activeStep?: number;
  accent?: string;
};

/** Workflow/timeline proof treatment observed in Premiere, voice and AI-video episodes. */
export const ProcessTimeline: React.FC<ProcessTimelineProps> = ({ title, steps, activeStep = 0, accent = AMBER() }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleIn = interpolate(frame, [0, getStyle<number>("treatments.process-timeline.titleInDurationSec", 0.45) * fps], [0, 1], { easing: Easing.out(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const active = Math.min(steps.length - 1, Math.max(0, activeStep));
  const progress = interpolate(frame, [getStyle<number>("treatments.process-timeline.progressStartSec", 0.35) * fps, getStyle<number>("treatments.process-timeline.progressEndSec", 1.2) * fps], [0, 1], { easing: Easing.out(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: BLACK(), color: PAPER(), overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 60%, ${accent}14, transparent 48%)` }} />
      <div style={{ position: "absolute", left: 76, top: 62, opacity: titleIn, transform: `translateY(${(1 - titleIn) * 18}px)`, fontFamily: "Arial, sans-serif" }}>
        <div style={{ color: accent, fontSize: getStyle<number>("treatments.process-timeline.kicker.fontSize", 17), fontWeight: getStyle<number>("treatments.process-timeline.kicker.fontWeight", 900), letterSpacing: "0.18em", textTransform: "uppercase", textShadow: "0 2px 8px rgba(0,0,0,0.7)" }}>workflow</div>
        <div style={{ fontSize: getStyle<number>("treatments.process-timeline.title.fontSize", 48), fontWeight: getStyle<number>("treatments.process-timeline.title.fontWeight", 900), marginTop: 12, background: `linear-gradient(135deg, ${getStyle<string>("colors.gradientStart", "#ff6b35")} 0%, ${getStyle<string>("colors.gradientEnd", "#ffd166")} 55%, ${getStyle<string>("colors.gradientStart", "#ff6b35")} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", filter: `drop-shadow(0 3px 10px rgba(0,0,0,0.7)) drop-shadow(0 0 16px ${accent}40)` }}>{title}</div>
      </div>
      <svg style={{ position: "absolute", left: "9%", width: "82%", top: "46%", height: 60, overflow: "visible", transform: "translateY(-50%)" }} viewBox="0 0 100 12" preserveAspectRatio="none">
        <defs>
          <linearGradient id="ptBarGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={getStyle<string>("colors.gradientStart", "#ff6b35")} />
            <stop offset="100%" stopColor={getStyle<string>("colors.gradientEnd", "#ffd166")} />
          </linearGradient>
        </defs>
        <path d="M 0 6 Q 50 -6 100 6" pathLength={100} fill="none" stroke="rgba(244,232,207,.2)" strokeWidth={0.7} />
        <path d="M 0 6 Q 50 -6 100 6" pathLength={100} fill="none" stroke="url(#ptBarGrad)" strokeWidth={1.2} strokeLinecap="round" strokeDasharray="100" strokeDashoffset={100 * (1 - progress * ((active + 1) / Math.max(steps.length, 1)))} style={{ filter: `drop-shadow(0 0 3px ${accent})` }} />
      </svg>
      {steps.map((step, index) => {
        const reveal = spring({ frame: Math.max(0, frame - index * 0.18 * fps), fps, config: { damping: getStyle<number>("treatments.process-timeline.spring.damping", 18), stiffness: getStyle<number>("treatments.process-timeline.spring.stiffness", 150) }, durationInFrames: Math.round(0.6 * fps) });
        const selected = index === active;
        const x = 9 + (index / Math.max(steps.length - 1, 1)) * 82;
        const color = step.color ?? (selected ? accent : "#61d7e8");
        return (
          <div key={`${step.label}-${index}`} style={{ position: "absolute", left: `${x}%`, top: "46%", width: 180, transform: `translate(-50%, -50%) translateY(${(1 - reveal) * 28}px)`, opacity: reveal }}>
            <div style={{ width: selected ? 28 : 20, height: selected ? 28 : 20, margin: "0 auto", borderRadius: "48% 52% 46% 54% / 52% 46% 54% 48%", background: `radial-gradient(circle at 35% 30%, ${color}, ${color}99)`, boxShadow: selected ? `0 0 24px ${color}, 0 0 48px ${color}66` : `0 0 12px ${color}88`, border: `3px solid ${BLACK()}` }} />
            <div style={{ marginTop: 18, padding: "12px 14px", border: `2px solid ${selected ? color : `${color}88`}`, borderRadius: 8, background: selected ? `${color}18` : "rgba(7,9,13,.76)", textAlign: "center", fontFamily: "Arial, sans-serif" }}>
              <div style={{ color, fontSize: getStyle<number>("treatments.process-timeline.step.fontSize", 16), fontWeight: getStyle<number>("treatments.process-timeline.step.fontWeight", 900), textTransform: "uppercase", letterSpacing: "0.04em", textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>{step.label}</div>
              {step.detail ? <div style={{ color: PAPER(), opacity: 0.7, fontSize: 12, lineHeight: 1.3, marginTop: 6, fontWeight: 900 }}>{step.detail}</div> : null}
            </div>
          </div>
        );
      })}
      <div style={{ position: "absolute", right: 76, bottom: 48, color: "rgba(244,232,207,.5)", fontFamily: "Arial, sans-serif", fontSize: 14, letterSpacing: "0.08em", textTransform: "uppercase" }}>step {active + 1} / {steps.length}</div>
    </AbsoluteFill>
  );
};

export type Candidate = {
  label: string;
  src?: string;
  detail?: string;
  color?: string;
};

export type CandidateComparisonProps = {
  title: string;
  candidates: Candidate[];
  selectedIndex?: number;
  criteria?: string;
  accent?: string;
};

/** Candidate/failed-output comparison treatment observed in voice, AI-video and thumbnail episodes. */
export const CandidateComparison: React.FC<CandidateComparisonProps> = ({ title, candidates, selectedIndex = 0, criteria, accent = AMBER() }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleIn = interpolate(frame, [0, getStyle<number>("treatments.candidate-comparison.titleInDurationSec", 0.45) * fps], [0, 1], { easing: Easing.out(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const gradientStart = getStyle<string>("colors.gradientStart", "#ff6b35");
  const gradientEnd = getStyle<string>("colors.gradientEnd", "#ffd166");
  return (
    <AbsoluteFill style={{ background: BLACK(), color: PAPER(), overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 70, top: 54, opacity: titleIn, transform: `translateY(${(1 - titleIn) * 18}px)`, fontFamily: "Arial, sans-serif" }}>
        <div style={{ color: accent, fontSize: getStyle<number>("treatments.candidate-comparison.kicker.fontSize", 17), fontWeight: getStyle<number>("treatments.candidate-comparison.kicker.fontWeight", 900), letterSpacing: "0.18em", textTransform: "uppercase", textShadow: "0 2px 8px rgba(0,0,0,0.7)" }}>compare</div>
        <div style={{ fontSize: getStyle<number>("treatments.candidate-comparison.title.fontSize", 44), fontWeight: getStyle<number>("treatments.candidate-comparison.title.fontWeight", 900), marginTop: 10, background: `linear-gradient(135deg, ${gradientStart} 0%, ${gradientEnd} 55%, ${gradientStart} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", filter: "drop-shadow(0 3px 10px rgba(0,0,0,0.7))" }}>{title}</div>
        {criteria ? <div style={{ fontSize: getStyle<number>("treatments.candidate-comparison.criteria.fontSize", 18), opacity: 0.68, marginTop: 8, fontWeight: 900 }}>{criteria}</div> : null}
      </div>
      <div style={{ position: "absolute", left: "7%", right: "7%", top: "28%", bottom: "12%", display: "grid", gridTemplateColumns: `repeat(${Math.max(1, Math.min(4, candidates.length))}, 1fr)`, gap: 18, alignItems: "stretch" }}>
        {candidates.map((candidate, index) => {
          const entrance = spring({ frame: Math.max(0, frame - index * getStyle<number>("treatments.candidate-comparison.candidateStaggerSec", 0.22) * fps), fps, config: { damping: getStyle<number>("treatments.candidate-comparison.spring.damping", 18), stiffness: getStyle<number>("treatments.candidate-comparison.spring.stiffness", 160) }, durationInFrames: Math.round(0.6 * fps) });
          const selected = index === selectedIndex;
          const color = candidate.color ?? (selected ? accent : "#61d7e8");
          return (
            <div key={`${candidate.label}-${index}`} style={{ opacity: entrance, transform: `translateY(${(1 - entrance) * 24}px) scale(${selected ? 1 : 0.96})`, border: `2px solid ${selected ? color : `${color}55`}`, borderRadius: 10, background: selected ? `${color}18` : "rgba(7,9,13,.76)", boxShadow: selected ? `0 0 24px ${color}44` : "none", overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div style={{ height: "68%", background: "#11151b", position: "relative" }}>
                {candidate.src ? <Img src={candidate.src} style={{ width: "100%", height: "100%", objectFit: "cover", filter: selected ? "none" : "grayscale(.65) brightness(.7)" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color, fontFamily: "Arial, sans-serif", fontSize: getStyle<number>("treatments.candidate-comparison.candidate.fontSize", 18) }}>NO PREVIEW</div>}
                <div style={{ position: "absolute", top: 12, left: 12, color: selected ? color : PAPER(), fontFamily: "Arial, sans-serif", fontSize: 13, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", background: "rgba(0,0,0,.68)", padding: "5px 8px", borderRadius: 4, textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>{selected ? "selected" : "alternative"}</div>
              </div>
              <div style={{ padding: "14px 16px", fontFamily: "Arial, sans-serif" }}>
                <div style={{ color, fontSize: getStyle<number>("treatments.candidate-comparison.candidate.fontSize", 18), fontWeight: 900, textTransform: "uppercase", textShadow: "0 2px 6px rgba(0,0,0,0.7)" }}>{candidate.label}</div>
                {candidate.detail ? <div style={{ color: PAPER(), opacity: 0.7, fontSize: 13, lineHeight: 1.35, marginTop: 6 }}>{candidate.detail}</div> : null}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export type CinematicMetaphorProps = {
  src: string;
  subtitle?: string;
  label?: string;
  accent?: string;
  mode?: "cinematic" | "line-art" | "warm";
};

/** Asset-driven metaphor shot: a concept is staged as a cinematic world, not pasted as stock. */
export const CinematicMetaphor: React.FC<CinematicMetaphorProps> = ({ src, subtitle, label, accent = AMBER(), mode = "cinematic" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entrance = interpolate(frame, [0, getStyle<number>("treatments.cinematic-metaphor.entranceDurationSec", 0.7) * fps], [0, 1], { easing: Easing.out(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const push = interpolate(frame, [0, getStyle<number>("treatments.cinematic-metaphor.pushDurationSec", 4) * fps], [getStyle<number>("treatments.cinematic-metaphor.pushStart", 1.08), 1], { easing: Easing.out(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const filter = mode === "line-art" ? "grayscale(1) sepia(1) hue-rotate(350deg) saturate(4) contrast(1.35) brightness(.9)" : mode === "warm" ? "sepia(.38) saturate(1.25) contrast(1.12) brightness(.9)" : "saturate(1.08) contrast(1.15) brightness(.9)";
  return (
    <AbsoluteFill style={{ background: BLACK(), overflow: "hidden", opacity: entrance }}>
      <Img src={src} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transform: `scale(${push})`, filter }} />
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 42%, transparent 38%, rgba(0,0,0,.78) 100%), linear-gradient(90deg, ${accent}22, transparent 55%)` }} />
      <div style={{ position: "absolute", left: 70, top: 54, color: accent, fontFamily: "Arial, sans-serif", fontSize: getStyle<number>("treatments.cinematic-metaphor.label.fontSize", 16), fontWeight: getStyle<number>("treatments.cinematic-metaphor.label.fontWeight", 900), letterSpacing: "0.16em", textTransform: "uppercase", textShadow: "0 2px 10px #000" }}>{label}</div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, minHeight: "16%", background: BLACK(), display: "flex", alignItems: "center", justifyContent: "center", padding: "0 9%" }}>
        {subtitle ? <div style={{ color: accent, fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: getStyle<number>("treatments.cinematic-metaphor.subtitle.fontSize", 28), fontWeight: 900, textAlign: "center", textShadow: "0 3px 12px #000, 0 0 20px rgba(0,0,0,0.7)" }}>{subtitle}</div> : null}
      </div>
    </AbsoluteFill>
  );
};

export type SceneTransitionProps = {
  type: "flash" | "fade" | "blur" | "light-leak";
  accent?: string;
};

/** Transition bridge used between semantic visual worlds. */
export const SceneTransition: React.FC<SceneTransitionProps> = ({ type, accent = AMBER() }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const progress = interpolate(frame, [0, Math.max(1, durationInFrames / 2), durationInFrames], [0, 1, 0], { easing: Easing.inOut(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (type === "flash") return <AbsoluteFill style={{ background: accent, opacity: progress, mixBlendMode: "screen", pointerEvents: "none" }} />;
  if (type === "blur") return <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 50%, transparent 0%, ${accent}55 100%)`, opacity: progress, filter: `blur(${progress * 22}px)`, pointerEvents: "none" }} />;
  if (type === "light-leak") return <AbsoluteFill style={{ background: `linear-gradient(105deg, transparent 18%, ${accent}aa 48%, #fff6 54%, transparent 78%)`, opacity: progress, mixBlendMode: "screen", pointerEvents: "none" }} />;
  return <AbsoluteFill style={{ background: "#000", opacity: progress, pointerEvents: "none" }} />;
};

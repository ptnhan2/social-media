import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { Item } from "./types";

// ---------------------------------------------------------------------------
// voxKit v2 — shared Vox primitives
// NEW in v2 (from full-video feedback):
//  - Animated: motion library (slideL/R, dropBounce, rotateIn, zoomBurst,
//    flipX, popIn, fadeUp) — deterministic, on-twos, settle-then-hold
//  - TornFrame shapes: rect | circle | tri | hex | blob (torn edges keep)
//  - KaraokeSubtitle: fixed bottom layer, current word highlighted
//  - StampText with paper backdrop (auto-contrast) + hold-out timing
//  - PenArrow with long label hold (labelStart/labelEnd)
// ---------------------------------------------------------------------------

export const VOX_YELLOW = "#fff200";
export const VOX_YELLOW_DARK = "#C77F00"; // amber — for yellow on LIGHT backgrounds
export const INK = "#131313";
export const CREAM = "#F5F0E8";
export const MUTED = "#636363";
export const RED_PEN = "#D64541";
export const CREAM_TEXT = "#F5F0E8";
export const DARK_BG = "#171A1C";

// CUTOUT_OK — images that have rembg cutout versions (project-specific;
// override per-video if needed). Shared visual primitives for Composer treatments.
export const CUTOUT_OK = [
  "scene-1.png", "scene-3.png", "scene-4.png", "scene-6.png", "scene-7.png",
  "scene-11.png", "scene-12.png", "scene-13.png", "scene-15.png", "scene-21.png",
  "scene-22.png", "scene-25.png", "scene-28.png", "scene-29.png", "scene-30.png",
];

// resolve an accent color for a given background: pure Vox yellow is
// unreadable/glaring on light paper — swap to deep amber there.
export function resolveAccent(color: string | undefined, onDark: boolean): string {
  if (color === VOX_YELLOW && !onDark) return VOX_YELLOW_DARK;
  return color ?? (onDark ? CREAM_TEXT : INK);
}

export const FONT_FACE = `
@font-face {
  font-family: 'Archivo Black';
  src: url('${staticFile("fonts/archivo-black-latin.woff2")}') format('woff2');
  font-weight: 400;
  font-style: normal;
}
@font-face {
  font-family: 'Inter';
  src: url('${staticFile("fonts/inter-400-latin.woff2")}') format('woff2');
  font-weight: 400;
  font-style: normal;
}
@font-face {
  font-family: 'Inter';
  src: url('${staticFile("fonts/inter-700-latin.woff2")}') format('woff2');
  font-weight: 700;
  font-style: normal;
}
@font-face {
  font-family: 'Roboto Mono';
  src: url('${staticFile("fonts/roboto-mono-400-latin.woff2")}') format('woff2');
  font-weight: 400;
  font-style: normal;
}
@font-face {
  font-family: 'Roboto Mono';
  src: url('${staticFile("fonts/roboto-mono-500-latin.woff2")}') format('woff2');
  font-weight: 500;
  font-style: normal;
}
`;

export const ARCHIVO = "'Archivo Black', 'Arial Black', sans-serif";
export const INTER = "'Inter', 'Helvetica Neue', sans-serif";
export const MONO = "'Roboto Mono', 'Courier New', monospace";

export function onTwos(frame: number): number {
  return Math.floor(frame / 2) * 2;
}

export function hash(seed: number, i: number): number {
  const n = Math.sin(seed * 127.1 + i * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

export const easeOut = (f: number, dur: number) =>
  interpolate(f, [0, dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

export const FontsAndBase: React.FC = () => (
  <style>
    {FONT_FACE}
    {"html, body, #root { margin: 0; padding: 0; }"}
  </style>
);

// --- cream/dark paper background ---
// v10: drift (slow continuous motion = anti-freeze), stronger halftone (S1/S5/S6)
// v10-2: translucent paper when a chapter backdrop is active (BackdropCtx) —
// the full-bleed act image shows through the paper = real 3-layer depth.
export const BackdropCtx = React.createContext<boolean>(false);

export const PaperBg: React.FC<{
  frame: number;
  dark?: boolean;
  driftFrom?: number; // absolute seconds — start of slow horizontal drift
  driftTo?: number; // absolute seconds — end of drift
}> = ({ frame, dark = false, driftFrom, driftTo }) => {
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const zoom = 1 + 0.04 * easeOut(frame, 360);
  const driftK = driftFrom != null && driftTo != null && driftTo > driftFrom
    ? interpolate(t, [driftFrom, driftTo], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : 0;
  const backdropOn = React.useContext(BackdropCtx);
  const base = dark ? DARK_BG : CREAM;
  return (
    // v10-3 (vision audit 2026-08-04): FLAT solid background — references
    // (remotion_vox/JH/gemini) all use a single flat color; translucent
    // backdrop-through-paper read as noise. ChapterBackdrop retired.
    <AbsoluteFill style={{ background: base }}>
      <AbsoluteFill style={{ transform: `scale(${zoom * 1.08}) translateX(${-5.5 * driftK}%)` }}>
        <svg width="100%" height="100%">
          <defs>
            <filter id={`paperNoise${dark ? "d" : "l"}`}>
              <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="3" stitchTiles="stitch" />
              <feColorMatrix
                type="matrix"
                values={dark
                  ? "0 0 0 0 0.12  0 0 0 0 0.12  0 0 0 0 0.13  0 0 0 0.10 0"
                  : "0 0 0 0 0.36  0 0 0 0 0.33  0 0 0 0 0.27  0 0 0 0.09 0"}
              />
            </filter>
            <filter id={`fiber${dark ? "d" : "l"}`}>
              <feTurbulence type="turbulence" baseFrequency="0.004 0.05" numOctaves="2" seed="7" />
              <feColorMatrix
                type="matrix"
                values={dark
                  ? "0 0 0 0 0.3  0 0 0 0 0.3  0 0 0 0 0.32  0 0 0 0.05 0"
                  : "0 0 0 0 0.28  0 0 0 0 0.26  0 0 0 0 0.22  0 0 0 0.05 0"}
              />
            </filter>
            <pattern id={`halftone${dark ? "d" : "l"}`} width="14" height="14" patternUnits="userSpaceOnUse">
              <circle cx="4" cy="4" r="2" fill={dark ? "#FFFFFF" : "#131313"} opacity="0.10" />
            </pattern>
            <pattern id={`halftoneSmall${dark ? "d" : "l"}`} width="7" height="7" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="0.9" fill={dark ? "#FFFFFF" : "#131313"} opacity="0.07" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" filter={`url(#paperNoise${dark ? "d" : "l"})`} />
          <rect width="100%" height="100%" filter={`url(#fiber${dark ? "d" : "l"})`} />
          <rect width="100%" height="100%" fill={`url(#halftoneSmall${dark ? "d" : "l"})`} />
          <rect width="100%" height="100%" fill={`url(#halftone${dark ? "d" : "l"})`} />
        </svg>
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background: dark
            ? "radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(0,0,0,0.45) 100%)"
            : "radial-gradient(ellipse at 50% 45%, transparent 62%, rgba(80,60,30,0.20) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

// --- continuous camera push-in (S6/S10: every scene moves while held) ---
export const PushIn: React.FC<{
  start: number; // seconds
  end: number; // seconds
  from?: number; // scale at start
  to?: number; // scale at end (photo 1.12, text 1.06)
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ start, end, from = 1.0, to = 1.12, style, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const k = interpolate(t, [start, end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const scale = from + (to - from) * k;
  return (
    <AbsoluteFill style={{ transform: `scale(${scale})`, transformOrigin: "50% 50%", ...style }}>
      {children}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Animated — motion library wrapper.
// Each motion is deterministic, on-twos, and holds still after settling.
// ---------------------------------------------------------------------------
export type MotionType =
  | "slideL"
  | "slideR"
  | "slideUp"
  | "slideDown"
  | "dropBounce"
  | "rotateIn"
  | "zoomBurst"
  | "zoomInSlow"
  | "flipX"
  | "popIn"
  | "fadeUp"
  | "swingIn";

export const Animated: React.FC<{
  motion: MotionType;
  start: number; // seconds
  dur?: number; // seconds
  children: React.ReactNode;
  style?: React.CSSProperties;
  seed?: number;
  rotate?: number; // base rotation
  z?: number;
}> = ({ motion, start, dur = 0.9, children, style, seed = 50, rotate = 0, z = 5 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const vf = onTwos(frame);
  const f = Math.max(0, vf - start * fps);
  const durF = dur * fps;

  if (f > durF * 1.6) {
    // settled: hold still (tiny nothing)
  }

  let transform = "";
  let opacity = 1;

  const p = spring({ frame: f, fps, config: { damping: 15, stiffness: 130 } });
  const pBounce = spring({ frame: f, fps, config: { damping: 7, mass: 0.9, stiffness: 150 } });
  const e = easeOut(f, durF);

  switch (motion) {
    case "slideL":
      transform = `translateX(${-14 + p * 14}%) rotate(${rotate}deg)`;
      break;
    case "slideR":
      transform = `translateX(${14 - p * 14}%) rotate(${rotate}deg)`;
      break;
    case "slideUp":
      transform = `translateY(${12 - p * 12}%) rotate(${rotate}deg)`;
      break;
    case "slideDown":
      transform = `translateY(${-12 + p * 12}%) rotate(${rotate}deg)`;
      break;
    case "dropBounce":
      transform = `translateY(${(-60 + pBounce * 60) * Math.min(e * 3, 1)}%) rotate(${rotate}deg)`;
      opacity = easeOut(f, 4);
      break;
    case "rotateIn":
      transform = `rotate(${rotate + (1 - e) * -14}deg) scale(${0.8 + e * 0.2})`;
      break;
    case "zoomBurst":
      transform = `scale(${1.35 - e * 0.35}) rotate(${rotate}deg)`;
      break;
    case "zoomInSlow":
      transform = `scale(${0.92 + e * 0.08}) rotate(${rotate}deg)`;
      break;
    case "flipX":
      transform = `perspective(1200px) rotateY(${(1 - e) * -90}deg) rotate(${rotate}deg)`;
      break;
    case "popIn":
      transform = `scale(${0.82 + p * 0.18 + Math.max(0, p - 1) * 0.22}) rotate(${rotate}deg)`;
      opacity = easeOut(f, 4);
      break;
    case "fadeUp":
      transform = `translateY(${(1 - e) * 8}%) rotate(${rotate}deg)`;
      opacity = e;
      break;
    case "swingIn":
      transform = `rotate(${rotate + (1 - e) * 24}deg) translateX(${(1 - e) * 6}%)`;
      opacity = e;
      break;
  }

  return (
    <div style={{ position: "absolute", transform, opacity, zIndex: z, ...style }}>{children}</div>
  );
};

// ---------------------------------------------------------------------------
// TornFrame — torn paper element, 5 shapes, torn SVG displacement edges.
// ---------------------------------------------------------------------------
export type TornShape = "rect" | "circle" | "tri" | "hex" | "blob";

const SHAPE_POLY: Record<string, string> = {
  tri: "50,1 99,99 1,99",
  hex: "50,1 93,25 93,75 50,99 7,75 7,25",
};

function blobPoly(seed: number, pts = 10): string {
  const out: string[] = [];
  for (let i = 0; i < pts; i++) {
    const a = (i / pts) * Math.PI * 2;
    const r = 46 + (hash(seed, i) - 0.5) * 14;
    out.push(`${(50 + Math.cos(a) * r).toFixed(1)},${(50 + Math.sin(a) * r).toFixed(1)}`);
  }
  return out.join(" ");
}

export const TornFrame: React.FC<{
  id: string;
  children: React.ReactNode;
  x: number;
  y: number;
  width: number;
  aspect?: number;
  rotate?: number;
  seed?: number;
  innerPad?: number;
  entrance?: number;
  from?: "left" | "right" | "top" | "none";
  dark?: boolean;
  z?: number;
  shape?: TornShape;
  clipChildren?: boolean;
}> = ({
  id,
  children,
  x,
  y,
  width,
  aspect = 100 / 62,
  rotate = 0,
  seed = 3,
  innerPad = 5,
  entrance = 0,
  from = "left",
  dark = false,
  z = 3,
  shape = "rect",
  clipChildren = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const vf = onTwos(frame);
  const f = Math.max(0, vf - entrance * fps);

  const p = spring({ frame: f, fps, config: { damping: 16, stiffness: 120 } });
  const slide = from === "left" ? -12 : from === "right" ? 12 : from === "top" ? -8 : 0;
  const tx = interpolate(p, [0, 1], [slide, 0]);
  const rot = rotate + (1 - p) * -2.5;
  const opacity = interpolate(f, [0, 4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const settle = 1 - Math.min(p, 1);
  const jx = (hash(seed, Math.floor(vf)) - 0.5) * 2 * 1.2 * settle;
  const jy = (hash(seed + 7, Math.floor(vf)) - 0.5) * 2 * 1.0 * settle;

  const outer = dark ? "#1E2226" : "#FAF7EF";
  const inner = dark ? "#23282D" : "#F7F1E2";
  const H = 100 / aspect;

  const outerEl =
    shape === "circle" ? (
      <circle cx="50" cy={H / 2} r={Math.min(49, H / 2 - 1)} fill={outer} filter={`url(#${id})`} />
    ) : shape === "tri" || shape === "hex" ? (
      <polygon points={SHAPE_POLY[shape]} fill={outer} filter={`url(#${id})`} />
    ) : shape === "blob" ? (
      <polygon points={blobPoly(seed)} fill={outer} filter={`url(#${id})`} />
    ) : (
      <rect x="0" y="0" width="100" height={H} fill={outer} filter={`url(#${id})`} />
    );

  const innerEl =
    shape === "circle" ? (
      <circle cx="50" cy={H / 2} r={Math.min(49, H / 2 - 1) - innerPad * 0.9} fill={inner} filter={`url(#${id})`} />
    ) : shape === "tri" || shape === "hex" ? (
      <polygon points={SHAPE_POLY[shape]} transform={`scale(0.92) translate(4, ${(H - 92) / 2 / 1.08})`} fill={inner} filter={`url(#${id})`} />
    ) : shape === "blob" ? (
      <polygon points={blobPoly(seed + 50, 8)} fill={inner} filter={`url(#${id})`} />
    ) : (
      <rect x={innerPad} y={innerPad} width={100 - innerPad * 2} height={H - innerPad * 2} fill={inner} filter={`url(#${id})`} />
    );

  const childClip: React.CSSProperties =
    shape === "circle"
      ? { borderRadius: "50%", overflow: "hidden" }
      : shape === "tri"
        ? { clipPath: "polygon(50% 2%, 98% 98%, 2% 98%)" }
        : shape === "hex"
          ? { clipPath: "polygon(50% 2%, 92% 26%, 92% 74%, 50% 98%, 8% 74%, 8% 26%)" }
          : shape === "blob"
            ? { borderRadius: "42% 58% 55% 45% / 50% 44% 56% 50%" }
            : {};

  return (
    <div
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        width: `${width}%`,
        opacity,
        transform: `translate(-50%, -50%) translate(${tx + jx}px, ${jy}px) rotate(${rot}deg)`,
        filter:
          "drop-shadow(0 4px 6px rgba(0,0,0,0.30)) drop-shadow(0 20px 38px rgba(0,0,0,0.22))",
        zIndex: z,
      }}
    >
      <svg
        width="100%"
        viewBox={`0 0 100 ${H}`}
        preserveAspectRatio="none"
        style={{ display: "block" }}
      >
        <defs>
          <filter id={id} x="-6%" y="-8%" width="112%" height="116%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.035 0.055"
              numOctaves="4"
              seed={seed}
              result="noise"
            />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="6" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
        {outerEl}
        {innerEl}
      </svg>
      <div
        style={{
          position: "absolute",
          inset: shape === "circle" ? `${innerPad * 0.9}%` : `${innerPad + 1.5}%`,
          ...(clipChildren ? childClip : {}),
        }}
      >
        {children}
      </div>
    </div>
  );
};

// --- photo inside torn frame (any shape) ---
export const PhotoCard: React.FC<{
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  rotate?: number;
  seed?: number;
  entrance?: number;
  from?: "left" | "right" | "top" | "none";
  aspect?: number;
  tone?: string;
  shape?: TornShape;
  caption?: string;
}> = ({
  id,
  src,
  x,
  y,
  width,
  rotate = -1.2,
  seed = 5,
  entrance = 0,
  from = "left",
  aspect = 1.5,
  tone = "grayscale(0.75) sepia(0.25) contrast(1.05) brightness(0.97)",
  shape = "rect",
  caption,
}) => {
  return (
    <TornFrame
      id={id}
      x={x}
      y={y}
      width={width}
      aspect={aspect}
      rotate={rotate}
      seed={seed}
      innerPad={2.5}
      entrance={entrance}
      from={from}
      shape={shape}
    >
      <Img
        src={src}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", filter: tone }}
      />
      {caption ? (
        <div
          style={{
            position: "absolute",
            left: "6%",
            top: "6%",
            fontFamily: MONO,
            fontSize: 12,
            letterSpacing: "1.1px",
            textTransform: "uppercase",
            color: "#131313",
            background: "rgba(247,241,226,0.88)",
            padding: "2px 8px",
            borderRadius: 2,
          }}
        >
          {caption}
        </div>
      ) : null}
    </TornFrame>
  );
};

// ---------------------------------------------------------------------------
// SubjectCutout — photo cut out along the SUBJECT (alpha from rembg PNG).
// The torn-paper sticker edge follows the subject silhouette: white border
// (via SVG stroke on a dilated alpha mask approximation = simple white
// box-shadow trick), 2-layer drop shadow, boil on entrance then hold.
// ---------------------------------------------------------------------------
export const SubjectCutout: React.FC<{
  id: string;
  src: string; // PNG with alpha (cutout)
  x: number;
  y: number;
  width: number;
  rotate?: number;
  entrance?: number;
  from?: "left" | "right" | "top" | "none";
  tone?: string;
  z?: number;
  dropShadow?: boolean;
  offsetStroke?: boolean; // v10: red marker offset behind subject (vox signature)
  offset?: number; // px offset of the red stroke (default 8)
  halftone?: boolean; // v10: halftone dots clipped to the subject silhouette
  halftoneDark?: boolean; // dots on dark bg (screen blend)
}> = ({
  id,
  src,
  x,
  y,
  width,
  rotate = -1.5,
  entrance = 0,
  from = "left",
  tone = "grayscale(0.65) sepia(0.2) contrast(1.06) brightness(0.99)",
  z = 4,
  dropShadow = true,
  offsetStroke = false,
  offset = 8,
  halftone = false,
  halftoneDark = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const vf = onTwos(frame);
  const f = Math.max(0, vf - entrance * fps);

  const p = spring({ frame: f, fps, config: { damping: 15, stiffness: 130 } });
  const slide = from === "left" ? -12 : from === "right" ? 12 : from === "top" ? -8 : 0;
  const tx = interpolate(p, [0, 1], [slide, 0]);
  const rot = rotate + (1 - p) * -3;
  const opacity = interpolate(f, [0, 4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const settle = 1 - Math.min(p, 1);
  const jx = (hash(seedOf(id), Math.floor(vf)) - 0.5) * 2 * 1.2 * settle;
  const jy = (hash(seedOf(id) + 7, Math.floor(vf)) - 0.5) * 2 * 1.0 * settle;

  return (
    <div
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        width: `${width}%`,
        opacity,
        transform: `translate(-50%, -50%) translate(${tx + jx}px, ${jy}px) rotate(${rot}deg)`,
        zIndex: z,
      }}
    >
      {/* red offset marker stroke (painted BEFORE the subject = behind it) */}
      {offsetStroke ? (
        <div
          style={{
            position: "absolute",
            left: offset,
            top: offset,
            width: "100%",
            opacity: 0.9,
            filter:
              "grayscale(1) sepia(1) hue-rotate(-48deg) saturate(6) brightness(0.92) contrast(1.05)",
          }}
        >
          <Img src={src} style={{ width: "100%", display: "block" }} />
        </div>
      ) : null}
      {/* white sticker border following the alpha silhouette */}
      <div style={{ position: "relative", filter: "drop-shadow(0 0 3px rgba(250,247,239,0.95)) drop-shadow(0 0 1.5px rgba(250,247,239,0.9))" }}>
        <div
          style={{
            filter: dropShadow
              ? "drop-shadow(0 4px 6px rgba(0,0,0,0.30)) drop-shadow(0 22px 40px rgba(0,0,0,0.24))"
              : undefined,
          }}
        >
          <Img src={src} style={{ width: "100%", display: "block", filter: tone }} />
          {/* halftone clipped to the subject silhouette */}
          {halftone ? (
            <svg
              width="100%"
              height="100%"
              style={{
                position: "absolute",
                inset: 0,
                mixBlendMode: halftoneDark ? "screen" : "multiply",
                opacity: halftoneDark ? 0.55 : 0.5,
              }}
            >
              <defs>
                <pattern id={`hd-${id}`} width="14" height="14" patternUnits="userSpaceOnUse">
                  <circle cx="4" cy="4" r="2" fill={halftoneDark ? "#FFFFFF" : "#131313"} />
                </pattern>
                <mask id={`hm-${id}`}>
                  <image href={src} width="100%" height="100%" />
                </mask>
              </defs>
              <rect width="100%" height="100%" fill={`url(#hd-${id})`} mask={`url(#hm-${id})`} />
            </svg>
          ) : null}
        </div>
      </div>
    </div>
  );
};

function seedOf(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 97;
}

// --- washi tape ---
export const WashiTape: React.FC<{
  x: number;
  y: number;
  angle: number;
  width?: number;
  height?: number;
  seed?: number;
}> = ({ x, y, angle, width = 110, height = 30, seed = 21 }) => {
  const frame = useCurrentFrame();
  const vf = onTwos(frame);
  const appear = easeOut(vf, 8);
  const stick = 1 - Math.min(appear, 1);
  const jx = (hash(seed, Math.floor(vf)) - 0.5) * 2 * 1.5 * stick;
  return (
    <div
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        width,
        height,
        background: "linear-gradient(105deg, rgba(238,228,196,0.78), rgba(226,214,178,0.68))",
        transform: `translate(-50%, -50%) translateX(${jx}px) rotate(${angle}deg)`,
        boxShadow: "0 2px 4px rgba(60,45,20,0.22)",
        opacity: 0.9,
        zIndex: 5,
        clipPath: "polygon(0 8%, 6% 0, 92% 4%, 100% 12%, 97% 88%, 88% 100%, 10% 96%, 0 90%)",
      }}
    />
  );
};

// ---------------------------------------------------------------------------
// StampText — kinetic text with optional paper backdrop (auto-contrast).
// Hold-out: stays until `end`, then fades out fast.
// ---------------------------------------------------------------------------
export const StampText: React.FC<{
  text: string;
  start: number;
  end: number;
  size?: number;
  color?: string;
  x?: number;
  y?: number;
  rotate?: number;
  align?: "center" | "left" | "right";
  width?: string;
  lineHeight?: number;
  backdrop?: boolean; // paper chip behind text = always readable
  backdropColor?: string;
  onDark?: boolean;
  motion?: MotionType;
}> = ({
  text,
  start,
  end,
  size = 96,
  color,
  x = 0,
  y = 0,
  rotate = 0,
  align = "center",
  width = "auto",
  lineHeight = 1.02,
  backdrop = false,
  backdropColor = "rgba(247,241,226,0.92)",
  onDark = false,
  motion = "popIn",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const vf = onTwos(frame);
  const localStart = start * fps;
  const localEnd = end * fps;
  const f = vf - localStart;
  if (f < 0 || f > localEnd - localStart) return null;

  const appear = spring({ frame: f, fps, config: { damping: 9, mass: 0.7, stiffness: 220 } });
  const scale = 0.85 + appear * 0.15 + Math.max(0, appear - 1) * 0.3;
  const ty = (1 - Math.min(appear, 1)) * 14;
  const out = interpolate(f, [localEnd - localStart - 8, localEnd - localStart], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const finalColor = resolveAccent(color, onDark);

  return (
    <div
      style={{
        position: "absolute",
        left: align === "center" ? "50%" : `${x}%`,
        top: `${y}%`,
        transform: align === "center" ? "translate(-50%, -50%)" : undefined,
        opacity: Math.min(appear, out),
        zIndex: 6,
      }}
    >
      <div
        style={{
          transform: `scale(${scale}) translateY(${ty}px) rotate(${rotate}deg)`,
          width,
          ...(backdrop ? { background: backdropColor, padding: "6px 14px", borderRadius: 3 } : {}),
        }}
      >
        <span
          style={{
            fontFamily: ARCHIVO,
            fontWeight: 400,
            fontSize: size,
            color: finalColor,
            lineHeight,
            letterSpacing: "-0.02em",
            textTransform: "uppercase",
            display: "block",
            textAlign: align === "right" ? "right" : "left",
            whiteSpace: "pre-wrap",
          }}
        >
          {text}
        </span>
      </div>
    </div>
  );
};

// --- yellow highlight sweep ---
export const HighlightSweep: React.FC<{
  start: number;
  end: number;
  x: number;
  y: number;
  width: number;
  height?: number;
  rotate?: number;
  dark?: boolean;
}> = ({ start, end, x, y, width, height = 46, rotate = -0.6, dark = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const vf = onTwos(frame);
  const localStart = start * fps;
  const f = vf - localStart;
  if (f < 0 || f > (end - start) * fps) return null;

  const sweep = easeOut(f, Math.min(16, (end - start) * fps * 0.4));

  return (
    <div
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        height,
        width: `${width * sweep}%`,
        transform: `rotate(${rotate}deg)`,
        opacity: 0.8,
        zIndex: 1,
      }}
    >
      <svg width="100%" height="100%" viewBox="0 0 100 20" preserveAspectRatio="none">
        <path
          d="M 0 14 Q 50 9 100 12"
          stroke={resolveAccent(VOX_YELLOW, dark)}
          strokeWidth="13"
          fill="none"
          strokeLinecap="round"
          opacity="0.85"
        />
        <path
          d="M 3 16 Q 52 11 97 13"
          stroke={resolveAccent(VOX_YELLOW, dark)}
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
          opacity="0.5"
        />
      </svg>
    </div>
  );
};

// ---------------------------------------------------------------------------
// PenArrow — draw-on arrow, label holds until labelEnd (long enough to read)
// ---------------------------------------------------------------------------
export const PenArrow: React.FC<{
  start: number;
  drawDur?: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label?: string;
  labelStart?: number;
  labelEnd?: number;
  labelColor?: string;
}> = ({
  start,
  drawDur = 1.4,
  x1,
  y1,
  x2,
  y2,
  label,
  labelStart,
  labelEnd,
  labelColor = RED_PEN,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const vf = onTwos(frame);
  const localStart = start * fps;
  const f = vf - localStart;
  if (f < 0 || f > (labelEnd ?? start + drawDur + 2.5) * fps - localStart) return null;

  const draw = easeOut(f, drawDur * fps);
  const len = Math.hypot(x2 - x1, y2 - y1);
  const dash = `${Math.max(0, draw * len)} ${len}`;

  const ls = (labelStart ?? start + drawDur + 0.15) * fps;
  const le = (labelEnd ?? start + drawDur + 2.5) * fps;
  const labelOpacity = Math.min(easeOut(f - ls, 5), interpolate(f, [le - 8, le], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  }));

  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 8 }}>
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={RED_PEN}
          strokeWidth="0.7"
          strokeDasharray={dash}
          strokeLinecap="round"
        />
        {draw > 0.85 ? <circle cx={x2} cy={y2} r="1.2" fill={RED_PEN} /> : null}
      </svg>
      {label && labelOpacity > 0 ? (
        <div
          style={{
            position: "absolute",
            left: `${(x1 + x2) / 2 - 6}%`,
            top: `${(y1 + y2) / 2 - 9}%`,
            fontFamily: INTER,
            fontWeight: 700,
            fontSize: 24,
            color: labelColor,
            background: "rgba(247,241,226,0.94)",
            padding: "4px 14px",
            borderRadius: 3,
            transform: "rotate(-1.2deg)",
            opacity: labelOpacity,
            whiteSpace: "nowrap",
            boxShadow: "0 2px 8px rgba(60,45,20,0.25)",
          }}
        >
          {label}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// KaraokeSubtitle — fixed bottom layer, word-level highlight following voice.
// Data: sentences from timeline.json [{start, end, text}]
// ---------------------------------------------------------------------------
export const KaraokeSubtitle: React.FC<{
  sentences: { start: number; end: number; text: string }[];
  dark?: boolean;
}> = ({ sentences, dark = false }) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const vf = onTwos(frame); // v10: word advance on-twos (12fps editorial feel)
  const t = vf / fps;

  const active = sentences.find((s) => t >= s.start && t <= s.end);
  if (!active) return null;

  const words = active.text.split(" ");
  const dur = Math.max(0.5, active.end - active.start);
  const perWord = dur / words.length;
  const idx = Math.min(
    words.length - 1,
    Math.floor(Math.max(0, t - active.start) / perWord)
  );

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: Math.round(height * 0.045),
        zIndex: 30,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          fontFamily: INTER,
          fontWeight: 700,
          fontSize: Math.round(height * 0.028),
          textAlign: "center",
          maxWidth: "86%",
          lineHeight: 1.35,
          padding: "8px 18px",
          background: dark ? "rgba(20,23,25,0.88)" : "rgba(247,241,226,0.9)",
          borderRadius: 3,
          boxShadow: "0 3px 10px rgba(0,0,0,0.25)",
        }}
      >
        {words.map((w, i) => (
          <span
            key={i}
            style={{
              color:
                i < idx
                  ? dark
                    ? "#9AA0A6"
                    : "#8A8F94"
                  : i === idx
                    ? resolveAccent(VOX_YELLOW, dark)
                    : dark
                      ? "#F5F0E8"
                      : INK,
              textShadow: i === idx ? "0 0 12px rgba(255,242,0,0.45)" : undefined,
            }}
          >
            {w}{" "}
          </span>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// --- mono label ---
export const MonoLabel: React.FC<{
  text: string;
  x: number;
  y: number;
  color?: string;
  size?: number;
  motion?: MotionType;
  start?: number;
}> = ({ text, x, y, color = MUTED, size = 13, motion = "fadeUp", start = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = Math.max(0, frame - start * fps);
  const opacity = easeOut(f, 6);
  return (
    <div
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        opacity,
        fontFamily: MONO,
        fontWeight: 400,
        fontSize: size,
        letterSpacing: "1.1px",
        textTransform: "uppercase",
        color,
        transform: "rotate(-1deg)",
        zIndex: 6,
      }}
    >
      {text}
    </div>
  );
};

// --- imperfection stack (v10: grain 22%, vignette 17%, stronger CA) ---
export const ImperfectionOverlay: React.FC<{ frame: number }> = ({ frame }) => {
  const flicker = 1 + 0.012 * Math.sin(Math.floor(frame / 5) * 2.3 + 1.7);
  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 20 }}>
      <AbsoluteFill style={{ opacity: 0.22, mixBlendMode: "overlay" }}>
        <svg width="100%" height="100%">
          <filter id="filmGrain">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
            <feColorMatrix type="matrix" values="0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0.9 0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#filmGrain)" />
        </svg>
      </AbsoluteFill>
      <AbsoluteFill style={{ opacity: flicker }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg, rgba(255,0,60,0.09) 0%, transparent 2%, transparent 98%, rgba(0,80,255,0.09) 100%)",
          }}
        />
      </AbsoluteFill>
      {/* vignette — guides the eye, adds contrast at the edges (S5) */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 45%, transparent 58%, rgba(0,0,0,0.17) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};


// --- ItemText (moved from VoxScenes to shared primitives) ---


export const hexToRgba = (hex: string, a: number) => {
  const n = parseInt(hex.replace("#", ""), 16);
  return "rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})";
};

export const ItemText: React.FC<{ item: Item; sceneStart: number; sceneEnd: number; dark?: boolean; y?: number; align?: "center" | "left" | "right" }> = ({
  item,
  sceneStart,
  sceneEnd,
  dark = false,
  y = 40,
  align = "center",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const vf = onTwos(frame); // v10: item text steps on-twos (12fps editorial)
  const f0 = Math.max(0, vf - item.at * fps);
  if (vf < item.at * fps) return null;
  const appear = easeOut(f0, 7);
  const out = easeOut(vf - (sceneEnd - 0.5) * fps, 6);
  const opacity = Math.min(appear, 1 - Math.max(0, vf - (sceneEnd - 0.5) * fps) / 6);
  // v10: solid accent plaque for hero items (S3/S4 — bold saturated blocks);
  // smaller items keep a translucent accent chip on paper.
  const accent = item.color ? resolveAccent(item.color, dark) : null;
  const isHero = (item.size ?? 56) >= 42 && accent !== null;
  const chipBg = isHero
    ? accent!
    : accent
      ? hexToRgba(accent, dark ? 0.24 : 0.16)
      : dark
        ? "rgba(255,255,255,0.08)"
        : "rgba(247,241,226,0.92)";
  const chipColor = isHero
    ? accent === VOX_YELLOW || accent === "#C77F00"
      ? INK
      : "#FFFFFF"
    : accent ?? (dark ? "#F5F0E8" : INK);
  return (
    <div
      style={{
        position: "absolute",
        left: align === "center" ? "50%" : `${align === "left" ? 14 : 86}%`,
        top: `${y}%`,
        transform: `translate(${align === "center" ? "-50%" : align === "left" ? "0" : "-100%"}, -50%) rotate(${-0.8 + Math.sin(item.at) * 0.4}deg)`,
        opacity,
        zIndex: 6,
        textAlign: align,
      }}
    >
      <span
        style={{
          fontFamily: ARCHIVO,
          fontWeight: 400,
          fontSize: item.size ?? 56,
          color: chipColor,
          lineHeight: 1.05,
          letterSpacing: "-0.02em",
          textTransform: "uppercase",
          display: "block",
          background: chipBg,
          padding: isHero ? "18px 42px" : "6px 16px",
          borderRadius: isHero ? 6 : 3,
          whiteSpace: "pre-wrap",
          textShadow: "none",
          boxShadow: isHero ? "0 4px 14px rgba(0,0,0,0.28)" : "0 2px 8px rgba(60,45,20,0.18)",
        }}
      >
        {item.text}
      </span>
    </div>
  );
};


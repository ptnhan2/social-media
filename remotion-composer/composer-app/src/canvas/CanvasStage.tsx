// canvas/CanvasStage.tsx — pure renderer (no remotion hooks). Fixed 960x540 logical canvas.
// Recursive ElementView handles group (composite). PX coords = native for react-moveable.
import React from "react";
import type { CanvasElement, TextEffect } from "./types";
import { CANVAS_W, CANVAS_H } from "./types";

const ARCHIVO = "'Archivo Black', 'Arial Black', sans-serif";
const INK = "#131313";
const CREAM = "#F5F0E8";
const DARK_BG = "#171A1C";

const fontOf = (f?: string) => f ?? ARCHIVO;

// Build CSS text-effect decorations (shadow / outline / glow / neon) from effects[].
function effectStyle(effects?: TextEffect[]): React.CSSProperties {
  if (!effects?.length) return {};
  const s: React.CSSProperties = {};
  const shadows: string[] = [];
  for (const e of effects) {
    const c = e.color ?? "rgba(0,0,0,0.5)";
    const off = (e.intensity ?? 4);
    if (e.type === "shadow" || e.type === "lift") shadows.push(`${off}px ${off * 1.5}px ${off * 2}px ${c}`);
    if (e.type === "glow" || e.type === "neon") shadows.push(`0 0 ${off * 2}px ${c}`, `0 0 ${off * 4}px ${c}`);
    if (e.type === "outline") (s as any).WebkitTextStroke = `${Math.max(1, off / 2)}px ${c}`;
    if (e.type === "echo") shadows.push(`-${off}px 0 ${c}`, `${off}px 0 ${c}`);
  }
  if (shadows.length) s.textShadow = shadows.join(", ");
  return s;
}

const BackgroundView: React.FC<{ el: CanvasElement }> = ({ el }) => {
  if (el.bgStyle === "image" && el.bgSrc) return <img src={el.bgSrc} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover" }} />;
  if (el.bgStyle === "solid") return <div style={{ position: "absolute", inset: 0, background: el.bgColor ?? "#111" }} />;
  const dark = el.bgStyle === "paper-dark";
  return (
    <div style={{ position: "absolute", inset: 0, background: dark ? DARK_BG : CREAM }}>
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <defs>
          <filter id="bgN"><feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="3" stitchTiles="stitch" />
            <feColorMatrix type="matrix" values={dark ? "0 0 0 0 0.12 0 0 0 0 0.12 0 0 0 0 0.13 0 0 0 0.10 0" : "0 0 0 0 0.36 0 0 0 0 0.33 0 0 0 0 0.27 0 0 0 0.09 0"} /></filter>
          <pattern id="bgH" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="2" fill={dark ? "#FFFFFF" : "#131313"} opacity="0.10" /></pattern>
        </defs>
        <rect width="100%" height="100%" filter="url(#bgN)" />
        <rect width="100%" height="100%" fill="url(#bgH)" />
      </svg>
      <div style={{ position: "absolute", inset: 0, background: dark ? "radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(0,0,0,0.45) 100%)" : "radial-gradient(ellipse at 50% 45%, transparent 62%, rgba(80,60,30,0.20) 100%)" }} />
    </div>
  );
};

const TextView: React.FC<{ el: CanvasElement }> = ({ el }) => {
  const grad = el.gradient?.length ? `linear-gradient(90deg, ${el.gradient.map(g => `${g.color} ${g.pos * 100}%`).join(",")})` : undefined;
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center",
      justifyContent: el.align === "start" ? "flex-start" : el.align === "end" ? "flex-end" : "center", padding: "0 6px" }}>
      <span style={{
        fontFamily: fontOf(el.fontFamily), fontWeight: el.fontWeight ?? 400, fontStyle: el.fontStyle ?? "normal",
        textDecoration: el.textDecoration ?? "none", fontSize: el.fontSize ?? 48,
        color: grad ? "transparent" : (el.color ?? INK), background: grad ?? undefined,
        WebkitBackgroundClip: grad ? "text" : undefined, WebkitTextFillColor: grad ? "transparent" : undefined,
        lineHeight: el.lineHeight ?? 1.05, letterSpacing: `${el.letterSpacing ?? -0.01}em`,
        textTransform: "uppercase", display: "block", textAlign: el.align ?? "center", whiteSpace: "pre-wrap",
        wordBreak: "break-word", width: "100%", ...effectStyle(el.effects),
      }}>{el.spans ? el.spans.map((sp, i) => <span key={i} style={{ color: sp.color, fontWeight: sp.fontWeight, fontStyle: sp.fontStyle, textDecoration: sp.textDecoration }}>{sp.text}</span>) : el.text}</span>
    </div>
  );
};

const ShapeView: React.FC<{ el: CanvasElement }> = ({ el }) => {
  if (el.paths?.length) {
    return <svg width="100%" height="100%" viewBox={`0 0 ${el.w} ${el.h}`} preserveAspectRatio="none" style={{ overflow: "visible" }}>
      {el.paths.map((p, i) => <path key={i} d={p.d} fill={p.fill?.type === "solid" ? p.fill.color : p.fill?.type === "gradient" ? "url(#sg)" : undefined} stroke={p.stroke?.color} strokeWidth={p.stroke?.weight} />)}
    </svg>;
  }
  // legacy solid shape
  let shape: React.CSSProperties = { width: "100%", height: "100%", background: el.fill ?? "#4FC3F7", borderRadius: el.radius ?? 0, opacity: el.opacity };
  if (el.sides && el.sides >= 3) {
    // polygon via clip-path
    const sides = el.sides;
    const pts = Array.from({ length: sides }, (_, i) => { const a = (i / sides) * Math.PI * 2 - Math.PI / 2; return `${50 + Math.cos(a) * 50}% ${50 + Math.sin(a) * 50}%`; }).join(",");
    shape = { ...shape, clipPath: `polygon(${pts})`, borderRadius: 0 };
  }
  if (el.strokeWidth) shape.border = `${el.strokeWidth}px solid ${el.stroke ?? INK}`;
  return <div style={shape} />;
};

const LineView: React.FC<{ el: CanvasElement }> = ({ el }) => (
  <svg width="100%" height="100%" viewBox={`0 0 ${el.w} ${el.h}`} preserveAspectRatio="none" style={{ overflow: "visible", position: "absolute", inset: 0 }}>
    <line x1="0" y1="0" x2={el.x2 ?? el.w} y2={el.y2 ?? el.h} stroke={el.stroke ?? INK} strokeWidth={el.strokeWidth ?? 2} strokeDasharray={el.dash?.join(" ")} />
  </svg>
);

const MissingAsset: React.FC<{ el: CanvasElement }> = ({ el }) => <div data-missing-asset={el.id} style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", padding: 10, boxSizing: "border-box", border: "1px dashed #ec6a5e", background: "rgba(236,106,94,.12)", color: "#ffd1cc", font: "10px 'Roboto Mono', monospace", textAlign: "center" }}>Missing asset<br />{el.name || el.id}</div>;

const AssetImage: React.FC<{ el: CanvasElement; style: React.CSSProperties }> = ({ el, style }) => {
  const [failed, setFailed] = React.useState(!el.src);
  React.useEffect(() => setFailed(!el.src), [el.src]);
  return failed ? <MissingAsset el={el} /> : <img src={el.src} alt="" draggable={false} onError={() => setFailed(true)} style={style} />;
};

const ImageView: React.FC<{ el: CanvasElement }> = ({ el }) => {
  const tone = el.filter ?? "grayscale(0.65) sepia(0.2) contrast(1.06) brightness(0.99)";
  const tf = `${el.flipH ? "scaleX(-1)" : ""} ${el.flipV ? "scaleY(-1)" : ""}`.trim();
  if (el.imgRender === "full-bleed") return <AssetImage el={el} style={{ width: "100%", height: "100%", objectFit: el.fit ?? "cover", filter: tone, transform: tf || undefined }} />;
  if (el.imgRender === "photo-card") return (
    <div style={{ width: "100%", height: "100%", background: "#F7F1E2", padding: "3%", borderRadius: 4, boxShadow: "0 4px 6px rgba(0,0,0,.3), 0 20px 38px rgba(0,0,0,.22)", transform: "rotate(-1.2deg)" }}>
      <AssetImage el={el} style={{ width: "100%", height: "100%", objectFit: el.fit ?? "cover", filter: tone, borderRadius: 2 }} />
    </div>
  );
  return <div style={{ width: "100%", height: "100%", filter: "drop-shadow(0 0 3px rgba(250,247,239,.95)) drop-shadow(0 4px 6px rgba(0,0,0,.3)) drop-shadow(0 22px 40px rgba(0,0,0,.24))" }}>
    <AssetImage el={el} style={{ width: "100%", height: "100%", objectFit: el.fit ?? "contain", filter: tone, transform: tf || undefined }} />
  </div>;
};

// Recursive element renderer. Group renders children (relative coords). `interactive` only for
// top-level elements (group children not individually selectable yet — "enter group" = future).
const ElementView: React.FC<{ el: CanvasElement; dark?: boolean; interactive?: boolean; selectedIds?: string[]; handlers?: StageHandlers }> = ({ el, interactive, selectedIds = [], handlers }) => {
  const content = el.type === "background" ? <BackgroundView el={el} />
    : el.type === "text" || el.type === "richtext" ? <TextView el={el} />
    : el.type === "shape" ? <ShapeView el={el} />
    : el.type === "line" ? <LineView el={el} />
    : el.type === "group" ? (el.children?.map(c => <ElementView key={c.id} el={c} />))
    : el.type === "frame" ? (el.children?.map(c => <ElementView key={c.id} el={c} />))
    : <ImageView el={el} />;
  return (
    <div data-el-id={interactive ? el.id : undefined}
      className={`canvas-el ${interactive ? "interactive" : ""} ${selectedIds.includes(el.id) ? "selected" : ""}`}
      style={{ position: "absolute", left: el.x, top: el.y, width: el.w, height: el.h,
        transform: `rotate(${el.rotation}deg)`, opacity: el.opacity,
        cursor: interactive ? (el.locked ? "default" : "move") : "default",
        overflow: el.type === "frame" ? "hidden" : "visible",
        borderRadius: el.type === "frame" && el.frameShape === "circle" ? "50%" : 0,
      }}
      onPointerDown={interactive ? (e) => handlers?.onElementPointerDown?.(el.id, e) : undefined}>
      {content}
    </div>
  );
};

export interface StageHandlers {
  onElementPointerDown?: (id: string, e: React.PointerEvent) => void;
}

export const CanvasStage: React.FC<{
  elements: CanvasElement[];
  scale?: number;
  grain?: number;
  vignette?: number;
  interactive?: boolean;
  selectedIds?: string[];
  handlers?: StageHandlers;
  stageRef?: React.RefObject<HTMLDivElement>;
  children?: React.ReactNode;
}> = ({ elements, scale = 1, grain, vignette, interactive, selectedIds = [], handlers, stageRef, children }) => {
  const bg = elements.find(e => e.type === "background");
  return (
    <div ref={stageRef} className="canvas-stage" style={{
      position: "relative", width: CANVAS_W, height: CANVAS_H,
      overflow: interactive ? "visible" : "hidden",
      background: bg ? undefined : "#0f1117",
      transform: scale !== 1 ? `scale(${scale})` : undefined, transformOrigin: "50% 50%",
    }}>
      {elements.filter(e => e.visible).map(el => (
        <ElementView key={el.id} el={el} interactive={interactive} selectedIds={selectedIds} handlers={handlers} />
      ))}
      {children}
      {grain ? <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: grain, mixBlendMode: "overlay" }}><filter id="stGrain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" /></filter><rect width="100%" height="100%" filter="url(#stGrain)" /></svg> : null}
      {vignette ? <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: `radial-gradient(ellipse at 50% 45%, transparent 58%, rgba(0,0,0,${vignette}) 100%)` }} /> : null}
    </div>
  );
};

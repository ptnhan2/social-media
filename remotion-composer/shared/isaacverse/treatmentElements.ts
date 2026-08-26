import type { SemanticBeat } from "./types";
import {
  PRESENCE_ANCHOR, PRESENCE_HEIGHT, PRESENCE_ASPECT, PRESENCE_TO_CLIP_ANIM, DEFAULT_PRESENCE,
  presenceAsset, resolveCharacterPresence, type CharacterPresenceConfig,
} from "./characterPresence";

export type TreatmentElementType = "text" | "image" | "shape";

/** Resolves a style-store knob path to a value (node-safe: the generator
 *  passes a plain-object resolver; absent = hardcoded fallbacks). */
export type StyleResolver = <T>(path: string, fallback: T) => T;

export type TreatmentElement = {
  id: string;
  type: TreatmentElementType;
  x: number; y: number; w: number; h: number;
  rotation?: number;
  opacity?: number;
  /** Constant base scale (unselected candidate cards sit at 0.96). */
  scale?: number;
  /** CSS mix-blend-mode for overlay shapes (host-reflection light = screen). */
  blendMode?: string;
  /** Per-property keyframes (t = element-local seconds) — slow push-ins. */
  keyframes?: Record<string, { t: number; v: number; easing?: "linear" | "ease-in" | "ease-out" | "ease-in-out" }[]>;
  z?: number;
  text?: string;
  color?: string;
  fontSize?: number;
  fontWeight?: number;
  fontFamily?: string;
  textAlign?: string;
  textTransform?: string;
  letterSpacing?: number;
  lineHeight?: number;
  fontStyle?: string;
  textShadow?: string;
  /** Gradient fill for text: rendered via background-clip in the editor flow. */
  textGradient?: { start: string; end: string; stop?: number };
  /** Badge-style solid background behind text (candidate badges). */
  bgColor?: string;
  src?: string;
  fit?: "cover" | "contain";
  filter?: string;
  background?: string;
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  boxShadow?: string;
  animIn?: string;
  animOut?: string;
  animDurationSec?: number;
  /** Easing applied to anim progress ("linear" | "cubic-out"); baked by the
   * projection to mirror treatment interpolate(Easing.out(cubic)). */
  animEasing?: string;
  /** Slide distance in frame px (slide/fade-slide presets); fraction fallback
   * kept for UI-created clips. */
  animSlidePx?: number;
  /** Exact Remotion spring config — rendered via the clipStyle spring port
   * (remotionSpring) so the editor path matches treatment physics. */
  animSpring?: { damping: number; stiffness: number; mass: number; durationSec: number; from: number };
  /** Continuous pulse after reveal: scale *= 1 + amp * sin(frame * radPerFrame)
   * (DiagramNodeView activePulse). */
  pulse?: { amp: number; radPerFrame: number };
  /** Horizontal width wipe over its own window (ChapterCard accent line). */
  wipeX?: { startSec: number; durationSec: number };
  /** Group-scale origin in frame px: sibling elements sharing an origin scale
   * together around it (mirrors a treatment DOM group transform). */
  groupOriginX?: number;
  groupOriginY?: number;
  startSec?: number;
  endSec?: number;
  role?: string;
  /** Edge element (type "shape" + elementType "edge"): quadratic bezier
   *  draw-on — mirrors SemanticDiagram.Edge in the editor render path. */
  elementType?: string;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  /** Custom viewBox for edge elements (default 100×100). ProcessTimeline's
   * progress curve uses 100×12 like the treatment's inline svg. */
  viewBoxW?: number;
  viewBoxH?: number;
  /** Literal SVG path (overrides the computed quadratic bezier). */
  pathD?: string;
  /** Draw-on target fraction (default 1 = full draw; the progress bar draws
   * to (active+1)/steps). */
  revealTo?: number;
  curvature?: number;
  strokeMode?: string;
  strokeColor?: string;
  strokeWidth?: number;
  gradientStops?: string[];
  brushDasharray?: number[];
  linecap?: string;
  revealDurationSec?: number;
  /** prop -> style knob path that fed it (generator provenance, spec §2.2).
   *  Props absent here are fixed by treatment code (styleSource: null). */
  styleSource?: Record<string, string>;
};

const W = 1920;
const H = 1080;
const px = (v: number) => v / W;
const py = (v: number) => v / H;

const assetSrc = (beat: SemanticBeat, kind: string) => beat.treatment.assets.find((a) => a.kind === kind)?.src;

const text = (id: string, x: number, y: number, w: number, h: number, content: string, opts: Partial<TreatmentElement> = {}): TreatmentElement => ({
  id, type: "text", x: px(x), y: py(y), w: px(w), h: py(h), text: content, z: 10, opacity: 1, ...opts,
});

const image = (id: string, x: number, y: number, w: number, h: number, src: string, opts: Partial<TreatmentElement> = {}): TreatmentElement => ({
  id, type: "image", x: px(x), y: py(y), w: px(w), h: py(h), src, z: 5, opacity: 1, fit: "cover", ...opts,
});

const shape = (id: string, x: number, y: number, w: number, h: number, opts: Partial<TreatmentElement> = {}): TreatmentElement => ({
  id, type: "shape", x: px(x), y: py(y), w: px(w), h: py(h), z: 8, opacity: 1, ...opts,
});

const accent = (beat: SemanticBeat, resolve: StyleResolver) => {
  const p = beat.treatment.params as Record<string, unknown>;
  // same resolution order as treatments.tsx (params.accent ?? store colors.amber)
  return asStr(p.accent, resolve<string>("colors.amber", "#f2b84b"));
};

// ---- semantic-diagram node box layout (mirrors DiagramNodeView DOM) ----
// The treatment renders node boxes with DOM auto-height; the projection must
// ESTIMATE that height. Constants calibrated 2026-08-25 via Chromium
// measureText/DOM on Arial: line-height 900 = 1.44em, uppercase-900 width
// ≈ 0.75em/char, mixed-900 ≈ 0.64em/char. Both render paths run in the same
// Chromium, so the line-height constants are exact; wrap counts are estimates.
export const NODE_BOX = {
  width: 270,
  border: 2,
  padTop: 14,
  padX: 18,
  padBottom: 13,
  detailMarginTop: 6,
  dot: 8,
  dotOverlap: 4,
  labelLineHeight: 1.44,
  detailLineHeight: 1.35,
  labelCharEm: 0.75,
  detailCharEm: 0.64,
} as const;

/** Estimated node box/total height from label+detail text (DOM auto-layout
 * mirror — see NODE_BOX for calibration notes). */
export const estimateNodeBoxHeight = (
  label: string,
  detail: string,
  labelFontSize = 20,
  detailFontSize = 13,
): { boxH: number; totalH: number; labelH: number; detailH: number } => {
  const inner = NODE_BOX.width - 2 * NODE_BOX.padX - 2 * NODE_BOX.border; // 230
  const labelLines = Math.max(1, Math.ceil((label.length * labelFontSize * NODE_BOX.labelCharEm) / inner));
  const labelH = labelLines * labelFontSize * NODE_BOX.labelLineHeight;
  const detailLines = detail ? Math.max(1, Math.ceil((detail.length * detailFontSize * NODE_BOX.detailCharEm) / inner)) : 0;
  const detailH = detailLines * detailFontSize * NODE_BOX.detailLineHeight;
  const contentH = NODE_BOX.padTop + labelH + (detail ? NODE_BOX.detailMarginTop + detailH : 0) + NODE_BOX.padBottom;
  const boxH = contentH + 2 * NODE_BOX.border;
  const totalH = boxH + NODE_BOX.dotOverlap;
  return { boxH, totalH, labelH, detailH };
};

/** Character presence as a projected element (render path mirror of
 *  treatments.tsx CharacterPresence — spec: CHARACTER-PRESENCE-SPEC.md). */
const characterPresenceElement = (treatmentId: string, beat: SemanticBeat, resolve: StyleResolver): TreatmentElement | null => {
  const p = beat.treatment.params as Record<string, unknown>;
  // store gate through the same resolver the other knobs use
  const gate = resolve<(CharacterPresenceConfig & { enabled?: boolean }) | null>(`treatments.${treatmentId}.characterPresence`, null);
  const lookup = (tid: string) => (tid === treatmentId ? gate : null);
  const config = resolveCharacterPresence(treatmentId, p, beat.narrativeFunction, lookup, beat.startSec);
  if (!config) return null;
  const merged = { ...DEFAULT_PRESENCE, ...config };
  const anchor = PRESENCE_ANCHOR[merged.position ?? "thirds-br"];
  const height = PRESENCE_HEIGHT[merged.size ?? "small"];
  // unknown poses (user-baked via the studio) fall back to the present aspect
  const width = Math.round(height * (PRESENCE_ASPECT[merged.pose ?? "present"] ?? 654 / 1249));
  const cx = anchor.left / 100 * W;
  const cy = anchor.top / 100 * H;
  const a = accent(beat, resolve);
  return image(`${beat.id}:character-presence`, cx - width / 2, cy - height / 2, width, height, presenceAsset(merged.pose), {
    z: 30, opacity: merged.opacity ?? 0.95,
    animIn: PRESENCE_TO_CLIP_ANIM[merged.motion ?? "fade-scale"],
    animDurationSec: 0.6, startSec: merged.startSec ?? 0.7,
    // treatment-exact double drop-shadow (raw CSS passthrough in clipFilterCss)
    filter: `drop-shadow(0 6px 22px rgba(0,0,0,0.6)) drop-shadow(0 0 26px ${a}33)`,
    styleSource: { width: `treatments.${treatmentId}.characterPresence`, opacity: `treatments.${treatmentId}.characterPresence` },
  });
};

/** ChapterCard title wrap: the treatment's title div is width:86% of a
 *  shrink-to-fit parent, so the text ALWAYS wraps at 0.86 × its own single-
 *  line width (verified 2026-08-26: both render titles wrap to 2 lines).
 *  Greedy word wrap with the calibrated Arial Black-900 factor (~0.65em/char
 *  + letterSpacing) reproduces the DOM line breaks for both current titles. */
export const wrapChapterTitle = (title: string, fontSize: number, letterSpacing: number): { lines: string[]; widthEst: number } => {
  const charW = fontSize * 0.65;
  const spaceW = charW + letterSpacing;
  // widths computed on the UPPERCASED text (that's what renders), but the
  // returned lines keep the ORIGINAL case — textTransform handles the rest
  const words = title.trim().split(/\s+/);
  const upper = words.map((w) => w.toUpperCase());
  const wordW = (w: string) => w.length * charW + (w.length - 1) * letterSpacing;
  const single = upper.reduce((sum, w, i) => sum + wordW(w) + (i > 0 ? spaceW : 0), 0);
  const cap = single * 0.86;
  const lines: string[] = [];
  let cur = "";
  let curW = 0;
  upper.forEach((u, i) => {
    const w = wordW(u);
    const addW = cur ? spaceW + w : w;
    if (curW + addW <= cap || !cur) {
      cur = cur ? `${cur} ${words[i]}` : words[i];
      curW += addW;
    } else {
      lines.push(cur);
      cur = words[i];
      curW = w;
    }
  });
  if (cur) lines.push(cur);
  return { lines, widthEst: Math.max(...lines.map((l) => l.split(/\s+/).reduce((sum, w, i) => sum + wordW(w.toUpperCase()) + (i > 0 ? spaceW : 0), 0))) };
};

// ---- strict projection warning trail (PIPELINE-HARDENING-SPEC §3.1) ----
// Sync/generator mode sets strict: structural fallbacks (missing params that
// silently produce empty beats) are COLLECTED and surfaced in the CLI summary
// instead of vanishing. Lenient philosophy stays (nothing throws) — but a
// trail exists so "sync thiếu" from malformed EditDoc params is visible.
let strictProjection = false;
const projectionWarnings: string[] = [];
export const setStrictProjection = (value: boolean) => { strictProjection = value; };
export const consumeProjectionWarnings = (): string[] => projectionWarnings.splice(0);
const warnProjection = (ctx: string) => { if (strictProjection) projectionWarnings.push(ctx); };

const asStr = (v: unknown, fb = "") => typeof v === "string" ? v : fb;
const asNum = (v: unknown, fb: number) => typeof v === "number" ? v : fb;
const asArr = <T,>(v: unknown): T[] => Array.isArray(v) ? v as T[] : [];

/** identity resolver — cold projection without a store uses treatment defaults */
const noStyle: StyleResolver = <T,>(_path: string, fallback: T) => fallback;

export const generateTreatmentElements = (beat: SemanticBeat, resolve: StyleResolver = noStyle): TreatmentElement[] => {
  const p = beat.treatment.params as Record<string, unknown>;
  const a = accent(beat, resolve);
  const id = beat.id;
  const s = resolve;

  switch (beat.treatment.id) {
    case "chapter-card": {
      const titleText = asStr(p.title, beat.narrativeFunction);
      const longTitle = titleText.trim().length > 22;
      const gradientStart = s("colors.gradientStart", "#ff6b35");
      const gradientEnd = s("colors.gradientEnd", "#ffd166");
      const cyan = s("colors.cyan", "#61d7e8");
      const black = s("colors.black", "#07090d");
      const fontSize = longTitle ? s("treatments.chapter-card.title.fontSizeLong", 82) : s("treatments.chapter-card.title.fontSizeShort", 96);
      const titleLineHeight = s("treatments.chapter-card.title.lineHeight", 1.08);
      const inDur = s("treatments.chapter-card.reveal.inDurationSec", 0.45);
      const lineStart = s("treatments.chapter-card.reveal.lineStartSec", 0.15);
      const lineEnd = s("treatments.chapter-card.reveal.lineEndSec", 0.8);
      const accentHeight = s("treatments.chapter-card.accentLine.height", 8);
      const accentMaxWidth = s("treatments.chapter-card.accentLine.maxWidth", 280);
      const subtitleFontSize = s("treatments.chapter-card.subtitle.fontSize", 24);
      // treatment title ALWAYS wraps (86% of its own max width — see
      // wrapChapterTitle); layout = centered block: titleH + 26 + line + 22 + sub
      const { lines: titleLines, widthEst: titleW } = wrapChapterTitle(titleText, fontSize, longTitle ? fontSize * 0.04 : fontSize * 0.08);
      const titleH = Math.ceil(titleLines.length * fontSize * titleLineHeight);
      const subH = Math.ceil(subtitleFontSize * 1.4);
      const blockH = titleH + 26 + accentHeight + 22 + subH;
      const blockTop = H / 2 - blockH / 2;
      // the box only needs to be WIDE ENOUGH that the baked \n breaks are the
      // ONLY breaks (text is centered; the box itself is invisible): the
      // width estimate runs a few % short of true Arial Black metrics, so pad
      // it — an auto-wrap inside the box would add a third line.
      const titleBoxW = Math.min(Math.ceil(titleW * 1.18) + 24, Math.floor(W * 0.94));
      const titleX = W / 2 - titleBoxW / 2;
      const blockAnim = {
        // treatment block entrance: opacity inProgress + scale 0.85→1
        // (cubic-out) — exactly the p-fade-scale preset math
        animIn: "p-fade-scale", animDurationSec: inDur, startSec: 0,
      } as const;
      return [
        // radial backdrop + ambient glow (treatment AbsoluteFill + inset div)
        shape(`${id}:bg`, 0, 0, W, H, {
          background: `radial-gradient(ellipse at 50% 42%, #16162e 0%, #0a0a18 55%, ${black} 100%)`, z: 0, startSec: 0,
        }),
        shape(`${id}:bg-glow`, 0, 0, W, H, {
          background: `radial-gradient(circle at 50% 50%, ${a}18, transparent 55%)`,
          animIn: "fade", animEasing: "cubic-out", animDurationSec: inDur, z: 0, startSec: 0,
        }),
        text(`${id}:title`, titleX, blockTop, titleBoxW, titleH, titleLines.join("\n"), {
          fontSize, fontWeight: s("treatments.chapter-card.title.fontWeight", 900), fontFamily: "Arial Black, Arial, sans-serif",
          textTransform: "uppercase", lineHeight: titleLineHeight,
          letterSpacing: longTitle ? fontSize * 0.04 : fontSize * 0.08,
          textAlign: "center", textGradient: { start: gradientStart, end: gradientEnd, stop: 45 },
          strokeWidth: 1.5, strokeColor: "rgba(0,0,0,0.25)",
          filter: `drop-shadow(0 4px 14px rgba(0,0,0,0.7)) drop-shadow(0 0 30px ${a}50)`,
          ...blockAnim, z: 15,
          styleSource: {
            fontSize: longTitle ? "treatments.chapter-card.title.fontSizeLong" : "treatments.chapter-card.title.fontSizeShort",
            fontWeight: "treatments.chapter-card.title.fontWeight",
            textGradientStart: "colors.gradientStart", textGradientEnd: "colors.gradientEnd",
          },
        }),
        // accent line: width wipes 0 -> lineProgress × maxWidth while the
        // block entrance still applies (independent scaleX timing)
        shape(`${id}:accent-line`, W / 2 - accentMaxWidth / 2, blockTop + titleH + 26, accentMaxWidth, accentHeight, {
          background: `linear-gradient(90deg, transparent, ${gradientStart}, ${gradientEnd}, ${gradientStart}, transparent)`,
          boxShadow: `0 0 24px ${gradientStart}80, 0 2px 8px rgba(0,0,0,0.5)`,
          borderRadius: 4, wipeX: { startSec: lineStart, durationSec: Math.max(0.01, lineEnd - lineStart) },
          ...blockAnim, z: 12,
          styleSource: { width: "treatments.chapter-card.accentLine.maxWidth", height: "treatments.chapter-card.accentLine.height" },
        }),
        asStr(p.subtitle) ? text(`${id}:subtitle`, (W - 1651) / 2, blockTop + titleH + 26 + accentHeight + 22, 1651, subH, asStr(p.subtitle), {
          fontSize: subtitleFontSize, fontWeight: 900, fontFamily: "Arial, sans-serif",
          letterSpacing: subtitleFontSize * 0.08, textTransform: "uppercase", textAlign: "center",
          color: cyan, textShadow: "0 2px 10px rgba(0,0,0,0.8)",
          ...blockAnim, z: 12,
          styleSource: { fontSize: "treatments.chapter-card.subtitle.fontSize" },
        }) : null,
      ].filter(Boolean) as TreatmentElement[];
    }

    case "semantic-diagram": {
      const nodes = asArr<Record<string, unknown>>(p.nodes);
      if (nodes.length === 0) warnProjection(`semantic-diagram @${id}: params.nodes missing/empty — projecting NO node clips`);
      const nodeFontSize = s("treatments.semantic-diagram.node.fontSize", 20);
      const nodeFontWeight = s("treatments.semantic-diagram.node.fontWeight", 900);
      const detailFontSize = s("treatments.semantic-diagram.node.detailFontSize", 13);
      // store-resolved colors — same knobs the treatment reads via getStyle
      const cyan = s("colors.cyan", "#61d7e8");
      const paper = s("colors.paper", "#f4e8cf");
      const black = s("colors.black", "#07090d");
      const nodeBorderWidth = s("treatments.semantic-diagram.node.borderWidth", 2);
      const nodeBorderRadius = s("treatments.semantic-diagram.node.borderRadius", 10);
      const nodeBackground = s<string>("treatments.semantic-diagram.node.background", "rgba(7,9,13,0.84)");
      const nodeGlow = s("treatments.semantic-diagram.node.glow", 18);
      const nodePadding = s<string>("treatments.semantic-diagram.node.padding", "14px 18px 13px");
      const padParts = nodePadding.split(/\s+/).map((part) => Number.parseFloat(part));
      const padTop = Number.isFinite(padParts[0]) ? padParts[0] : NODE_BOX.padTop;
      const padX = Number.isFinite(padParts[1]) ? padParts[1] : NODE_BOX.padX;
      const padBottom = Number.isFinite(padParts[2]) ? padParts[2] : NODE_BOX.padBottom;
      const entDamping = s("treatments.semantic-diagram.entrance.damping", 18);
      const entStiffness = s("treatments.semantic-diagram.entrance.stiffness", 140);
      const entMass = s("treatments.semantic-diagram.entrance.mass", 0.8);
      const entDur = s("treatments.semantic-diagram.entrance.durationSec", 0.75);
      const kickerFontSize = s("treatments.semantic-diagram.kicker.fontSize", 18);
      const kickerFontWeight = s("treatments.semantic-diagram.kicker.fontWeight", 900);
      const titleFontSize = s("treatments.semantic-diagram.title.fontSize", 46);
      const titleFontWeight = s("treatments.semantic-diagram.title.fontWeight", 900);
      // measured Chromium line heights (2026-08-25): Arial-900 ≈ 1.422-1.44em,
      // Arial Black-900 46px = 64.8px, Arial-normal 14px = 16.8px
      const kickerH = kickerFontSize * 1.4222;
      const titleH = titleFontSize * 1.4087;
      const footerH = 16.8;
      const els: TreatmentElement[] = [
        // per-beat background (treatment renders BLACK() AbsoluteFill + radial
        // glow inside the beat camera; both must exist in the editor path too)
        shape(`${id}:bg`, 0, 0, W, H, { background: black, z: 0, startSec: 0 }),
        shape(`${id}:bg-glow`, 0, 0, W, H, { background: `radial-gradient(circle at 50% 46%, ${a}12, transparent 42%)`, z: 0, startSec: 0 }),
        (asStr(p.kicker) || beat.narrativeFunction) ? text(`${id}:kicker`, 86, 62, 800, kickerH, asStr(p.kicker) || beat.narrativeFunction, {
          fontSize: kickerFontSize, fontWeight: kickerFontWeight,
          fontFamily: "Arial, sans-serif", textTransform: "uppercase", letterSpacing: kickerFontSize * 0.18, textAlign: "left",
          color: cyan, animIn: "fade-slide-up", animSlidePx: 18, animEasing: "cubic-out", animDurationSec: 0.55, z: 15, startSec: 0, textShadow: "0 2px 8px rgba(0,0,0,0.7)",
          styleSource: { fontSize: "treatments.semantic-diagram.kicker.fontSize", fontWeight: "treatments.semantic-diagram.kicker.fontWeight" },
        }) : null,
        text(`${id}:title`, 86, 62 + kickerH + 12, 1200, titleH, asStr(p.title, beat.narrativeFunction), {
          fontSize: titleFontSize, fontWeight: titleFontWeight,
          fontFamily: "Arial Black, Arial, sans-serif", color: paper, textAlign: "left",
          letterSpacing: titleFontSize * -0.02, strokeWidth: 1, strokeColor: "rgba(0,0,0,0.2)",
          filter: `drop-shadow(0 3px 10px rgba(0,0,0,0.6)) drop-shadow(0 0 18px ${a}30)`,
          animIn: "fade-slide-up", animSlidePx: 18, animEasing: "cubic-out", animDurationSec: 0.55, z: 15, startSec: 0,
          styleSource: { fontSize: "treatments.semantic-diagram.title.fontSize", fontWeight: "treatments.semantic-diagram.title.fontWeight" },
        }),
        shape(`${id}:accent-line`, 86, 62 + kickerH + 12 + titleH + 16, 130, 5, {
          background: `linear-gradient(90deg, ${s("colors.gradientStart", "#ff6b35")}, ${s("colors.gradientEnd", "#ffd166")})`,
          borderRadius: 3, boxShadow: `0 0 16px ${a}80`,
          animIn: "fade-slide-up", animSlidePx: 18, animEasing: "cubic-out", animDurationSec: 0.55, z: 12, startSec: 0,
        }),
        // centerLabel: 250×250 circle centered at (50%, 50%) — static (no anim)
        asStr(p.centerLabel) ? shape(`${id}:center-label`, W / 2 - 125, H / 2 - 125, 250, 250, {
          borderRadius: 125, borderWidth: 2, borderColor: `${cyan}88`, background: "linear-gradient(135deg, rgba(0,212,255,0.10), rgba(255,107,53,0.08))", boxShadow: `0 0 38px ${cyan}28`, z: 5, startSec: 0,
        }) : null,
        asStr(p.centerLabel) ? text(`${id}:center-label-text`, W / 2 - 125, H / 2 - 125, 250, 250, asStr(p.centerLabel), {
          fontSize: s("treatments.semantic-diagram.centerLabel.fontSize", 20), fontWeight: 900, fontFamily: "Arial, sans-serif", textTransform: "uppercase", letterSpacing: 1.6,
          color: cyan, textAlign: "center", z: 6, startSec: 0, textShadow: "0 2px 8px rgba(0,0,0,0.7)",
          styleSource: { fontSize: "treatments.semantic-diagram.centerLabel.fontSize" },
        }) : null,
      ].filter(Boolean) as TreatmentElement[];
      nodes.forEach((node, i) => {
        const nx = asNum(node.x, 50) / 100 * W;
        const ny = asNum(node.y, 50) / 100 * H;
        // treatment reveal: (node.activeFrom ?? 0) * fps — NOT index stagger
        const activeFrom = asNum(node.activeFrom, 0);
        const label = asStr(node.label);
        const detail = asStr(node.detail);
        const innerW = NODE_BOX.width - 2 * padX - 2 * nodeBorderWidth;
        const labelLines = Math.max(1, Math.ceil((label.length * nodeFontSize * NODE_BOX.labelCharEm) / innerW));
        const labelH = labelLines * nodeFontSize * NODE_BOX.labelLineHeight;
        const detailLines = detail ? Math.max(1, Math.ceil((detail.length * detailFontSize * NODE_BOX.detailCharEm) / innerW)) : 0;
        const detailH = detailLines * detailFontSize * NODE_BOX.detailLineHeight;
        const boxH = nodeBorderWidth + padTop + labelH + (detail ? NODE_BOX.detailMarginTop + detailH : 0) + padBottom + nodeBorderWidth;
        const totalH = boxH + NODE_BOX.dotOverlap;
        const boxLeft = nx - NODE_BOX.width / 2;
        const boxTop = ny - totalH / 2;
        const innerLeft = boxLeft + nodeBorderWidth + padX;
        const labelTop = boxTop + nodeBorderWidth + padTop;
        const color = asStr(node.color, a);
        // group transform: every node piece scales around the node center with
        // the SAME entrance spring + activePulse (mirrors DiagramNodeView)
        const group = {
          groupOriginX: nx, groupOriginY: ny,
          animIn: "spring",
          animSpring: { damping: entDamping, stiffness: entStiffness, mass: entMass, durationSec: entDur, from: 0.82 },
          pulse: { amp: 0.08, radPerFrame: 1 / 5 },
          animDurationSec: entDur, startSec: activeFrom,
        } as const;
        els.push(shape(`${id}:node-${i}-box`, boxLeft, boxTop, NODE_BOX.width, boxH, {
          borderWidth: nodeBorderWidth, borderColor: color, background: nodeBackground, borderRadius: nodeBorderRadius,
          boxShadow: `0 0 ${nodeGlow}px ${color}38, inset 0 0 ${nodeGlow}px ${color}12`, z: 10,
          styleSource: {
            borderWidth: "treatments.semantic-diagram.node.borderWidth", borderRadius: "treatments.semantic-diagram.node.borderRadius",
            background: "treatments.semantic-diagram.node.background", boxShadow: "treatments.semantic-diagram.node.glow",
          }, ...group,
        }));
        els.push(text(`${id}:node-${i}-label`, innerLeft, labelTop, innerW, labelH, label, {
          fontSize: nodeFontSize, fontWeight: nodeFontWeight, fontFamily: "Arial, sans-serif", textTransform: "uppercase", letterSpacing: nodeFontSize * 0.04, textAlign: "left",
          color, z: 11, textShadow: "0 2px 6px rgba(0,0,0,0.7)",
          styleSource: { fontSize: "treatments.semantic-diagram.node.fontSize", fontWeight: "treatments.semantic-diagram.node.fontWeight" }, ...group,
        }));
        if (detail) els.push(text(`${id}:node-${i}-detail`, innerLeft, labelTop + labelH + NODE_BOX.detailMarginTop, innerW, detailH, detail, {
          fontSize: detailFontSize, fontFamily: "Arial, sans-serif", color: paper, opacity: 0.78, lineHeight: NODE_BOX.detailLineHeight, fontWeight: 900, textAlign: "left", z: 11,
          styleSource: { fontSize: "treatments.semantic-diagram.node.detailFontSize" }, ...group,
        }));
        // the dot under the box (overlaps the bottom border by 4px);
        // gradient uses secondaryAccent→accent (NOT node color) like the treatment
        els.push(shape(`${id}:node-${i}-dot`, nx - NODE_BOX.dot / 2, boxTop + boxH - NODE_BOX.dotOverlap, NODE_BOX.dot, NODE_BOX.dot, {
          borderRadius: NODE_BOX.dot / 2, background: `linear-gradient(135deg, ${cyan}, ${a})`, boxShadow: `0 0 12px ${cyan}`, z: 11, ...group,
        }));
      });
      // Edges (E2 parity): the treatment draws edges in an SVG with viewBox
      // "0 0 100 100" + preserveAspectRatio="none" — node % coords go in AS-IS
      // and the non-uniform stretch produces the stroke width + curvature
      // scaling. The editor overlay renders the same viewBox, so coordinates
      // stay in percent units here (NOT converted to px).
      {
        const edges = asArr<Record<string, unknown>>(p.edges);
        if (edges.length === 0) warnProjection(`semantic-diagram @${id}: params.edges missing/empty — projecting NO edge clips`);
        const nodeById = new Map(nodes.map((n) => [asStr(n.id), n]));
        const strokeStyle = s<Record<string, unknown>>("treatments.semantic-diagram.edge.stroke", {} as Record<string, unknown>);
        const strokeMode = asStr(strokeStyle.mode, "gradient");
        const strokeColor = asStr(strokeStyle.color, "rgba(242,184,75,0.58)");
        const strokeWidth = asNum(strokeStyle.width, 2);
        const gradientStops = Array.isArray(strokeStyle.gradientStops) ? (strokeStyle.gradientStops as string[]) : ["#7fd8e8", "#f2d58a"];
        const brushDasharray = asStr(strokeStyle.brushDasharray, "3 1 5 2").split(/[\s,]+/).filter(Boolean).map((v) => Number.parseFloat(v));
        const linecap = asStr(strokeStyle.linecap, "round");
        const curvature = s<number>("treatments.semantic-diagram.edge.curvature", 0.12);
        const revealDur = s<number>("treatments.semantic-diagram.edge.revealDurationSec", 0.65);
        edges.forEach((edge, i) => {
          const from = nodeById.get(asStr(edge.from));
          const to = nodeById.get(asStr(edge.to));
          if (!from || !to) return;
          els.push(shape(`${id}:edge-${i}`, 0, 0, W, H, {
            elementType: "edge",
            x1: asNum(from.x, 50), y1: asNum(from.y, 50),
            x2: asNum(to.x, 50), y2: asNum(to.y, 50),
            curvature,
            strokeMode, strokeColor, strokeWidth, gradientStops, brushDasharray, linecap,
            revealDurationSec: revealDur,
            startSec: asNum(edge.revealAt, 0),
            z: 4, opacity: 1,
            styleSource: {
              curvature: "treatments.semantic-diagram.edge.curvature",
              stroke: "treatments.semantic-diagram.edge.stroke",
              revealDurationSec: "treatments.semantic-diagram.edge.revealDurationSec",
            },
          }));
        });
      }
      const sdPresence = characterPresenceElement("semantic-diagram", beat, s);
      if (sdPresence) els.push(sdPresence);
      // footer: right-anchored (right: 70 → right edge 1850), bottom: 45
      els.push(text(`${id}:footer`, 1850 - 500, 1080 - 45 - footerH, 500, footerH, "follow the thread", {
        fontSize: 14, fontWeight: 400, fontFamily: "Arial, sans-serif", textTransform: "uppercase", letterSpacing: 1.12, textAlign: "right",
        color: "rgba(244,232,207,0.45)", z: 8, startSec: 0,
      }));
      return els;
    }

    case "host-reflection-cinematic": {
      const src = assetSrc(beat, "character") ?? assetSrc(beat, "image") ?? "";
      const black = s("colors.black", "#07090d");
      const lightSide = asStr(p.lightSide, "left");
      const entranceDur = s("treatments.host-reflection.entranceDurationSec", 0.5);
      const pushStart = s("treatments.host-reflection.pushStart", 1.06);
      const pushDur = s("treatments.host-reflection.pushDurationSec", 4);
      const lbTop = s("treatments.host-reflection.letterboxTopPct", 8);
      const lbBottom = s("treatments.host-reflection.letterboxBottomPct", 12);
      const lbTopH = Math.round((lbTop / 100) * H);
      const lbBottomH = Math.round((lbBottom / 100) * H);
      // every element fades in with the whole-beat entrance (AbsoluteFill opacity)
      const beatIn = { animIn: "fade", animEasing: "cubic-out", animDurationSec: entranceDur, startSec: 0 } as const;
      const light = lightSide === "left"
        ? "linear-gradient(90deg, rgba(242,184,75,.65), transparent 48%)"
        : "linear-gradient(270deg, rgba(242,184,75,.65), transparent 48%)";
      const els: TreatmentElement[] = [];
      if (src) els.push(image(`${id}:bg-image`, 0, 0, W, H, src, {
        filter: s("treatments.host-reflection.filter", "saturate(1.05) contrast(1.15) brightness(.9)"), z: 1,
        // slow push-in (scale pushStart -> 1 over pushDur, cubic-out approximated
        // by the quad ease-out keyframe easing)
        keyframes: { scale: [{ t: 0, v: pushStart, easing: "ease-out" }, { t: pushDur, v: 1, easing: "linear" }] },
        ...beatIn,
        styleSource: { filter: "treatments.host-reflection.filter" },
      }));
      els.push(shape(`${id}:light-overlay`, 0, 0, W, H, {
        background: light, blendMode: "screen", z: 3, opacity: 0.7, ...beatIn,
      }));
      els.push(shape(`${id}:vignette`, 0, 0, W, H, {
        background: "linear-gradient(180deg, rgba(0,0,0,.18), transparent 36%, transparent 65%, rgba(0,0,0,.7))", z: 4, ...beatIn,
      }));
      els.push(shape(`${id}:letterbox-top`, 0, 0, W, lbTopH, { background: black, z: 6, ...beatIn }));
      els.push(shape(`${id}:letterbox-bottom`, 0, H - lbBottomH, W, lbBottomH, { background: black, z: 6, ...beatIn }));
      els.push(text(`${id}:subtitle`, Math.round(W * 0.08), H - lbBottomH, W - Math.round(W * 0.16), lbBottomH, asStr(p.subtitle, beat.transcript), {
        fontSize: s("treatments.host-reflection.subtitle.fontSize", 27), fontStyle: "italic", fontFamily: "Georgia, serif", textAlign: "center", color: a,
        fontWeight: s("treatments.host-reflection.subtitle.fontWeight", 900), textShadow: "0 3px 12px #000, 0 0 24px rgba(0,0,0,0.8)", z: 14, ...beatIn,
        styleSource: { fontSize: "treatments.host-reflection.subtitle.fontSize", fontWeight: "treatments.host-reflection.subtitle.fontWeight" },
      }));
      return els;
    }

    case "screen-proof-in-world": {
      const screenSrc = assetSrc(beat, "screen") ?? "";
      const hostSrc = assetSrc(beat, "character");
      const els: TreatmentElement[] = [];
      if (screenSrc) els.push(image(`${id}:screen`, 250, 130, 1306, 735, screenSrc, {
        borderWidth: 2, borderColor: `${a}aa`, borderRadius: 0, background: "#050609", z: 5, animIn: "scale", animDurationSec: 0.8, startSec: 0,
      }));
      if (hostSrc) els.push(image(`${id}:host`, 1440, 525, 400, 520, hostSrc, {
        fit: "contain", filter: "drop-shadow(0 0 12px rgba(242,184,75,.45))", z: 8, animIn: "slide-up", animDurationSec: 0.5, startSec: 0.4,
      }));
      if (asStr(p.caption)) els.push(text(`${id}:caption`, 154, 935, 1612, 60, asStr(p.caption), {
        fontSize: s("treatments.screen-proof.caption.fontSize", 28), fontStyle: "italic", fontWeight: 900, fontFamily: "Arial, sans-serif", textAlign: "center", color: "#f4e8cf",
        textShadow: "0 3px 12px #000, 0 0 18px rgba(0,0,0,0.7)", z: 14, animIn: "fade", animDurationSec: 0.5, startSec: 0.6,
        styleSource: { fontSize: "treatments.screen-proof.caption.fontSize" },
      }));
      return els;
    }

    case "audience-demand-proof": {
      const comments = asArr<Record<string, unknown>>(p.comments);
      const contextSrc = assetSrc(beat, "screen");
      const hostSrc = assetSrc(beat, "character");
      const els: TreatmentElement[] = [];
      if (contextSrc) els.push(image(`${id}:context-bg`, 0, 0, W, H, contextSrc, {
        filter: "blur(16px) saturate(.7) brightness(.35)", z: 1, opacity: 0.5, startSec: 0,
      }));
      els.push(text(`${id}:label`, 70, 54, 600, 30, "audience demand", {
        fontSize: s("treatments.audience-demand.kicker.fontSize", 18), fontWeight: s("treatments.audience-demand.kicker.fontWeight", 900),
        fontFamily: "Arial, sans-serif", textTransform: "uppercase", letterSpacing: 3.2, color: a, opacity: 0.9, z: 10, startSec: 0, textShadow: "0 2px 8px rgba(0,0,0,0.7)",
        styleSource: { fontSize: "treatments.audience-demand.kicker.fontSize", fontWeight: "treatments.audience-demand.kicker.fontWeight" },
      }));
      comments.forEach((c, i) => {
        const cx = asNum(c.x, 50 + ((i % 3) - 1) * 18) / 100 * W;
        const cy = asNum(c.y, 28 + Math.floor(i / 3) * 18) / 100 * H;
        const cStart = 0.25 + i * 0.25;
        els.push(shape(`${id}:comment-${i}-box`, cx - 270, cy - 40, 540, 80, {
          background: "rgba(248,248,244,.96)", borderRadius: 8, boxShadow: `0 12px 30px rgba(0,0,0,.38)`, z: 12 + i, animIn: "bounce", animDurationSec: 0.55, startSec: cStart,
        }));
        els.push(text(`${id}:comment-${i}-text`, cx - 240, cy - 30, 480, 60, asStr(c.text), {
          fontSize: s("treatments.audience-demand.comments.fontSize", 25), fontWeight: s("treatments.audience-demand.comments.fontWeight", 900),
          fontFamily: "Arial, sans-serif", color: "#14171c", lineHeight: 1.2, z: 13 + i, animIn: "bounce", animDurationSec: 0.55, startSec: cStart,
          textShadow: "0 1px 2px rgba(0,0,0,0.25)",
          styleSource: { fontSize: "treatments.audience-demand.comments.fontSize", fontWeight: "treatments.audience-demand.comments.fontWeight" },
        }));
      });
      if (hostSrc) els.push(image(`${id}:host`, 1536, 525, 384, 520, hostSrc, { fit: "contain", z: 20, animIn: "slide-up", animDurationSec: 0.5, startSec: 0.25 + comments.length * 0.25 }));
      if (asStr(p.caption)) els.push(text(`${id}:caption`, 154, 940, 1612, 50, asStr(p.caption), {
        fontSize: s("treatments.audience-demand.caption.fontSize", 28), fontStyle: "italic", fontWeight: 900, fontFamily: "Georgia, serif", textAlign: "center", color: "#f4e8cf",
        textShadow: "0 3px 12px #000, 0 0 20px rgba(0,0,0,0.7)", z: 25, animIn: "fade", animDurationSec: 0.5, startSec: 0.5 + comments.length * 0.25,
        styleSource: { fontSize: "treatments.audience-demand.caption.fontSize" },
      }));
      return els;
    }

    case "process-timeline": {
      const steps = asArr<Record<string, unknown>>(p.steps);
      if (steps.length === 0) warnProjection(`process-timeline @${id}: params.steps missing/empty — projecting NO step clips`);
      const active = asNum(p.activeStep, 0);
      const activeIdx = Math.min(steps.length - 1, Math.max(0, active));
      const gradientStart = s("colors.gradientStart", "#ff6b35");
      const gradientEnd = s("colors.gradientEnd", "#ffd166");
      const black = s("colors.black", "#07090d");
      const paper = s("colors.paper", "#f4e8cf");
      const titleInDur = s("treatments.process-timeline.titleInDurationSec", 0.45);
      const progressStart = s("treatments.process-timeline.progressStartSec", 0.35);
      const progressEnd = s("treatments.process-timeline.progressEndSec", 1.2);
      const springDamping = s("treatments.process-timeline.spring.damping", 18);
      const springStiffness = s("treatments.process-timeline.spring.stiffness", 150);
      const kickerFontSize = s("treatments.process-timeline.kicker.fontSize", 17);
      const titleFontSize = s("treatments.process-timeline.title.fontSize", 48);
      const stepFontSize = s("treatments.process-timeline.step.fontSize", 16);
      const kickerH = kickerFontSize * 1.4222;
      const titleH = titleFontSize * 1.4222;
      const footerH = 16.8;
      // svg bar: left 9% width 82%, centered on 46% of height, 60px tall,
      // viewBox 100×12 — curve M 0 6 Q 50 -6 100 6 (both paths identical)
      const barLeft = 0.09 * W;
      const barWidth = 0.82 * W;
      const barCenterY = 0.46 * H;
      const barTop = barCenterY - 30;
      const barPath = "M 0 6 Q 50 -6 100 6";
      const els: TreatmentElement[] = [
        shape(`${id}:bg`, 0, 0, W, H, { background: black, z: 0, startSec: 0 }),
        shape(`${id}:bg-glow`, 0, 0, W, H, { background: `radial-gradient(circle at 50% 60%, ${a}14, transparent 48%)`, z: 0, startSec: 0 }),
        text(`${id}:label`, 76, 62, 600, kickerH, asStr(p.kicker) || beat.narrativeFunction || "workflow", {
          fontSize: kickerFontSize, fontWeight: s("treatments.process-timeline.kicker.fontWeight", 900),
          fontFamily: "Arial, sans-serif", textTransform: "uppercase", letterSpacing: kickerFontSize * 0.18, textAlign: "left",
          color: a, animIn: "fade-slide-up", animSlidePx: 18, animEasing: "cubic-out", animDurationSec: titleInDur, z: 10, startSec: 0,
          textShadow: "0 2px 8px rgba(0,0,0,0.7)",
          styleSource: { fontSize: "treatments.process-timeline.kicker.fontSize", fontWeight: "treatments.process-timeline.kicker.fontWeight" },
        }),
        text(`${id}:title`, 76, 62 + kickerH + 12, 1200, titleH, asStr(p.title, beat.narrativeFunction), {
          fontSize: titleFontSize, fontWeight: s("treatments.process-timeline.title.fontWeight", 900),
          fontFamily: "Arial, sans-serif", color: paper, textAlign: "left",
          textGradient: { start: gradientStart, end: gradientEnd },
          filter: `drop-shadow(0 3px 10px rgba(0,0,0,0.7)) drop-shadow(0 0 16px ${a}40)`,
          animIn: "fade-slide-up", animSlidePx: 18, animEasing: "cubic-out", animDurationSec: titleInDur, z: 10, startSec: 0,
          styleSource: { fontSize: "treatments.process-timeline.title.fontSize", fontWeight: "treatments.process-timeline.title.fontWeight", textGradientStart: "colors.gradientStart", textGradientEnd: "colors.gradientEnd" },
        }),
        // progress track (full curve, static)
        shape(`${id}:progress-track`, barLeft, barTop, barWidth, 60, {
          elementType: "edge", viewBoxW: 100, viewBoxH: 12, pathD: barPath,
          x1: 0, y1: 6, x2: 100, y2: 6,
          strokeMode: "solid", strokeColor: "rgba(244,232,207,.2)", strokeWidth: 0.7,
          revealDurationSec: 0.001, z: 5, startSec: 0,
        }),
        // progress fill: draw-on over [progressStart, progressEnd] to (active+1)/steps
        shape(`${id}:progress-fill`, barLeft, barTop, barWidth, 60, {
          elementType: "edge", viewBoxW: 100, viewBoxH: 12, pathD: barPath,
          x1: 0, y1: 6, x2: 100, y2: 6,
          strokeMode: "gradient", gradientStops: [gradientStart, gradientEnd], strokeWidth: 1.2, linecap: "round",
          revealDurationSec: Math.max(0.01, progressEnd - progressStart),
          revealTo: (activeIdx + 1) / Math.max(steps.length, 1),
          filter: `drop-shadow(0 0 3px ${a})`,
          z: 6, startSec: progressStart,
          styleSource: { gradientStops: "treatments.process-timeline.progress" },
        }),
      ];
      steps.forEach((st, i) => {
        const sx = 0.09 * W + (i / Math.max(steps.length - 1, 1)) * 0.82 * W;
        const selected = i === activeIdx;
        const col = asStr(st.color, selected ? a : "#61d7e8");
        const stepStart = i * 0.18;
        const dotSize = selected ? 28 : 20;
        const labelH = stepFontSize * 1.4222;
        const detailFontSize = 12;
        const detailLines = asStr(st.detail) ? Math.max(1, Math.ceil((asStr(st.detail).length * detailFontSize * 0.64) / 148)) : 0;
        const detailH = detailLines * detailFontSize * 1.3;
        const boxH = 2 + 12 + labelH + (detailLines ? 6 + detailH : 0) + 12 + 2;
        const stepTotalH = dotSize + 18 + boxH;
        const stepTop = barCenterY - stepTotalH / 2;
        const springCfg = { damping: springDamping, stiffness: springStiffness, mass: 1, durationSec: 0.6, from: 1 };
        const stepAnim = {
          animIn: "spring-slide-up", animSlidePx: 28, animSpring: springCfg,
          animDurationSec: 0.6, startSec: stepStart,
        } as const;
        els.push(shape(`${id}:step-${i}-dot`, sx - dotSize / 2, stepTop, dotSize, dotSize, {
          borderRadius: dotSize * 0.5, background: `radial-gradient(circle at 35% 30%, ${col}, ${col}99)`,
          boxShadow: selected ? `0 0 24px ${col}, 0 0 48px ${col}66` : `0 0 12px ${col}88`,
          borderWidth: 3, borderColor: black, z: 8, ...stepAnim,
        }));
        const boxTop = stepTop + dotSize + 18;
        els.push(shape(`${id}:step-${i}-box`, sx - 90, boxTop, 180, boxH, {
          borderWidth: 2, borderColor: selected ? col : `${col}88`, borderRadius: 8,
          background: selected ? `${col}18` : "rgba(7,9,13,.76)", z: 8, ...stepAnim,
        }));
        els.push(text(`${id}:step-${i}-label`, sx - 90 + 16, boxTop + 14, 148, labelH, asStr(st.label), {
          fontSize: stepFontSize, fontWeight: s("treatments.process-timeline.step.fontWeight", 900),
          fontFamily: "Arial, sans-serif", textTransform: "uppercase", letterSpacing: stepFontSize * 0.04, textAlign: "center",
          color: col, z: 9, textShadow: "0 2px 8px rgba(0,0,0,0.8)", ...stepAnim,
          styleSource: { fontSize: "treatments.process-timeline.step.fontSize", fontWeight: "treatments.process-timeline.step.fontWeight" },
        }));
        if (asStr(st.detail)) els.push(text(`${id}:step-${i}-detail`, sx - 90 + 16, boxTop + 14 + labelH + 6, 148, detailH, asStr(st.detail), {
          fontSize: detailFontSize, fontFamily: "Arial, sans-serif", color: paper, opacity: 0.7, lineHeight: 1.3, textAlign: "center", z: 9, fontWeight: 900, ...stepAnim,
        }));
      });
      const ptPresence = characterPresenceElement("process-timeline", beat, s);
      if (ptPresence) els.push(ptPresence);
      // footer: right 76 → right edge 1844, bottom 48 → bottom edge 1032
      els.push(text(`${id}:footer`, 1844 - 500, 1032 - footerH, 500, footerH, `step ${activeIdx + 1} / ${steps.length}`, {
        fontSize: 14, fontWeight: 400, fontFamily: "Arial, sans-serif", textTransform: "uppercase", letterSpacing: 1.12, textAlign: "right",
        color: "rgba(244,232,207,.5)", z: 8, startSec: 0,
      }));
      return els;
    }

    case "candidate-comparison": {
      const candidates = asArr<Record<string, unknown>>(p.candidates);
      if (candidates.length === 0) warnProjection(`candidate-comparison @${id}: params.candidates missing/empty — projecting NO candidate clips`);
      const selected = asNum(p.selectedIndex, 0);
      const count = Math.max(1, Math.min(4, candidates.length));
      const black = s("colors.black", "#07090d");
      const paper = s("colors.paper", "#f4e8cf");
      const gradientStart = s("colors.gradientStart", "#ff6b35");
      const gradientEnd = s("colors.gradientEnd", "#ffd166");
      const kickerFontSize = s("treatments.candidate-comparison.kicker.fontSize", 17);
      const titleFontSize = s("treatments.candidate-comparison.title.fontSize", 44);
      const stagger = s("treatments.candidate-comparison.candidateStaggerSec", 0.22);
      const springDamping = s("treatments.candidate-comparison.spring.damping", 18);
      const springStiffness = s("treatments.candidate-comparison.spring.stiffness", 160);
      const kickerH = kickerFontSize * 1.4222;
      const titleH = titleFontSize * 1.4222;
      // grid: left/right 7%, top 28% (302.4) bottom 12% (950.4), gap 18
      const gridLeft = 0.07 * W;
      const gridW = W - 2 * gridLeft;
      const colW = (gridW - (count - 1) * 18) / count;
      const cardTop = 0.28 * H;
      const cardH = 0.88 * H - cardTop;
      const imgH = cardH * 0.68;
      const titleInDur = s("treatments.candidate-comparison.titleInDurationSec", 0.45);
      const blockAnim = { animIn: "fade-slide-up", animSlidePx: 18, animEasing: "cubic-out", animDurationSec: titleInDur, startSec: 0 } as const;
      const els: TreatmentElement[] = [
        shape(`${id}:bg`, 0, 0, W, H, { background: black, z: 0, startSec: 0 }),
        text(`${id}:label`, 70, 54, 600, kickerH, "compare", {
          fontSize: kickerFontSize, fontWeight: s("treatments.candidate-comparison.kicker.fontWeight", 900),
          fontFamily: "Arial, sans-serif", textTransform: "uppercase", letterSpacing: kickerFontSize * 0.18, textAlign: "left",
          color: a, textShadow: "0 2px 8px rgba(0,0,0,0.7)", z: 10, ...blockAnim,
          styleSource: { fontSize: "treatments.candidate-comparison.kicker.fontSize", fontWeight: "treatments.candidate-comparison.kicker.fontWeight" },
        }),
        text(`${id}:title`, 70, 54 + kickerH + 10, 1200, titleH, asStr(p.title, beat.narrativeFunction), {
          fontSize: titleFontSize, fontWeight: s("treatments.candidate-comparison.title.fontWeight", 900),
          fontFamily: "Arial, sans-serif", color: paper, textAlign: "left",
          textGradient: { start: gradientStart, end: gradientEnd },
          filter: "drop-shadow(0 3px 10px rgba(0,0,0,0.7))",
          z: 10, ...blockAnim,
          styleSource: { fontSize: "treatments.candidate-comparison.title.fontSize", fontWeight: "treatments.candidate-comparison.title.fontWeight", textGradientStart: "colors.gradientStart", textGradientEnd: "colors.gradientEnd" },
        }),
        asStr(p.criteria) ? text(`${id}:criteria`, 70, 54 + kickerH + 10 + titleH + 8, 1200, 25, asStr(p.criteria), {
          fontSize: s("treatments.candidate-comparison.criteria.fontSize", 18), fontFamily: "Arial, sans-serif", color: paper, opacity: 0.68,
          fontWeight: 900, textAlign: "left", z: 10, ...blockAnim,
          styleSource: { fontSize: "treatments.candidate-comparison.criteria.fontSize" },
        }) : null,
      ].filter(Boolean) as TreatmentElement[];
      candidates.forEach((c, i) => {
        const isSel = i === selected;
        const col = asStr(c.color, isSel ? a : "#61d7e8");
        const cx = gridLeft + i * (colW + 18);
        const candStart = i * stagger;
        // card entrance: spring opacity + translateY(24px) rise; unselected
        // cards sit at constant 0.96 scale (treatment grid look)
        const candAnim = {
          animIn: "spring-slide-up", animSlidePx: 24, animDurationSec: 0.6, startSec: candStart,
          animSpring: { damping: springDamping, stiffness: springStiffness, mass: 1, durationSec: 0.6, from: 1 },
          // group scale around the CARD center (treatment scales the card div)
          groupOriginX: cx + colW / 2, groupOriginY: cardTop + cardH / 2,
        } as const;
        const scale = isSel ? undefined : 0.96;
        els.push(shape(`${id}:candidate-${i}-card`, cx, cardTop, colW, cardH, {
          borderWidth: 2, borderColor: isSel ? col : `${col}55`, borderRadius: 10,
          background: isSel ? `${col}18` : "rgba(7,9,13,.76)",
          boxShadow: isSel ? `0 0 24px ${col}44` : "none",
          z: 5 + i, scale, ...candAnim,
        }));
        els.push(shape(`${id}:candidate-${i}-img-bg`, cx + 2, cardTop + 2, colW - 4, imgH, {
          background: "#11151b", z: 6 + i, scale, ...candAnim,
        }));
        if (asStr(c.src)) els.push(image(`${id}:candidate-${i}-img`, cx + 2, cardTop + 2, colW - 4, imgH, asStr(c.src), {
          fit: "cover", filter: isSel ? "none" : "grayscale(.65) brightness(.7)", z: 6 + i, scale, ...candAnim,
        }));
        els.push(text(`${id}:candidate-${i}-badge`, cx + 2 + 12, cardTop + 2 + 12, 130, 13 * 1.4 + 10, isSel ? "selected" : "alternative", {
          fontSize: 13, fontWeight: 900, fontFamily: "Arial, sans-serif", textTransform: "uppercase", letterSpacing: 1.56,
          color: isSel ? col : paper, bgColor: "rgba(0,0,0,.68)", borderRadius: 4,
          textAlign: "left", z: 7 + i, startSec: candStart, textShadow: "0 1px 4px rgba(0,0,0,0.8)",
        }));
        const labelTop = cardTop + 2 + imgH + 14;
        const labelFontSize = s("treatments.candidate-comparison.candidate.fontSize", 18);
        els.push(text(`${id}:candidate-${i}-label`, cx + 2 + 16, labelTop, colW - 36, labelFontSize * 1.4222, asStr(c.label), {
          fontSize: labelFontSize, fontWeight: 900, fontFamily: "Arial, sans-serif", textTransform: "uppercase",
          textAlign: "left", color: col, z: 7 + i, textShadow: "0 2px 6px rgba(0,0,0,0.7)", scale, ...candAnim,
          styleSource: { fontSize: "treatments.candidate-comparison.candidate.fontSize" },
        }));
        if (asStr(c.detail)) {
          const detailLines = Math.max(1, Math.ceil((asStr(c.detail).length * 13 * 0.64) / (colW - 36)));
          els.push(text(`${id}:candidate-${i}-detail`, cx + 2 + 16, labelTop + labelFontSize * 1.4222 + 6, colW - 36, detailLines * 13 * 1.35, asStr(c.detail), {
            fontSize: 13, fontFamily: "Arial, sans-serif", color: paper, opacity: 0.7, lineHeight: 1.35,
            textAlign: "left", z: 7 + i, scale, ...candAnim,
          }));
        }
      });
      return els;
    }

    case "cinematic-metaphor": {
      const src = assetSrc(beat, "image") ?? assetSrc(beat, "video") ?? "";
      const els: TreatmentElement[] = [];
      if (src) els.push(image(`${id}:bg-image`, 0, 0, W, H, src, {
        filter: "saturate(1.08) contrast(1.15) brightness(.9)", z: 1, animIn: "fade", animDurationSec: 0.7, startSec: 0,
      }));
      els.push(shape(`${id}:vignette`, 0, 0, W, H, {
        background: `radial-gradient(ellipse at 50% 42%, transparent 38%, rgba(0,0,0,.78) 100%), linear-gradient(90deg, ${a}22, transparent 55%)`, z: 3, startSec: 0,
      }));
      if (asStr(p.label)) els.push(text(`${id}:label`, 70, 54, 600, 30, asStr(p.label), {
        fontSize: s("treatments.cinematic-metaphor.label.fontSize", 16), fontWeight: s("treatments.cinematic-metaphor.label.fontWeight", 900),
        fontFamily: "Arial, sans-serif", textTransform: "uppercase", letterSpacing: 2.6, color: a, textShadow: "0 2px 10px #000", z: 14, animIn: "fade", animDurationSec: 0.7, startSec: 0.3,
        styleSource: { fontSize: "treatments.cinematic-metaphor.label.fontSize", fontWeight: "treatments.cinematic-metaphor.label.fontWeight" },
      }));
      if (asStr(p.subtitle)) els.push(text(`${id}:subtitle`, 0, 907, W, 173, asStr(p.subtitle, beat.transcript), {
        fontSize: s("treatments.cinematic-metaphor.subtitle.fontSize", 28), fontStyle: "italic", fontWeight: 900, fontFamily: "Georgia, serif", textAlign: "center", color: a,
        textShadow: "0 3px 12px #000, 0 0 20px rgba(0,0,0,0.7)", z: 14, animIn: "fade", animDurationSec: 0.7, startSec: 0.5,
        styleSource: { fontSize: "treatments.cinematic-metaphor.subtitle.fontSize" },
      }));
      return els;
    }

    default:
      return [
        text(`${id}:fallback`, 100, 400, 1720, 200, beat.narrativeFunction, {
          fontSize: 48, fontWeight: 800, fontFamily: "Arial, sans-serif", textAlign: "center", color: "#ec6a5e", z: 10,
        }),
      ];
  }
};

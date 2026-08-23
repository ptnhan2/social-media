import type { SemanticBeat } from "./types";

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
  textGradient?: { start: string; end: string };
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
  startSec?: number;
  endSec?: number;
  role?: string;
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

const accent = (beat: SemanticBeat) => {
  const p = beat.treatment.params as Record<string, unknown>;
  return typeof p.accent === "string" ? p.accent : "#f2b84b";
};

const asStr = (v: unknown, fb = "") => typeof v === "string" ? v : fb;
const asNum = (v: unknown, fb: number) => typeof v === "number" ? v : fb;
const asArr = <T,>(v: unknown): T[] => Array.isArray(v) ? v as T[] : [];

/** identity resolver — cold projection without a store uses treatment defaults */
const noStyle: StyleResolver = <T,>(_path: string, fallback: T) => fallback;

export const generateTreatmentElements = (beat: SemanticBeat, resolve: StyleResolver = noStyle): TreatmentElement[] => {
  const p = beat.treatment.params as Record<string, unknown>;
  const a = accent(beat);
  const id = beat.id;
  const s = resolve;

  switch (beat.treatment.id) {
    case "chapter-card": {
      const titleText = asStr(p.title, beat.narrativeFunction);
      const longTitle = titleText.trim().length > 22;
      const gradientStart = s("colors.gradientStart", "#ff6b35");
      const gradientEnd = s("colors.gradientEnd", "#ffd166");
      return [
        text(`${id}:title`, 134, 380, 1652, 220, titleText, {
          fontSize: longTitle ? s("treatments.chapter-card.title.fontSizeLong", 82) : s("treatments.chapter-card.title.fontSizeShort", 96),
          fontWeight: s("treatments.chapter-card.title.fontWeight", 900), fontFamily: "Arial Black, Arial, sans-serif", textAlign: "center", textTransform: "uppercase",
          color: "#f4e8cf", textShadow: `0 0 22px ${a}55`, textGradient: { start: gradientStart, end: gradientEnd },
          animIn: "scale", animDurationSec: 0.45, z: 15, startSec: 0,
          styleSource: {
            fontSize: longTitle ? "treatments.chapter-card.title.fontSizeLong" : "treatments.chapter-card.title.fontSizeShort",
            fontWeight: "treatments.chapter-card.title.fontWeight",
            textGradientStart: "colors.gradientStart", textGradientEnd: "colors.gradientEnd",
          },
        }),
        shape(`${id}:accent-line`, 865, 620, s("treatments.chapter-card.accentLine.maxWidth", 190), s("treatments.chapter-card.accentLine.height", 5), {
          background: `linear-gradient(90deg, transparent, ${gradientStart}, ${gradientEnd}, ${gradientStart}, transparent)`, boxShadow: `0 0 24px ${gradientStart}80`,
          z: 12, startSec: 0.2, animIn: "scale", animDurationSec: 0.65,
          styleSource: { width: "treatments.chapter-card.accentLine.maxWidth", height: "treatments.chapter-card.accentLine.height" },
        }),
        asStr(p.subtitle) ? text(`${id}:subtitle`, 288, 660, 1344, 60, asStr(p.subtitle), {
          fontSize: s("treatments.chapter-card.subtitle.fontSize", 24), fontWeight: 900, fontFamily: "Arial, sans-serif", textAlign: "center", textTransform: "uppercase",
          letterSpacing: 1.2, color: a === "#f2b84b" ? "#61d7e8" : "#f2b84b", opacity: 0.8, animIn: "fade", animDurationSec: 0.8, z: 12, startSec: 0.4,
          textShadow: "0 2px 10px rgba(0,0,0,0.8)",
          styleSource: { fontSize: "treatments.chapter-card.subtitle.fontSize" },
        }) : null,
      ].filter(Boolean) as TreatmentElement[];
    }

    case "semantic-diagram": {
      const nodes = asArr<Record<string, unknown>>(p.nodes);
      const nodeFontSize = s("treatments.semantic-diagram.node.fontSize", 20);
      const nodeFontWeight = s("treatments.semantic-diagram.node.fontWeight", 900);
      const detailFontSize = s("treatments.semantic-diagram.node.detailFontSize", 13);
      const els: TreatmentElement[] = [
        asStr(p.kicker) ? text(`${id}:kicker`, 86, 62, 800, 30, asStr(p.kicker), {
          fontSize: s("treatments.semantic-diagram.kicker.fontSize", 18), fontWeight: s("treatments.semantic-diagram.kicker.fontWeight", 900),
          fontFamily: "Arial, sans-serif", textTransform: "uppercase", letterSpacing: 3.2,
          color: "#61d7e8", animIn: "fade", animDurationSec: 0.55, z: 15, startSec: 0, textShadow: "0 2px 8px rgba(0,0,0,0.7)",
          styleSource: { fontSize: "treatments.semantic-diagram.kicker.fontSize", fontWeight: "treatments.semantic-diagram.kicker.fontWeight" },
        }) : null,
        text(`${id}:title`, 86, 95, 1200, 60, asStr(p.title, beat.narrativeFunction), {
          fontSize: s("treatments.semantic-diagram.title.fontSize", 46), fontWeight: s("treatments.semantic-diagram.title.fontWeight", 900),
          fontFamily: "Arial, sans-serif", color: "#f4e8cf", animIn: "fade", animDurationSec: 0.55, z: 15, startSec: 0,
          textShadow: "0 3px 10px rgba(0,0,0,0.6)",
          styleSource: { fontSize: "treatments.semantic-diagram.title.fontSize", fontWeight: "treatments.semantic-diagram.title.fontWeight" },
        }),
        shape(`${id}:accent-line`, 86, 168, 110, 4, { background: `linear-gradient(90deg, ${s("colors.gradientStart", "#ff6b35")}, ${s("colors.gradientEnd", "#ffd166")})`, boxShadow: `0 0 14px ${a}`, z: 12, startSec: 0.15 }),
        asStr(p.centerLabel) ? shape(`${id}:center-label`, 710, 350, 500, 500, {
          borderRadius: 250, borderWidth: 2, borderColor: `${a}88`, background: "linear-gradient(135deg, rgba(0,212,255,0.10), rgba(255,107,53,0.08))", boxShadow: `0 0 38px ${a}28`, z: 5, startSec: 0.15,
        }) : null,
        asStr(p.centerLabel) ? text(`${id}:center-label-text`, 760, 470, 400, 260, asStr(p.centerLabel), {
          fontSize: s("treatments.semantic-diagram.centerLabel.fontSize", 20), fontWeight: 900, fontFamily: "Arial, sans-serif", textTransform: "uppercase", letterSpacing: 1.6,
          color: "#61d7e8", textAlign: "center", z: 6, startSec: 0.15, textShadow: "0 2px 8px rgba(0,0,0,0.7)",
          styleSource: { fontSize: "treatments.semantic-diagram.centerLabel.fontSize" },
        }) : null,
      ].filter(Boolean) as TreatmentElement[];
      nodes.forEach((node, i) => {
        const nx = asNum(node.x, 50) / 100 * W;
        const ny = asNum(node.y, 50) / 100 * H;
        const nodeStart = 0.3 + i * 0.25;
        els.push(shape(`${id}:node-${i}-box`, nx - 135, ny - 50, 270, 100, {
          borderWidth: 2, borderColor: asStr(node.color, a), background: "rgba(7,9,13,0.84)", borderRadius: 10,
          boxShadow: `0 0 18px ${asStr(node.color, a)}38`, animIn: "scale", animDurationSec: 0.75, z: 10, startSec: nodeStart,
        }));
        els.push(text(`${id}:node-${i}-label`, nx - 120, ny - 42, 240, 30, asStr(node.label), {
          fontSize: nodeFontSize, fontWeight: nodeFontWeight, fontFamily: "Arial, sans-serif", textTransform: "uppercase", letterSpacing: 0.8,
          color: asStr(node.color, a), animIn: "scale", animDurationSec: 0.75, z: 11, startSec: nodeStart, textShadow: "0 2px 6px rgba(0,0,0,0.7)",
          styleSource: { fontSize: "treatments.semantic-diagram.node.fontSize", fontWeight: "treatments.semantic-diagram.node.fontWeight" },
        }));
        if (asStr(node.detail)) els.push(text(`${id}:node-${i}-detail`, nx - 120, ny - 10, 240, 50, asStr(node.detail), {
          fontSize: detailFontSize, fontFamily: "Arial, sans-serif", color: "#f4e8cf", opacity: 0.78, lineHeight: 1.35, animIn: "scale", animDurationSec: 0.75, z: 11, startSec: nodeStart, fontWeight: 900,
          styleSource: { fontSize: "treatments.semantic-diagram.node.detailFontSize" },
        }));
      });
      els.push(text(`${id}:footer`, 1340, 990, 500, 30, "follow the thread", {
        fontSize: 14, fontFamily: "Arial, sans-serif", textTransform: "uppercase", letterSpacing: 1.6, color: "rgba(244,232,207,0.45)", z: 8, startSec: 0,
      }));
      return els;
    }

    case "host-reflection-cinematic": {
      const src = assetSrc(beat, "character") ?? assetSrc(beat, "image") ?? "";
      const els: TreatmentElement[] = [];
      if (src) els.push(image(`${id}:bg-image`, 0, 0, W, H, src, {
        filter: s("treatments.host-reflection.filter", "saturate(1.05) contrast(1.15) brightness(.9)"), z: 1, animIn: "fade", animDurationSec: 0.5, startSec: 0,
        styleSource: { filter: "treatments.host-reflection.filter" },
      }));
      els.push(shape(`${id}:light-overlay`, 0, 0, W, H, {
        background: "linear-gradient(90deg, rgba(242,184,75,.65), transparent 48%)", z: 3, opacity: 0.7, startSec: 0,
      }));
      els.push(shape(`${id}:vignette`, 0, 0, W, H, {
        background: "linear-gradient(180deg, rgba(0,0,0,.18), transparent 36%, transparent 65%, rgba(0,0,0,.7))", z: 4, startSec: 0,
      }));
      els.push(shape(`${id}:letterbox-top`, 0, 0, W, 86, { background: "#07090d", z: 6, startSec: 0 }));
      els.push(shape(`${id}:letterbox-bottom`, 0, 0 + 950, W, 130, { background: "#07090d", z: 6, startSec: 0 }));
      els.push(text(`${id}:subtitle`, 0, 960, W, 110, asStr(p.subtitle, beat.transcript), {
        fontSize: s("treatments.host-reflection.subtitle.fontSize", 27), fontStyle: "italic", fontFamily: "Georgia, serif", textAlign: "center", color: a,
        fontWeight: s("treatments.host-reflection.subtitle.fontWeight", 900), textShadow: "0 3px 12px #000, 0 0 24px rgba(0,0,0,0.8)", z: 14, animIn: "fade", animDurationSec: 0.5, startSec: 0.3,
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
      const active = asNum(p.activeStep, 0);
      const gradientStart = s("colors.gradientStart", "#ff6b35");
      const gradientEnd = s("colors.gradientEnd", "#ffd166");
      const els: TreatmentElement[] = [
        text(`${id}:label`, 76, 62, 600, 30, "workflow", {
          fontSize: s("treatments.process-timeline.kicker.fontSize", 17), fontWeight: s("treatments.process-timeline.kicker.fontWeight", 900),
          fontFamily: "Arial, sans-serif", textTransform: "uppercase", letterSpacing: 3.2, color: a, animIn: "fade", animDurationSec: 0.45, z: 10, startSec: 0,
          textShadow: "0 2px 8px rgba(0,0,0,0.7)",
          styleSource: { fontSize: "treatments.process-timeline.kicker.fontSize", fontWeight: "treatments.process-timeline.kicker.fontWeight" },
        }),
        text(`${id}:title`, 76, 95, 1200, 60, asStr(p.title, beat.narrativeFunction), {
          fontSize: s("treatments.process-timeline.title.fontSize", 48), fontWeight: s("treatments.process-timeline.title.fontWeight", 900),
          fontFamily: "Arial, sans-serif", color: "#f4e8cf", animIn: "fade", animDurationSec: 0.45, z: 10, startSec: 0,
          textGradient: { start: gradientStart, end: gradientEnd }, textShadow: "0 3px 10px rgba(0,0,0,0.7)",
          styleSource: { fontSize: "treatments.process-timeline.title.fontSize", fontWeight: "treatments.process-timeline.title.fontWeight", textGradientStart: "colors.gradientStart", textGradientEnd: "colors.gradientEnd" },
        }),
        shape(`${id}:progress-track`, 173, 497, 1574, 3, { background: "rgba(244,232,207,.2)", z: 5, startSec: 0 }),
        shape(`${id}:progress-fill`, 173, 497, Math.max(10, 1574 * ((active + 1) / Math.max(steps.length, 1))), 3, {
          background: `linear-gradient(90deg, ${gradientStart}, ${gradientEnd})`, boxShadow: `0 0 16px ${gradientStart}`, z: 6, startSec: 0,
        }),
      ];
      steps.forEach((st, i) => {
        const sx = 173 + (i / Math.max(steps.length - 1, 1)) * 1574;
        const selected = i === active;
        const col = asStr(st.color, selected ? a : "#61d7e8");
        const stepStart = 0.3 + i * 0.3;
        els.push(shape(`${id}:step-${i}-dot`, sx - 14, 483, selected ? 28 : 20, selected ? 28 : 20, {
          borderRadius: 50, background: `radial-gradient(circle at 35% 30%, ${col}, ${col}99)`, boxShadow: selected ? `0 0 24px ${col}, 0 0 48px ${col}66` : `0 0 12px ${col}88`, borderWidth: 3, borderColor: "#07090d", z: 8, animIn: "scale", animDurationSec: 0.6, startSec: stepStart,
        }));
        els.push(shape(`${id}:step-${i}-box`, sx - 90, 530, 180, 80, {
          borderWidth: 2, borderColor: selected ? col : `${col}88`, borderRadius: 8, background: selected ? `${col}18` : "rgba(7,9,13,.76)", z: 8, animIn: "slide-up", animDurationSec: 0.6, startSec: stepStart,
        }));
        els.push(text(`${id}:step-${i}-label`, sx - 80, 542, 160, 25, asStr(st.label), {
          fontSize: s("treatments.process-timeline.step.fontSize", 16), fontWeight: s("treatments.process-timeline.step.fontWeight", 900),
          fontFamily: "Arial, sans-serif", textTransform: "uppercase", letterSpacing: 0.8, color: col, textAlign: "center", z: 9, animIn: "slide-up", animDurationSec: 0.6, startSec: stepStart,
          textShadow: "0 2px 8px rgba(0,0,0,0.8)",
          styleSource: { fontSize: "treatments.process-timeline.step.fontSize", fontWeight: "treatments.process-timeline.step.fontWeight" },
        }));
        if (asStr(st.detail)) els.push(text(`${id}:step-${i}-detail`, sx - 80, 570, 160, 35, asStr(st.detail), {
          fontSize: 12, fontFamily: "Arial, sans-serif", color: "#f4e8cf", opacity: 0.7, lineHeight: 1.3, textAlign: "center", z: 9, animIn: "slide-up", animDurationSec: 0.6, startSec: stepStart, fontWeight: 900,
        }));
      });
      els.push(text(`${id}:footer`, 1380, 990, 500, 30, `step ${active + 1} / ${steps.length}`, {
        fontSize: 14, fontFamily: "Arial, sans-serif", textTransform: "uppercase", letterSpacing: 1.6, color: "rgba(244,232,207,.5)", z: 8, startSec: 0,
      }));
      return els;
    }

    case "candidate-comparison": {
      const candidates = asArr<Record<string, unknown>>(p.candidates);
      const selected = asNum(p.selectedIndex, 0);
      const count = Math.max(1, Math.min(4, candidates.length));
      const colW = (1574 - (count - 1) * 18) / count;
      const gradientStart = s("colors.gradientStart", "#ff6b35");
      const gradientEnd = s("colors.gradientEnd", "#ffd166");
      const els: TreatmentElement[] = [
        text(`${id}:label`, 70, 54, 600, 30, "compare", {
          fontSize: s("treatments.candidate-comparison.kicker.fontSize", 17), fontWeight: s("treatments.candidate-comparison.kicker.fontWeight", 900),
          fontFamily: "Arial, sans-serif", textTransform: "uppercase", letterSpacing: 3.2, color: a, animIn: "fade", animDurationSec: 0.45, z: 10, startSec: 0,
          textShadow: "0 2px 8px rgba(0,0,0,0.7)",
          styleSource: { fontSize: "treatments.candidate-comparison.kicker.fontSize", fontWeight: "treatments.candidate-comparison.kicker.fontWeight" },
        }),
        text(`${id}:title`, 70, 87, 1200, 55, asStr(p.title, beat.narrativeFunction), {
          fontSize: s("treatments.candidate-comparison.title.fontSize", 44), fontWeight: s("treatments.candidate-comparison.title.fontWeight", 900),
          fontFamily: "Arial, sans-serif", color: "#f4e8cf", animIn: "fade", animDurationSec: 0.45, z: 10, startSec: 0,
          textGradient: { start: gradientStart, end: gradientEnd }, textShadow: "0 3px 10px rgba(0,0,0,0.7)",
          styleSource: { fontSize: "treatments.candidate-comparison.title.fontSize", fontWeight: "treatments.candidate-comparison.title.fontWeight", textGradientStart: "colors.gradientStart", textGradientEnd: "colors.gradientEnd" },
        }),
        asStr(p.criteria) ? text(`${id}:criteria`, 70, 140, 1200, 30, asStr(p.criteria), {
          fontSize: s("treatments.candidate-comparison.criteria.fontSize", 18), fontFamily: "Arial, sans-serif", color: "#f4e8cf", opacity: 0.68, animIn: "fade", animDurationSec: 0.45, z: 10, startSec: 0, fontWeight: 900,
          styleSource: { fontSize: "treatments.candidate-comparison.criteria.fontSize" },
        }) : null,
      ].filter(Boolean) as TreatmentElement[];
      candidates.forEach((c, i) => {
        const isSel = i === selected;
        const col = asStr(c.color, isSel ? a : "#61d7e8");
        const cx = 134 + i * (colW + 18);
        const candStart = 0.2 + i * 0.2;
        els.push(shape(`${id}:candidate-${i}-card`, cx, 302, colW, 650, {
          borderWidth: 2, borderColor: isSel ? col : `${col}55`, borderRadius: 10, background: isSel ? `${col}18` : "rgba(7,9,13,.76)",
          boxShadow: isSel ? `0 0 24px ${col}44` : "none", z: 5 + i, animIn: "slide-up", animDurationSec: 0.6, startSec: candStart,
        }));
        if (asStr(c.src)) els.push(image(`${id}:candidate-${i}-img`, cx + 2, 304, colW - 4, 440, asStr(c.src), {
          fit: "cover", filter: isSel ? "none" : "grayscale(.65) brightness(.7)", z: 6 + i, animIn: "slide-up", animDurationSec: 0.6, startSec: candStart,
        }));
        els.push(text(`${id}:candidate-${i}-badge`, cx + 12, 314, 120, 25, isSel ? "selected" : "alternative", {
          fontSize: 13, fontWeight: 900, fontFamily: "Arial, sans-serif", textTransform: "uppercase", letterSpacing: 1.6,
          color: isSel ? col : "#f4e8cf", background: "rgba(0,0,0,.68)", z: 7 + i, startSec: candStart, textShadow: "0 1px 4px rgba(0,0,0,0.8)",
        }));
        els.push(text(`${id}:candidate-${i}-label`, cx + 14, 560, colW - 28, 30, asStr(c.label), {
          fontSize: s("treatments.candidate-comparison.candidate.fontSize", 18), fontWeight: 900, fontFamily: "Arial, sans-serif", textTransform: "uppercase", color: col, z: 7 + i, animIn: "slide-up", animDurationSec: 0.6, startSec: candStart,
          textShadow: "0 2px 6px rgba(0,0,0,0.7)",
          styleSource: { fontSize: "treatments.candidate-comparison.candidate.fontSize" },
        }));
        if (asStr(c.detail)) els.push(text(`${id}:candidate-${i}-detail`, cx + 14, 595, colW - 28, 60, asStr(c.detail), {
          fontSize: 13, fontFamily: "Arial, sans-serif", color: "#f4e8cf", opacity: 0.7, lineHeight: 1.35, z: 7 + i, animIn: "slide-up", animDurationSec: 0.6, startSec: candStart,
        }));
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

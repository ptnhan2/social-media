// canvas/types.ts — Semantic beat canvas element model.
// PX coordinates @ fixed logical canvas 960x540 (matches Remotion composition).
// Layer order = array order. Source IDs point back to SemanticBeat.elements.

export const CANVAS_W = 960;
export const CANVAS_H = 540;

export const newId = () => "el-" + Math.random().toString(36).slice(2, 9);

// ===== Animation (PER ELEMENT) =====
export type EntranceType = "fade" | "slide" | "rise" | "bounce" | "zoom" | "pan" | "pop" | "typewriter" | "flip";
export type ExitType = "fade" | "slide" | "zoom" | "pop";
export type LoopType = "pulse" | "float" | "rotate" | "drift" | "breathe" | "wiggle";
export type Direction = "left" | "right" | "up" | "down";

export interface EntranceAnim { type: EntranceType; direction?: Direction; speed?: number; intensity?: number; duration?: number; delay?: number; }
export interface ExitAnim { type: ExitType; direction?: Direction; speed?: number; duration?: number; }
export interface LoopAnim { type: LoopType; speed?: number; intensity?: number; }
export interface MotionPath { points: { x: number; y: number }[]; style?: "original" | "smooth" | "steady"; orient?: boolean; speed?: number; }

export interface Animation {
  entrance?: EntranceAnim;
  exit?: ExitAnim;
  loop?: LoopAnim;
  motionPath?: MotionPath;
  appearAt?: number;  // seconds — when the element appears (timing/sequence)
}

// ===== SFX (PER ELEMENT) =====
export type SfxTrigger = "onAppear" | "onExit" | "onLoop" | "onTransition";
export type SfxSound = "tick" | "whoosh" | "chime" | "pop" | "thud" | "rise" | "none";
export interface Sfx { trigger: SfxTrigger; sound: SfxSound; volume?: number; }

// ===== Text effects (Canva-aligned) =====
export type TextEffectType = "shadow" | "lift" | "outline" | "glow" | "echo" | "splice" | "hollow" | "glitch" | "neon" | "curve" | "background";
export interface TextEffect { type: TextEffectType; intensity?: number; color?: string; direction?: Direction; transparency?: number; }
export interface GradientStop { color: string; pos: number; }

// ===== Fill / Stroke (shapes) =====
export type Fill =
  | { type: "solid"; color: string }
  | { type: "gradient"; stops: GradientStop[] }
  | { type: "image"; src: string }
  | { type: "video"; src: string };
export interface Stroke { weight: number; color: string; }
export interface ShapePath { d: string; fill?: Fill; stroke?: Stroke; }

// ===== Rich text (per-span formatting) =====
export interface RichSpan {
  text: string;
  color?: string;
  fontWeight?: number;
  fontStyle?: "normal" | "italic";
  textDecoration?: "none" | "underline";
  strikethrough?: boolean;
}

// ===== Element =====
export type ElementType = "background" | "text" | "richtext" | "image" | "video" | "shape" | "line" | "frame" | "group" | "chart" | "audio";
export type ImageRender = "cutout" | "photo-card" | "full-bleed";
export type BgStyle = "paper-dark" | "paper-light" | "solid" | "image";

export interface CanvasElement {
  id: string;
  type: ElementType;
  x: number; y: number; w: number; h: number;  // px @ 960x540
  rotation: number;
  opacity: number;
  locked: boolean;
  visible: boolean;
  name?: string;
  sourceElementId?: string;
  sourcePath?: string;
  animation?: Animation;   // per-element (P2 wires to preview)
  sfx?: Sfx;               // per-element (P2 wires to preview)

  // text / richtext
  text?: string;
  spans?: RichSpan[];          // richtext
  color?: string;              // text color
  fontFamily?: string;
  fontWeight?: number;
  fontStyle?: "normal" | "italic";
  textDecoration?: "none" | "underline";
  fontSize?: number;
  align?: "start" | "center" | "end" | "justify";
  lineHeight?: number;
  letterSpacing?: number;
  effects?: TextEffect[];
  gradient?: GradientStop[];

  // image / video
  src?: string;
  imgRender?: ImageRender;
  filter?: string;
  fit?: "cover" | "contain";
  flipH?: boolean;
  flipV?: boolean;
  caption?: string;

  // shape
  paths?: ShapePath[];
  fill?: string;           // legacy solid fill (shape)
  stroke?: string;         // legacy
  strokeWidth?: number;    // legacy
  radius?: number;
  sides?: number;          // polygons

  // line
  x2?: number; y2?: number;
  dash?: number[];
  arrowStart?: boolean;
  arrowEnd?: boolean;

  // frame (clips children)
  frameShape?: "rect" | "circle" | "custom";
  framePath?: string;

  // group (composite — enables plaque = group(shape + text))
  children?: CanvasElement[];

  // background
  bgStyle?: BgStyle;
  bgSrc?: string;
  bgColor?: string;
}

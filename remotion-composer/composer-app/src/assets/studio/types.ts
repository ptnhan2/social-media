export type ToolId = "move" | "lasso" | "wand" | "eraser" | "bgremove" | "zoom" | "hand";

export interface Pt {
  x: number;
  y: number;
}

/** Non-destructive per-layer filter values (slider ranges, editor units). */
export interface LayerFilters {
  brightness: number; // -100..100
  contrast: number; // -100..100
  saturate: number; // -100..100
  hue: number; // -180..180
  blur: number; // 0..20 px
}

export const DEFAULT_FILTERS: LayerFilters = {
  brightness: 0,
  contrast: 0,
  saturate: 0,
  hue: 0,
  blur: 0,
};

export const BLEND_MODES = [
  "source-over",
  "multiply",
  "screen",
  "overlay",
  "darken",
  "lighten",
  "color-dodge",
  "soft-light",
  "difference",
  "exclusion",
] as const;

/**
 * One image layer. x/y is the layer CENTER in doc coords (Photoshop-like:
 * rotation and transform happen around the center).
 */
export interface Layer {
  id: string;
  name: string;
  /** Display URL (served via /api/assets/file). Changes when pixels change. */
  src: string;
  /** Server-side path used by bridge ops (polygon-mask, remove-bg, ...). */
  path: string;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number; // degrees, around center
  opacity: number; // 0..1
  visible: boolean;
  locked: boolean;
  flipX: boolean;
  flipY: boolean;
  filters: LayerFilters;
  blendMode: string;
  width: number; // natural image width (before scale)
  height: number;
}

/** Serializable document — this is what history snapshots. */
export interface DocState {
  layers: Layer[]; // index 0 = bottom
  docWidth: number;
  docHeight: number;
}

export interface LassoState {
  points: Pt[]; // doc coords
  closed: boolean;
}

export interface WandSelection {
  layerId: string;
  /** Mask canvas (RGBA, tinted preview) — not part of history. */
  maskCanvas: HTMLCanvasElement | null;
  /** Raw alpha mask aligned to the layer image, for applying erase. */
  alphaMask: Uint8ClampedArray | null;
  width: number;
  height: number;
}

export interface ToolOptions {
  eraser: { size: number; hardness: number };
  wand: { tolerance: number; contiguous: boolean };
  lasso: { mode: "keep" | "delete" };
}

export interface Viewport {
  scale: number;
  x: number;
  y: number;
}

export type UiState = {
  selectedIds: string[];
  activeTool: ToolId;
  lasso: LassoState;
  wand: WandSelection | null;
  toolOptions: ToolOptions;
  status: string;
  busy: boolean;
};

export interface HistoryEntry {
  label: string;
  doc: DocState;
}

export const DEFAULT_TOOL_OPTIONS: ToolOptions = {
  eraser: { size: 40, hardness: 1 },
  wand: { tolerance: 32, contiguous: true },
  lasso: { mode: "keep" },
};

export function makeLayer(partial: Partial<Layer> & Pick<Layer, "id" | "name" | "src" | "path" | "width" | "height">): Layer {
  return {
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    flipX: false,
    flipY: false,
    filters: { ...DEFAULT_FILTERS },
    blendMode: "source-over",
    ...partial,
  };
}

/** Layer bounding box in doc coords, accounting for rotation (AABB). */
export function layerAABB(layer: Layer): { x: number; y: number; width: number; height: number } {
  const w = layer.width * layer.scaleX;
  const h = layer.height * layer.scaleY;
  const rad = (layer.rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const bw = w * cos + h * sin;
  const bh = w * sin + h * cos;
  return { x: layer.x - bw / 2, y: layer.y - bh / 2, width: bw, height: bh };
}

export function layerDisplaySize(layer: Layer): { w: number; h: number } {
  return { w: layer.width * layer.scaleX, h: layer.height * layer.scaleY };
}

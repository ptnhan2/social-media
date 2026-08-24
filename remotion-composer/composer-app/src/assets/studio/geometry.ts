import { Layer, Pt } from "./types";

/**
 * Snap target: while dragging a layer, snap its center / edges to doc
 * center / edges / user guides when within threshold (doc coords).
 */
export interface SnapResult {
  x: number;
  y: number;
  guidesX: number[]; // doc-space vertical guide positions that engaged
  guidesY: number[]; // doc-space horizontal guide positions that engaged
}

export function snapLayer(
  center: Pt,
  layer: Layer,
  docWidth: number,
  docHeight: number,
  threshold: number,
  userGuides?: { v: number[]; h: number[] },
): SnapResult {
  const w = layer.width * layer.scaleX;
  const h = layer.height * layer.scaleY;
  const halfW = w / 2;
  const halfH = h / 2;

  const targetsX = [
    { at: docWidth / 2, layerAt: 0 },
    { at: 0, layerAt: -halfW },
    { at: docWidth, layerAt: halfW },
    ...(userGuides?.v ?? []).map((g) => ({ at: g, layerAt: 0 })),
  ];
  const targetsY = [
    { at: docHeight / 2, layerAt: 0 },
    { at: 0, layerAt: -halfH },
    { at: docHeight, layerAt: halfH },
    ...(userGuides?.h ?? []).map((g) => ({ at: g, layerAt: 0 })),
  ];

  let x = center.x;
  let y = center.y;
  const guidesX: number[] = [];
  const guidesY: number[] = [];

  for (const t of targetsX) {
    const pos = x + t.layerAt;
    if (Math.abs(pos - t.at) <= threshold) {
      x = t.at - t.layerAt;
      guidesX.push(t.at);
      break;
    }
  }
  for (const t of targetsY) {
    const pos = y + t.layerAt;
    if (Math.abs(pos - t.at) <= threshold) {
      y = t.at - t.layerAt;
      guidesY.push(t.at);
      break;
    }
  }
  return { x, y, guidesX, guidesY };
}

/** Inverse of the Konva render transform: doc point -> image pixel coords. */
export function docToImage(layer: Layer, pt: Pt): Pt {
  const dx = pt.x - layer.x;
  const dy = pt.y - layer.y;
  const rad = (-layer.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const rx = dx * cos - dy * sin;
  const ry = dx * sin + dy * cos;
  const fx = layer.flipX ? -1 : 1;
  const fy = layer.flipY ? -1 : 1;
  return {
    x: (rx / (layer.scaleX * fx)) + layer.width / 2,
    y: (ry / (layer.scaleY * fy)) + layer.height / 2,
  };
}

export function pointInPolygon(pt: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    const intersect = yi > pt.y !== yj > pt.y && pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

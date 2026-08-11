import type { EditPatch } from "../../../shared/isaacverse/schema";
import type { SemanticBeat, SemanticElement } from "../../../shared/isaacverse/types";
import type { CanvasElement } from "./types";

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

const displayValue = (value: unknown, fallback: string) => {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.label === "string") return record.label;
    if (typeof record.text === "string") return record.text;
    if (typeof record.detail === "string") return record.detail;
  }
  return fallback;
};

const geometryFor = (element: SemanticElement, index: number) => element.geometry ?? { x: 110 + (index % 3) * 255, y: 115 + Math.floor(index / 3) * 125, width: 220, height: 80, rotation: 0 };

export const editBeatToCanvas = (beat: SemanticBeat): CanvasElement[] => {
  const elements: CanvasElement[] = [{ id: `${beat.id}:background`, sourceElementId: `${beat.id}:background`, type: "background", x: 0, y: 0, w: 960, h: 540, rotation: 0, opacity: 1, locked: true, visible: true, bgStyle: "paper-dark", name: "Beat background" }];
  (beat.elements || []).forEach((source, index) => {
    const geometry = geometryFor(source, index);
    const value = valueAtPath(beat, source.sourcePath);
    const isText = source.kind === "text" || source.kind === "node" || source.kind === "step";
    const asset = !isText && value && typeof value === "object" ? value as Record<string, unknown> : undefined;
    elements.push({
      id: `${beat.id}:canvas:${source.id}`,
      sourceElementId: source.id,
      sourcePath: source.sourcePath,
      type: isText ? "text" : "image",
      x: geometry.x,
      y: geometry.y,
      w: geometry.width,
      h: geometry.height,
      rotation: geometry.rotation ?? 0,
      opacity: 1,
      locked: false,
      visible: true,
      name: source.role,
      text: isText ? displayValue(value, source.role) : undefined,
      fontSize: source.role === "title" ? 42 : 28,
      color: "#f4f7f7",
      fontFamily: source.role === "title" ? "'Archivo Black'" : "'Inter'",
      align: "center",
      lineHeight: 1.05,
      src: asset && typeof asset.src === "string" ? asset.src : undefined,
      imgRender: "photo-card",
    });
  });
  return elements;
};

export const canvasElementsToPatch = (beat: SemanticBeat, elements: CanvasElement[]): EditPatch => {
  const sourceById = new Map((beat.elements || []).map((element) => [element.id, element]));
  const operations = elements.flatMap((element) => {
    if (!element.sourceElementId || element.sourceElementId.endsWith(":background")) return [];
    const source = sourceById.get(element.sourceElementId);
    if (!source) return [];
    const value = { x: element.x, y: element.y, width: element.w, height: element.h, rotation: element.rotation };
    const original = source.geometry ?? { x: 0, y: 0, width: 0, height: 0, rotation: 0 };
    const geometryChanged = value.x !== original.x || value.y !== original.y || value.width !== original.width || value.height !== original.height || value.rotation !== (original.rotation ?? 0);
    const result: EditPatch["operations"] = geometryChanged ? [{ op: "updateElement", beatId: beat.id, elementId: source.id, path: "geometry", value }] : [];
    if (element.type === "text" && element.text !== displayValue(valueAtPath(beat, source.sourcePath), source.role)) result.push({ op: "updateElement", beatId: beat.id, elementId: source.id, path: "metadata.text", value: element.text ?? "" });
    return result;
  });
  return {
    id: `patch-canvas-${beat.id}-${Date.now()}`,
    videoId: "canvas-editor",
    baseVersion: "v001",
    reason: "Apply direct canvas edits to the selected beat.",
    operations,
    affectedRange: { startSec: beat.startSec, endSec: beat.startSec + beat.durationSec },
    status: "draft",
  };
};

import type { ClipRange } from "../../../shared/isaacverse/editor";
import { frameRangeForSeconds } from "../../../shared/isaacverse/editorTime";
import type { InclusiveFrameRange } from "../../../shared/isaacverse/editorTime";

export { frameRangeForSeconds } from "../../../shared/isaacverse/editorTime";
export type { InclusiveFrameRange } from "../../../shared/isaacverse/editorTime";

export const snapToFrame = (seconds: number, fps: number) => {
  if (!Number.isFinite(seconds) || !Number.isFinite(fps) || fps <= 0) throw new Error("seconds and fps must be finite");
  return Math.round(seconds * fps) / fps;
};

export const frameRangeForClip = (range: ClipRange, fps: number): InclusiveFrameRange => {
  if (range.endSec <= range.startSec) throw new Error("clip range must have positive duration");
  return frameRangeForSeconds(range, fps);
};

export const clampClipRange = (range: ClipRange, bounds: ClipRange, minimumDurationSec = 0.05): ClipRange => {
  if (bounds.endSec <= bounds.startSec) throw new Error("bounds must have positive duration");
  const minimum = Math.min(Math.max(0, minimumDurationSec), bounds.endSec - bounds.startSec);
  const startSec = Math.min(Math.max(range.startSec, bounds.startSec), bounds.endSec - minimum);
  const endSec = Math.max(startSec + minimum, Math.min(range.endSec, bounds.endSec));
  return { startSec, endSec };
};

export const trimClipRange = (range: ClipRange, edge: "start" | "end", timeSec: number, minimumDurationSec = 0.05): ClipRange => {
  if (range.endSec <= range.startSec) throw new Error("clip range must have positive duration");
  const minimum = Math.min(Math.max(0, minimumDurationSec), range.endSec - range.startSec);
  if (edge === "start") return { startSec: Math.min(Math.max(timeSec, range.startSec), range.endSec - minimum), endSec: range.endSec };
  return { startSec: range.startSec, endSec: Math.max(Math.min(timeSec, range.endSec), range.startSec + minimum) };
};

export const splitClipRange = (range: ClipRange, timeSec: number): [ClipRange, ClipRange] => {
  if (timeSec <= range.startSec || timeSec >= range.endSec) throw new Error("split time must be inside clip");
  return [{ startSec: range.startSec, endSec: timeSec }, { startSec: timeSec, endSec: range.endSec }];
};

export const rippleRanges = (ranges: ClipRange[], fromSec: number, deltaSec: number): ClipRange[] => ranges.map((range) => range.startSec >= fromSec ? { startSec: range.startSec + deltaSec, endSec: range.endSec + deltaSec } : { ...range });

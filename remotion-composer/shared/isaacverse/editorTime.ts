export type SecondsRange = {
  startSec: number;
  endSec: number;
};

export type InclusiveFrameRange = {
  startFrame: number;
  endFrame: number;
};

export const frameRangeForSeconds = (range: SecondsRange, fps: number, durationSec = Math.max(range.startSec, range.endSec)) : InclusiveFrameRange => {
  if (!Number.isFinite(fps) || fps <= 0) throw new Error("fps must be positive");
  const startSec = Math.max(0, Math.min(durationSec, range.startSec));
  const endSec = Math.max(startSec + 1 / fps, Math.min(durationSec, range.endSec));
  return { startFrame: Math.floor(startSec * fps), endFrame: Math.max(0, Math.ceil(endSec * fps) - 1) };
};

import type { MotionPhase } from "./types";

export const cameraPhaseFrames = (
  beatDurationSec: number,
  phase: Pick<MotionPhase, "startSec" | "durationSec"> | undefined,
  fps: number,
) => {
  const startSec = phase?.startSec ?? 0;
  const durationSec = phase?.durationSec ?? beatDurationSec;
  const startFrame = Math.max(0, Math.round(startSec * fps));
  const endFrame = Math.max(startFrame + 1, Math.round((startSec + durationSec) * fps));
  return { startFrame, endFrame };
};

import type { EditTransition, IsaacVerseEditDoc, SemanticBeat } from "./types";
import type { VideoDoc } from "./schema";

const asTransition = (beat: SemanticBeat, atSec: number): EditTransition | null => {
  const value = beat.treatment.params.transition;
  if (!value || typeof value !== "object") return null;
  const transition = value as { type?: unknown; durationSec?: unknown; accent?: unknown };
  if (!["flash", "fade", "blur", "light-leak"].includes(String(transition.type))) return null;
  return {
    id: `transition-after-${beat.id}`,
    atSec,
    durationSec: typeof transition.durationSec === "number" ? transition.durationSec : 0.45,
    type: transition.type as EditTransition["type"],
    accent: typeof transition.accent === "string" ? transition.accent : undefined,
  };
};

const normalizedBeats = (beats: SemanticBeat[]): SemanticBeat[] => {
  let cursor = 0;
  return beats.map((beat) => {
    const startSec = Number.isFinite(beat.startSec) && beat.startSec >= cursor ? beat.startSec : cursor;
    const durationSec = Math.max(0.1, beat.durationSec);
    cursor = startSec + durationSec;
    return { ...beat, startSec, durationSec };
  });
};

/** Convert the agent's story/beat document into the render-time edit document. */
export const assembleEditDoc = (video: VideoDoc): IsaacVerseEditDoc => {
  const beats = normalizedBeats(video.beats);
  const transitions = beats.flatMap((beat) => {
    const atSec = beat.startSec + beat.durationSec;
    return asTransition(beat, atSec) ? [asTransition(beat, atSec)!] : [];
  });
  return {
    id: `${video.id}-edit`,
    width: video.edit?.width ?? 1920,
    height: video.edit?.height ?? 1080,
    fps: video.edit?.fps ?? 30,
    beats,
    audioPlan: video.audio ?? video.edit?.audioPlan,
    transitions: video.edit?.transitions ?? transitions,
    colorGrade: video.edit?.colorGrade ?? { preset: "cinematic", intensity: 0.2 },
    music: video.edit?.music,
  };
};

export const editDurationSec = (edit: IsaacVerseEditDoc) => {
  const end = edit.beats.reduce((max, beat) => Math.max(max, beat.startSec + beat.durationSec), 0);
  const transitionEnd = (edit.transitions ?? []).reduce((max, transition) => Math.max(max, transition.atSec + transition.durationSec), 0);
  return Math.max(end, transitionEnd);
};

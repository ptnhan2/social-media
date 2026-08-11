import type { IsaacVerseEditDoc, SemanticBeat, TreatmentId } from "../../../shared/isaacverse/types";
import type { ApplyScope, EditPatch, FeedbackCategory, FeedbackRecord, FeedbackScope } from "../../../shared/isaacverse/feedback";

export type BeatQaStatus = "ready" | "review" | "attention";

export type BeatAudioSummary = {
  density: "sparse" | "normal" | "dense" | "none";
  sfxCount: number;
  hasVoice: boolean;
  hasMusicDuck: boolean;
};

const patchId = (beatId: string, category: FeedbackCategory) => `patch-${beatId}-${category}`;

export const treatmentLabel = (id: TreatmentId | string) => id.replace(/-/g, " ");

export const beatEndSec = (beat: SemanticBeat) => beat.startSec + beat.durationSec;

export const beatAudioSummary = (doc: IsaacVerseEditDoc, beatId: string): BeatAudioSummary => {
  const beat = doc.beats.find((item) => item.id === beatId);
  const plan = doc.audioPlan?.beats.find((item) => item.beatId === beatId);
  return {
    density: plan?.density ?? "none",
    sfxCount: plan?.sfx.length ?? 0,
    hasVoice: Boolean(plan?.voice || (beat && doc.audioPlan?.voice.some((voice) => voice.startSec < beatEndSec(beat) && voice.endSec > beat.startSec))),
    hasMusicDuck: Boolean(plan?.duckZones.some((zone) => zone.bus === "music")),
  };
};

export const beatMotionSummary = (beat: SemanticBeat) => {
  const params = beat.treatment.params;
  const parts: string[] = [];
  if (typeof params.cameraScale === "number" && params.cameraScale > 1) parts.push(`push ${params.cameraScale.toFixed(2)}x`);
  if (params.focusRect && typeof params.focusRect === "object") parts.push("focus rect");
  if (Array.isArray(params.nodes)) parts.push(`${params.nodes.length} reveals`);
  if (Array.isArray(params.steps)) parts.push(`${params.steps.length} steps`);
  return parts.length ? parts.join(" · ") : "phase choreography";
};

export const beatQaStatus = (doc: IsaacVerseEditDoc, beat: SemanticBeat): BeatQaStatus => {
  const audio = beatAudioSummary(doc, beat.id);
  const params = beat.treatment.params;
  const hasEmbeddedAssets = Array.isArray(params.candidates) && params.candidates.some((candidate) => candidate && typeof candidate === "object" && typeof (candidate as { src?: unknown }).src === "string");
  const hasAssets = beat.treatment.assets.length > 0 || hasEmbeddedAssets || ["semantic-diagram", "process-timeline", "chapter-card"].includes(beat.treatment.id);
  if (!hasAssets) return "attention";
  if (audio.density === "none" && !doc.audioPlan) return "review";
  return "ready";
};

export const createFeedbackRecord = ({
  id,
  createdAt,
  doc,
  beat,
  category,
  note,
  scope = "beat",
  applyScope = "this_instance",
  shotId,
  elementId,
  reviewSliceId,
  motionPhaseId,
  audioCueId,
  startSec,
  endSec,
  modality,
}: {
  id: string;
  createdAt: string;
  doc: IsaacVerseEditDoc;
  beat: SemanticBeat;
  category: FeedbackCategory;
  note?: string;
  scope?: FeedbackScope;
  applyScope?: ApplyScope;
  shotId?: string;
  elementId?: string;
  reviewSliceId?: string;
  motionPhaseId?: string;
  audioCueId?: string;
  startSec?: number;
  endSec?: number;
  modality?: string;
}): FeedbackRecord => ({
  id,
  videoId: doc.id,
  version: doc.version ?? "v001",
  scope,
  target: { reviewSliceId, beatId: beat.id, shotId, elementId, motionPhaseId, audioCueId, startSec: startSec ?? beat.startSec, endSec: endSec ?? beatEndSec(beat) },
  category,
  modality,
  note,
  status: "open",
  applyScope,
  createdAt,
});

export const createPatch = (beat: SemanticBeat, category: FeedbackCategory, note = "", id = patchId(beat.id, category), videoId = "composer-fixture", baseVersion = "v001"): EditPatch | null => {
  const target = { beatId: beat.id, startSec: beat.startSec, endSec: beatEndSec(beat) };
  if (category === "too-busy" && beat.treatment.id === "audience-demand-proof") {
    const comments = Array.isArray(beat.treatment.params.comments) ? beat.treatment.params.comments : [];
    return {
      id,
      videoId,
      baseVersion,
      reason: note || "Reduce visual density and preserve one focal comment.",
      affectedRange: { startSec: target.startSec, endSec: target.endSec },
      status: "draft",
      operations: [{ op: "replaceTreatment", beatId: beat.id, treatmentId: beat.treatment.id, params: { ...beat.treatment.params, comments: comments.slice(0, 2) } }],
    };
  }
  if (category === "too-slow") {
    return {
      id,
      videoId,
      baseVersion,
      reason: note || "Tighten this beat while preserving the transcript.",
      affectedRange: { startSec: target.startSec, endSec: target.endSec },
      status: "draft",
      operations: [{ op: "updateBeat", beatId: beat.id, changes: { durationSec: Math.max(1.5, beat.durationSec - 0.6) } }],
    };
  }
  if (category === "not-cinematic" && beat.treatment.id === "screen-proof-in-world") {
    return {
      id,
      videoId,
      baseVersion,
      reason: note || "Turn the flat screen proof into a character reflection shot.",
      affectedRange: { startSec: target.startSec, endSec: target.endSec },
      status: "draft",
      operations: [{ op: "replaceTreatment", beatId: beat.id, treatmentId: "host-reflection-cinematic", params: { subtitle: beat.transcript, lightSide: "left" } }],
    };
  }
  if (category === "wrong-visual" && beat.treatment.id === "host-reflection-cinematic") {
    return {
      id,
      videoId,
      baseVersion,
      reason: note || "Replace reflection with a relationship diagram.",
      affectedRange: { startSec: target.startSec, endSec: target.endSec },
      status: "draft",
      operations: [{ op: "replaceTreatment", beatId: beat.id, treatmentId: "semantic-diagram", params: { title: beat.narrativeFunction, kicker: "alternative", centerLabel: "the idea", nodes: [], edges: [] } }],
    };
  }
  return null;
};

import type { SemanticBeat, SemanticElement, SemanticScene, SemanticShot, IsaacVerseEditDoc } from "./types";
import type { EditPatch } from "./schema";
import { frameRangeForSeconds } from "./editorTime";

export type ReviewSource = "beat" | "shot" | "motion-phase" | "element" | "audio-event" | "voice" | "music" | "transition" | "custom";

export type ReviewModality = "story" | "pacing" | "voice" | "caption" | "visual" | "asset" | "motion" | "transition" | "music" | "ambience" | "sfx" | "mix" | "color" | "technical";

export type ReviewStatus = "unreviewed" | "approved" | "needs-fix" | "blocked";
export type FeedbackRequestStatus = "pending" | "claimed" | "previewed" | "applied" | "rejected" | "blocked";

export type ReviewTarget = {
  sceneId?: string;
  beatId?: string;
  shotId?: string;
  elementId?: string;
  motionPhaseId?: string;
  audioCueId?: string;
  transitionId?: string;
  startSec: number;
  endSec: number;
};

export type ReviewSlice = {
  id: string;
  videoId: string;
  parentId?: string;
  source: ReviewSource;
  label: string;
  target: ReviewTarget;
  startSec: number;
  endSec: number;
  modalities: ReviewModality[];
  transcript?: string;
  status: ReviewStatus;
};

export type ReviewQueueEntry = { sliceId: string; status: ReviewStatus; note?: string; updatedAt: string };
export type ReviewQueue = { projectId: string; version: string; entries: ReviewQueueEntry[]; rollup: { slices: number; approved: number; needsFix: number; unreviewed: number; blocked: number }; updatedAt: string };

export type ReviewSelection = {
  slice: ReviewSlice;
  beat: SemanticBeat;
  scene?: SemanticScene;
  shot?: SemanticShot;
  element?: SemanticElement;
  transcript: string;
  audioCueIds: string[];
  motionPhaseIds: string[];
};

export type FeedbackRequest = {
  id: string;
  projectId: string;
  version: string;
  slice: ReviewSlice;
  category: string;
  modality: ReviewModality;
  note?: string;
  requestedAction: "diagnose_and_patch" | "inspect_only" | "render_evidence";
  status: FeedbackRequestStatus;
  createdAt: string;
  claimedAt?: string;
  resultPath?: string;
  result?: {
    diagnosis?: string;
    patch?: EditPatch;
    beforePath?: string;
    afterPath?: string;
    evidencePaths?: string[];
    completedAt?: string;
  };
};

const clampRange = (startSec: number, endSec: number, min: number, max: number) => {
  const start = Math.max(min, Math.min(max, startSec));
  const end = Math.max(start + 0.05, Math.min(max, endSec));
  return { startSec: start, endSec: Math.min(max, end) };
};

const beatEnd = (beat: SemanticBeat) => beat.startSec + beat.durationSec;
const videoIdOf = (doc: IsaacVerseEditDoc) => doc.videoId || doc.id;

const makeSlice = (doc: IsaacVerseEditDoc, beat: SemanticBeat, source: ReviewSource, label: string, target: ReviewTarget, modalities: ReviewModality[], startSec: number, endSec: number, parentId?: string, constrainToBeat = true): ReviewSlice => {
  const range = constrainToBeat ? clampRange(startSec, endSec, beat.startSec, beatEnd(beat)) : { startSec, endSec: Math.max(startSec + 0.05, endSec) };
  const atomicTargetId = source === "element" ? target.elementId : source === "shot" ? target.shotId : source === "motion-phase" ? target.motionPhaseId : source === "audio-event" ? target.audioCueId : source === "voice" ? target.audioCueId || target.shotId : source === "music" ? target.audioCueId || target.shotId : source === "transition" ? target.transitionId : undefined;
  return { id: `${videoIdOf(doc)}:${target.beatId || beat.id}:${source}:${atomicTargetId || "range"}`, videoId: videoIdOf(doc), parentId, source, label, target: { ...target, startSec: range.startSec, endSec: range.endSec }, startSec: range.startSec, endSec: range.endSec, modalities, transcript: beat.transcript, status: "unreviewed" };
};

export const deriveReviewSlices = (doc: IsaacVerseEditDoc): ReviewSlice[] => {
  const videoId = videoIdOf(doc);
  const slices: ReviewSlice[] = [];
  for (const beat of doc.beats) {
    const beatSlice = makeSlice(doc, beat, "beat", `${beat.journeySlot}: ${beat.narrativeFunction}`, { sceneId: beat.sceneId, beatId: beat.id, startSec: beat.startSec, endSec: beatEnd(beat) }, ["story", "pacing", "visual", "voice", "caption", "music", "sfx", "mix"], beat.startSec, beatEnd(beat));
    slices.push(beatSlice);
    for (const shotId of beat.shotIds || []) {
      const shot = doc.shots?.find((candidate) => candidate.id === shotId);
      if (!shot) continue;
      slices.push(makeSlice(doc, beat, "shot", shot.purpose, { sceneId: beat.sceneId, beatId: beat.id, shotId: shot.id, startSec: shot.startSec, endSec: shot.startSec + shot.durationSec }, ["visual", "pacing", "transition"], shot.startSec, shot.startSec + shot.durationSec, beatSlice.id));
    }
    for (const phase of beat.motionPhases || []) slices.push(makeSlice(doc, beat, "motion-phase", phase.name, { sceneId: beat.sceneId, beatId: beat.id, shotId: beat.shotIds?.[0], motionPhaseId: phase.id, startSec: beat.startSec + phase.startSec, endSec: beat.startSec + phase.startSec + phase.durationSec }, ["motion", "visual", "pacing"], beat.startSec + phase.startSec, beat.startSec + phase.startSec + phase.durationSec, beatSlice.id));
    for (const element of beat.elements || []) {
      const modalities: ReviewModality[] = element.kind === "text" ? ["caption", "visual"] : element.kind === "audio" ? ["sfx", "mix"] : element.kind === "asset" || element.kind === "image" ? ["visual", "asset"] : ["visual"];
      const elementStart = beat.startSec + (element.startSec ?? 0);
      const elementEnd = beat.startSec + (element.endSec ?? beat.durationSec);
      slices.push(makeSlice(doc, beat, "element", element.role, { sceneId: beat.sceneId, beatId: beat.id, shotId: beat.shotIds?.[0], elementId: element.id, startSec: elementStart, endSec: elementEnd }, modalities, elementStart, elementEnd, beatSlice.id));
    }
    for (const cue of beat.audioCues) slices.push(makeSlice(doc, beat, "audio-event", cue.reason, { sceneId: beat.sceneId, beatId: beat.id, shotId: beat.shotIds?.[0], audioCueId: cue.id, startSec: cue.atSec, endSec: cue.atSec + (cue.durationSec ?? 0.8) }, ["sfx", "mix"], cue.atSec, cue.atSec + (cue.durationSec ?? 0.8), beatSlice.id));
    const voice = beat.voiceSegment || doc.audioPlan?.voice.find((segment) => segment.startSec < beatEnd(beat) && segment.endSec > beat.startSec);
    if (voice) slices.push(makeSlice(doc, beat, "voice", "voice delivery", { sceneId: beat.sceneId, beatId: beat.id, shotId: beat.shotIds?.[0], startSec: voice.startSec, endSec: voice.endSec }, ["voice", "caption", "pacing", "mix"], voice.startSec, voice.endSec, beatSlice.id));
    const music = doc.audioPlan?.music.find((track) => track.startSec < beatEnd(beat) && track.endSec > beat.startSec);
    if (music) slices.push(makeSlice(doc, beat, "music", "music bed", { sceneId: beat.sceneId, beatId: beat.id, startSec: Math.max(beat.startSec, music.startSec), endSec: Math.min(beatEnd(beat), music.endSec) }, ["music", "mix", "pacing"], Math.max(beat.startSec, music.startSec), Math.min(beatEnd(beat), music.endSec), beatSlice.id));
  }
  for (const transition of doc.transitions || []) {
    const beat = doc.beats.find((candidate) => candidate.startSec <= transition.atSec && beatEnd(candidate) > transition.atSec) || doc.beats.find((candidate) => candidate.startSec >= transition.atSec) || doc.beats[doc.beats.length - 1];
    if (!beat) continue;
    const transitionStart = beat.startSec >= transition.atSec ? beat.startSec : Math.max(beat.startSec, transition.atSec - 0.05);
    slices.push(makeSlice(doc, beat, "transition", transition.type, { sceneId: beat.sceneId, beatId: beat.id, transitionId: transition.id, startSec: transitionStart, endSec: transition.atSec + transition.durationSec }, ["transition", "visual", "sfx"], transitionStart, transition.atSec + transition.durationSec, undefined, true));
  }
  return slices.map((slice, index) => ({ ...slice, id: slice.id || `${videoId}:slice:${index}` }));
};

export const getReviewSelection = (doc: IsaacVerseEditDoc, sliceId: string): ReviewSelection => {
  const slice = deriveReviewSlices(doc).find((candidate) => candidate.id === sliceId);
  if (!slice || !slice.target.beatId) throw new Error(`Unknown review slice: ${sliceId}`);
  const beat = doc.beats.find((candidate) => candidate.id === slice.target.beatId);
  if (!beat) throw new Error(`Review slice references missing beat: ${slice.target.beatId}`);
  return {
    slice,
    beat,
    scene: slice.target.sceneId ? doc.scenes?.find((candidate) => candidate.id === slice.target.sceneId) : undefined,
    shot: slice.target.shotId ? doc.shots?.find((candidate) => candidate.id === slice.target.shotId) : undefined,
    element: slice.target.elementId ? beat.elements?.find((candidate) => candidate.id === slice.target.elementId) : undefined,
    transcript: beat.transcript,
    audioCueIds: beat.audioCues.map((cue) => cue.id),
    motionPhaseIds: beat.motionPhases?.map((phase) => phase.id) || [],
  };
};

export const frameRangeForReviewSlice = (slice: ReviewSlice, fps: number, durationSec: number) => {
  const range = frameRangeForSeconds(slice, fps, durationSec);
  return { inFrame: range.startFrame, outFrame: range.endFrame };
};

export const reviewRollup = (slices: ReviewSlice[], entries: ReviewQueueEntry[]) => {
  const statuses = new Map(entries.map((entry) => [entry.sliceId, entry.status]));
  const counts = { slices: slices.length, approved: 0, needsFix: 0, unreviewed: 0, blocked: 0 };
  slices.forEach((slice) => {
    const status = statuses.get(slice.id) || slice.status;
    if (status === "approved") counts.approved += 1;
    else if (status === "needs-fix") counts.needsFix += 1;
    else if (status === "blocked") counts.blocked += 1;
    else counts.unreviewed += 1;
  });
  return counts;
};

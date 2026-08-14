import type { IsaacVerseEditDoc, SemanticBeat, TreatmentId } from "./types";
import type { EditorDoc } from "./editor";
import type { AssetManifest, FeedbackRecord, VideoDoc } from "./schema";

export type ValidationIssue = { path: string; message: string };

const TREATMENTS: TreatmentId[] = [
  "audience-demand-proof",
  "screen-proof-in-world",
  "semantic-diagram",
  "host-reflection-cinematic",
  "cinematic-metaphor",
  "chapter-card",
  "candidate-comparison",
  "process-timeline",
];

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const isNonEmptyString = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

function validateBeat(beat: unknown, path: string, seen: Set<string>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!isObject(beat)) return [{ path, message: "beat must be an object" }];
  if (!isNonEmptyString(beat.id)) issues.push({ path: `${path}.id`, message: "stable beat id is required" });
  if (typeof beat.id === "string") {
    if (seen.has(beat.id)) issues.push({ path: `${path}.id`, message: `duplicate beat id: ${beat.id}` });
    seen.add(beat.id);
  }
  if (!isFiniteNumber(beat.startSec) || beat.startSec < 0) issues.push({ path: `${path}.startSec`, message: "must be a non-negative number" });
  if (!isFiniteNumber(beat.durationSec) || beat.durationSec <= 0) issues.push({ path: `${path}.durationSec`, message: "must be greater than zero" });
  if (!isNonEmptyString(beat.transcript)) issues.push({ path: `${path}.transcript`, message: "transcript is required" });
  if (!isNonEmptyString(beat.narrativeFunction)) issues.push({ path: `${path}.narrativeFunction`, message: "narrative function is required" });
  if (!isObject(beat.treatment)) {
    issues.push({ path: `${path}.treatment`, message: "treatment instance is required" });
  } else if (!TREATMENTS.includes(beat.treatment.id as TreatmentId)) {
    issues.push({ path: `${path}.treatment.id`, message: `unknown treatment: ${String(beat.treatment.id)}` });
  }
  if (!Array.isArray(beat.audioCues)) issues.push({ path: `${path}.audioCues`, message: "audioCues must be an array" });
  return issues;
}

export function validateEditDoc(value: unknown): ValidationIssue[] {
  if (!isObject(value)) return [{ path: "$", message: "EditDoc must be an object" }];
  const issues: ValidationIssue[] = [];
  if (!isNonEmptyString(value.id)) issues.push({ path: "$.id", message: "edit id is required" });
  if (!isFiniteNumber(value.width) || value.width <= 0) issues.push({ path: "$.width", message: "width must be greater than zero" });
  if (!isFiniteNumber(value.height) || value.height <= 0) issues.push({ path: "$.height", message: "height must be greater than zero" });
  if (!isFiniteNumber(value.fps) || value.fps <= 0) issues.push({ path: "$.fps", message: "fps must be greater than zero" });
  if (!Array.isArray(value.beats)) return [...issues, { path: "$.beats", message: "beats must be an array" }];
  const seen = new Set<string>();
  value.beats.forEach((beat, index) => issues.push(...validateBeat(beat, `$.beats[${index}]`, seen)));

  const beatIds = new Set(value.beats.filter(isObject).map((beat) => String(beat.id)));
  const elementIds = new Set<string>();
  value.beats.forEach((beat, index) => {
    if (!isObject(beat) || !Array.isArray(beat.elements)) return;
    beat.elements.forEach((element, elementIndex) => {
      const path = `$.beats[${index}].elements[${elementIndex}]`;
      if (!isObject(element) || !isNonEmptyString(element.id)) {
        issues.push({ path: `${path}.id`, message: "stable element id is required" });
        return;
      }
      if (elementIds.has(element.id)) issues.push({ path: `${path}.id`, message: `duplicate element id: ${element.id}` });
      elementIds.add(element.id);
      if (!isNonEmptyString(element.role)) issues.push({ path: `${path}.role`, message: "element role is required" });
      if (!isNonEmptyString(element.kind)) issues.push({ path: `${path}.kind`, message: "element kind is required" });
    });
  });

  const shotIds = new Set<string>();
  if (value.shots !== undefined) {
    if (!Array.isArray(value.shots)) issues.push({ path: "$.shots", message: "shots must be an array" });
    else value.shots.forEach((shot, index) => {
      const path = `$.shots[${index}]`;
      if (!isObject(shot)) { issues.push({ path, message: "shot must be an object" }); return; }
      if (!isNonEmptyString(shot.id)) issues.push({ path: `${path}.id`, message: "stable shot id is required" });
      if (typeof shot.id === "string" && shotIds.has(shot.id)) issues.push({ path: `${path}.id`, message: `duplicate shot id: ${shot.id}` });
      if (typeof shot.id === "string") shotIds.add(shot.id);
      if (!isNonEmptyString(shot.beatId) || !beatIds.has(String(shot.beatId))) issues.push({ path: `${path}.beatId`, message: "shot references an unknown beat" });
      if (!isFiniteNumber(shot.startSec) || !isFiniteNumber(shot.durationSec) || shot.startSec < 0 || shot.durationSec <= 0) issues.push({ path: `${path}.timing`, message: "shot timing must be valid" });
      if (!Array.isArray(shot.elementIds)) issues.push({ path: `${path}.elementIds`, message: "shot elementIds must be an array" });
      else shot.elementIds.forEach((elementId, elementIndex) => {
        if (!isNonEmptyString(elementId) || !elementIds.has(elementId)) issues.push({ path: `${path}.elementIds[${elementIndex}]`, message: "shot references an unknown element" });
      });
    });
  }

  if (value.scenes !== undefined) {
    if (!Array.isArray(value.scenes)) issues.push({ path: "$.scenes", message: "scenes must be an array" });
    else {
      const sceneIds = new Set<string>();
      value.scenes.forEach((scene, index) => {
        const path = `$.scenes[${index}]`;
        if (!isObject(scene)) { issues.push({ path, message: "scene must be an object" }); return; }
        if (!isNonEmptyString(scene.id)) issues.push({ path: `${path}.id`, message: "stable scene id is required" });
        if (typeof scene.id === "string" && sceneIds.has(scene.id)) issues.push({ path: `${path}.id`, message: `duplicate scene id: ${scene.id}` });
        if (typeof scene.id === "string") sceneIds.add(scene.id);
        if (!Array.isArray(scene.beatIds)) issues.push({ path: `${path}.beatIds`, message: "scene beatIds must be an array" });
        else scene.beatIds.forEach((beatId, beatIndex) => {
          if (!isNonEmptyString(beatId) || !beatIds.has(beatId)) issues.push({ path: `${path}.beatIds[${beatIndex}]`, message: "scene references an unknown beat" });
        });
        if (scene.shotIds !== undefined) {
          if (!Array.isArray(scene.shotIds)) issues.push({ path: `${path}.shotIds`, message: "scene shotIds must be an array" });
          else scene.shotIds.forEach((shotId, shotIndex) => {
            if (!isNonEmptyString(shotId) || !shotIds.has(shotId)) issues.push({ path: `${path}.shotIds[${shotIndex}]`, message: "scene references an unknown shot" });
          });
        }
      });
    }
  }
  return issues;
}

export function validateEditPatch(value: unknown): ValidationIssue[] {
  if (!isObject(value)) return [{ path: "$", message: "EditPatch must be an object" }];
  const issues: ValidationIssue[] = [];
  for (const key of ["id", "videoId", "baseVersion", "reason", "status"]) {
    if (!isNonEmptyString(value[key])) issues.push({ path: `$.${key}`, message: `${key} is required` });
  }
  if (!isObject(value.affectedRange) || !isFiniteNumber(value.affectedRange.startSec) || !isFiniteNumber(value.affectedRange.endSec) || value.affectedRange.startSec < 0 || value.affectedRange.endSec <= value.affectedRange.startSec) {
    issues.push({ path: "$.affectedRange", message: "affectedRange must contain a positive start/end range" });
  }
  if (!Array.isArray(value.operations) || value.operations.length === 0) {
    issues.push({ path: "$.operations", message: "at least one patch operation is required" });
    return issues;
  }
  value.operations.forEach((operation, index) => {
    const path = `$.operations[${index}]`;
    if (!isObject(operation) || !isNonEmptyString(operation.op)) { issues.push({ path, message: "patch operation and op are required" }); return; }
    if (operation.op === "updateBeat" && (!isNonEmptyString(operation.beatId) || !isObject(operation.changes))) issues.push({ path, message: "updateBeat requires beatId and changes" });
    else if (operation.op === "replaceTreatment" && (!isNonEmptyString(operation.beatId) || !isNonEmptyString(operation.treatmentId))) issues.push({ path, message: "replaceTreatment requires beatId and treatmentId" });
    else if (operation.op === "addElement" && (!isNonEmptyString(operation.beatId) || !isObject(operation.element) || !isNonEmptyString(operation.element.id))) issues.push({ path, message: "addElement requires beatId and element id" });
    else if (operation.op === "addAsset" && (!isObject(operation.asset) || !isNonEmptyString(operation.asset.id) || !isNonEmptyString(operation.asset.src))) issues.push({ path, message: "addAsset requires asset id and src" });
    else if (operation.op === "updateElement" && (!isNonEmptyString(operation.beatId) || !isNonEmptyString(operation.elementId) || !isNonEmptyString(operation.path))) issues.push({ path, message: "updateElement requires beatId, elementId, and path" });
    else if (operation.op === "replaceAsset" && (!isNonEmptyString(operation.assetId) || !isNonEmptyString(operation.replacementAssetId))) issues.push({ path, message: "replaceAsset requires asset IDs" });
    else if (operation.op === "updateAudioCue" && (!isNonEmptyString(operation.beatId) || !isNonEmptyString(operation.cueId) || !isObject(operation.changes))) issues.push({ path, message: "updateAudioCue requires beatId, cueId, and changes" });
    else if (operation.op === "removeAudioCue" && (!isNonEmptyString(operation.beatId) || !isNonEmptyString(operation.cueId))) issues.push({ path, message: "removeAudioCue requires beatId and cueId" });
    else if (!["updateBeat", "replaceTreatment", "addElement", "addAsset", "updateElement", "replaceAsset", "updateAudioCue", "removeAudioCue"].includes(operation.op)) issues.push({ path: `${path}.op`, message: `unknown patch operation: ${operation.op}` });
  });
  return issues;
}

export function validateEditorDoc(value: unknown): ValidationIssue[] {
  if (!isObject(value)) return [{ path: "$", message: "EditorDoc must be an object" }];
  const editor = value as Partial<EditorDoc>;
  const issues: ValidationIssue[] = [];
  if (!isNonEmptyString(editor.id)) issues.push({ path: "$.id", message: "editor id is required" });
  if (!isNonEmptyString(editor.projectId)) issues.push({ path: "$.projectId", message: "editor projectId is required" });
  if (!isFiniteNumber(editor.fps) || editor.fps <= 0) issues.push({ path: "$.fps", message: "editor fps must be positive" });
  if (!isFiniteNumber(editor.durationSec) || editor.durationSec <= 0) issues.push({ path: "$.durationSec", message: "editor duration must be positive" });
  if (!Array.isArray(editor.tracks) || editor.tracks.length === 0) {
    issues.push({ path: "$.tracks", message: "editor must contain at least one source-backed track" });
    return issues;
  }
  const assets = Array.isArray(editor.assets) ? editor.assets : [];
  const trackIds = new Set<string>();
  editor.tracks.forEach((track, index) => {
    const path = `$.tracks[${index}]`;
    if (!isObject(track)) { issues.push({ path, message: "track must be an object" }); return; }
    if (!isNonEmptyString(track.id) || trackIds.has(track.id)) issues.push({ path: `${path}.id`, message: "track id is required and must be unique" });
    if (isNonEmptyString(track.id)) trackIds.add(track.id);
    if (!isObject(track.source) || !isNonEmptyString(track.source.kind)) issues.push({ path: `${path}.source`, message: "track source binding is required" });
    if (track.source?.kind === "asset" && (!isNonEmptyString(track.source.assetId) || !assets.some((asset) => asset.id === track.source?.assetId))) issues.push({ path: `${path}.source.assetId`, message: "asset-bound track must reference an existing editor asset" });
    if (!Array.isArray(track.accepts) || !isObject(track.capabilities)) issues.push({ path, message: "track accepts and capabilities are required" });
    if (!Array.isArray(track.clips) || (track.clips.length === 0 && !(isObject(track.metadata) && track.metadata.userCreated === true))) issues.push({ path: `${path}.clips`, message: "empty phantom tracks are not allowed" });
    (track.clips || []).forEach((clip, clipIndex) => {
      const clipPath = `${path}.clips[${clipIndex}]`;
      if (!isObject(clip) || !isNonEmptyString(clip.id)) issues.push({ path: `${clipPath}.id`, message: "clip id is required" });
      if (isObject(clip) && (!isObject(clip.range) || !isFiniteNumber(clip.range.startSec) || !isFiniteNumber(clip.range.endSec) || clip.range.endSec <= clip.range.startSec)) issues.push({ path: `${clipPath}.range`, message: "clip range must be positive" });
      if (isObject(clip) && clip.trackId !== track.id) issues.push({ path: `${clipPath}.trackId`, message: "clip must belong to its containing track" });
    });
  });
  return issues;
}

export function validateVideoDoc(value: unknown): ValidationIssue[] {
  if (!isObject(value)) return [{ path: "$", message: "VideoDoc must be an object" }];
  const issues: ValidationIssue[] = [];
  if (!isNonEmptyString(value.id)) issues.push({ path: "$.id", message: "video id is required" });
  if (!isNonEmptyString(value.idea)) issues.push({ path: "$.idea", message: "idea is required" });
  if (!isNonEmptyString(value.surfaceProblem)) issues.push({ path: "$.surfaceProblem", message: "surface problem is required" });
  if (!isNonEmptyString(value.deeperProblem)) issues.push({ path: "$.deeperProblem", message: "deeper problem is required" });
  if (!isNonEmptyString(value.thumbnailPromise)) issues.push({ path: "$.thumbnailPromise", message: "thumbnail promise is required" });
  if (!isObject(value.commonGoal) || value.commonGoal.aligned !== true) issues.push({ path: "$.commonGoal", message: "viewer/creator goal must be explicit and aligned" });
  if (!Array.isArray(value.beats) || value.beats.length === 0) issues.push({ path: "$.beats", message: "at least one semantic beat is required" });
  return issues;
}

export function validateAssetManifest(value: unknown): ValidationIssue[] {
  if (!isObject(value)) return [{ path: "$", message: "AssetManifest must be an object" }];
  const issues: ValidationIssue[] = [];
  if (!isNonEmptyString(value.videoId)) issues.push({ path: "$.videoId", message: "video id is required" });
  if (!Array.isArray(value.entries)) return [...issues, { path: "$.entries", message: "entries must be an array" }];
  const seen = new Set<string>();
  value.entries.forEach((entry, index) => {
    const path = `$.entries[${index}]`;
    if (!isObject(entry)) { issues.push({ path, message: "asset entry must be an object" }); return; }
    if (!isNonEmptyString(entry.id)) issues.push({ path: `${path}.id`, message: "stable asset id is required" });
    if (typeof entry.id === "string" && seen.has(entry.id)) issues.push({ path: `${path}.id`, message: `duplicate asset id: ${entry.id}` });
    if (typeof entry.id === "string") seen.add(entry.id);
    if (!isNonEmptyString(entry.description)) issues.push({ path: `${path}.description`, message: "asset description is required" });
    if (!isObject(entry.provenance)) issues.push({ path: `${path}.provenance`, message: "asset provenance is required" });
  });
  return issues;
}

export function validateFeedback(value: unknown): ValidationIssue[] {
  if (!isObject(value)) return [{ path: "$", message: "FeedbackRecord must be an object" }];
  const issues: ValidationIssue[] = [];
  for (const key of ["id", "videoId", "version", "scope", "category", "status", "applyScope", "createdAt"]) {
    if (!isNonEmptyString(value[key])) issues.push({ path: `$.${key}`, message: `${key} is required` });
  }
  if (!isObject(value.target)) issues.push({ path: "$.target", message: "feedback target is required" });
  return issues;
}

export function assertValid<T>(value: T, issues: ValidationIssue[], label: string): T {
  if (issues.length) throw new Error(`${label} validation failed:\n${issues.map((issue) => `- ${issue.path}: ${issue.message}`).join("\n")}`);
  return value;
}

export const assertValidEditDoc = (value: IsaacVerseEditDoc) => assertValid(value, validateEditDoc(value), "EditDoc");
export const assertValidVideoDoc = (value: VideoDoc) => assertValid(value, validateVideoDoc(value), "VideoDoc");
export const assertValidAssetManifest = (value: AssetManifest) => assertValid(value, validateAssetManifest(value), "AssetManifest");
export const assertValidFeedback = (value: FeedbackRecord) => assertValid(value, validateFeedback(value), "FeedbackRecord");
export const assertValidPatch = <T>(value: T) => assertValid(value, validateEditPatch(value), "EditPatch");
export const assertValidEditorDoc = (value: EditorDoc) => assertValid(value, validateEditorDoc(value), "EditorDoc");

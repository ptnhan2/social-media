import type { EditPatch, EditPatchOperation, FeedbackApplyScope, FeedbackRecord as SchemaFeedbackRecord, FeedbackScope as SchemaFeedbackScope } from "./schema";
import type { IsaacVerseEditDoc, SemanticBeat, SemanticElement } from "./types";

export type { EditPatch, EditPatchOperation } from "./schema";
export type FeedbackScope = SchemaFeedbackScope;
export type ApplyScope = FeedbackApplyScope;
export type FeedbackRecord = SchemaFeedbackRecord;

export type FeedbackCategory =
  | "too-busy"
  | "too-slow"
  | "wrong-visual"
  | "weak-transition"
  | "motion-too-strong"
  | "motion-too-flat"
  | "text-unreadable"
  | "wrong-typography"
  | "sfx-too-loud"
  | "sfx-missing"
  | "music-covers-voice"
  | "asset-generic"
  | "not-cinematic"
  | "not-supporting-story"
  | "custom";

const setPath = (element: SemanticElement, path: string, value: unknown): SemanticElement => {
  const keys = path.split(".").filter(Boolean);
  if (!keys.length) return element;
  const root: Record<string, unknown> = { ...element };
  let cursor = root;
  keys.slice(0, -1).forEach((key) => {
    const child = cursor[key];
    cursor[key] = child && typeof child === "object" ? { ...(child as Record<string, unknown>) } : {};
    cursor = cursor[key] as Record<string, unknown>;
  });
  cursor[keys[keys.length - 1]] = value;
  return root as SemanticElement;
};

const updateBeat = (beat: SemanticBeat, operations: EditPatchOperation[]): SemanticBeat => operations.reduce((current, operation) => {
  if (operation.op === "updateBeat") return { ...current, ...operation.changes } as SemanticBeat;
  if (operation.op === "replaceTreatment") return {
    ...current,
    treatment: {
      ...current.treatment,
      id: operation.treatmentId,
      params: operation.params ?? current.treatment.params,
    },
  };
  if (operation.op === "addElement") return {
    ...current,
    elements: [...(current.elements || []), { ...operation.element, metadata: { ...(operation.element.metadata || {}), canvasOverride: true } }],
  };
  if (operation.op === "updateElement") {
    const element = current.elements?.find((candidate) => candidate.id === operation.elementId);
    const updatedElement = element ? setPath(element, operation.path, operation.value) : undefined;
    const updatesGeometry = operation.path === "geometry" || operation.path.startsWith("geometry.");
    return {
      ...current,
      elements: current.elements?.map((candidate) => candidate.id === operation.elementId ? (updatedElement && updatesGeometry ? { ...updatedElement, metadata: { ...updatedElement.metadata, canvasOverride: true } } : updatedElement || candidate) : candidate),
    };
  }
  if (operation.op === "updateAudioCue") {
    return {
      ...current,
      audioCues: current.audioCues.map((cue) => cue.id === operation.cueId ? { ...cue, ...operation.changes } : cue),
    };
  }
  if (operation.op === "removeAudioCue") return { ...current, audioCues: current.audioCues.filter((cue) => cue.id !== operation.cueId) };
  return current;
}, beat);

const replaceAssetInBeat = (beat: SemanticBeat, assetId: string, replacementAssetId: string, doc: IsaacVerseEditDoc): SemanticBeat => {
  const replacement = doc.assets?.find((asset) => asset.id === replacementAssetId);
  return {
    ...beat,
    treatment: {
      ...beat.treatment,
      assets: beat.treatment.assets.map((asset) => asset.id === assetId ? (replacement ? { ...replacement } : { ...asset, id: replacementAssetId }) : asset),
    },
  };
};

export const applyPatch = (doc: IsaacVerseEditDoc, patch: EditPatch): IsaacVerseEditDoc => {
  let reflow = 0;
  let assets = doc.assets;
  let beats = doc.beats.map((originalBeat) => {
    const operations = patch.operations.filter((operation) => "beatId" in operation && operation.beatId === originalBeat.id);
    const updated = updateBeat(originalBeat, operations);
    const durationChange = operations.find((operation): operation is Extract<EditPatchOperation, { op: "updateBeat" }> => operation.op === "updateBeat" && typeof operation.changes.durationSec === "number");
    const shifted = { ...updated, startSec: updated.startSec + reflow };
    if (durationChange && typeof durationChange.changes.durationSec === "number") reflow += durationChange.changes.durationSec - originalBeat.durationSec;
    return shifted;
  });
  const durationOperations = patch.operations.filter((operation): operation is Extract<EditPatchOperation, { op: "updateBeat" }> => operation.op === "updateBeat" && typeof operation.changes.durationSec === "number");
  const durationChanges = durationOperations.map((operation) => {
    const original = doc.beats.find((beat) => beat.id === operation.beatId);
    return original ? { endSec: original.startSec + original.durationSec, delta: Number(operation.changes.durationSec) - original.durationSec } : null;
  }).filter((change): change is { endSec: number; delta: number } => Boolean(change));
  let transitions = doc.transitions;
  for (const operation of patch.operations) {
    if (operation.op === "addAsset") assets = [...(assets || []).filter((asset) => asset.id !== operation.asset.id), operation.asset];
  }
  if (transitions && durationChanges.length) transitions = transitions.map((transition) => ({ ...transition, atSec: transition.atSec + durationChanges.filter((change) => transition.atSec >= change.endSec).reduce((sum, change) => sum + change.delta, 0) }));
  for (const operation of patch.operations) {
    if (operation.op === "replaceAsset") beats = beats.map((beat) => replaceAssetInBeat(beat, operation.assetId, operation.replacementAssetId, { ...doc, assets }));
  }
  return { ...doc, version: patch.id, assets, beats, transitions };
};

export const findBeat = (doc: IsaacVerseEditDoc, beatId: string): SemanticBeat | undefined => doc.beats.find((beat) => beat.id === beatId);

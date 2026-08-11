import type { EditPatch, EditPatchOperation } from "./schema";
import type { FeedbackCategory } from "./feedback";
import { findBeat } from "./feedback";
import type { IsaacVerseEditDoc, SemanticBeat, SemanticElement, SemanticScene, SemanticShot } from "./types";

export type OperationName =
  | "inspect_segment"
  | "diagnose_feedback"
  | "patch_beat"
  | "replace_treatment"
  | "replace_asset"
  | "update_motion_phase"
  | "update_audio_cue"
  | "render_preview_window"
  | "compare_preview"
  | "apply_patch"
  | "rollback_patch"
  | "promote_feedback_rule";

export type OperationTarget = {
  reviewSliceId?: string;
  sceneId?: string;
  beatId?: string;
  shotId?: string;
  elementId?: string;
  motionPhaseId?: string;
  audioCueId?: string;
  startSec: number;
  endSec: number;
};

export type OperationRequest = {
  operation: OperationName;
  projectId: string;
  target?: OperationTarget;
  category?: FeedbackCategory | string;
  note?: string;
  patch?: EditPatch;
  treatmentId?: SemanticBeat["treatment"]["id"];
  params?: Record<string, unknown>;
  assetId?: string;
  replacementAssetId?: string;
  cueId?: string;
  changes?: Record<string, unknown>;
  confirm?: boolean;
};

export type OperationResult = {
  operationId: string;
  operation: OperationName;
  status: "ok" | "needs_approval" | "rejected" | "error";
  projectId: string;
  diagnosis?: string;
  message?: string;
  data?: {
    beat?: SemanticBeat;
    shot?: SemanticShot;
    element?: SemanticElement;
    scene?: SemanticScene;
    evidence?: Record<string, unknown>;
  };
  patch?: EditPatch;
};

const operationId = (operation: OperationName, projectId: string) => `op-${operation}-${projectId}-${Date.now()}`;
const rangeFor = (beat: SemanticBeat, target?: OperationTarget) => ({ startSec: target?.startSec ?? beat.startSec, endSec: target?.endSec ?? beat.startSec + beat.durationSec });

const result = (request: OperationRequest, status: OperationResult["status"], extra: Partial<OperationResult> = {}): OperationResult => ({ operationId: operationId(request.operation, request.projectId), operation: request.operation, status, projectId: request.projectId, ...extra });

export const inspectSegment = (doc: IsaacVerseEditDoc, target: OperationTarget): OperationResult => {
  const beat = target.beatId ? findBeat(doc, target.beatId) : doc.beats.find((candidate) => candidate.startSec <= target.startSec && candidate.startSec + candidate.durationSec >= target.endSec);
  if (!beat) return { operationId: operationId("inspect_segment", doc.videoId ?? doc.id), operation: "inspect_segment", status: "rejected", projectId: doc.videoId ?? doc.id, message: "Target beat not found" };
  const shot = target.shotId ? doc.shots?.find((candidate) => candidate.id === target.shotId) : doc.shots?.find((candidate) => candidate.beatId === beat.id);
  const element = target.elementId ? beat.elements?.find((candidate) => candidate.id === target.elementId) : undefined;
  const scene = beat.sceneId ? doc.scenes?.find((candidate) => candidate.id === beat.sceneId) : undefined;
  return {
    operationId: operationId("inspect_segment", doc.videoId ?? doc.id),
    operation: "inspect_segment",
    status: "ok",
    projectId: doc.videoId ?? doc.id,
    data: {
      beat,
      shot,
      element,
      scene,
      evidence: {
        transcript: beat.transcript,
        narrativeFunction: beat.narrativeFunction,
        treatmentId: beat.treatment.id,
        assetIds: beat.treatment.assets.map((asset) => asset.id),
        audioCueIds: beat.audioCues.map((cue) => cue.id),
        motionPhaseIds: beat.motionPhases?.map((phase) => phase.id) ?? [],
        revision: beat.revision ?? 0,
      },
    },
  };
};

const patchFor = (doc: IsaacVerseEditDoc, request: OperationRequest, beat: SemanticBeat, operations: EditPatchOperation[], diagnosis: string): EditPatch => {
  const durationChange = operations.find((operation) => operation.op === "updateBeat" && typeof operation.changes.durationSec === "number");
  const beatIndex = doc.beats.findIndex((candidate) => candidate.id === beat.id);
  return {
    id: `patch-${request.projectId}-${beat.id}-${Date.now()}`,
    videoId: request.projectId,
    baseVersion: doc.version ?? "v001",
    reason: request.note || diagnosis,
    operations,
    affectedRange: rangeFor(beat, request.target),
    status: "draft",
    cascade: durationChange ? { requiresReflow: true, affectedBeatIds: doc.beats.slice(Math.max(0, beatIndex)).map((candidate) => candidate.id), reason: "Changing duration reflows downstream timeline ranges." } : undefined,
  };
};

export const diagnoseFeedback = (doc: IsaacVerseEditDoc, request: OperationRequest): OperationResult => {
  if (!request.target) return result(request, "rejected", { message: "diagnose_feedback requires a target" });
  const beat = request.target.beatId ? findBeat(doc, request.target.beatId) : undefined;
  if (!beat) return result(request, "rejected", { message: "Target beat not found" });
  const category = request.category || "custom";
  if (category === "too-slow") return result(request, "ok", { diagnosis: "The beat can tighten while keeping the transcript and treatment unchanged.", patch: patchFor(doc, request, beat, [{ op: "updateBeat", beatId: beat.id, changes: { durationSec: Math.max(1.5, beat.durationSec - 0.6) } }], "Tighten the beat while preserving the transcript.") });
  if (category === "too-busy" && beat.treatment.id === "audience-demand-proof") {
    const comments = Array.isArray(beat.treatment.params.comments) ? beat.treatment.params.comments.slice(0, 2) : [];
    return result(request, "ok", { diagnosis: "The audience-proof treatment has more comment layers than the beat can carry.", patch: patchFor(doc, request, beat, [{ op: "replaceTreatment", beatId: beat.id, treatmentId: beat.treatment.id, params: { ...beat.treatment.params, comments } }], "Keep one focal comment and reduce visual density.") });
  }
  if (category === "not-cinematic" && beat.treatment.id === "screen-proof-in-world") return result(request, "ok", { diagnosis: "The screen proof is informative but flat; replace it with a character reflection treatment so the evidence has a point of view.", patch: patchFor(doc, request, beat, [{ op: "replaceTreatment", beatId: beat.id, treatmentId: "host-reflection-cinematic", params: { subtitle: beat.transcript, lightSide: "left" } }], "Turn flat proof into a character reflection shot.") });
  if (category === "wrong-visual" && beat.treatment.id === "host-reflection-cinematic") return result(request, "ok", { diagnosis: "The reflection does not explain the relationship in this sentence; a semantic diagram makes it explicit.", patch: patchFor(doc, request, beat, [{ op: "replaceTreatment", beatId: beat.id, treatmentId: "semantic-diagram", params: { title: beat.narrativeFunction, kicker: "the relationship", centerLabel: "the idea", nodes: [], edges: [] } }], "Replace reflection with a relationship diagram.") });
  if (category === "motion-too-flat") {
    const phases = beat.motionPhases?.length ? beat.motionPhases : [{ id: `${beat.id}:phase-agent`, name: "controlled push", startSec: 0, durationSec: Math.min(beat.durationSec, 1.8), purpose: "move the focal evidence", params: { cameraScale: 1.06 } }];
    return result(request, "ok", { diagnosis: "The beat has no explicit motion phase with a narrative purpose.", patch: patchFor(doc, request, beat, [{ op: "updateBeat", beatId: beat.id, changes: { motionPhases: phases } }], "Add a restrained motion phase to the focal evidence.") });
  }
  if (category === "text-unreadable" || category === "wrong-typography") {
    const element = beat.elements?.find((candidate) => candidate.kind === "text");
    if (!element) return result(request, "needs_approval", { diagnosis: "No stable text element is available for a safe local typography patch." });
    const value = category === "text-unreadable" ? "#f8fafc" : "Archivo Black";
    return result(request, "ok", { diagnosis: `The selected text element needs a ${category === "text-unreadable" ? "higher-contrast color" : "more intentional type treatment"}.`, patch: patchFor(doc, request, beat, [{ op: "updateElement", beatId: beat.id, elementId: element.id, path: category === "text-unreadable" ? "metadata.color" : "metadata.fontFamily", value }], "Adjust the selected text element only.") });
  }
  if (category === "sfx-too-loud" && beat.audioCues[0]) return result(request, "ok", { diagnosis: "The first event cue is the local loudness target.", patch: patchFor(doc, request, beat, [{ op: "updateAudioCue", beatId: beat.id, cueId: beat.audioCues[0].id, changes: { gain: Math.min(beat.audioCues[0].gain ?? 0, -12) } }], "Lower the selected event cue without muting the bus.") });
  if (category === "sfx-missing") return result(request, "ok", { diagnosis: "The beat has no event cue at the reveal point.", patch: patchFor(doc, request, beat, [{ op: "updateBeat", beatId: beat.id, changes: { audioCues: [...beat.audioCues, { id: `${beat.id}:agent-sfx`, atSec: beat.startSec + 0.2, reason: "emphasis" }] } }], "Add one purposeful event cue at the beat reveal.") });
  return result(request, "needs_approval", { diagnosis: "No deterministic local patch is safe for this complaint without a new treatment or asset decision.", message: "The feedback record is preserved for an explicit alternative or future-rule decision." });
};

export const dispatchLocalOperation = (doc: IsaacVerseEditDoc, request: OperationRequest): OperationResult => {
  if (request.operation === "inspect_segment") return request.target ? inspectSegment(doc, request.target) : result(request, "rejected", { message: "inspect_segment requires a target" });
  if (request.operation === "diagnose_feedback") return diagnoseFeedback(doc, request);
  if (request.operation === "patch_beat" && request.patch) return result(request, "ok", { patch: request.patch, diagnosis: request.patch.reason });
  if (request.operation === "replace_treatment" && request.target?.beatId && request.treatmentId) {
    const beat = findBeat(doc, request.target.beatId);
    if (!beat) return result(request, "rejected", { message: "Target beat not found" });
    return result(request, "ok", { patch: patchFor(doc, request, beat, [{ op: "replaceTreatment", beatId: beat.id, treatmentId: request.treatmentId, params: request.params }], "Replace the selected beat treatment.") });
  }
  if (request.operation === "replace_asset" && request.assetId && request.replacementAssetId) return result(request, "needs_approval", { message: "Asset replacement requires an explicit provenance match before apply." });
  if (request.operation === "update_audio_cue" && request.target?.beatId && request.cueId) {
    const beat = findBeat(doc, request.target.beatId);
    if (!beat) return result(request, "rejected", { message: "Target beat not found" });
    return result(request, "ok", { patch: patchFor(doc, request, beat, [{ op: "updateAudioCue", beatId: beat.id, cueId: request.cueId, changes: request.changes || {} }], "Update the selected audio cue." ) });
  }
  if (["update_motion_phase", "render_preview_window", "compare_preview", "apply_patch", "rollback_patch", "promote_feedback_rule"].includes(request.operation)) return result(request, "needs_approval", { message: `Operation ${request.operation} requires the project store or render executor.` });
  return result(request, "rejected", { message: `Operation ${request.operation} has insufficient target or parameters.` });
};

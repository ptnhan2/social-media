import type { AudioPlan } from "./audio";
import type { AssetKind, AssetRef, IsaacVerseEditDoc, SemanticBeat, SemanticElement, TreatmentId } from "./types";

export type JourneySlot =
  | "status_quo"
  | "call"
  | "assistance"
  | "departure"
  | "trials"
  | "approach"
  | "crisis"
  | "reward"
  | "result"
  | "return"
  | "new_life"
  | "resolution";

export type AudienceAvatar = {
  id: string;
  description: string;
  knowledgeLevel: "beginner" | "intermediate" | "advanced";
  desiredTransformation: string;
};

export type VideoDoc = {
  id: string;
  seriesId?: string;
  idea: string;
  commonGoal: { viewer: string; creator: string; aligned: boolean };
  surfaceProblem: string;
  deeperProblem: string;
  thumbnailPromise: string;
  audienceAvatars: AudienceAvatar[];
  transformation: { start: string; end: string };
  grandStoryLink?: string;
  beats: SemanticBeat[];
  edit?: IsaacVerseEditDoc;
  audio?: AudioPlan;
  thumbnail?: { src?: string; title: string; testStatus?: "pending" | "passed" | "failed" };
  dubs?: { language: string; audioSrc: string; title?: string; description?: string }[];
};

export type QASeverity = "info" | "warning" | "failure";

export type QAFinding = {
  id: string;
  severity: QASeverity;
  category: "story" | "voice" | "audio" | "visual" | "treatment" | "asset" | "thumbnail" | "compliance" | "render";
  message: string;
  evidencePaths: string[];
  target?: { beatId?: string; shotId?: string; elementId?: string; startSec?: number; endSec?: number };
  patchCandidates?: string[];
};

export type QAReport = {
  id: string;
  videoId: string;
  version: string;
  mode: "draft" | "master";
  status: "pass" | "pass_with_review" | "fail";
  findings: QAFinding[];
  metrics: Record<string, number | string | boolean>;
  createdAt: string;
};

export type RenderWindow = {
  id: string;
  videoId: string;
  version: string;
  startSec: number;
  endSec: number;
  startFrame: number;
  endFrame: number;
  quality: "draft" | "master";
  path: string;
  createdAt: string;
};

export type DubTrack = {
  language: string;
  voiceSrc?: string;
  mixSrc?: string;
  aligned: boolean;
  status: "planned" | "generated" | "aligned" | "failed";
  notes?: string[];
};

export type ThumbnailArtifact = {
  id: string;
  src: string;
  type: string;
  title: string;
  qaStatus: "pending" | "passed" | "failed";
  reportPath?: string;
};

export type PublishManifest = {
  videoId: string;
  masterSrc: string;
  thumbnailSrc?: string;
  title: string;
  description: string;
  captions: string[];
  dubs: DubTrack[];
  complianceReportPath: string;
  gateReportPath: string;
  status: "draft" | "ready" | "dry_run" | "published" | "blocked";
  providerResponse?: Record<string, unknown>;
};

export type AssetStatus = "planned" | "resolving" | "ready" | "failed" | "rejected";

export type AssetManifestEntry = {
  id: string;
  kind: AssetKind | "font" | "music" | "sfx" | "voice";
  src?: string;
  status: AssetStatus;
  description: string;
  provenance: {
    provider?: string;
    sourceUrl?: string;
    license?: string;
    prompt?: string;
    generatedAt?: string;
  };
  dimensions?: { width: number; height: number };
  durationSec?: number;
  usedBy: { beatId?: string; treatmentId?: string }[];
  qa?: { passed: boolean; checks: string[]; failures?: string[] };
};

export type AssetManifest = {
  videoId: string;
  entries: AssetManifestEntry[];
  updatedAt: string;
};

export type TreatmentEvidence = {
  videoId: string;
  timestamps: string[];
  observationFile: string;
};

export type TreatmentInputSlot = {
  role: string;
  kind: AssetKind | "text" | "diagram" | "audio";
  required: boolean;
  constraints?: Record<string, unknown>;
};

export type TreatmentPhase = {
  name: string;
  start: "relative" | "beat";
  duration: number | "content";
  properties: Record<string, unknown>;
};

export type TreatmentSpec = {
  id: TreatmentId;
  status: "forensic-provisional" | "validated" | "catalog-approved" | "retired";
  evidence: TreatmentEvidence[];
  narrativeFunctions: string[];
  inputSlots: TreatmentInputSlot[];
  component: string;
  parameters: Record<string, unknown>;
  phases: TreatmentPhase[];
  textRoles: string[];
  audioCues: { event: string; sfx?: string; music?: string; duckDb?: number }[];
  assetRequirements: { kind: string; mode: "agent_generated" | "agent_orchestrated_external" | "human_gate"; provider?: string; required: boolean }[];
  failureModes: string[];
  acceptanceChecks: string[];
  agentNotes: string[];
  whenToUse: string;
  whenNotToUse: string;
};

export type FeedbackScope = "element" | "shot" | "beat" | "scene" | "audio" | "video";
export type FeedbackStatus = "open" | "previewed" | "applied" | "rejected" | "rolled_back";
export type FeedbackApplyScope = "this_instance" | "similar_instances" | "future_rule";

export type FeedbackRecord = {
  id: string;
  videoId: string;
  version: string;
  scope: FeedbackScope;
  target: { reviewSliceId?: string; beatId?: string; shotId?: string; elementId?: string; motionPhaseId?: string; audioCueId?: string; startSec: number; endSec: number };
  category: string;
  modality?: string;
  note?: string;
  diagnosis?: string;
  patchId?: string;
  status: FeedbackStatus;
  applyScope: FeedbackApplyScope;
  createdAt: string;
};

export type EditPatchOperation =
  | { op: "updateBeat"; beatId: string; changes: Record<string, unknown> }
  | { op: "replaceTreatment"; beatId: string; treatmentId: TreatmentId; params?: Record<string, unknown> }
  | { op: "addElement"; beatId: string; element: SemanticElement }
  | { op: "addAsset"; asset: AssetRef }
  | { op: "updateElement"; beatId: string; elementId: string; path: string; value: unknown }
  | { op: "replaceAsset"; assetId: string; replacementAssetId: string }
  | { op: "updateAudioCue"; beatId: string; cueId: string; changes: Record<string, unknown> }
  | { op: "removeAudioCue"; beatId: string; cueId: string };

export type EditPatch = {
  id: string;
  videoId: string;
  baseVersion: string;
  reason: string;
  operations: EditPatchOperation[];
  affectedRange: { startSec: number; endSec: number };
  status: "draft" | "previewed" | "applied" | "rejected" | "rolled_back";
  cascade?: { requiresReflow: boolean; affectedBeatIds: string[]; reason: string };
  render?: { path: string; quality: "draft" | "master"; createdAt: string };
};

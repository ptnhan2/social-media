// Machine-readable bridge between VideoDoc beats and Remotion treatments.
// This is intentionally smaller than the full forensic TreatmentSpec: it is the
// render-time contract an agent can generate and validate.
import type { AudioPlan } from "./audio";

export type TreatmentId =
  | "audience-demand-proof"
  | "screen-proof-in-world"
  | "semantic-diagram"
  | "host-reflection-cinematic"
  | "cinematic-metaphor"
  | "chapter-card"
  | "candidate-comparison"
  | "process-timeline";

export type AssetKind = "image" | "video" | "screen" | "character" | "diagram" | "audio";

export type AssetRef = {
  id: string;
  kind: AssetKind;
  src: string;
  description?: string;
  provenance?: string;
};

export type ElementKind = "text" | "shape" | "image" | "video" | "asset" | "node" | "step" | "overlay" | "audio";

export type SemanticElement = {
  id: string;
  role: string;
  kind: ElementKind;
  sourcePath?: string;
  startSec?: number;
  endSec?: number;
  geometry?: { x: number; y: number; width: number; height: number; rotation?: number };
  metadata?: Record<string, unknown>;
};

export type SemanticShot = {
  id: string;
  beatId: string;
  startSec: number;
  durationSec: number;
  purpose: string;
  elementIds: string[];
  transitionAfter?: string;
};

export type SemanticScene = {
  id: string;
  index: number;
  startSec: number;
  durationSec: number;
  beatIds: string[];
  shotIds?: string[];
  transitionAfter?: string;
};

export type MotionPhase = {
  id: string;
  name: string;
  startSec: number;
  durationSec: number;
  purpose: string;
  params?: Record<string, unknown>;
};

export type BeatQAStatus = "pending" | "pass" | "review" | "fail";

export type BeatQA = {
  status: BeatQAStatus;
  findings: string[];
  checkedAt?: string;
  evidencePaths?: string[];
};

export type AudioCue = {
  id: string;
  src?: string;
  atSec: number;
  durationSec?: number;
  gain?: number;
  reason: "transition" | "build" | "reveal" | "ui" | "comedy" | "emphasis" | "ambience";
};

export type EditTransition = {
  id: string;
  atSec: number;
  durationSec: number;
  type: "flash" | "fade" | "blur" | "light-leak";
  accent?: string;
};

export type ColorGradePlan = {
  preset: "none" | "warm" | "cinematic" | "neutral";
  intensity: number;
};

export type TreatmentInstance = {
  id: TreatmentId;
  params: Record<string, unknown>;
  assets: AssetRef[];
};

export type SemanticBeat = {
  id: string;
  sceneId?: string;
  shotIds?: string[];
  journeySlot: string;
  startSec: number;
  durationSec: number;
  transcript: string;
  narrativeFunction: string;
  treatment: TreatmentInstance;
  elements?: SemanticElement[];
  motionPhases?: MotionPhase[];
  revision?: number;
  qa?: BeatQA;
  audioCues: AudioCue[];
  voiceSegment?: { src: string; startSec: number; endSec: number };
};

export type IsaacVerseEditDoc = {
  id: string;
  videoId?: string;
  version?: string;
  width: number;
  height: number;
  fps: number;
  beats: SemanticBeat[];
  assets?: AssetRef[];
  shots?: SemanticShot[];
  scenes?: SemanticScene[];
  treatmentUsage?: Record<string, { beatIds: string[]; count: number }>;
  qa?: { status: "pending" | "pass" | "review" | "fail"; reportPath?: string; checkedAt?: string };
  music?: { src: string; gain: number; duckUnderVoice: boolean };
  audioPlan?: AudioPlan;
  transitions?: EditTransition[];
  colorGrade?: ColorGradePlan;
};

export type TreatmentRegistryEntry = {
  id: TreatmentId;
  component: string;
  narrativeFunctions: string[];
  requiredAssets: AssetKind[];
  agentCanGenerate: boolean;
  agentCanOrchestrateExternal: boolean;
  humanGate?: "approval" | "licensing" | "none";
};

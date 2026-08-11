export type VoiceEmotion = "excited" | "disappointed" | "confused" | "curious" | "neutral";

export type VoiceDirective = {
  emphasisWords: string[];
  pauseBeforeSec: number;
  emotion: VoiceEmotion;
};

export type VoiceSentence = {
  id: string;
  order: number;
  text: string;
  directive: VoiceDirective;
  batchId: string;
};

export type VoiceTake = {
  id: string;
  sentenceIds: string[];
  path: string;
  durationSec?: number;
  loudnessLufs?: number;
  toneVariance?: number;
  selected?: boolean;
  provenance?: { provider: string; model?: string; settings?: Record<string, unknown> };
};

export type VoiceSegment = {
  sentenceId: string;
  takeId: string;
  sourceStartSec?: number;
  sourceEndSec?: number;
  outputStartSec?: number;
};

export type VoicePlan = {
  videoId: string;
  voiceId: string;
  modelId: string;
  settings: { stability: number; similarityBoost: number; style: number; speed: number };
  sentences: VoiceSentence[];
  takes: VoiceTake[];
  selectedSegments: VoiceSegment[];
  eqPreset: "isaacverse-clean" | "none";
  dubs: { language: string; sourceVoicePath?: string; outputPath?: string; status: "planned" | "ready" | "failed" }[];
};

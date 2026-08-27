/**
 * Voice clip contract — timeline-centric voice pipeline (PIPELINE-PRODUCTION-
 * SPEC v3, M1a). One voice clip per beat/batch on the "voice" track; the
 * clip metadata IS the parity surface: the user edits providerText in the
 * Composer Audio tab, the agent regenerates via the same bridge op, and the
 * per-field override ledger decides whose text survives a sync.
 */

export type VoiceSettings = {
  voiceId: string;
  modelId: string;
  stability: number;
  similarityBoost: number;
  style: number;
  speed: number;
  useSpeakerBoost: boolean;
};

export const VOICE_SETTINGS_DEFAULTS: VoiceSettings = {
  voiceId: "21m00Tcm4TlvDq8ikWAM",
  modelId: "eleven_multilingual_v2",
  stability: 0.35,
  similarityBoost: 0.75,
  style: 0.35,
  speed: 1.0,
  useSpeakerBoost: true,
};

export type VoiceQcCheck = {
  id: string;
  label: string;
  pass: boolean;
  value: string;
  threshold: string;
};

export type VoiceQc = {
  pass: boolean;
  checkedAt: string;
  durationSec: number;
  expectedSec: number;
  peakDb: number;
  meanDb: number;
  lufs: number | null;
  tailSilenceSec: number;
  /** WER vs script when a transcriber is available (whisperx); null = skipped. */
  wer: number | null;
  checks: VoiceQcCheck[];
};

export const VOICE_QC_THRESHOLDS = {
  maxPeakDb: -0.5,
  durationTolerance: 0.15,
  maxTailSilenceSec: 1.5,
  maxWer: 0.05,
  wpm: 150,
  lufsTarget: -16,
  truePeakTarget: -1.5,
  lraTarget: 11,
} as const;

/** ElevenLabs v2-safe text prep (stage B direction). Iron rule: NEVER add,
 *  remove or reword — only punctuation-level transforms. v3-only constructs
 *  (audio tags) are avoided so the default multilingual_v2 path stays valid. */
export const buildProviderText = (
  sentenceText: string,
  opts: { maxBreaks?: number } = {},
): string => {
  const maxBreaks = opts.maxBreaks ?? 2;
  let text = sentenceText.replace(/\s+/g, " ").trim();
  // "..." → explicit pause; cap the count — too many breaks destabilize v2
  let breaks = 0;
  text = text.replace(/\.\.\./g, () => (breaks < maxBreaks ? (breaks += 1, `<break time="0.4s"/>`) : "…"));
  return text;
};

/** Soft validation for user edits of providerText: words must match the
 *  sentence (tags/CAPS/punctuation may change). Returns the changed words so
 *  the UI can warn without blocking — parity means the user CAN break the
 *  rule, we just tell them. */
export const validateProviderTextEdit = (
  sentenceText: string,
  providerText: string,
): { ok: boolean; changedWords: string[] } => {
  const strip = (s: string) => s.toLowerCase().replace(/<[^>]+>/g, " ").replace(/[^a-z0-9'\s]/g, " ").split(/\s+/).filter(Boolean);
  const a = strip(sentenceText);
  const b = strip(providerText);
  const counts = new Map<string, number>();
  for (const w of a) counts.set(w, (counts.get(w) ?? 0) + 1);
  for (const w of b) counts.set(w, (counts.get(w) ?? 0) - 1);
  const changedWords = [...counts.entries()].filter(([, n]) => n !== 0).map(([w]) => w);
  return { ok: changedWords.length === 0, changedWords };
};

/** Expected spoken duration heuristic (used before alignment exists). */
export const expectedDurationSec = (text: string, wpm = VOICE_QC_THRESHOLDS.wpm): number => {
  const words = text.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(0.8, (words / wpm) * 60);
};

/** Assemble the QC verdict from measured metrics (deterministic — the VLM
 *  cannot hear; these numbers ARE the audio oracle). */
export const buildVoiceQc = (metrics: {
  durationSec: number;
  expectedSec: number;
  peakDb: number;
  meanDb: number;
  lufs: number | null;
  tailSilenceSec: number;
  wer: number | null;
}): VoiceQc => {
  const durDelta = Math.abs(metrics.durationSec - metrics.expectedSec) / Math.max(0.5, metrics.expectedSec);
  // WER is the truncation/garbling oracle: a WPM-heuristic duration mismatch
  // with a WER-verified full reading is a DELIVERY STYLE, not a failure.
  const werVerified = metrics.wer !== null && metrics.wer <= VOICE_QC_THRESHOLDS.maxWer;
  const durationPass = werVerified || durDelta <= VOICE_QC_THRESHOLDS.durationTolerance;
  const checks: VoiceQcCheck[] = [
    { id: "clip", label: "Clipping", pass: metrics.peakDb < VOICE_QC_THRESHOLDS.maxPeakDb, value: `${metrics.peakDb.toFixed(1)} dBFS peak`, threshold: `< ${VOICE_QC_THRESHOLDS.maxPeakDb} dBFS` },
    { id: "duration", label: "Duration", pass: durationPass, value: `${metrics.durationSec.toFixed(2)}s vs ${metrics.expectedSec.toFixed(2)}s (${Math.round(durDelta * 100)}%)`, threshold: `±${VOICE_QC_THRESHOLDS.durationTolerance * 100}% or WER-verified` },
    { id: "tail-silence", label: "Tail silence", pass: metrics.tailSilenceSec <= VOICE_QC_THRESHOLDS.maxTailSilenceSec, value: `${metrics.tailSilenceSec.toFixed(2)}s`, threshold: `≤ ${VOICE_QC_THRESHOLDS.maxTailSilenceSec}s` },
  ];
  if (metrics.wer !== null) {
    checks.push({ id: "wer", label: "WER vs script", pass: metrics.wer <= VOICE_QC_THRESHOLDS.maxWer, value: `${(metrics.wer * 100).toFixed(1)}%`, threshold: `≤ ${VOICE_QC_THRESHOLDS.maxWer * 100}%` });
  }
  return {
    pass: checks.every((c) => c.pass),
    checkedAt: new Date().toISOString(),
    durationSec: metrics.durationSec,
    expectedSec: metrics.expectedSec,
    peakDb: metrics.peakDb,
    meanDb: metrics.meanDb,
    lufs: metrics.lufs,
    tailSilenceSec: metrics.tailSilenceSec,
    wer: metrics.wer,
    checks,
  };
};

import { describe, expect, it } from "vitest";
import { buildProviderText, expectedDurationSec, validateProviderTextEdit, buildVoiceQc, VOICE_SETTINGS_DEFAULTS } from "../../../shared/isaacverse/voiceClip";
import { applyVoiceTake, setEditorClipMetadata } from "./editorOperations";
import { projectEditDocToEditor } from "../../../shared/isaacverse/editorProjection";
import type { EditorClip, EditorDoc } from "../../../shared/isaacverse/editor";

const makeEditorDoc = (clip: EditorClip): EditorDoc => ({
  id: "test-doc",
  fps: 30,
  width: 1920,
  height: 1080,
  durationSec: 10,
  schemaVersion: 3,
  revision: { revision: 1, updatedAt: "2026-01-01T00:00:00.000Z", baseEditVersion: "v1" },
  tracks: [
    { id: "voice", kind: "voice", name: "Voice", clips: [clip], accepts: ["audio"], source: { kind: "project", projectRef: "audio-plan.voice" }, capabilities: { visual: false, audio: true, canvas: false, trim: true, split: true, gain: true, fade: true, mute: true, solo: true }, order: 0 },
  ],
} as unknown as EditorDoc);

const voiceClip = (extra: Record<string, unknown> = {}): EditorClip => ({
  id: "clip:voice:seg-1",
  kind: "voice",
  trackId: "voice",
  range: { startSec: 3.5, endSec: 7 },
  label: "Voiceover",
  source: {},
  metadata: { src: "proj/voice.mp3", transcript: "A cut is a decision", sentenceText: "A cut is a decision", providerText: "A cut is a DECISION", segmentId: "seg-1", ...extra },
} as unknown as EditorClip);

describe("buildProviderText (stage B text prep)", () => {
  it("converts ellipsis to a capped number of break tags", () => {
    const out = buildProviderText("wait... really... maybe... yes");
    expect(out.match(/<break time="0.4s"\/>/g)?.length).toBe(2);
    expect(out).toContain("maybe… yes");
  });
  it("never changes words — only punctuation-level transforms", () => {
    const text = "The timeline is NOT the edit.";
    expect(buildProviderText(text).replace(/<[^>]+>/g, " ")).toMatch(/timeline is NOT the edit/);
  });
  it("collapses whitespace and trims", () => {
    expect(buildProviderText("  hello   world  ")).toBe("hello world");
  });
});

describe("validateProviderTextEdit (soft word guard)", () => {
  it("allows tag/punctuation changes", () => {
    const result = validateProviderTextEdit("make it punchy", "MAKE it <break time=\"0.4s\"/> punchy!");
    expect(result.ok).toBe(true);
  });
  it("flags rewording", () => {
    const result = validateProviderTextEdit("make it punchy", "make it snappy");
    expect(result.ok).toBe(false);
    expect(result.changedWords).toContain("snappy");
  });
});

describe("expectedDurationSec + buildVoiceQc (deterministic oracle)", () => {
  it("estimates from word count at 150 wpm", () => {
    expect(expectedDurationSec("one two three four five")).toBeCloseTo(2.0, 5);
  });
  it("passes a clean take and fails a clipped one", () => {
    const clean = buildVoiceQc({ durationSec: 2.9, expectedSec: 3.0, peakDb: -3.2, meanDb: -22, lufs: -18, tailSilenceSec: 0.2, wer: 0.01 });
    expect(clean.pass).toBe(true);
    const clipped = buildVoiceQc({ durationSec: 2.9, expectedSec: 3.0, peakDb: -0.2, meanDb: -22, lufs: -18, tailSilenceSec: 0.2, wer: 0.01 });
    expect(clipped.pass).toBe(false);
    expect(clipped.checks.find((c) => c.id === "clip")?.pass).toBe(false);
  });
});

describe("applyVoiceTake (stage F-H apply, parity ledger)", () => {
  const regenResult = {
    src: "proj/voice/stems/seg-1.wav",
    qc: { pass: true, durationSec: 3.1, checks: [] },
    takeId: "seg-1-take-02",
    takes: [{ id: "seg-1-take-02" }],
    stemDurationSec: 3.1,
    breathPadSec: 0.3,
  };

  it("writes machine fields, stretches the range, bumps the revision", () => {
    const doc = makeEditorDoc(voiceClip());
    const next = applyVoiceTake(doc, "clip:voice:seg-1", regenResult);
    const clip = next.tracks[0].clips[0];
    expect(clip.metadata.src).toBe(regenResult.src);
    expect(clip.metadata.takeId).toBe("seg-1-take-02");
    expect(clip.metadata.qc).toMatchObject({ pass: true });
    expect(clip.range.endSec).toBeCloseTo(3.5 + 3.1 + 0.3, 5);
    expect(next.revision.revision).toBe(2);
    // machine write must NOT masquerade as a human edit
    expect(clip.metadata.userEdited).toBeUndefined();
    // machine fields are override-marked so a later sync regenerates around them
    expect((clip.metadata.overridden as Record<string, boolean>).src).toBe(true);
    expect((clip.metadata.overridden as Record<string, boolean>).qc).toBe(true);
  });

  it("preserves a user-edited providerText (agent regen must not clobber it)", () => {
    const edited = setEditorClipMetadata(makeEditorDoc(voiceClip()), "clip:voice:seg-1", { providerText: "A CUT is a <break time=\"0.4s\"/> decision" });
    const next = applyVoiceTake(edited, "clip:voice:seg-1", { ...regenResult, providerText: "machine direction" });
    const clip = next.tracks[0].clips[0];
    expect(clip.metadata.providerText).toContain("A CUT");
  });

  it("refuses non-voice clips", () => {
    const doc = makeEditorDoc({ ...voiceClip(), kind: "element" });
    expect(() => applyVoiceTake(doc, "clip:voice:seg-1", regenResult)).toThrow(/not a voice clip/);
  });
});

describe("voice clip projection (direction fields from generation)", () => {
  it("projects providerText + sentenceText from audioPlan.voice", () => {
    const doc = {
      id: "p", videoId: "p", version: "v1", width: 1920, height: 1080, fps: 30,
      beats: [{ id: "beat-1", sceneId: "s", shotIds: [], journeySlot: "call", startSec: 0, durationSec: 3, transcript: "make it punchy", narrativeFunction: "f", treatment: { id: "chapter-card", params: { title: "T" }, assets: [] }, elements: [], motionPhases: [], audioCues: [] }],
      audioPlan: {
        voice: [{ id: "seg-1", src: "p/voice.mp3", startSec: 0, endSec: 3, transcript: "make it punchy... now" }],
        music: [], ambience: [], beats: [], master: {},
      },
    };
    const editor = projectEditDocToEditor(doc as never);
    const voiceClip = editor.tracks.flatMap((t) => t.clips).find((c) => c.kind === "voice");
    expect(voiceClip).toBeDefined();
    expect(voiceClip?.metadata.sentenceText).toBe("make it punchy... now");
    expect(voiceClip?.metadata.providerText).toContain('<break time="0.4s"/>');
    expect(voiceClip?.source.beatId).toBe("beat-1");
  });
  it("defaults voice settings exist for the UI", () => {
    expect(VOICE_SETTINGS_DEFAULTS.modelId).toBe("eleven_multilingual_v2");
    expect(VOICE_SETTINGS_DEFAULTS.stability).toBe(0.35);
  });
});

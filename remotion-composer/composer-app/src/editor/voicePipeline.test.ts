import { describe, expect, it } from "vitest";
import { buildProviderText, expectedDurationSec, validateProviderTextEdit, buildVoiceQc, VOICE_SETTINGS_DEFAULTS } from "../../../shared/isaacverse/voiceClip";
import { applyVoiceTake, retimeVoiceClip, setEditorClipMetadata } from "./editorOperations";
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

describe("buildProviderText (stage B text prep, v3-safe)", () => {
  it("collapses whitespace and trims — nothing else changes", () => {
    expect(buildProviderText("  hello   world  ")).toBe("hello world");
  });
  it("keeps ellipsis verbatim (v3 pauses come from punctuation, not break tags)", () => {
    expect(buildProviderText("wait... really... maybe... yes")).toBe("wait... really... maybe... yes");
  });
  it("passes CAPS and audio tags through untouched (user direction is verbatim)", () => {
    const text = "make it PUNCHY [pause] [excited] now";
    expect(buildProviderText(text)).toBe(text);
  });
  it("never changes words — verbatim passthrough", () => {
    const text = "The timeline is NOT the edit.";
    expect(buildProviderText(text)).toBe(text);
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

describe("voice-first ripple (M1b stage H — narration overflows the beat)", () => {
  /** Two beats on the main track, one voice clip + one overlay per beat, and
   *  a second voice clip for beat-2 — the minimum topology the ripple must
   *  keep consistent. */
  const makeTwoBeatDoc = (): EditorDoc => {
    const beat1: EditorClip = { id: "beat-1", kind: "beat", trackId: "video-main", range: { startSec: 0, endSec: 4 }, label: "Beat 1", source: { beatId: "b1" }, linkedClipIds: [], locked: false, muted: false, hidden: false, metadata: {} };
    const beat2: EditorClip = { id: "beat-2", kind: "beat", trackId: "video-main", range: { startSec: 4, endSec: 8 }, label: "Beat 2", source: { beatId: "b2" }, linkedClipIds: [], locked: false, muted: false, hidden: false, metadata: {} };
    const overlay1: EditorClip = { id: "ov-1", kind: "element", trackId: "visual-1", range: { startSec: 1, endSec: 4 }, label: "Ov 1", source: { beatId: "b1" }, linkedClipIds: [], locked: false, muted: false, hidden: false, metadata: {} };
    const overlay2: EditorClip = { id: "ov-2", kind: "element", trackId: "visual-1", range: { startSec: 4, endSec: 8 }, label: "Ov 2", source: { beatId: "b2" }, linkedClipIds: [], locked: false, muted: false, hidden: false, metadata: {} };
    const voice1: EditorClip = { ...voiceClip(), id: "clip:voice:v1", trackId: "voice", range: { startSec: 0, endSec: 3.7 }, source: { beatId: "b1" } };
    const voice2: EditorClip = { ...voiceClip({ qc: { pass: true, durationSec: 3.5 } }), id: "clip:voice:v2", range: { startSec: 4, endSec: 7.5 }, source: { beatId: "b2" }, metadata: { transcript: "second", sentenceText: "second", providerText: "second", qc: { pass: true, durationSec: 3.5 } } };
    return {
      ...makeEditorDoc(voice1),
      durationSec: 8,
      tracks: [
        { id: "video-main", kind: "video", name: "Main", clips: [beat1, beat2], accepts: ["video"], source: { kind: "project" }, capabilities: { visual: true, audio: false, canvas: true, trim: true, split: true, gain: false, fade: false, mute: false, solo: false }, order: 0 },
        { id: "visual-1", kind: "overlay", name: "Overlay 1", clips: [overlay1, overlay2], accepts: ["image"], source: { kind: "project" }, capabilities: { visual: true, audio: false, canvas: true, trim: true, split: true, gain: false, fade: false, mute: false, solo: false }, order: 1 },
        { id: "voice", kind: "voice", name: "Voice", clips: [voice1, voice2], accepts: ["audio"], source: { kind: "project", projectRef: "audio-plan.voice" }, capabilities: { visual: false, audio: true, canvas: false, trim: true, split: true, gain: true, fade: true, mute: true, solo: true }, order: 2 },
      ],
    } as unknown as EditorDoc;
  };
  const clipOf = (doc: EditorDoc, id: string) => doc.tracks.flatMap((t) => t.clips).find((c) => c.id === id)!;

  it("applyVoiceTake ripples downstream beats when the new stem overflows", () => {
    const doc = makeTwoBeatDoc();
    // stem 4.6s + 0.3 pad from t=0 → voice end 4.9 > beat-1 end 4 → delta 0.9
    const next = applyVoiceTake(doc, "clip:voice:v1", {
      src: "p/stems/v1.wav", qc: { pass: true, checks: [] }, takeId: "v1-take-01",
      stemDurationSec: 4.6, breathPadSec: 0.3,
    });
    expect(clipOf(next, "clip:voice:v1").range.endSec).toBeCloseTo(4.9, 5);
    // beat-1 grew to cover the narration
    expect(clipOf(next, "beat-1").range.endSec).toBeCloseTo(4.9, 5);
    // beat-1's end-aligned overlay grew WITH its beat
    expect(clipOf(next, "ov-1").range.endSec).toBeCloseTo(4.9, 5);
    // downstream beat-2 + its overlay + voice-2 shifted forward by 0.9
    expect(clipOf(next, "beat-2").range.startSec).toBeCloseTo(4.9, 5);
    expect(clipOf(next, "ov-2").range.startSec).toBeCloseTo(4.9, 5);
    expect(clipOf(next, "clip:voice:v2").range.startSec).toBeCloseTo(4.9, 5);
    expect(next.durationSec).toBeCloseTo(8.9, 5);
  });

  it("applyVoiceTake never shrinks — shorter stems keep the slot", () => {
    const doc = makeTwoBeatDoc();
    const next = applyVoiceTake(doc, "clip:voice:v1", {
      src: "p/stems/v1.wav", qc: { pass: true, checks: [] }, takeId: "v1-take-01",
      stemDurationSec: 1.0, breathPadSec: 0.3,
    });
    // the voice clip itself shrinks to the stem (it IS the audio) ...
    expect(clipOf(next, "clip:voice:v1").range.endSec).toBeCloseTo(1.3, 5);
    // ... but the beat + downstream stay put — trimming is a human decision
    expect(clipOf(next, "beat-1").range.endSec).toBe(4);
    expect(clipOf(next, "beat-2").range.startSec).toBe(4);
    expect(next.durationSec).toBe(8);
  });

  it("retimeVoiceClip: pad change retimes the clip and ripples (user edit, ledger-marked)", () => {
    const doc = makeTwoBeatDoc();
    // voice1 has no qc.durationSec → estimate = range (3.7) - old pad (0.3) = 3.4 stem
    // pad 0.9 → end 4.3 > beat end 4 → ripple 0.3
    const next = retimeVoiceClip(doc, "clip:voice:v1", 0.9);
    expect(clipOf(next, "clip:voice:v1").range.endSec).toBeCloseTo(4.3, 5);
    expect(clipOf(next, "clip:voice:v1").metadata.breathPadSec).toBe(0.9);
    expect(clipOf(next, "beat-2").range.startSec).toBeCloseTo(4.3, 5);
    // user edit — per-field ledger, not the machine anonymous write
    const md = clipOf(next, "clip:voice:v1").metadata as { userEdited?: boolean; overridden?: Record<string, boolean> };
    expect(md.userEdited).toBe(true);
    expect(md.overridden?.breathPadSec).toBe(true);
    expect(md.overridden?.range).toBe(true);
    // downstream clips are machine-shifted — NOT user-marked
    expect((clipOf(next, "beat-2").metadata as { userEdited?: boolean }).userEdited).toBeUndefined();
  });

  it("retimeVoiceClip: shrinking the pad only shrinks the voice clip", () => {
    const doc = makeTwoBeatDoc();
    const next = retimeVoiceClip(doc, "clip:voice:v2", 0.1);
    // stem 3.5 + 0.1 = 3.6 < slot 3.5... beat-2 covers 4→8, voice end 7.6 stays inside
    expect(clipOf(next, "clip:voice:v2").range.endSec).toBeCloseTo(7.6, 5);
    expect(clipOf(next, "beat-2").range.endSec).toBe(8);
    expect(next.durationSec).toBe(8);
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
    expect(voiceClip?.metadata.providerText).toBe("make it punchy... now");
    expect(voiceClip?.source.beatId).toBe("beat-1");
  });
  it("defaults voice settings exist for the UI (eleven_v3 is the standard)", () => {
    expect(VOICE_SETTINGS_DEFAULTS.modelId).toBe("eleven_v3");
    expect(VOICE_SETTINGS_DEFAULTS.stability).toBe(0.35);
  });
});

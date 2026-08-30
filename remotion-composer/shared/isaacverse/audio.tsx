import React from "react";
import { Audio } from "@remotion/media";
import { Sequence, interpolate, useVideoConfig } from "remotion";
import type { EditorDoc } from "./editor";

export type AudioDensity = "sparse" | "normal" | "dense";
export type AudioReason = "hook" | "pause" | "transition" | "build" | "reveal" | "emphasis" | "ui" | "comedy" | "world";

export type VoiceSegment = {
  id: string;
  src: string;
  startSec: number;
  endSec: number;
  transcript: string;
  /** Voice direction override (from beat.direction) — the exact string sent to
   *  the TTS provider. Absent = derive from transcript via buildProviderText. */
  providerText?: string;
  /** True when a partial regen (--only) kept this segment's previous stem. */
  kept?: boolean;
  pauseBeforeSec?: number;
  emphasisWords?: string[];
  /** Provenance from the voice pipeline (scaffold-voice-plan --regen): the
   *  deterministic QC verdict + the selected take flow through the projection
   *  onto the voice clips — the QC badge + project page read them. */
  qc?: Record<string, unknown>;
  takeId?: string;
  takes?: unknown[];
};

export type MusicBed = {
  id: string;
  src: string;
  startSec: number;
  endSec: number;
  gainDb: number;
  bpm?: number;
  beatGrid?: number[];
  density: AudioDensity;
};

export type SfxCue = {
  id: string;
  src: string;
  atSec: number;
  durationSec?: number;
  gainDb: number;
  reason: AudioReason;
  anchor?: string;
  fadeInSec?: number;
  fadeOutSec?: number;
};

export type DuckZone = {
  startSec: number;
  endSec: number;
  bus: "music" | "ambience";
  gainDb: number;
  attackSec: number;
  releaseSec: number;
};

export type BeatAudioPlan = {
  beatId: string;
  density: AudioDensity;
  voice?: VoiceSegment;
  sfx: SfxCue[];
  duckZones: DuckZone[];
  preservePauses: boolean;
};

export type AudioPlan = {
  voice: VoiceSegment[];
  music: MusicBed[];
  ambience: MusicBed[];
  beats: BeatAudioPlan[];
  master: { targetLufs?: number; maxTruePeakDbfs?: number; limiter: boolean };
};

const dbToLinear = (db: number) => Math.pow(10, db / 20);

const duckAt = (timeSec: number, zones: DuckZone[]) => {
  let gainDb = 0;
  for (const zone of zones) {
    if (timeSec < zone.startSec - zone.attackSec || timeSec > zone.endSec + zone.releaseSec) continue;
    if (timeSec < zone.startSec) {
      const p = interpolate(timeSec, [zone.startSec - zone.attackSec, zone.startSec], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      gainDb = Math.min(gainDb, zone.gainDb * p);
    } else if (timeSec <= zone.endSec) {
      gainDb = Math.min(gainDb, zone.gainDb);
    } else {
      const p = interpolate(timeSec, [zone.endSec, zone.endSec + zone.releaseSec], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      gainDb = Math.min(gainDb, zone.gainDb * p);
    }
  }
  return gainDb;
};

const audioFade = (frame: number, duration: number, fadeInSec: number, fadeOutSec: number, fps: number) => {
  const fadeIn = Math.round(fadeInSec * fps);
  const fadeOut = Math.round(fadeOutSec * fps);
  const inGain = fadeIn ? interpolate(frame, [0, fadeIn], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
  const outGain = fadeOut ? interpolate(frame, [Math.max(0, duration - fadeOut), duration], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
  return Math.min(inGain, outGain);
};

const VoiceTrack: React.FC<{ segment: VoiceSegment; fps: number; gainDb?: number; fadeInSec?: number; fadeOutSec?: number; muted?: boolean; speed?: number }> = ({ segment, fps, gainDb = 0, fadeInSec = 0, fadeOutSec = 0, muted = false, speed = 1 }) => {
  const duration = Math.max(1, Math.round((segment.endSec - segment.startSec) * fps));
  return (
  <Sequence from={Math.round(segment.startSec * fps)} durationInFrames={Math.max(1, Math.round((segment.endSec - segment.startSec) * fps))}>
    <Audio
      src={segment.src}
      trimBefore={Math.round((segment.pauseBeforeSec ?? 0) * fps)}
      playbackRate={speed}
      volume={(frame) => muted ? 0 : dbToLinear(gainDb) * audioFade(frame, duration, fadeInSec, fadeOutSec, fps)}
    />
  </Sequence>
  );
};

const MusicTrack: React.FC<{ bed: MusicBed; zones: DuckZone[]; fps: number; fadeInSec?: number; fadeOutSec?: number; muted?: boolean; speed?: number }> = ({ bed, zones, fps, fadeInSec = 0, fadeOutSec = 0, muted = false, speed = 1 }) => {
  const duration = Math.max(1, Math.round((bed.endSec - bed.startSec) * fps));
  return (
    <Sequence from={Math.round(bed.startSec * fps)} durationInFrames={duration}>
      <Audio src={bed.src} playbackRate={speed} volume={(frame) => muted ? 0 : dbToLinear(bed.gainDb + duckAt(bed.startSec + frame / fps, zones)) * audioFade(frame, duration, fadeInSec, fadeOutSec, fps)} />
    </Sequence>
  );
};

const SfxTrack: React.FC<{ cue: SfxCue; fps: number; muted?: boolean; speed?: number }> = ({ cue, fps, muted = false, speed = 1 }) => {
  const duration = Math.max(1, Math.round((cue.durationSec ?? 0.8) * fps));
  const fadeIn = Math.round((cue.fadeInSec ?? 0.02) * fps);
  const fadeOut = Math.round((cue.fadeOutSec ?? 0.08) * fps);
  return (
    <Sequence from={Math.round(cue.atSec * fps)} durationInFrames={duration}>
      <Audio src={cue.src} playbackRate={speed} volume={(frame) => {
        const inGain = fadeIn ? interpolate(frame, [0, fadeIn], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
        const outGain = fadeOut ? interpolate(frame, [Math.max(0, duration - fadeOut), duration], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
        return muted ? 0 : dbToLinear(cue.gainDb) * Math.min(inGain, outGain);
      }} />
    </Sequence>
  );
};

/** Deterministic multi-bus mixer. Audio generation/resolution happens before this render. */
export const AudioMixer: React.FC<{ plan: AudioPlan; editor?: EditorDoc }> = ({ plan, editor }) => {
  const { fps } = useVideoConfig();
  const zones = plan.beats.flatMap((beat) => beat.duckZones);
  const editorTracks = editor?.tracks ?? [];
  const editorVoice = editorTracks.find((track) => track.id === "voice");
  const editorMusic = editorTracks.find((track) => track.id === "music");
  const editorSfx = editorTracks.find((track) => track.id === "sfx");
  const hasSolo = editorTracks.some((track) => track.solo);
  const isMutedBySolo = (trackId: string) => hasSolo && !editorTracks.find((track) => track.id === trackId)?.solo;
  const voiceClips = editorVoice?.clips.filter((clip) => clip.kind === "voice") ?? [];
  const musicClips = editorMusic?.clips.filter((clip) => clip.kind === "music") ?? [];
  const sfxClips = editorSfx?.clips.filter((clip) => clip.kind === "audio-event") ?? [];
  return (
    <>
      {plan.music.flatMap((bed) => {
        const clips = musicClips.filter((clip) => clip.metadata.trackId === bed.id);
        if (!clips.length) return [<MusicTrack key={bed.id} bed={bed} zones={zones} fps={fps} muted={Boolean(editorMusic?.muted || isMutedBySolo("music"))} />];
        return clips.map((clip) => <MusicTrack key={clip.id} bed={{ ...bed, startSec: clip.range.startSec, endSec: clip.range.endSec, gainDb: typeof clip.metadata.gainDb === "number" ? clip.metadata.gainDb : bed.gainDb }} zones={zones} fps={fps} fadeInSec={typeof clip.metadata.fadeInSec === "number" ? clip.metadata.fadeInSec : 0} fadeOutSec={typeof clip.metadata.fadeOutSec === "number" ? clip.metadata.fadeOutSec : 0} speed={typeof clip.metadata.speed === "number" ? clip.metadata.speed : 1} muted={Boolean(editorMusic?.muted || isMutedBySolo("music") || clip.muted)} />);
      })}
      {plan.ambience.map((bed) => <MusicTrack key={bed.id} bed={bed} zones={[]} fps={fps} />)}
      {plan.voice.flatMap((segment) => {
        const clips = voiceClips.filter((clip) => clip.metadata.segmentId === segment.id);
        if (!clips.length) return [<VoiceTrack key={segment.id} segment={segment} fps={fps} muted={Boolean(editorVoice?.muted || isMutedBySolo("voice"))} />];
        // Voice pipeline parity (SPEC v3): a regenerated clip points at its own
        // stem via metadata.src — the timeline clip is the truth for its audio;
        // the plan segment src stays as the planned/original source.
        return clips.map((clip) => <VoiceTrack key={clip.id} segment={{ ...segment, src: typeof clip.metadata.src === "string" && clip.metadata.src ? clip.metadata.src : segment.src, startSec: clip.range.startSec, endSec: clip.range.endSec }} fps={fps} gainDb={typeof clip.metadata.gainDb === "number" ? clip.metadata.gainDb : 0} fadeInSec={typeof clip.metadata.fadeInSec === "number" ? clip.metadata.fadeInSec : 0} fadeOutSec={typeof clip.metadata.fadeOutSec === "number" ? clip.metadata.fadeOutSec : 0} speed={typeof clip.metadata.speed === "number" ? clip.metadata.speed : 1} muted={Boolean(editorVoice?.muted || isMutedBySolo("voice") || clip.muted)} />);
      })}
      {plan.beats.flatMap((beat) => beat.sfx.flatMap((cue) => {
        const clips = sfxClips.filter((clip) => clip.source.audioCueId === cue.id);
        if (!clips.length) return [<SfxTrack key={`${beat.beatId}-${cue.id}-${cue.atSec}`} cue={cue} fps={fps} muted={Boolean(editorSfx?.muted || isMutedBySolo("sfx"))} />];
        return clips.map((clip) => <SfxTrack key={clip.id} cue={{ ...cue, atSec: clip.range.startSec, durationSec: clip.range.endSec - clip.range.startSec, gainDb: typeof clip.metadata.gainDb === "number" ? clip.metadata.gainDb : cue.gainDb, fadeInSec: typeof clip.metadata.fadeInSec === "number" ? clip.metadata.fadeInSec : cue.fadeInSec, fadeOutSec: typeof clip.metadata.fadeOutSec === "number" ? clip.metadata.fadeOutSec : cue.fadeOutSec }} fps={fps} speed={typeof clip.metadata.speed === "number" ? clip.metadata.speed : 1} muted={Boolean(editorSfx?.muted || isMutedBySolo("sfx") || clip.muted)} />);
      }))}
    </>
  );
};

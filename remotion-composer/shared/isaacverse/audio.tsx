import React from "react";
import { Audio } from "@remotion/media";
import { Sequence, interpolate, useVideoConfig } from "remotion";

export type AudioDensity = "sparse" | "normal" | "dense";
export type AudioReason = "hook" | "pause" | "transition" | "build" | "reveal" | "emphasis" | "ui" | "comedy" | "world";

export type VoiceSegment = {
  id: string;
  src: string;
  startSec: number;
  endSec: number;
  transcript: string;
  pauseBeforeSec?: number;
  emphasisWords?: string[];
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

const VoiceTrack: React.FC<{ segment: VoiceSegment; fps: number }> = ({ segment, fps }) => (
  <Sequence from={Math.round(segment.startSec * fps)} durationInFrames={Math.max(1, Math.round((segment.endSec - segment.startSec) * fps))}>
    <Audio
      src={segment.src}
      trimBefore={Math.round((segment.pauseBeforeSec ?? 0) * fps)}
      volume={1}
    />
  </Sequence>
);

const MusicTrack: React.FC<{ bed: MusicBed; zones: DuckZone[]; fps: number }> = ({ bed, zones, fps }) => {
  const duration = Math.max(1, Math.round((bed.endSec - bed.startSec) * fps));
  return (
    <Sequence from={Math.round(bed.startSec * fps)} durationInFrames={duration}>
      <Audio src={bed.src} volume={(frame) => dbToLinear(bed.gainDb + duckAt(bed.startSec + frame / fps, zones))} />
    </Sequence>
  );
};

const SfxTrack: React.FC<{ cue: SfxCue; fps: number }> = ({ cue, fps }) => {
  const duration = Math.max(1, Math.round((cue.durationSec ?? 0.8) * fps));
  const fadeIn = Math.round((cue.fadeInSec ?? 0.02) * fps);
  const fadeOut = Math.round((cue.fadeOutSec ?? 0.08) * fps);
  return (
    <Sequence from={Math.round(cue.atSec * fps)} durationInFrames={duration}>
      <Audio src={cue.src} volume={(frame) => {
        const inGain = fadeIn ? interpolate(frame, [0, fadeIn], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
        const outGain = fadeOut ? interpolate(frame, [Math.max(0, duration - fadeOut), duration], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
        return dbToLinear(cue.gainDb) * Math.min(inGain, outGain);
      }} />
    </Sequence>
  );
};

/** Deterministic multi-bus mixer. Audio generation/resolution happens before this render. */
export const AudioMixer: React.FC<{ plan: AudioPlan }> = ({ plan }) => {
  const { fps } = useVideoConfig();
  const zones = plan.beats.flatMap((beat) => beat.duckZones);
  return (
    <>
      {plan.music.map((bed) => <MusicTrack key={bed.id} bed={bed} zones={zones} fps={fps} />)}
      {plan.ambience.map((bed) => <MusicTrack key={bed.id} bed={bed} zones={[]} fps={fps} />)}
      {plan.voice.map((segment) => <VoiceTrack key={segment.id} segment={segment} fps={fps} />)}
      {plan.beats.flatMap((beat) => beat.sfx.map((cue) => <SfxTrack key={`${beat.beatId}-${cue.id}-${cue.atSec}`} cue={cue} fps={fps} />))}
    </>
  );
};

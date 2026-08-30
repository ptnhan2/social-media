import type { IsaacVerseEditDoc, SemanticBeat } from "./types";
import type { ClipRange, EditorAcceptedAssetKind, EditorClip, EditorDoc, EditorMarker, EditorProjectionOptions, EditorTrack, EditorTrackKind } from "./editor";
import { generateTreatmentElements, setStrictProjection, consumeProjectionWarnings, type StyleResolver, type TreatmentElement } from "./treatmentElements";
import { buildProviderText } from "./voiceClip";

// strict-projection warning trail (PIPELINE-HARDENING-SPEC §3.1) — re-exported
// so the generate-editor CLI can enable/collect via the projection bundle.
export { setStrictProjection, consumeProjectionWarnings };

const visualCapabilities = { visual: true, audio: false, canvas: true, trim: true, split: true, gain: false, fade: false, mute: false, solo: false };
const audioCapabilities = { visual: false, audio: true, canvas: false, trim: true, split: true, gain: true, fade: true, mute: true, solo: true };

/** Dot-path resolver over a plain style-store object (node-safe, no fetch). */
const resolveFromStyle = (style: Record<string, unknown>): StyleResolver => <T,>(path: string, fallback: T): T => {
  let obj: unknown = style;
  for (const part of path.split(".")) {
    if (obj && typeof obj === "object" && part in (obj as Record<string, unknown>)) {
      obj = (obj as Record<string, unknown>)[part];
    } else {
      return fallback;
    }
  }
  return (obj as T) ?? fallback;
};

const FIXED_TRACKS: { id: string; kind: EditorTrackKind; name: string; source: EditorTrack["source"]; accepts: EditorAcceptedAssetKind[]; capabilities: EditorTrack["capabilities"] }[] = [
  { id: "video-main", kind: "video", name: "Main track", source: { kind: "project", projectRef: "semantic-beats" }, accepts: ["image", "video"], capabilities: visualCapabilities },
  { id: "voice", kind: "voice", name: "Audio 1", source: { kind: "project", projectRef: "audio-plan.voice" }, accepts: ["audio"], capabilities: audioCapabilities },
  { id: "music", kind: "music", name: "Audio 2", source: { kind: "project", projectRef: "audio-plan.music" }, accepts: ["audio"], capabilities: audioCapabilities },
  { id: "sfx", kind: "sfx", name: "Audio 3", source: { kind: "project", projectRef: "audio-plan.sfx" }, accepts: ["audio"], capabilities: audioCapabilities },
];

const beatEnd = (beat: SemanticBeat) => beat.startSec + beat.durationSec;

const clip = (input: Omit<EditorClip, "linkedClipIds" | "locked" | "muted" | "hidden" | "metadata"> & Partial<Pick<EditorClip, "locked" | "muted" | "hidden" | "metadata">>): EditorClip => ({
  ...input,
  linkedClipIds: [],
  locked: input.locked ?? false,
  muted: input.muted ?? false,
  hidden: input.hidden ?? false,
  metadata: input.metadata ?? {},
});

const addClip = (tracks: Map<string, EditorTrack>, trackId: string, value: EditorClip) => {
  tracks.get(trackId)?.clips.push(value);
};

const elementRange = (beat: SemanticBeat, el: TreatmentElement): ClipRange => ({
  startSec: beat.startSec + (el.startSec ?? 0),
  endSec: beat.startSec + (el.endSec ?? beat.durationSec),
});

const elementClipFromTreatment = (el: TreatmentElement, beat: SemanticBeat, beatClipId: string, styleResolvedAt?: EditorProjectionOptions["styleResolvedAt"]): EditorClip => {
  const isText = el.type === "text";
  const range = elementRange(beat, el);
  return clip({
    id: el.id,
    kind: "element",
    trackId: "",
    range,
    label: el.text?.slice(0, 30) || el.role || el.id.split(":").pop() || el.id,
    source: { beatId: beat.id, elementId: el.id },
    parentClipId: beatClipId,
    color: isText ? "amber" : "coral",
    metadata: {
      ...el,
      // provenance (spec §2.2): which knobs fed this clip, at which store version.
      // styleSource flows in via ...el (null/absent = fixed by treatment code).
      styleResolvedAt: styleResolvedAt ?? null,
      x: el.x, y: el.y, w: el.w, h: el.h,
      rotation: el.rotation || 0,
      opacity: el.opacity ?? 1,
      z: el.z ?? 10,
      isTextClip: isText,
      elementType: el.elementType ?? el.type,
      text: el.text,
      color: el.color,
      fontSize: el.fontSize,
      fontWeight: el.fontWeight,
      fontFamily: el.fontFamily,
      textAlign: el.textAlign,
      textTransform: el.textTransform,
      letterSpacing: el.letterSpacing,
      lineHeight: el.lineHeight,
      fontStyle: el.fontStyle,
      textShadow: el.textShadow,
      src: el.src,
      fit: el.fit,
      filter: el.filter,
      background: el.background,
      borderRadius: el.borderRadius,
      borderWidth: el.borderWidth,
      borderColor: el.borderColor,
      boxShadow: el.boxShadow,
      animIn: el.animIn,
      animOut: el.animOut,
      animDurationSec: el.animDurationSec,
      startSec: el.startSec,
      endSec: el.endSec,
    },
  });
};

const packIntoTracks = (clips: EditorClip[]): EditorClip[][] => {
  const sorted = [...clips].sort((a, b) => {
    if (a.range.startSec !== b.range.startSec) return a.range.startSec - b.range.startSec;
    return (typeof a.metadata.z === "number" ? a.metadata.z : 10) - (typeof b.metadata.z === "number" ? b.metadata.z : 10);
  });
  const lanes: { endSec: number; clips: EditorClip[] }[] = [];
  for (const clipItem of sorted) {
    let assigned = false;
    for (const lane of lanes) {
      if (lane.endSec <= clipItem.range.startSec) {
        lane.clips.push(clipItem);
        lane.endSec = clipItem.range.endSec;
        assigned = true;
        break;
      }
    }
    if (!assigned) lanes.push({ endSec: clipItem.range.endSec, clips: [clipItem] });
  }
  return lanes.map((lane) => lane.clips);
};

const addAudioPlanClips = (doc: IsaacVerseEditDoc, tracks: Map<string, EditorTrack>) => {
  const duckZones = doc.audioPlan?.beats.flatMap((beat) => beat.duckZones) ?? [];
  for (const segment of doc.audioPlan?.voice ?? []) {
    // Voice pipeline parity (PIPELINE-PRODUCTION-SPEC v3): the clip carries
    // the DIRECTION fields the Audio tab edits — sentenceText (working copy
    // of the transcript) and providerText (the exact string sent to the TTS
    // provider). Sync merge keeps user-edited providerText via the per-field
    // override ledger; unmodified clips refresh from here.
    const segmentBeat = doc.beats.find((beat) => beat.startSec === segment.startSec || (segment.startSec >= beat.startSec && segment.startSec < beat.startSec + beat.durationSec));
    addClip(tracks, "voice", clip({ id: `clip:voice:${segment.id}`, kind: "voice", trackId: "voice", range: { startSec: segment.startSec, endSec: segment.endSec }, label: "Voiceover", source: segmentBeat ? { beatId: segmentBeat.id } : {}, color: "cyan", metadata: { src: segment.src, transcript: segment.transcript, sentenceText: segment.transcript, // direction truth: the scaffold writes the beat's direction override (or its transcript rebuild) into the segment — prefer it over rebuilding here so beat.direction survives projection
      providerText: typeof segment.providerText === "string" ? segment.providerText : buildProviderText(segment.transcript), segmentId: segment.id, ...(segment.qc ? { qc: segment.qc } : {}), ...(segment.takeId ? { takeId: segment.takeId } : {}), ...(segment.takes ? { takes: segment.takes } : {}) } }));
  }
  for (const track of doc.audioPlan?.music ?? []) {
    addClip(tracks, "music", clip({ id: `clip:music:${track.id}`, kind: "music", trackId: "music", range: { startSec: track.startSec, endSec: track.endSec }, label: "Music bed", source: {}, color: "amber", metadata: { src: track.src, gainDb: track.gainDb, density: track.density, beatGrid: track.beatGrid ?? [], duckZones, trackId: track.id } }));
  }
  for (const beat of doc.audioPlan?.beats ?? []) {
    for (const cue of beat.sfx) {
      addClip(tracks, "sfx", clip({ id: `clip:sfx:${cue.id}`, kind: "audio-event", trackId: "sfx", range: { startSec: cue.atSec, endSec: cue.atSec + (cue.durationSec ?? 0.8) }, label: cue.reason, source: { beatId: beat.beatId, audioCueId: cue.id }, color: "violet", metadata: { src: cue.src, gainDb: cue.gainDb, reason: cue.reason, fadeInSec: cue.fadeInSec, fadeOutSec: cue.fadeOutSec } }));
    }
  }
};

const collectBeatClips = (doc: IsaacVerseEditDoc, tracks: Map<string, EditorTrack>, markers: EditorMarker[], resolve?: StyleResolver, styleResolvedAt?: EditorProjectionOptions["styleResolvedAt"]): EditorClip[] => {
  const elementClips: EditorClip[] = [];
  for (const beat of doc.beats) {
    const beatClipId = `clip:beat:${beat.id}`;
    addClip(tracks, "video-main", clip({ id: beatClipId, kind: "beat", trackId: "video-main", range: { startSec: beat.startSec, endSec: beatEnd(beat) }, label: beat.narrativeFunction, source: { beatId: beat.id }, color: "cyan", metadata: { transcript: beat.transcript, treatmentId: beat.treatment.id } }));

    markers.push({ id: `marker:beat:${beat.id}`, kind: "beat", range: { startSec: beat.startSec, endSec: beatEnd(beat) }, label: beat.narrativeFunction, source: { beatId: beat.id } });
    for (const shotId of beat.shotIds ?? []) {
      const shot = doc.shots?.find((candidate) => candidate.id === shotId);
      if (!shot) continue;
      markers.push({ id: `marker:shot:${shot.id}`, kind: "shot", range: { startSec: shot.startSec, endSec: shot.startSec + shot.durationSec }, label: shot.purpose, source: { beatId: beat.id, shotId: shot.id } });
    }

    for (const phase of beat.motionPhases ?? []) {
      const range = { startSec: beat.startSec + phase.startSec, endSec: beat.startSec + phase.startSec + phase.durationSec };
      markers.push({ id: `marker:motion:${phase.id}`, kind: "motion-phase", range, label: phase.name, source: { beatId: beat.id, shotId: beat.shotIds?.[0], motionPhaseId: phase.id } });
    }

    const elements = generateTreatmentElements(beat, resolve);
    for (const el of elements) {
      elementClips.push(elementClipFromTreatment(el, beat, beatClipId, styleResolvedAt));
    }

    for (const cue of beat.audioCues ?? []) {
      const range = { startSec: cue.atSec, endSec: cue.atSec + (cue.durationSec ?? 0.8) };
      addClip(tracks, "sfx", clip({ id: `clip:sfx:${cue.id}`, kind: "audio-event", trackId: "sfx", range, label: cue.reason, source: { beatId: beat.id, audioCueId: cue.id }, parentClipId: beatClipId, color: "violet", metadata: { src: cue.src, gain: cue.gain, reason: cue.reason } }));
    }
  }
  return elementClips;
};

const addTransitionMarkers = (doc: IsaacVerseEditDoc, markers: EditorMarker[]) => {
  for (const transition of doc.transitions ?? []) {
    markers.push({ id: `marker:transition:${transition.id}`, kind: "transition", range: { startSec: transition.atSec, endSec: transition.atSec + transition.durationSec }, label: transition.type, source: { transitionId: transition.id } });
  }
};

export const projectEditDocToEditor = (doc: IsaacVerseEditDoc, options: EditorProjectionOptions = {}): EditorDoc => {
  const tracks = new Map<string, EditorTrack>(FIXED_TRACKS.map((track, order) => [track.id, { id: track.id, kind: track.kind, name: track.name, order, locked: false, muted: false, solo: false, hidden: false, source: track.source, accepts: track.accepts, capabilities: track.capabilities, clips: [] }]));
  const markers: EditorMarker[] = [];
  const resolve = options.style ? resolveFromStyle(options.style) : undefined;
  const elementClips = collectBeatClips(doc, tracks, markers, resolve, options.styleResolvedAt);
  addAudioPlanClips(doc, tracks);
  addTransitionMarkers(doc, markers);

  const packedLanes = packIntoTracks(elementClips);
  packedLanes.forEach((laneClips, index) => {
    const trackId = `visual-${index + 1}`;
    const track: EditorTrack = {
      id: trackId,
      kind: "overlay",
      name: `Visual ${index + 1}`,
      order: FIXED_TRACKS.length + index,
      locked: false,
      muted: false,
      solo: false,
      hidden: false,
      source: { kind: "project", projectRef: "treatment-elements" },
      accepts: ["image", "video", "text"],
      capabilities: visualCapabilities,
      clips: laneClips.map((c) => ({ ...c, trackId })),
    };
    tracks.set(trackId, track);
  });

  const videoMain = tracks.get("video-main");
  const visualTracks = packedLanes.map((_, index) => tracks.get(`visual-${index + 1}`)!).filter(Boolean);
  const audioTracks = ["voice", "music", "sfx"].map((id) => tracks.get(id)!).filter((t) => t && t.clips.length > 0);

  const orderedTracks = [
    videoMain!,
    ...visualTracks,
    ...audioTracks,
  ].filter(Boolean);

  let visualCount = 0;
  let audioCount = 0;
  const namedTracks = orderedTracks.map((track) => {
    if (track.kind === "video") return { ...track, name: "Main track" };
    if (track.kind === "overlay") { visualCount += 1; return { ...track, name: `Visual ${visualCount}` }; }
    audioCount += 1;
    return { ...track, name: `Audio ${audioCount}` };
  });

  const durationSec = Math.max(0, ...namedTracks.flatMap((track) => track.clips.map((item) => item.range.endSec)), ...markers.map((marker) => marker.range.endSec));
  return {
    id: `editor:${options.projectId ?? doc.videoId ?? doc.id}`,
    projectId: options.projectId ?? doc.videoId ?? doc.id,
    width: doc.width,
    height: doc.height,
    fps: doc.fps,
    durationSec,
    tracks: namedTracks,
    markers,
    assets: (doc.assets || []).filter((asset): asset is typeof asset & { kind: "image" | "video" | "audio" } => asset.kind === "image" || asset.kind === "video" || asset.kind === "audio").map((asset) => ({ id: asset.id, name: asset.description || asset.id, src: asset.src, kind: asset.kind, provenance: "project" as const })),
    revision: { baseEditVersion: doc.version ?? "v000", revision: 0, updatedAt: options.now ?? new Date().toISOString() },
  };
};

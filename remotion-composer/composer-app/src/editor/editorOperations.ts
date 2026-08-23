import type { ClipKeyframe, EditorClip, EditorDoc, EditorGroup } from "../../../shared/isaacverse/editor";
import { splitClipRange, trimClipRange } from "./time";

const updateRevision = (editor: EditorDoc): EditorDoc["revision"] => ({
  ...editor.revision,
  revision: editor.revision.revision + 1,
  updatedAt: new Date().toISOString(),
});

const locateClip = (editor: EditorDoc, clipId: string) => {
  for (let trackIndex = 0; trackIndex < editor.tracks.length; trackIndex += 1) {
    const clipIndex = editor.tracks[trackIndex].clips.findIndex((clip) => clip.id === clipId);
    if (clipIndex >= 0) return { trackIndex, clipIndex, clip: editor.tracks[trackIndex].clips[clipIndex] };
  }
  throw new Error(`Unknown editor clip: ${clipId}`);
};

const neighbors = (clips: EditorClip[], clipIndex: number) => {
  const ordered = clips.slice().sort((a, b) => a.range.startSec - b.range.startSec);
  const current = clips[clipIndex];
  const position = ordered.findIndex((clip) => clip.id === current.id);
  return { previous: position > 0 ? ordered[position - 1] : undefined, next: position < ordered.length - 1 ? ordered[position + 1] : undefined };
};

/** Mark a clip as touched by the user — the generator merge ledger (spec §2.3):
 *  user-modified clips are kept on regeneration, never silently overwritten. */
const userTouched = (clip: EditorClip): EditorClip => ({
  ...clip,
  metadata: { ...clip.metadata, userEdited: true },
});

/** Append a deleted clip id to the user-deletion ledger (regeneration must not resurrect). */
const withDeleted = (editor: EditorDoc, clipId: string): string[] =>
  [...(editor.userDeletedClipIds ?? []).filter((id) => id !== clipId), clipId];

export const trimEditorClip = (editor: EditorDoc, clipId: string, edge: "start" | "end", timeSec: number, minimumDurationSec = 1 / editor.fps): EditorDoc => {
  const location = locateClip(editor, clipId);
  if (location.clip.locked || editor.tracks[location.trackIndex].locked) throw new Error("clip is locked");
  const { previous, next } = neighbors(editor.tracks[location.trackIndex].clips, location.clipIndex);
  if (edge === "end" && next && timeSec > next.range.startSec) throw new Error("trim would overlap next clip");
  if (edge === "start" && previous && timeSec < previous.range.endSec) throw new Error("trim would overlap previous clip");
  const range = trimClipRange(location.clip.range, edge, timeSec, minimumDurationSec);
  if (previous && range.startSec < previous.range.endSec) throw new Error("trim would overlap previous clip");
  if (next && range.endSec > next.range.startSec) throw new Error("trim would overlap next clip");
  return {
    ...editor,
    tracks: editor.tracks.map((track, trackIndex) => trackIndex !== location.trackIndex ? track : {
      ...track,
      clips: track.clips.map((clip) => clip.id === clipId ? { ...userTouched(clip), range } : clip),
    }),
    revision: updateRevision(editor),
  };
};

export const splitEditorClip = (editor: EditorDoc, clipId: string, timeSec: number): EditorDoc => {
  const location = locateClip(editor, clipId);
  if (location.clip.locked || editor.tracks[location.trackIndex].locked) throw new Error("clip is locked");
  const [beforeRange, afterRange] = splitClipRange(location.clip.range, timeSec);
  const duration = location.clip.range.endSec - location.clip.range.startSec;
  const ratio = (timeSec - location.clip.range.startSec) / duration;
  const splitSourceRange = (range: EditorClip["sourceRange"], startRatio: number, endRatio: number) => range ? {
    startSec: range.startSec + (range.endSec - range.startSec) * startRatio,
    endSec: range.startSec + (range.endSec - range.startSec) * endRatio,
  } : undefined;
  const makePart = (suffix: "a" | "b", range: typeof beforeRange, startRatio: number, endRatio: number): EditorClip => ({
    ...location.clip,
    id: `${location.clip.id}:part-${suffix}`,
    range,
    sourceRange: splitSourceRange(location.clip.sourceRange, startRatio, endRatio),
    metadata: { ...location.clip.metadata, splitFrom: location.clip.id, splitPart: suffix, userEdited: true },
  });
  return {
    ...editor,
    tracks: editor.tracks.map((track, trackIndex) => trackIndex !== location.trackIndex ? track : {
      ...track,
      clips: track.clips.flatMap((clip) => clip.id === clipId ? [makePart("a", beforeRange, 0, ratio), makePart("b", afterRange, ratio, 1)] : [clip]),
    }),
    revision: updateRevision(editor),
  };
};

export const rippleEditorDoc = (editor: EditorDoc, fromSec: number, deltaSec: number, trackIds?: string[]): EditorDoc => {
  const selectedTracks = trackIds ? new Set(trackIds) : undefined;
  const linkedIds = new Set<string>();
  for (const track of editor.tracks) {
    if (selectedTracks && !selectedTracks.has(track.id)) continue;
    for (const clip of track.clips) {
      if (clip.range.startSec >= fromSec) {
        linkedIds.add(clip.id);
        clip.linkedClipIds.forEach((id) => linkedIds.add(id));
      }
    }
  }
  const tracks = editor.tracks.map((track) => ({
    ...track,
    clips: track.clips.map((clip) => {
      const inSelectedTrack = !selectedTracks || selectedTracks.has(track.id);
      const shouldShift = (inSelectedTrack && clip.range.startSec >= fromSec) || (!inSelectedTrack && linkedIds.has(clip.id));
      if (!shouldShift) return clip;
      const range = { startSec: clip.range.startSec + deltaSec, endSec: clip.range.endSec + deltaSec };
      if (range.startSec < 0) throw new Error("ripple would move a clip before the document start");
      return { ...userTouched(clip), range };
    }),
  }));
  const durationSec = Math.max(0, ...tracks.flatMap((track) => track.clips.map((clip) => clip.range.endSec)));
  return { ...editor, durationSec, tracks, revision: updateRevision(editor) };
};

export const setEditorTrackState = (editor: EditorDoc, trackId: string, changes: Partial<Pick<EditorDoc["tracks"][number], "name" | "locked" | "muted" | "solo" | "hidden">>): EditorDoc => {
  if (!editor.tracks.some((track) => track.id === trackId)) throw new Error(`Unknown editor track: ${trackId}`);
  return { ...editor, tracks: editor.tracks.map((track) => track.id === trackId ? { ...track, ...changes } : track), revision: updateRevision(editor) };
};

export const addEditorTrack = (editor: EditorDoc, track: EditorDoc["tracks"][number]): EditorDoc => {
  if (editor.tracks.some((candidate) => candidate.id === track.id)) throw new Error(`Track already exists: ${track.id}`);
  if (!track.clips.length) throw new Error("track must contain at least one clip");
  if (track.source.kind === "asset" && !editor.assets?.some((asset) => asset.id === track.source.assetId)) throw new Error("track source asset is missing");
  const tracks = [...editor.tracks, { ...track, order: editor.tracks.length }];
  return { ...editor, tracks, revision: updateRevision(editor) };
};

export const addAssetTrack = (editor: EditorDoc, assetKind: "image" | "video" | "audio", assetId: string, startSec = 0): EditorDoc => {
  const asset = editor.assets?.find((candidate) => candidate.id === assetId);
  if (!asset) throw new Error(`Unknown editor asset: ${assetId}`);
  if (asset.kind !== assetKind) throw new Error(`Asset ${assetId} is not compatible with ${assetKind} track`);
  const isAudio = assetKind === "audio";
  const kind = isAudio ? "music" as const : "overlay" as const;
  const trackId = `track:${kind}:${assetId}:${editor.revision.revision + 1}`;
  const duration = Math.max(1 / editor.fps, Math.min(3, Math.max(0, editor.durationSec - startSec)));
  return addEditorTrack(editor, {
    id: trackId,
    kind,
    name: asset.name,
    order: editor.tracks.length,
    locked: false,
    muted: false,
    solo: false,
    hidden: false,
    source: { kind: "asset", assetId },
    accepts: [assetKind],
    capabilities: isAudio ? { visual: false, audio: true, canvas: false, trim: true, split: true, gain: true, fade: true, mute: true, solo: true } : { visual: true, audio: false, canvas: true, trim: true, split: true, gain: false, fade: false, mute: false, solo: false },
    clips: [{ id: `clip:asset:${assetId}:${editor.revision.revision + 1}`, kind: isAudio ? "music" : "element", trackId, range: { startSec, endSec: startSec + duration }, label: asset.name, source: { assetId }, linkedClipIds: [], locked: false, muted: false, hidden: false, metadata: { src: asset.src, assetId, fit: "contain" } }],
  });
};

export const deleteEditorTrack = (editor: EditorDoc, trackId: string, mode: "delete-clips" | "move-clips", targetTrackId?: string): EditorDoc => {
  const track = editor.tracks.find((candidate) => candidate.id === trackId);
  if (!track) throw new Error(`Unknown editor track: ${trackId}`);
  if (trackId === "video-main") throw new Error("main video track cannot be deleted");
  if (mode === "move-clips") {
    if (!targetTrackId || targetTrackId === trackId) throw new Error("a different target track is required");
    const target = editor.tracks.find((candidate) => candidate.id === targetTrackId);
    if (!target) throw new Error(`Unknown editor track: ${targetTrackId}`);
    const moved = track.clips.map((clip) => ({ ...clip, trackId: targetTrackId }));
    return { ...editor, tracks: editor.tracks.filter((candidate) => candidate.id !== trackId).map((candidate) => candidate.id === targetTrackId ? { ...candidate, clips: [...candidate.clips, ...moved] } : candidate).map((candidate, order) => ({ ...candidate, order })), revision: updateRevision(editor) };
  }
  return { ...editor, tracks: editor.tracks.filter((candidate) => candidate.id !== trackId).map((candidate, order) => ({ ...candidate, order })), revision: updateRevision(editor) };
};

export const reorderEditorTrack = (editor: EditorDoc, trackId: string, targetOrder: number): EditorDoc => {
  const currentIndex = editor.tracks.findIndex((track) => track.id === trackId);
  if (currentIndex < 0) throw new Error(`Unknown editor track: ${trackId}`);
  const tracks = editor.tracks.slice();
  const [track] = tracks.splice(currentIndex, 1);
  tracks.splice(Math.min(Math.max(0, targetOrder), tracks.length), 0, track);
  return { ...editor, tracks: tracks.map((item, order) => ({ ...item, order })), revision: updateRevision(editor) };
};

export const setEditorClipAudioState = (editor: EditorDoc, clipId: string, changes: { gainDb?: number; fadeInSec?: number; fadeOutSec?: number; muted?: boolean }): EditorDoc => {
  const location = locateClip(editor, clipId);
  if (location.clip.kind !== "voice" && location.clip.kind !== "music" && location.clip.kind !== "audio-event") throw new Error("clip is not an audio clip");
  return {
    ...editor,
    tracks: editor.tracks.map((track, trackIndex) => trackIndex !== location.trackIndex ? track : {
      ...track,
      clips: track.clips.map((clip) => clip.id !== clipId ? clip : {
        ...clip,
        muted: changes.muted ?? clip.muted,
        metadata: {
          ...clip.metadata,
          userEdited: true,
          ...(changes.gainDb === undefined ? {} : { gainDb: changes.gainDb }),
          ...(changes.fadeInSec === undefined ? {} : { fadeInSec: changes.fadeInSec }),
          ...(changes.fadeOutSec === undefined ? {} : { fadeOutSec: changes.fadeOutSec }),
        },
      }),
    }),
    revision: updateRevision(editor),
  };
};

export const setEditorTransitionState = (editor: EditorDoc, clipId: string, changes: { transitionType?: string; durationSec?: number }): EditorDoc => {
  const location = locateClip(editor, clipId);
  if (location.clip.kind !== "transition") throw new Error("clip is not a transition");
  const range = changes.durationSec === undefined ? location.clip.range : { ...location.clip.range, endSec: location.clip.range.startSec + Math.max(0.05, changes.durationSec) };
  return {
    ...editor,
    tracks: editor.tracks.map((track, trackIndex) => trackIndex !== location.trackIndex ? track : { ...track, clips: track.clips.map((clip) => clip.id !== clipId ? clip : { ...userTouched(clip), range, metadata: { ...clip.metadata, userEdited: true, ...(changes.transitionType === undefined ? {} : { transitionType: changes.transitionType }) } }) }),
    revision: updateRevision(editor),
  };
};

export const setEditorClipMetadata = (editor: EditorDoc, clipId: string, changes: Record<string, unknown>): EditorDoc => {
  const location = locateClip(editor, clipId);
  return {
    ...editor,
    tracks: editor.tracks.map((track, trackIndex) => trackIndex !== location.trackIndex ? track : {
      ...track,
      clips: track.clips.map((clip) => clip.id !== clipId ? clip : {
        ...clip,
        metadata: { ...clip.metadata, ...changes, userEdited: true },
      }),
    }),
    revision: updateRevision(editor),
  };
};

export const setEditorClipRange = (editor: EditorDoc, clipId: string, range: { startSec?: number; endSec?: number }): EditorDoc => {
  const location = locateClip(editor, clipId);
  if (location.clip.locked || editor.tracks[location.trackIndex].locked) throw new Error("clip is locked");
  const newRange = {
    startSec: range.startSec ?? location.clip.range.startSec,
    endSec: range.endSec ?? location.clip.range.endSec,
  };
  if (newRange.endSec <= newRange.startSec) throw new Error("clip end must be after start");
  return {
    ...editor,
    tracks: editor.tracks.map((track, trackIndex) => trackIndex !== location.trackIndex ? track : {
      ...track,
      clips: track.clips.map((clip) => clip.id !== clipId ? clip : { ...userTouched(clip), range: newRange }),
    }),
    revision: updateRevision(editor),
  };
};

export const deleteEditorClip = (editor: EditorDoc, clipId: string): EditorDoc => {
  const location = locateClip(editor, clipId);
  if (location.clip.locked || editor.tracks[location.trackIndex].locked) throw new Error("clip is locked");
  if (editor.tracks[location.trackIndex].id === "video-main") throw new Error("cannot delete clips from main video track");
  const tracks = editor.tracks.map((track, trackIndex) => trackIndex !== location.trackIndex ? track : {
    ...track,
    clips: track.clips.filter((clip) => clip.id !== clipId),
  });
  const cleanedTracks = tracks.map((track) => (track.clips.length === 0 && track.id !== "video-main" && track.id !== "voice" && track.id !== "music" && track.id !== "sfx" && track.id !== "transitions")
    ? null : track).filter((track): track is NonNullable<typeof track> => track !== null).map((track, order) => ({ ...track, order }));
  return { ...editor, tracks: cleanedTracks, userDeletedClipIds: withDeleted(editor, clipId), revision: updateRevision(editor) };
};

export const addTextClip = (editor: EditorDoc, text: string, startSec: number, durationSec = 3, preset: "heading" | "body" | "caption" | "lower-third" = "heading"): EditorDoc => {
  const fps = editor.fps;
  const minDuration = 1 / fps;
  const endSec = Math.min(editor.durationSec, startSec + Math.max(minDuration, durationSec));
  const clipId = `clip:text:${Date.now()}`;
  const textTrack = editor.tracks.find((track) => track.id === "text-overlay" || (track.kind === "text" && track.source.kind === "asset"));
  const presets: Record<string, Record<string, unknown>> = {
    heading: { x: 0.1, y: 0.1, w: 0.8, h: 0.2, fontSize: 72, fontWeight: 800, color: "#ffffff", textAlign: "center" },
    body: { x: 0.15, y: 0.42, w: 0.7, h: 0.16, fontSize: 40, fontWeight: 400, color: "#e8edf2", textAlign: "center" },
    caption: { x: 0.15, y: 0.78, w: 0.7, h: 0.12, fontSize: 36, fontWeight: 700, color: "#ffe066", textAlign: "center" },
    "lower-third": { x: 0.08, y: 0.8, w: 0.5, h: 0.12, fontSize: 34, fontWeight: 700, color: "#ffffff", textAlign: "left" },
  };
  const newClip: EditorClip = {
    id: clipId,
    kind: "element",
    trackId: textTrack?.id ?? "text-overlay",
    range: { startSec, endSec },
    label: text.slice(0, 30) || "Text",
    source: {},
    linkedClipIds: [],
    locked: false,
    muted: false,
    hidden: false,
    metadata: {
      text,
      isTextClip: true,
      opacity: 1,
      z: 10,
      userEdited: true,
      ...presets[preset],
    },
  };
  if (textTrack) {
    return {
      ...editor,
      tracks: editor.tracks.map((track) => track.id !== textTrack.id ? track : { ...track, clips: [...track.clips, newClip] }),
      revision: updateRevision(editor),
    };
  }
  const newTrack = {
    id: "text-overlay",
    kind: "text" as const,
    name: `Overlay ${editor.tracks.filter((track) => track.kind === "overlay" || track.kind === "text").length + 1}`,
    order: editor.tracks.length,
    locked: false,
    muted: false,
    solo: false,
    hidden: false,
    source: { kind: "project" as const },
    accepts: ["text" as const],
    capabilities: { visual: true, audio: false, canvas: true, trim: true, split: true, gain: false, fade: false, mute: false, solo: false },
    clips: [newClip],
    metadata: { userCreated: true },
  };
  return { ...editor, tracks: [...editor.tracks, newTrack], revision: updateRevision(editor) };
};

export const renameEditorTrack = (editor: EditorDoc, trackId: string, name: string): EditorDoc => {
  if (!editor.tracks.some((track) => track.id === trackId)) throw new Error(`Unknown editor track: ${trackId}`);
  if (!name.trim()) throw new Error("track name cannot be empty");
  return {
    ...editor,
    tracks: editor.tracks.map((track) => track.id !== trackId ? track : { ...track, name: name.trim(), metadata: { ...track.metadata, userNamed: true } }),
    revision: updateRevision(editor),
  };
};

export const addTrackLayer = (editor: EditorDoc, kind: "overlay" | "audio"): EditorDoc => {
  const existing = editor.tracks.filter((track) => kind === "overlay" ? track.kind === "overlay" || track.kind === "text" : track.kind === "music" || track.kind === "voice" || track.kind === "sfx");
  const trackId = `track:${kind}:user:${Date.now()}`;
  const isAudio = kind === "audio";
  const counter = existing.length + 1;
  return {
    ...editor,
    tracks: [...editor.tracks, {
      id: trackId,
      kind: isAudio ? "music" as const : "overlay" as const,
      name: isAudio ? `Audio ${counter}` : `Overlay ${counter}`,
      order: editor.tracks.length,
      locked: false,
      muted: false,
      solo: false,
      hidden: false,
      source: { kind: "generated" as const, generatorId: "layer-add" },
      accepts: isAudio ? ["audio" as const] : ["image" as const, "video" as const, "text" as const],
      capabilities: isAudio
        ? { visual: false, audio: true, canvas: false, trim: true, split: true, gain: true, fade: true, mute: true, solo: true }
        : { visual: true, audio: false, canvas: true, trim: true, split: true, gain: false, fade: false, mute: false, solo: false },
      clips: [],
      metadata: { userCreated: true, userNamed: true },
    }],
    revision: updateRevision(editor),
  };
};

export const moveClipToTrack = (editor: EditorDoc, clipId: string, targetTrackId: string, newStartSec: number): EditorDoc => {
  const location = locateClip(editor, clipId);
  if (location.clip.locked || editor.tracks[location.trackIndex].locked) throw new Error("clip is locked");
  const targetIndex = editor.tracks.findIndex((track) => track.id === targetTrackId);
  if (targetIndex < 0) throw new Error(`Unknown editor track: ${targetTrackId}`);
  if (editor.tracks[location.trackIndex].id === "video-main" && targetTrackId !== "video-main") throw new Error("main video clips stay on the main track");
  const targetTrack = editor.tracks[targetIndex];
  const isAudioClip = location.clip.kind === "voice" || location.clip.kind === "music" || location.clip.kind === "audio-event";
  const isVisualTrack = targetTrack.kind === "overlay" || targetTrack.kind === "text" || targetTrack.kind === "video";
  if (isAudioClip && isVisualTrack) throw new Error("audio clips cannot be moved to visual tracks");
  if (!isAudioClip && targetTrack.kind === "voice" || targetTrack.kind === "music" || targetTrack.kind === "sfx") {
    if (!isAudioClip) throw new Error("visual clips cannot be moved to audio tracks");
  }
  const duration = location.clip.range.endSec - location.clip.range.startSec;
  const movedClip: EditorClip = userTouched({
    ...location.clip,
    trackId: targetTrackId,
    range: { startSec: Math.max(0, newStartSec), endSec: Math.max(0, newStartSec) + duration },
  });
  const tracks = editor.tracks.map((track, trackIndex) => {
    if (trackIndex === location.trackIndex) return { ...track, clips: track.clips.filter((clip) => clip.id !== clipId) };
    if (trackIndex === targetIndex) return { ...track, clips: [...track.clips, movedClip] };
    return track;
  });
  const cleaned = tracks
    .filter((track) => track.clips.length > 0 || track.id === "video-main" || track.metadata?.userCreated === true)
    .map((track, order) => ({ ...track, order }));
  return { ...editor, tracks: cleaned, revision: updateRevision(editor) };
};

export const duplicateEditorClip = (editor: EditorDoc, clipId: string, atSec: number): EditorDoc => {
  const location = locateClip(editor, clipId);
  const duration = location.clip.range.endSec - location.clip.range.startSec;
  const copy: EditorClip = {
    ...location.clip,
    id: `${location.clip.id}:dup:${Date.now()}`,
    range: { startSec: Math.max(0, atSec), endSec: Math.max(0, atSec) + duration },
    linkedClipIds: [],
    metadata: { ...location.clip.metadata, userEdited: true },
  };
  return {
    ...editor,
    tracks: editor.tracks.map((track, trackIndex) => trackIndex !== location.trackIndex ? track : { ...track, clips: [...track.clips, copy] }),
    revision: updateRevision(editor),
  };
};

export const setEditorClipSpeed = (editor: EditorDoc, clipId: string, speed: number): EditorDoc => {
  const location = locateClip(editor, clipId);
  if (location.clip.kind !== "audio-event" && location.clip.kind !== "voice" && location.clip.kind !== "music" && location.clip.kind !== "element") throw new Error("speed is not supported for this clip type");
  if (!Number.isFinite(speed) || speed <= 0 || speed > 4) throw new Error("speed must be between 0.25 and 4");
  const duration = location.clip.range.endSec - location.clip.range.startSec;
  const newDuration = duration / speed;
  return {
    ...editor,
    tracks: editor.tracks.map((track, trackIndex) => trackIndex !== location.trackIndex ? track : {
      ...track,
      clips: track.clips.map((clip) => clip.id !== clipId ? clip : { ...userTouched(clip), range: { ...clip.range, endSec: clip.range.startSec + newDuration }, metadata: { ...clip.metadata, speed, userEdited: true } }),
    }),
    revision: updateRevision(editor),
  };
};

const keyframesFor = (clip: EditorClip, property: string): ClipKeyframe[] => {
  const record = clip.metadata.keyframes as Record<string, ClipKeyframe[]> | undefined;
  return Array.isArray(record?.[property]) ? record[property] : [];
};

export const addClipKeyframe = (editor: EditorDoc, clipId: string, property: string, timeSec: number, value: number): EditorDoc => {
  const location = locateClip(editor, clipId);
  const t = Math.max(0, timeSec - location.clip.range.startSec);
  const existing = keyframesFor(location.clip, property).filter((key) => Math.abs(key.t - t) > 0.001);
  const record = (location.clip.metadata.keyframes as Record<string, ClipKeyframe[]> | undefined) || {};
  return {
    ...editor,
    tracks: editor.tracks.map((track, trackIndex) => trackIndex !== location.trackIndex ? track : {
      ...track,
      clips: track.clips.map((clip) => clip.id !== clipId ? clip : {
        ...clip,
        metadata: { ...clip.metadata, keyframes: { ...record, [property]: [...existing, { t, v: value }].sort((a, b) => a.t - b.t) }, userEdited: true },
      }),
    }),
    revision: updateRevision(editor),
  };
};

export const removeClipKeyframe = (editor: EditorDoc, clipId: string, property: string, timeSec: number): EditorDoc => {
  const location = locateClip(editor, clipId);
  const t = timeSec - location.clip.range.startSec;
  const record = (location.clip.metadata.keyframes as Record<string, ClipKeyframe[]> | undefined) || {};
  const remaining = keyframesFor(location.clip, property).filter((key) => Math.abs(key.t - t) > 0.001);
  const next = { ...record, [property]: remaining };
  if (!remaining.length) delete next[property];
  return {
    ...editor,
    tracks: editor.tracks.map((track, trackIndex) => trackIndex !== location.trackIndex ? track : {
      ...track,
      clips: track.clips.map((clip) => clip.id !== clipId ? clip : { ...clip, metadata: { ...clip.metadata, keyframes: next, userEdited: true } }),
    }),
    revision: updateRevision(editor),
  };
};

export const setClipKeyframeEasing = (editor: EditorDoc, clipId: string, property: string, timeSec: number, easing: ClipKeyframe["easing"]): EditorDoc => {
  const location = locateClip(editor, clipId);
  const t = timeSec - location.clip.range.startSec;
  const record = (location.clip.metadata.keyframes as Record<string, ClipKeyframe[]> | undefined) || {};
  const next = keyframesFor(location.clip, property).map((key) => Math.abs(key.t - t) <= 0.001 ? { ...key, easing } : key);
  return {
    ...editor,
    tracks: editor.tracks.map((track, trackIndex) => trackIndex !== location.trackIndex ? track : {
      ...track,
      clips: track.clips.map((clip) => clip.id !== clipId ? clip : { ...clip, metadata: { ...clip.metadata, keyframes: { ...record, [property]: next } } }),
    }),
    revision: updateRevision(editor),
  };
};

export const moveClipKeyframe = (editor: EditorDoc, clipId: string, property: string, fromSec: number, toSec: number): EditorDoc => {
  const location = locateClip(editor, clipId);
  const duration = location.clip.range.endSec - location.clip.range.startSec;
  const newT = Math.max(0, Math.min(duration, toSec - location.clip.range.startSec));
  const record = (location.clip.metadata.keyframes as Record<string, ClipKeyframe[]> | undefined) || {};
  const next = keyframesFor(location.clip, property).map((key) => Math.abs(key.t - (fromSec - location.clip.range.startSec)) <= 0.001 ? { ...key, t: newT } : key).sort((a, b) => a.t - b.t);
  return {
    ...editor,
    tracks: editor.tracks.map((track, trackIndex) => trackIndex !== location.trackIndex ? track : {
      ...track,
      clips: track.clips.map((clip) => clip.id !== clipId ? clip : { ...clip, metadata: { ...clip.metadata, keyframes: { ...record, [property]: next } } }),
    }),
    revision: updateRevision(editor),
  };
};

export const normalizeTrackNames = (editor: EditorDoc): EditorDoc => {
  let overlayCount = 0;
  let audioCount = 0;
  const renamed = editor.tracks.map((track) => {
    if (track.metadata?.userNamed === true) return track;
    if (track.kind === "video") return track.name === "Main track" ? track : { ...track, name: "Main track" };
    if (track.kind === "overlay" || track.kind === "text") {
      overlayCount += 1;
      return { ...track, name: `Overlay ${overlayCount}` };
    }
    audioCount += 1;
    return { ...track, name: `Audio ${audioCount}` };
  });
  const changed = renamed.some((track, index) => track.name !== editor.tracks[index].name);
  return changed ? { ...editor, tracks: renamed } : editor;
};

export const migrateElementGeometry = (editor: EditorDoc, docWidth: number, docHeight: number): EditorDoc => {
  let changed = false;
  const tracks = editor.tracks.map((track) => ({
    ...track,
    clips: track.clips.map((clip) => {
      if (clip.kind !== "element") return clip;
      const md = clip.metadata;
      if (typeof md.x === "number") return clip;
      const geometry = md.geometry as { x?: number; y?: number; width?: number; height?: number; rotation?: number } | undefined;
      if (!geometry || typeof geometry.x !== "number" || typeof geometry.width !== "number") return clip;
      changed = true;
      return {
        ...clip,
        metadata: {
          ...md,
          x: geometry.x / docWidth,
          y: (typeof geometry.y === "number" ? geometry.y : 0) / docHeight,
          w: Math.max(0.01, geometry.width / docWidth),
          h: Math.max(0.01, (typeof geometry.height === "number" ? geometry.height : geometry.width) / docHeight),
          rotation: geometry.rotation || 0,
          opacity: typeof md.opacity === "number" ? md.opacity : 1,
          z: typeof md.z === "number" ? md.z : 5,
        },
      };
    }),
  }));
  return changed ? { ...editor, tracks, revision: { ...editor.revision, revision: editor.revision.revision + 1 } } : editor;
};

export const addTransitionClip = (editor: EditorDoc, atSec: number, transitionType: string, durationSec = 0.5): EditorDoc => {
  const transitionsTrack = editor.tracks.find((track) => track.id === "transitions");
  const newClip: EditorClip = {
    id: `clip:transition:${Date.now()}`,
    kind: "transition",
    trackId: "transitions",
    range: { startSec: Math.max(0, atSec), endSec: Math.max(0.05, atSec + durationSec) },
    label: transitionType,
    source: {},
    linkedClipIds: [],
    locked: false,
    muted: false,
    hidden: false,
    metadata: { transitionType, userEdited: true },
  };
  if (transitionsTrack) {
    return {
      ...editor,
      tracks: editor.tracks.map((track) => track.id !== "transitions" ? track : { ...track, clips: [...track.clips, newClip] }),
      revision: updateRevision(editor),
    };
  }
  const newTrack = {
    id: "transitions",
    kind: "transition" as const,
    name: "Transitions",
    order: editor.tracks.length,
    locked: false,
    muted: false,
    solo: false,
    hidden: false,
    source: { kind: "project" as const },
    accepts: [] as EditorDoc["tracks"][number]["accepts"],
    capabilities: { visual: true, audio: false, canvas: false, trim: true, split: false, gain: false, fade: false, mute: false, solo: false },
    clips: [newClip],
  };
  return { ...editor, tracks: [...editor.tracks, newTrack], revision: updateRevision(editor) };
};

export const moveClipInTime = (editor: EditorDoc, clipId: string, newStartSec: number): EditorDoc => {
  const location = locateClip(editor, clipId);
  if (location.clip.locked || editor.tracks[location.trackIndex].locked) throw new Error("clip is locked");
  const duration = location.clip.range.endSec - location.clip.range.startSec;
  return {
    ...editor,
    tracks: editor.tracks.map((track, trackIndex) => trackIndex !== location.trackIndex ? track : {
      ...track,
      clips: track.clips.map((clip) => clip.id !== clipId ? clip : { ...userTouched(clip), range: { startSec: Math.max(0, newStartSec), endSec: Math.max(0, newStartSec) + duration } }),
    }),
    revision: updateRevision(editor),
  };
};

export const addClipToTrack = (editor: EditorDoc, trackId: string, clip: EditorClip): EditorDoc => {
  const targetIndex = editor.tracks.findIndex((track) => track.id === trackId);
  if (targetIndex < 0) throw new Error(`Unknown editor track: ${trackId}`);
  return {
    ...editor,
    tracks: editor.tracks.map((track, trackIndex) => trackIndex !== targetIndex ? track : { ...track, clips: [...track.clips, userTouched({ ...clip, trackId })] }),
    revision: updateRevision(editor),
  };
};

export const addOverlayClip = (editor: EditorDoc, assetId: string, startSec: number, position?: { x: number; y: number }): EditorDoc => {
  const asset = editor.assets?.find((candidate) => candidate.id === assetId);
  if (!asset) throw new Error(`Unknown editor asset: ${assetId}`);
  if (asset.kind === "audio") throw new Error("audio assets belong on audio tracks");
  const fps = editor.fps;
  const duration = asset.kind === "video" ? Math.min(3, Math.max(0, editor.durationSec - startSec)) : 3;
  const trackId = `track:overlay:${assetId}`;
  const overlayTrack = editor.tracks.find((track) => track.id === trackId) || editor.tracks.find((track) => (track.kind === "overlay" || track.kind === "text") && track.metadata?.userCreated === true);
  const clip: EditorClip = {
    id: `clip:asset:${assetId}:${Date.now()}`,
    kind: "element",
    trackId: overlayTrack?.id ?? trackId,
    range: { startSec, endSec: Math.min(editor.durationSec, startSec + Math.max(1 / fps, duration)) },
    label: asset.name,
    source: { assetId },
    linkedClipIds: [],
    locked: false,
    muted: false,
    hidden: false,
    metadata: { src: asset.src, assetId, assetKind: asset.kind, fit: "contain", x: position?.x ?? 0.1, y: position?.y ?? 0.1, w: 0.3, h: 0.3, opacity: 1, z: 10, speed: 1, userEdited: true },
  };
  if (overlayTrack) return addClipToTrack(editor, overlayTrack.id, clip);
  const newTrack = {
    id: trackId,
    kind: "overlay" as const,
    name: "Overlay",
    order: editor.tracks.length,
    locked: false,
    muted: false,
    solo: false,
    hidden: false,
    source: { kind: "generated" as const, generatorId: "overlay-clip" },
    accepts: ["image" as const, "video" as const],
    capabilities: { visual: true, audio: false, canvas: true, trim: true, split: true, gain: false, fade: false, mute: false, solo: false },
    clips: [clip],
    metadata: { userCreated: true },
  };
  return { ...editor, tracks: [...editor.tracks, newTrack], revision: updateRevision(editor) };
};

export const setTrackFilter = (editor: EditorDoc, trackId: string, filter: string): EditorDoc => {
  const trackIndex = editor.tracks.findIndex((track) => track.id === trackId);
  if (trackIndex < 0) throw new Error(`Unknown editor track: ${trackId}`);
  return {
    ...editor,
    tracks: editor.tracks.map((track, index) => index !== trackIndex ? track : {
      ...track,
      clips: track.clips.map((clip) => ({ ...clip, metadata: { ...clip.metadata, filter: filter === "none" ? undefined : filter, userEdited: true } })),
    }),
    revision: updateRevision(editor),
  };
};

export const moveClipInTimeSafe = (editor: EditorDoc, clipId: string, newStartSec: number): EditorDoc => {
  const location = locateClip(editor, clipId);
  if (location.clip.locked || editor.tracks[location.trackIndex].locked) throw new Error("clip is locked");
  const duration = location.clip.range.endSec - location.clip.range.startSec;
  const track = editor.tracks[location.trackIndex];
  const neighbors = track.clips.filter((clip) => clip.id !== clipId);
  let clampedStart = Math.max(0, newStartSec);
  for (const neighbor of neighbors) {
    if (newStartSec < neighbor.range.endSec && newStartSec + duration > neighbor.range.startSec) {
      if (newStartSec < neighbor.range.startSec) {
        clampedStart = Math.min(clampedStart, neighbor.range.startSec - duration);
      } else {
        clampedStart = Math.max(clampedStart, neighbor.range.endSec);
      }
    }
  }
  clampedStart = Math.max(0, clampedStart);
  return {
    ...editor,
    tracks: editor.tracks.map((t, trackIndex) => trackIndex !== location.trackIndex ? t : {
      ...t,
      clips: t.clips.map((clip) => clip.id !== clipId ? clip : { ...userTouched(clip), range: { startSec: clampedStart, endSec: clampedStart + duration } }),
    }),
    revision: updateRevision(editor),
  };
};

let pasteCounter = 0;
export const nextPasteId = () => `paste-${Date.now()}-${pasteCounter++}`;

export const groupClips = (editor: EditorDoc, clipIds: string[], name?: string): EditorDoc => {
  if (clipIds.length < 2) throw new Error("need at least 2 clips to group");
  const group: EditorGroup = {
    id: `group:${Date.now()}`,
    name: name || `Group ${(editor.groups?.length ?? 0) + 1}`,
    clipIds,
  };
  return { ...editor, groups: [...(editor.groups || []), group], revision: updateRevision(editor) };
};

export const ungroupClips = (editor: EditorDoc, groupId: string): EditorDoc => {
  const groups = (editor.groups || []).filter((g) => g.id !== groupId);
  return { ...editor, groups: groups.length ? groups : undefined, revision: updateRevision(editor) };
};

export const ungroupClipsByMember = (editor: EditorDoc, clipId: string): EditorDoc => {
  const group = (editor.groups || []).find((g) => g.clipIds.includes(clipId));
  if (!group) return editor;
  return ungroupClips(editor, group.id);
};

export const groupOfClip = (editor: EditorDoc, clipId: string): EditorGroup | undefined =>
  (editor.groups || []).find((g) => g.clipIds.includes(clipId));

export const moveGroupClips = (editor: EditorDoc, groupId: string, deltaX: number, deltaY: number): EditorDoc => {
  const group = (editor.groups || []).find((g) => g.id === groupId);
  if (!group) return editor;
  return {
    ...editor,
    tracks: editor.tracks.map((track) => ({
      ...track,
      clips: track.clips.map((clip) => {
        if (!group.clipIds.includes(clip.id)) return clip;
        const x = typeof clip.metadata.x === "number" ? clip.metadata.x : 0.1;
        const y = typeof clip.metadata.y === "number" ? clip.metadata.y : 0.1;
        return { ...clip, metadata: { ...clip.metadata, x: x + deltaX, y: y + deltaY, userEdited: true } };
      }),
    })),
    revision: updateRevision(editor),
  };
};

export const rippleDeleteClip = (editor: EditorDoc, clipId: string): EditorDoc => {
  const location = locateClip(editor, clipId);
  if (location.clip.locked || editor.tracks[location.trackIndex].locked) throw new Error("clip is locked");
  if (editor.tracks[location.trackIndex].id === "video-main") throw new Error("cannot delete clips from main video track");
  const clipDuration = location.clip.range.endSec - location.clip.range.startSec;
  const trackId = editor.tracks[location.trackIndex].id;
  const tracks = editor.tracks.map((track, trackIndex) => {
    if (trackIndex !== location.trackIndex) return track;
    const remaining = track.clips.filter((clip) => clip.id !== clipId);
    return {
      ...track,
      clips: remaining.map((clip) => {
        if (clip.range.startSec >= location.clip.range.endSec) {
          return { ...userTouched(clip), range: { startSec: clip.range.startSec - clipDuration, endSec: clip.range.endSec - clipDuration } };
        }
        return clip;
      }),
    };
  });
  const cleanedTracks = tracks
    .filter((track) => track.clips.length > 0 || track.id === "video-main" || track.metadata?.userCreated === true)
    .map((track, order) => ({ ...track, order }));
  const durationSec = Math.max(0, ...cleanedTracks.flatMap((track) => track.clips.map((clip) => clip.range.endSec)));
  return { ...editor, tracks: cleanedTracks, userDeletedClipIds: withDeleted(editor, clipId), durationSec: Math.max(0.1, durationSec), revision: updateRevision(editor) };
};

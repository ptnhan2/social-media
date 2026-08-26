import type { IsaacVerseEditDoc } from "./types";

export type EditorTrackKind = "video" | "overlay" | "text" | "voice" | "music" | "sfx" | "transition";
export type EditorClipKind = EditorTrackKind | "beat" | "shot" | "element" | "audio-event";
export type EditorSelectionMode = "none" | "clip" | "range" | "playhead";
export type EditorMarkerKind = "beat" | "shot" | "motion-phase" | "transition";
export type EditorTrackSourceKind = "project" | "asset" | "generated";
export type EditorAcceptedAssetKind = "image" | "video" | "audio" | "text";

export type ClipRange = {
  startSec: number;
  endSec: number;
};

export type EditorSourceRef = {
  assetId?: string;
  beatId?: string;
  shotId?: string;
  elementId?: string;
  motionPhaseId?: string;
  audioCueId?: string;
  transitionId?: string;
  sourcePath?: string;
};

export type EditorClip = {
  id: string;
  kind: EditorClipKind;
  trackId: string;
  range: ClipRange;
  sourceRange?: ClipRange;
  label: string;
  source: EditorSourceRef;
  parentClipId?: string;
  linkedClipIds: string[];
  color?: string;
  locked: boolean;
  muted: boolean;
  hidden: boolean;
  metadata: Record<string, unknown>;
};

export type EditorTrack = {
  id: string;
  kind: EditorTrackKind;
  name: string;
  order: number;
  locked: boolean;
  muted: boolean;
  solo: boolean;
  hidden: boolean;
  source: { kind: EditorTrackSourceKind; assetId?: string; projectRef?: string; generatorId?: string };
  accepts: EditorAcceptedAssetKind[];
  capabilities: { visual: boolean; audio: boolean; canvas: boolean; trim: boolean; split: boolean; gain: boolean; fade: boolean; mute: boolean; solo: boolean };
  clips: EditorClip[];
  metadata?: Record<string, unknown>;
};

export type ClipKeyframe = {
  t: number;
  v: number;
  easing?: "linear" | "ease-in" | "ease-out" | "ease-in-out";
};

export type EditorMarker = {
  id: string;
  kind: EditorMarkerKind;
  range: ClipRange;
  label: string;
  source: EditorSourceRef;
};

export type EditorSelection = {
  mode: EditorSelectionMode;
  trackId?: string;
  clipId?: string;
  range?: ClipRange;
  source?: EditorSourceRef;
};

export type PlayheadState = {
  currentSec: number;
  isPlaying: boolean;
  loopRange?: ClipRange;
};

export type EditorRevision = {
  baseEditVersion: string;
  revision: number;
  updatedAt: string;
};

export type EditorAsset = {
  id: string;
  name: string;
  src: string;
  kind: "image" | "video" | "audio";
  provenance: "local-upload" | "project";
};

export type EditorDoc = {
  id: string;
  projectId: string;
  width: number;
  height: number;
  fps: number;
  durationSec: number;
  tracks: EditorTrack[];
  markers?: EditorMarker[];
  assets?: EditorAsset[];
  groups?: EditorGroup[];
  revision: EditorRevision;
  /** Generator merge ledger (spec §2.3): clip ids the user deleted —
   *  regeneration must NOT resurrect them. */
  userDeletedClipIds?: string[];
  /** Persisted-format version (PIPELINE-HARDENING-SPEC §3.1): readers at
   *  every boundary migrate sequentially to CURRENT_EDITOR_SCHEMA before
   *  use. Absent = v1 (pre-versioning docs). */
  schemaVersion?: number;
};

export type EditorProjectionOptions = {
  projectId?: string;
  now?: string;
  /** Style store object — when provided, generated element clips resolve knob
   *  values and record provenance (spec §2.2). */
  style?: Record<string, unknown>;
  /** Provenance stamp baked into generated clips: which store version resolved. */
  styleResolvedAt?: { storeVersion: number; seed?: string };
};

/** Overlay routing decision (PIPELINE-HARDENING-SPEC §3.2-1c / B1 fix):
 *  - overlay fully inside ONE beat clip (start >= host.start, end <= host.end)
 *    → nest inside that beat's camera (the treatment path scales visuals)
 *  - overlay spanning past the host clip (endSec > host.endSec, e.g. the
 *    beat was trimmed AFTER the overlay was generated) → render at ROOT
 *    (Remotion clips children to the parent Sequence window; a nested
 *    overlay would vanish from the post-trim segment)
 *  - overlay without a beatId → root
 *  Returns { nested, host } — the render path uses host.range.startSec to
 *  offset the nested overlay's own Sequence `from`. */
export function routeOverlay(overlay: EditorClip, videoClips: EditorClip[]): { nested: boolean; host: EditorClip | null } {
  const beatId = typeof overlay.source.beatId === "string" ? overlay.source.beatId : null;
  if (!beatId) return { nested: false, host: null };
  const candidates = videoClips.filter((c) => c.source.beatId === beatId);
  const host = candidates.find((c) => overlay.range.startSec >= c.range.startSec - 0.001 && overlay.range.startSec < c.range.endSec);
  const insideHost = host && overlay.range.endSec <= host.range.endSec + 0.001;
  return { nested: Boolean(host && insideHost), host: host ?? null };
}

export type EditorOperation =
  | { type: "trim"; clipId: string; edge: "start" | "end"; timeSec: number }
  | { type: "split"; clipId: string; timeSec: number }
  | { type: "ripple"; fromSec: number; deltaSec: number; trackIds?: string[] };

export type EditorSourceDoc = IsaacVerseEditDoc;

export type EditorGroup = {
  id: string;
  name: string;
  clipIds: string[];
};

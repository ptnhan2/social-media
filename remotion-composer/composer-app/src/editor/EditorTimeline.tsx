import React from "react";
import type { ClipKeyframe, ClipRange, EditorClip, EditorDoc, EditorTrack } from "../../../shared/isaacverse/editor";
import { loadWaveformLevels } from "../composer/waveform";

export type EditorTool = "select" | "trim" | "split" | "ripple";

type DropPayload = { src: string; kind: string; assetId?: string; name?: string };

type EditorTimelineProps = {
  editor: EditorDoc;
  selectionClipIds: string[];
  currentSec: number;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onSeek: (seconds: number) => void;
  onSelectClip: (clip: EditorClip) => void;
  onTrimClip?: (clip: EditorClip, edge: "start" | "end", timeSec: number) => void;
  onTrimCommit?: (clip: EditorClip, edge: "start" | "end", timeSec: number) => void;
  activeTool: EditorTool;
  onToolChange: (tool: EditorTool) => void;
  onSplitClip?: (clip: EditorClip, timeSec: number) => void;
  onRipple?: (fromSec: number, deltaSec: number) => void;
  onTrackStateChange?: (trackId: string, changes: { muted?: boolean; solo?: boolean; locked?: boolean; hidden?: boolean }) => void;
  onRenameTrack?: (trackId: string, name: string) => void;
  onAddLayer?: (kind: "overlay" | "audio") => void;
  onMoveClip?: (clipId: string, newStartSec: number) => void;
  onDropAssetOnTrack?: (trackId: string, payload: DropPayload, timeSec: number) => void;
  onSelectKeyframe?: (clipId: string, property: string, t: number) => void;
  onMoveKeyframe?: (clipId: string, property: string, fromSec: number, toSec: number) => void;
  onDropEffectOnTrack?: (trackId: string, effectId: string, timeSec: number) => void;
  onAddTransitionAt?: (timeSec: number, transitionType: string) => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
};

const formatTime = (seconds: number) => {
  const safe = Math.max(0, seconds);
  return `${Math.floor(safe / 60)}:${String(Math.floor(safe % 60)).padStart(2, "0")}`;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const TIMELINE_LANE_HEIGHT = 42;

const sourceLabel = (clip: EditorClip) =>
  clip.source.elementId || clip.source.shotId || clip.source.motionPhaseId || clip.source.audioCueId || clip.source.transitionId || clip.source.assetId || clip.source.beatId || clip.id;

const clipMetaLabel = (clip: EditorClip) => {
  if (clip.kind === "element") {
    const elementType = typeof clip.metadata.elementType === "string" ? clip.metadata.elementType : "visual";
    return elementType.toUpperCase();
  }
  if (clip.kind === "beat") {
    return clip.source.beatId?.replace(/^final-beat-/, "Beat ") || "Beat";
  }
  if (clip.kind === "voice" || clip.kind === "music" || clip.kind === "audio-event") {
    return clip.kind === "audio-event" ? "SFX" : clip.kind === "voice" ? "VOICE" : "MUSIC";
  }
  return sourceLabel(clip);
};

const clipColorClass = (clip: EditorClip) => `editor-clip-${clip.color || clip.kind}`;

const markerColorClass = (marker: { kind: string }) => `editor-marker-${marker.kind}`;

const rangeStyle = (range: ClipRange, durationSec: number) => ({
  left: `${clamp(range.startSec / durationSec * 100, 0, 100)}%`,
  width: `${Math.max(0.4, clamp((range.endSec - range.startSec) / durationSec * 100, 0, 100))}%`,
});

const layoutTrackClips = (clips: EditorClip[]): { clip: EditorClip; lane: number }[] => {
  const sorted = [...clips].sort((a, b) => a.range.startSec - b.range.startSec);
  const laneEnds: number[] = [];
  const result: { clip: EditorClip; lane: number }[] = [];
  for (const clipItem of sorted) {
    let assigned = false;
    for (let i = 0; i < laneEnds.length; i++) {
      if (laneEnds[i] <= clipItem.range.startSec) {
        laneEnds[i] = clipItem.range.endSec;
        result.push({ clip: clipItem, lane: i });
        assigned = true;
        break;
      }
    }
    if (!assigned) {
      laneEnds.push(clipItem.range.endSec);
      result.push({ clip: clipItem, lane: laneEnds.length - 1 });
    }
  }
  return result;
};

const TimelineWaveform: React.FC<{ src?: string; range: ClipRange }> = ({ src, range }) => {
  const durationSec = Math.max(0.5, range.endSec - range.startSec);
  const bins = Math.min(160, Math.max(28, Math.round(durationSec * 12)));
  const [levels, setLevels] = React.useState<number[] | null>(null);
  React.useEffect(() => {
    let active = true;
    if (!src || typeof window === "undefined") { setLevels(null); return () => { active = false; }; }
    loadWaveformLevels(src, bins)
      .then((peaks) => { if (active) setLevels(peaks); })
      .catch(() => { if (active) setLevels(null); });
    return () => { active = false; };
  }, [src, bins]);
  const bars = levels || Array.from({ length: bins }, (_, index) => 0.22 + ((index * 17) % 11) / 100);
  return <span className="editor-audio-visuals" aria-label={src ? "Decoded audio waveform" : "Audio waveform unavailable"}>
    <span className="editor-waveform">{bars.map((level, index) => <i key={index} style={{ height: `${Math.max(8, level * 100)}%` }} />)}</span>
    <span className="editor-waveform-label">{range.startSec.toFixed(1)}s</span>
  </span>;
};

const clipKeyframeMap = (clip: EditorClip): Record<string, ClipKeyframe[]> => {
  const record = clip.metadata.keyframes as Record<string, ClipKeyframe[]> | undefined;
  return record && typeof record === "object" ? record : {};
};

const KeyframeLane: React.FC<{
  clip: EditorClip;
  durationSec: number;
  onSelectKeyframe: (property: string, t: number) => void;
  onMoveKeyframe: (property: string, fromSec: number, toSec: number) => void;
}> = ({ clip, durationSec, onSelectKeyframe, onMoveKeyframe }) => {
  const map = clipKeyframeMap(clip);
  const properties = Object.keys(map);
  if (!properties.length) return null;
  return (
    <div className="editor-keyframe-lane" aria-label={`Keyframes for ${clip.label}`}>
      {properties.map((property) => (
        <div className="editor-keyframe-row" key={property}>
          <span className="editor-keyframe-prop">{property}</span>
          <span className="editor-keyframe-track">
            {map[property].map((key, index) => (
              <i
                key={`${property}-${index}`}
                className="editor-keyframe-diamond"
                style={{ left: `${clamp((clip.range.startSec + key.t) / durationSec * 100, 0, 100)}%` }}
                title={`${property} @ ${(clip.range.startSec + key.t).toFixed(2)}s = ${key.v}`}
                role="button"
                tabIndex={0}
                onClick={() => onSelectKeyframe(property, clip.range.startSec + key.t)}
                onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onSelectKeyframe(property, clip.range.startSec + key.t); }}
              />
            ))}
          </span>
        </div>
      ))}
    </div>
  );
};

export const EditorTimeline: React.FC<EditorTimelineProps> = (props) => {
  const {
    editor, selectionClipIds, currentSec, zoom, onZoomChange, onSeek, onSelectClip, onTrimClip, onTrimCommit, activeTool, onToolChange, onSplitClip, onRipple, onTrackStateChange, onRenameTrack, onAddLayer, onMoveClip, onDropAssetOnTrack, onSelectKeyframe, onMoveKeyframe, onDropEffectOnTrack, onAddTransitionAt, canUndo, canRedo, onUndo, onRedo,
  } = props;
  const canvasRef = React.useRef<HTMLDivElement>(null);
  const [draggingPlayhead, setDraggingPlayhead] = React.useState(false);
  const [trimDrag, setTrimDrag] = React.useState<{ clipId: string; edge: "start" | "end" } | null>(null);
  const [clipDrag, setClipDrag] = React.useState<{ clipId: string; startClientX: number; ghostDx: number; committed: boolean } | null>(null);
  const [rippleDelta, setRippleDelta] = React.useState(1);
  const [snapping, setSnapping] = React.useState(true);
  const [renaming, setRenaming] = React.useState<string | null>(null);
  const [renameValue, setRenameValue] = React.useState("");
  const [expandedTracks, setExpandedTracks] = React.useState<string[]>([]);
  const [dropTarget, setDropTarget] = React.useState<{ trackId: string; x: number } | null>(null);
  const [hoverSplitSec, setHoverSplitSec] = React.useState<number | null>(null);
  const [trackHeights, setTrackHeights] = React.useState<Record<string, number>>({});
  const [trackResize, setTrackResize] = React.useState<{ trackId: string; startY: number; startH: number } | null>(null);
  const [collapsedTracks, setCollapsedTracks] = React.useState<string[]>([]);
  const [expandedBeats, setExpandedBeats] = React.useState<string[]>([]);
  const [clipContextMenu, setClipContextMenu] = React.useState<{ x: number; y: number; clipId: string } | null>(null);
  const trimTimeRef = React.useRef(0);
  const duration = Math.max(0.05, editor.durationSec);
  const ticks = Array.from({ length: Math.ceil(duration) + 1 }, (_, index) => Math.min(duration, index));
  const TRACK_LABEL_W = 116;
  const secondsAtClientX = (clientX: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return currentSec;
    const trackWidth = rect.width - TRACK_LABEL_W;
    if (trackWidth <= 0) return 0;
    return clamp((clientX - rect.left - TRACK_LABEL_W) / trackWidth * duration, 0, duration);
  };
  const trackAreaPct = (sec: number) => `calc(${TRACK_LABEL_W}px + (100% - ${TRACK_LABEL_W}px) * ${clamp(sec / duration, 0, 1)})`;
  const seekFromPointer = (clientX: number) => onSeek(secondsAtClientX(clientX));
  const onPlayheadKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 1 : 1 / editor.fps;
    if (event.key === "ArrowLeft") { event.preventDefault(); onSeek(clamp(currentSec - step, 0, duration)); }
    if (event.key === "ArrowRight") { event.preventDefault(); onSeek(clamp(currentSec + step, 0, duration)); }
    if (event.key === "Home") { event.preventDefault(); onSeek(0); }
    if (event.key === "End") { event.preventDefault(); onSeek(duration); }
  };

  const snapCandidatesFor = (clip: EditorClip, trackId: string): number[] => {
    const candidates: number[] = [0];
    for (const track of editor.tracks) {
      for (const other of track.clips) {
        if (other.id === clip.id) continue;
        candidates.push(other.range.startSec, other.range.endSec);
      }
    }
    if (trackId === "video-main") candidates.push(duration);
    return [...new Set(candidates)].sort((a, b) => a - b);
  };

  const snappedStart = (clip: EditorClip, trackId: string, rawStart: number) => {
    if (!snapping) return rawStart;
    const threshold = 0.15 / zoom;
    let best = rawStart;
    let bestDistance = threshold;
    for (const candidate of snapCandidatesFor(clip, trackId)) {
      const distance = Math.abs(rawStart - candidate);
      if (distance < bestDistance) { best = candidate; bestDistance = distance; }
    }
    return best;
  };

  const onClipPointerDown = (event: React.PointerEvent, clip: EditorClip) => {
    if (clip.locked) return;
    if ((event.target as HTMLElement).closest(".editor-beat-toggle")) return;
    const track = displayTracks.find((t) => t.id === clip.trackId);
    if (track?.locked) return;
    if (activeTool === "split") { onSplitClip?.(clip, currentSec); return; }
    if (activeTool === "ripple") { onRipple?.(clip.range.startSec, rippleDelta); return; }
    if (activeTool === "trim") { onSelectClip(clip); return; }
    if ((event.target as HTMLElement).closest(".editor-trim-handle")) return;
    onSelectClip(clip);
    setClipDrag({ clipId: clip.id, startClientX: event.clientX, ghostDx: 0, committed: false });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onClipPointerMove = (event: React.PointerEvent) => {
    if (!clipDrag) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pxPerSec = (rect.width - TRACK_LABEL_W) / duration;
    const ghostDx = event.clientX - clipDrag.startClientX;
    setClipDrag({ ...clipDrag, ghostDx });
    const clip = editor.tracks.flatMap((t) => t.clips).find((c) => c.id === clipDrag.clipId);
    if (!clip) return;
    const rawStart = clip.range.startSec + ghostDx / pxPerSec;
    const start = snappedStart(clip, clip.trackId, rawStart);
    if (Math.abs(start - rawStart) < 0.001 && snapCandidatesFor(clip, clip.trackId).some((c) => Math.abs(rawStart - c) < 0.15 / zoom)) {
      setClipDrag((cur) => (cur ? { ...cur, snapPreviewSec: start } : cur));
    }
  };

  const onClipPointerUp = (event: React.PointerEvent) => {
    if (clipDrag) {
      const rect = canvasRef.current?.getBoundingClientRect();
      const clip = editor.tracks.flatMap((t) => t.clips).find((c) => c.id === clipDrag.clipId);
      if (clip && rect && Math.abs(clipDrag.ghostDx) > 3) {
        const pxPerSec = (rect.width - TRACK_LABEL_W) / duration;
        const rawStart = clip.range.startSec + clipDrag.ghostDx / pxPerSec;
        onMoveClip?.(clip.id, Math.max(0, snappedStart(clip, clip.trackId, rawStart)));
      }
      setClipDrag(null);
    }
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  const commitRename = (trackId: string) => {
    if (renameValue.trim()) onRenameTrack?.(trackId, renameValue.trim());
    setRenaming(null);
  };

  const onTrackDrop = (event: React.DragEvent, trackId: string) => {
    event.preventDefault();
    setDropTarget(null);
    const effectData = event.dataTransfer.getData("application/x-isaacverse-effect");
    const transitionData = event.dataTransfer.getData("application/x-isaacverse-transition");
    const assetRaw = event.dataTransfer.getData("application/x-isaacverse-asset");
    const timeSec = secondsAtClientX(event.clientX);
    if (effectData) { props.onDropEffectOnTrack?.(trackId, effectData, timeSec); return; }
    if (transitionData) { props.onAddTransitionAt?.(timeSec, transitionData); return; }
    if (!assetRaw) return;
    try {
      const payload = JSON.parse(assetRaw) as DropPayload;
      onDropAssetOnTrack?.(trackId, payload, timeSec);
    } catch { /* ignore */ }
  };

  const onTrackDragOver = (event: React.DragEvent, trackId: string) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setDropTarget({ trackId, x: event.clientX });
  };

  React.useEffect(() => {
    if (!trackResize) return;
    const onMove = (e: PointerEvent) => {
      const delta = e.clientY - trackResize.startY;
      setTrackHeights((cur) => ({ ...cur, [trackResize.trackId]: Math.max(42, Math.min(200, trackResize.startH + delta)) }));
    };
    const onUp = () => setTrackResize(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [trackResize]);

  const timelineWidthPct = `${zoom * 100}%`;

  const toggleBeatExpand = (clipId: string) => {
    setExpandedBeats((prev) => prev.includes(clipId) ? prev.filter((id) => id !== clipId) : [...prev, clipId]);
  };

  const mainTrack = editor.tracks.find((t) => t.kind === "video");
  const audioTrackKinds = ["voice", "music", "sfx", "transition"];
  const audioTracks = editor.tracks.filter((t) => audioTrackKinds.includes(t.kind));
  const isAutoVisual = (t: EditorTrack) => (t.kind === "overlay" || t.kind === "text") && !t.metadata?.userCreated;
  const isUserOverlay = (t: EditorTrack) => (t.kind === "overlay" || t.kind === "text") && t.metadata?.userCreated;
  const autoVisualTracks = editor.tracks.filter(isAutoVisual);
  const userOverlayTracks = editor.tracks.filter(isUserOverlay);
  const allElementClips = autoVisualTracks.flatMap((t) => t.clips);

  type DisplayTrack = EditorTrack & { isExpandedBeat?: boolean };
  const displayTracks: DisplayTrack[] = [];
  if (mainTrack) {
    displayTracks.push(mainTrack);
    for (const beatClip of mainTrack.clips) {
      if (expandedBeats.includes(beatClip.id)) {
        const beatId = beatClip.source.beatId;
        const beatElements = beatId
          ? allElementClips.filter((c) => c.source.beatId === beatId || c.parentClipId === beatClip.id)
          : allElementClips.filter((c) => c.parentClipId === beatClip.id);
        if (beatElements.length > 0) {
          displayTracks.push({
            id: `expanded:${beatClip.id}`,
            kind: "overlay",
            name: `${beatClip.label} · ${beatElements.length} elements`,
            order: 0,
            locked: false, muted: false, solo: false, hidden: false,
            source: { kind: "project", projectRef: "expanded-beat" },
            accepts: ["image", "video", "text"],
            capabilities: { visual: true, audio: false, canvas: true, trim: true, split: true, gain: false, fade: false, mute: false, solo: false },
            clips: beatElements,
            metadata: { isExpandedBeat: true, beatClipId: beatClip.id },
          });
        }
      }
    }
  }
  displayTracks.push(...userOverlayTracks);
  displayTracks.push(...audioTracks);

  return (
    <section className="editor-timeline" aria-label="Editable video timeline">
      <div className="editor-timeline-header">
        <div className="editor-timeline-title">
          <span className="editor-eyebrow">TIMELINE</span>
          <strong>{formatTime(currentSec)} / {formatTime(duration)}</strong>
        </div>
        <div className="editor-timeline-actions">
          <div className="editor-tool-tabs" aria-label="Timeline editing tools">
            {(["select", "trim", "split", "ripple"] as EditorTool[]).map((tool) => (
              <button key={tool} type="button" className={activeTool === tool ? "active" : ""} onClick={() => onToolChange(tool)}>{tool}</button>
            ))}
          </div>
          {activeTool === "ripple" ? <label className="editor-ripple-input">gap <input aria-label="Ripple amount" type="number" step="0.1" value={rippleDelta} onChange={(event) => setRippleDelta(Number(event.target.value))} />s</label> : null}
          <button type="button" className={snapping ? "active" : ""} onClick={() => setSnapping(!snapping)} title="Magnet snapping" aria-label="Toggle snapping">🧲</button>
          <button className="editor-add-track-button" type="button" onClick={() => onAddLayer?.("overlay")} aria-label="Add overlay layer">+ Overlay</button>
          <button className="editor-add-track-button" type="button" onClick={() => onAddLayer?.("audio")} aria-label="Add audio layer">+ Audio</button>
          <button type="button" onClick={() => onZoomChange(1)} aria-label="Zoom to fit" title="Zoom to fit">⊲⊳</button>
          <button type="button" onClick={() => onZoomChange(Math.max(1, zoom - 1))} aria-label="Zoom timeline out">−</button>
          <span>{zoom}x</span>
          <button type="button" onClick={() => onZoomChange(Math.min(6, zoom + 1))} aria-label="Zoom timeline in">+</button>
          <button type="button" onClick={onUndo} disabled={!canUndo} aria-label="Undo editor operation">↶</button>
          <button type="button" onClick={onRedo} disabled={!canRedo} aria-label="Redo editor operation">↷</button>
        </div>
      </div>
      <div className="editor-timeline-scroll">
        <div
          className="editor-timeline-canvas"
          ref={canvasRef}
          style={{ width: timelineWidthPct }}
          onClick={(event) => { if ((event.target as HTMLElement).closest("button") || (event.target as HTMLElement).closest(".editor-clip")) return; if (activeTool === "split") { const t = secondsAtClientX(event.clientX); const clip = editor.tracks.flatMap((tr) => tr.clips).find((c) => t >= c.range.startSec && t <= c.range.endSec && c.trackId !== "video-main"); if (clip) onSplitClip?.(clip, t); } else seekFromPointer(event.clientX); }}
          onPointerMove={(event) => { if (activeTool === "split") setHoverSplitSec(secondsAtClientX(event.clientX)); }}
          onPointerLeave={() => setHoverSplitSec(null)}
        >
          <div className="editor-timeline-ruler" aria-label="Timeline ruler">
            {ticks.map((tick) => <span key={tick} style={{ left: trackAreaPct(tick) }}>{formatTime(tick)}</span>)}
          </div>
          <div className="editor-marker-lane" aria-label="Beat and shot markers">
            {(editor.markers || []).map((marker) => (
              <button type="button" key={marker.id} className={`editor-marker ${markerColorClass(marker)}`} style={{ left: trackAreaPct(marker.range.startSec) }} title={`${marker.label} · ${formatTime(marker.range.startSec)}–${formatTime(marker.range.endSec)}`} aria-label={`${marker.kind} marker ${marker.label}`} onClick={(event) => { event.stopPropagation(); onSeek(marker.range.startSec); }} />
            ))}
          </div>
          {activeTool === "split" && hoverSplitSec !== null ? (
            <div className="editor-split-line" style={{ left: trackAreaPct(hoverSplitSec) }} aria-hidden="true" />
          ) : null}
          <div
            className={`editor-playhead ${draggingPlayhead ? "dragging" : ""}`}
            style={{ left: trackAreaPct(currentSec) }}
            role="slider"
            aria-label="Timeline playhead"
            aria-valuemin={0}
            aria-valuemax={duration}
            aria-valuenow={currentSec}
            tabIndex={0}
            onKeyDown={onPlayheadKeyDown}
            onPointerDown={(event) => { event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId); setDraggingPlayhead(true); seekFromPointer(event.clientX); }}
            onPointerMove={(event) => { if (draggingPlayhead) seekFromPointer(event.clientX); }}
            onPointerUp={(event) => { event.currentTarget.releasePointerCapture(event.pointerId); setDraggingPlayhead(false); }}
          />
          <div className="editor-track-list">
            {displayTracks.map((track) => {
              const isBeatSection = track.metadata?.isExpandedBeat === true;
              const laidOutClips = layoutTrackClips(track.clips);
              const laneCount = laidOutClips.reduce((max, item) => Math.max(max, item.lane + 1), 0);
              const isExpanded = expandedTracks.includes(track.id);
              const isCollapsed = collapsedTracks.includes(track.id);
              const hasKeyframes = track.clips.some((clip) => Object.keys(clipKeyframeMap(clip)).length > 0);
              const trackH = trackHeights[track.id] ?? 0;
              return (
                <React.Fragment key={track.id}>
                <div className={`editor-track-row ${track.hidden ? "hidden" : ""} ${dropTarget?.trackId === track.id ? "drop-target" : ""} ${activeTool === "split" ? "split-mode" : ""} ${activeTool === "trim" ? "trim-mode" : ""} ${isCollapsed ? "collapsed" : ""} ${isBeatSection ? "expanded-beat-section" : ""}`} style={trackH ? { minHeight: `${trackH}px` } : undefined} onDragOver={(event) => { if (!isBeatSection) onTrackDragOver(event, track.id); }} onDragLeave={() => setDropTarget(null)} onDrop={(event) => { if (!isBeatSection) onTrackDrop(event, track.id); }}>
                  <div className="editor-track-label" onDoubleClick={() => { if (!isBeatSection) { setRenaming(track.id); setRenameValue(track.name); } }}>
                    {renaming === track.id && !isBeatSection ? (
                      <input
                        className="editor-track-rename"
                        autoFocus
                        value={renameValue}
                        aria-label={`Rename ${track.name}`}
                        onChange={(event) => setRenameValue(event.target.value)}
                        onBlur={() => commitRename(track.id)}
                        onKeyDown={(event) => { if (event.key === "Enter") commitRename(track.id); if (event.key === "Escape") setRenaming(null); }}
                      />
                    ) : (
                      <strong title={isBeatSection ? track.name : `${track.kind} · ${track.clips.length} clips · double-click to rename`}>{track.name}</strong>
                    )}
                    {isBeatSection ? (
                      <div className="editor-track-controls">
                        <button type="button" aria-label="Collapse beat elements" onClick={(event) => { event.stopPropagation(); if (typeof track.metadata?.beatClipId === "string") toggleBeatExpand(track.metadata.beatClipId); }}>▲</button>
                      </div>
                    ) : (
                    <div className="editor-track-controls" aria-label={`${track.name} track controls`}>
                      <button type="button" className={track.hidden ? "active" : ""} aria-label={`Hide ${track.name}`} onClick={(event) => { event.stopPropagation(); onTrackStateChange?.(track.id, { hidden: !track.hidden }); }}>👁</button>
                      {track.capabilities.mute ? <button type="button" className={track.muted ? "active" : ""} aria-label={`Mute ${track.name}`} onClick={(event) => { event.stopPropagation(); onTrackStateChange?.(track.id, { muted: !track.muted }); }}>M</button> : null}
                      {track.capabilities.solo ? <button type="button" className={track.solo ? "active" : ""} aria-label={`Solo ${track.name}`} onClick={(event) => { event.stopPropagation(); onTrackStateChange?.(track.id, { solo: !track.solo }); }}>S</button> : null}
                      <button type="button" className={track.locked ? "active" : ""} aria-label={`Lock ${track.name}`} onClick={(event) => { event.stopPropagation(); onTrackStateChange?.(track.id, { locked: !track.locked }); }}>🔒</button>
                      <button type="button" className={isCollapsed ? "active" : ""} aria-label={`Collapse ${track.name}`} onClick={(event) => { event.stopPropagation(); setCollapsedTracks((cur) => (isCollapsed ? cur.filter((id) => id !== track.id) : [...cur, track.id])); }}>▼</button>
                      {hasKeyframes ? <button type="button" className={isExpanded ? "active" : ""} aria-label={`Expand ${track.name} keyframes`} onClick={(event) => { event.stopPropagation(); setExpandedTracks((cur) => (isExpanded ? cur.filter((id) => id !== track.id) : [...cur, track.id])); }}>◇</button> : null}
                    </div>
                    )}
                  </div>
                   <div className="editor-track-lane" aria-label={`${track.name} track`} style={{ minHeight: `${Math.max(50, laneCount * TIMELINE_LANE_HEIGHT + 8)}px` }}>
                    {laidOutClips.map(({ clip, lane }) => {
                      const dragging = clipDrag?.clipId === clip.id;
                      const ghostStyle: React.CSSProperties = dragging ? { transform: `translateX(${clipDrag!.ghostDx}px)`, opacity: 0.75, zIndex: 30 } : {};
                      return (
                        <React.Fragment key={clip.id}>
                          <button
                            type="button"
                            data-clip-id={clip.id}
                            className={`editor-clip ${clipColorClass(clip)} ${selectionClipIds.includes(clip.id) ? "selected" : ""} ${clip.locked || track.locked ? "locked" : ""} ${dragging ? "dragging" : ""}`}
                             style={{ ...rangeStyle(clip.range, duration), top: `${6 + lane * TIMELINE_LANE_HEIGHT}px`, bottom: `${6 + (laneCount - lane - 1) * TIMELINE_LANE_HEIGHT}px`, ...ghostStyle }}
                            title={`${clip.label} · ${formatTime(clip.range.startSec)}–${formatTime(clip.range.endSec)}`}
                            aria-label={`${clip.label} clip from ${formatTime(clip.range.startSec)} to ${formatTime(clip.range.endSec)}`}
                            onPointerDown={(event) => onClipPointerDown(event, clip)}
                            onPointerMove={(event) => onClipPointerMove(event)}
                            onPointerUp={(event) => onClipPointerUp(event)}
                            onClick={(event) => { if (clipDrag || activeTool !== "select") { event.stopPropagation(); } }}
                            onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); const rect = canvasRef.current?.getBoundingClientRect(); if (rect) setClipContextMenu({ x: event.clientX - rect.left, y: event.clientY - rect.top, clipId: clip.id }); }}
                          >
                            <span
                              className="editor-trim-handle editor-trim-start"
                              style={{ display: track.capabilities.trim === false ? "none" : undefined }}
                              aria-label={`Trim start of ${clip.label}`}
                              onClick={(event) => event.stopPropagation()}
                              onPointerDown={(event) => { if ((!onTrimClip && !onTrimCommit) || clip.locked || track.locked) return; event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId); setTrimDrag({ clipId: clip.id, edge: "start" }); trimTimeRef.current = secondsAtClientX(event.clientX); onTrimClip?.(clip, "start", trimTimeRef.current); }}
                              onPointerMove={(event) => { if (trimDrag?.clipId === clip.id && trimDrag.edge === "start") { trimTimeRef.current = secondsAtClientX(event.clientX); onTrimClip?.(clip, "start", trimTimeRef.current); } }}
                              onPointerUp={(event) => { if (trimDrag?.clipId === clip.id) { event.currentTarget.releasePointerCapture(event.pointerId); onTrimCommit?.(clip, "start", trimTimeRef.current); setTrimDrag(null); } }}
                            />
                            <span className="editor-clip-label">{clip.label}</span>
                            <small className="editor-clip-meta">{clipMetaLabel(clip)}</small>
                            {typeof clip.metadata.src === "string" && !clip.metadata.isTextClip ? <span className="editor-clip-img-preview" style={{ backgroundImage: `url(${clip.metadata.src})` }} /> : null}
                            {clip.metadata.elementType === "shape" && typeof clip.metadata.background === "string" ? <span className="editor-clip-shape-preview" style={{ background: clip.metadata.background }} /> : null}
                            {clip.kind === "voice" || clip.kind === "music" || clip.kind === "audio-event" ? <TimelineWaveform src={typeof clip.metadata.src === "string" ? clip.metadata.src : undefined} range={clip.range} /> : null}
                            <span
                              className="editor-trim-handle editor-trim-end"
                              style={{ display: track.capabilities.trim === false ? "none" : undefined }}
                              aria-label={`Trim end of ${clip.label}`}
                              onClick={(event) => event.stopPropagation()}
                              onPointerDown={(event) => { if ((!onTrimClip && !onTrimCommit) || clip.locked || track.locked) return; event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId); setTrimDrag({ clipId: clip.id, edge: "end" }); trimTimeRef.current = secondsAtClientX(event.clientX); onTrimClip?.(clip, "end", trimTimeRef.current); }}
                              onPointerMove={(event) => { if (trimDrag?.clipId === clip.id && trimDrag.edge === "end") { trimTimeRef.current = secondsAtClientX(event.clientX); onTrimClip?.(clip, "end", trimTimeRef.current); } }}
                              onPointerUp={(event) => { if (trimDrag?.clipId === clip.id) { event.currentTarget.releasePointerCapture(event.pointerId); onTrimCommit?.(clip, "end", trimTimeRef.current); setTrimDrag(null); } }}
                            />
                          </button>
                          {clip.kind === "beat" ? (
                            <span
                              className="editor-beat-toggle"
                              role="button"
                              tabIndex={0}
                              aria-label={expandedBeats.includes(clip.id) ? "Collapse beat elements" : "Expand beat elements"}
                              style={{ position: "absolute", left: `calc(${clamp(clip.range.startSec / duration * 100, 0, 100)}% + 4px)`, top: `${6 + lane * TIMELINE_LANE_HEIGHT + 2}px`, zIndex: 10 }}
                              onClick={(event) => { event.stopPropagation(); toggleBeatExpand(clip.id); }}
                              onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.stopPropagation(); toggleBeatExpand(clip.id); } }}
                            >
                              {expandedBeats.includes(clip.id) ? "\u25BC" : "\u25B8"}
                            </span>
                          ) : null}
                          {isExpanded ? (
                            <div className="editor-keyframe-lane-host" style={{ top: `${6 + lane * TIMELINE_LANE_HEIGHT + 24}px` }}>
                              <KeyframeLane clip={clip} durationSec={duration} onSelectKeyframe={(property, t) => onSelectKeyframe?.(clip.id, property, t)} onMoveKeyframe={(property, fromSec, toSec) => onMoveKeyframe?.(clip.id, property, fromSec, toSec)} />
                            </div>
                          ) : null}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
                <div className="editor-track-divider" role="separator" aria-label={`Resize ${track.name} height`} onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); setTrackResize({ trackId: track.id, startY: event.clientY, startH: trackHeights[track.id] ?? 42 }); }} />
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
      {clipContextMenu ? (
        <div className="ic-context-menu editor-clip-menu" style={{ left: clipContextMenu.x, top: clipContextMenu.y }} onPointerDown={(e) => e.stopPropagation()}>
          <button type="button" onClick={() => { const clip = editor.tracks.flatMap((t) => t.clips).find((c) => c.id === clipContextMenu.clipId); if (clip) onSplitClip?.(clip, currentSec); setClipContextMenu(null); }}>Split at playhead</button>
          <button type="button" onClick={() => { onSelectClip(editor.tracks.flatMap((t) => t.clips).find((c) => c.id === clipContextMenu.clipId)!); setClipContextMenu(null); }}>Select</button>
          <hr />
          <button type="button" onClick={() => { setClipContextMenu(null); window.dispatchEvent(new KeyboardEvent("keydown", { key: "d", ctrlKey: true })); }}>Duplicate</button>
          <button type="button" onClick={() => { setClipContextMenu(null); window.dispatchEvent(new KeyboardEvent("keydown", { key: "Delete" })); }}>Delete</button>
        </div>
      ) : null}
    </section>
  );
};

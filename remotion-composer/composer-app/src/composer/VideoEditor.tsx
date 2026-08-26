import React from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { IsaacVerseEditVideo } from "../../../shared/isaacverse/EditVideo";
import type { IsaacVerseEditDoc } from "../../../shared/isaacverse/types";
import type { EditorAsset, EditorClip, EditorDoc } from "../../../shared/isaacverse/editor";
import { projectEditDocToEditor } from "../../../shared/isaacverse/editorProjection";
import { loadProject, saveEditor, subscribeToChanges } from "./api";
import { EditorTimeline } from "../editor/EditorTimeline";
import { InteractiveCanvas } from "../canvas/InteractiveCanvas";
import { LeftRail, type LeftTab } from "./LeftRail";
import { PropertiesPanel, type KeyframeTarget, type PropTab } from "./PropertiesPanel";
import { AgentPanel } from "../agent/AgentPanel";
import {
  addClipKeyframe,
  addClipToTrack,
  addOverlayClip,
  addTextClip,
  addTrackLayer,
  addTransitionClip,
  deleteEditorClip,
  duplicateEditorClip,
  groupClips,
  groupOfClip,
  migrateEditorDoc,
  moveGroupClips,
  moveClipInTimeSafe,
  moveClipKeyframe,
  removeClipKeyframe,
  renameEditorTrack,
  rippleEditorDoc,
  setClipKeyframeEasing,
  setEditorClipAudioState,
  setEditorClipMetadata,
  setEditorClipRange,
  setEditorClipSpeed,
  setEditorTrackState,
  setTrackFilter,
  ungroupClips,
  ungroupClipsByMember,
  splitEditorClip,
  trimEditorClip,
  addCharacterPresenceClip,
} from "../editor/editorOperations";

const formatTime = (seconds: number) => {
  const safe = Math.max(0, seconds);
  const m = Math.floor(safe / 60);
  const s = Math.floor(safe % 60);
  const cs = Math.floor((safe % 1) * 100);
  return `${m}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
};

const documentDuration = (doc: IsaacVerseEditDoc) => Math.max(1, ...doc.beats.map((b) => b.startSec + b.durationSec));

const NUMERIC_KEYFRAME_PROPS = ["x", "y", "w", "h", "rotation", "opacity", "scale", "fontSize", "letterSpacing", "lineHeight", "strokeWidth", "shadowBlur", "glowBlur", "brightness", "contrast", "saturation"];

const ResponsivePlayer: React.FC<{
  playerRef: React.RefObject<PlayerRef>;
  doc: IsaacVerseEditDoc;
  editor: EditorDoc;
  durationSec: number;
  zoom: number;
  children?: React.ReactNode;
}> = ({ playerRef, doc, editor, durationSec, zoom, children }) => {
  const hostRef = React.useRef<HTMLDivElement>(null);
  const [fitSize, setFitSize] = React.useState({ width: 0, height: 0 });

  React.useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof ResizeObserver === "undefined") return;
    const update = () => {
      const rect = host.getBoundingClientRect();
      const aspect = doc.width / doc.height;
      const width = Math.min(rect.width, rect.height * aspect);
      setFitSize({ width: Math.max(0, width), height: Math.max(0, width / aspect) });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(host);
    return () => observer.disconnect();
  }, [doc.width, doc.height]);

  const stageWidth = fitSize.width * zoom;
  const stageHeight = fitSize.height * zoom;
  const inputProps = React.useMemo(() => ({ doc, editor }), [doc, editor]);

  return (
    <div ref={hostRef} className="ve-player-stage">
      <div className="ve-player-stage-inner" style={{ width: stageWidth, height: stageHeight }}>
        <Player
          ref={playerRef}
          component={IsaacVerseEditVideo}
          inputProps={inputProps}
          durationInFrames={Math.ceil(durationSec * doc.fps)}
          fps={doc.fps}
          compositionWidth={doc.width}
          compositionHeight={doc.height}
          inFrame={0}
          outFrame={Math.ceil(durationSec * doc.fps) - 1}
          initialFrame={0}
          style={{ width: "100%", height: "100%" }}
          acknowledgeRemotionLicense
        />
        {children}
      </div>
    </div>
  );
};

const ExportDialog: React.FC<{
  open: boolean;
  durationSec: number;
  onClose: () => void;
  onExport: (settings: { resolution: number; quality: string }) => void;
  exporting: boolean;
  exportState: { status: string; message?: string; outputUrl?: string; elapsedSec?: number } | null;
}> = ({ open, durationSec, onClose, onExport, exporting, exportState }) => {
  const [resolution, setResolution] = React.useState(1080);
  const [quality, setQuality] = React.useState("draft");
  const bitrates: Record<string, number> = { draft: 2.5, standard: 5.5, high: 11 };
  const scale = resolution / 1080;
  const estimateMb = Math.max(0.5, (durationSec * bitrates[quality] * scale * scale) / 8);
  if (!open) return null;
  return (
    <div className="ve-modal-backdrop" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ve-modal">
        <div className="ve-modal-head"><strong>Export video</strong><button type="button" onClick={onClose}>×</button></div>
        <div className="ve-export-body">
          <div className="ve-prop-section">
            <label className="ve-prop-field">
              <span>Resolution</span>
              <select value={resolution} onChange={(e) => setResolution(Number(e.target.value))}>
                <option value={360}>360p (draft preview)</option>
                <option value={540}>540p</option>
                <option value={720}>720p</option>
                <option value={1080}>1080p (Full HD)</option>
              </select>
            </label>
            <label className="ve-prop-field">
              <span>Quality</span>
              <select value={quality} onChange={(e) => setQuality(e.target.value)}>
                <option value="draft">Draft (fast)</option>
                <option value="standard">Standard</option>
                <option value="high">High (slow)</option>
              </select>
            </label>
          </div>
          <p className="ve-export-estimate">Duration {durationSec.toFixed(1)}s · 30 fps · MP4 · estimated ≈ {estimateMb.toFixed(1)} MB</p>
          {exporting || exportState ? (
            <div className="ve-export-progress">
              <div className="ve-spinner" />
              <span>{exportState?.status === "done" ? "Export finished" : exportState?.status === "error" ? `Export failed: ${exportState.message}` : `Rendering… ${exportState?.elapsedSec ? `${exportState.elapsedSec}s elapsed` : ""}`}</span>
              {exportState?.status === "done" && exportState.outputUrl ? <a className="ve-btn" href={exportState.outputUrl} download>Download MP4</a> : null}
            </div>
          ) : (
            <button className="ve-btn primary" type="button" onClick={() => onExport({ resolution, quality })}>Start export</button>
          )}
        </div>
      </div>
    </div>
  );
};

export const VideoEditor: React.FC<{ projectId?: string; onExit?: () => void; onOpenStudio?: () => void }> = ({ projectId = "isaacverse-final", onExit, onOpenStudio }) => {
  const playerRef = React.useRef<PlayerRef>(null);
  const stageWrapRef = React.useRef<HTMLDivElement>(null);
  const [doc, setDoc] = React.useState<IsaacVerseEditDoc | null>(null);
  const [editorDoc, setEditorDoc] = React.useState<EditorDoc | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [currentFrame, setCurrentFrame] = React.useState(0);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [editorZoom, setEditorZoom] = React.useState(1);
  const [timelineHeight, setTimelineHeight] = React.useState(() => (typeof window !== "undefined" ? Math.round(window.innerHeight * 0.38) : 320));
  const [editorUndo, setEditorUndo] = React.useState<EditorDoc[]>([]);
  const [editorRedo, setEditorRedo] = React.useState<EditorDoc[]>([]);
  const [statusMessage, setStatusMessage] = React.useState("Loading project…");
  const [activeTool, setActiveTool] = React.useState<"select" | "trim" | "split" | "ripple">("select");
  const [selectedClipIds, setSelectedClipIds] = React.useState<string[]>([]);
  const [poseList, setPoseList] = React.useState<string[]>(["present", "think", "point-right", "celebrate"]);
  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/assets/bridge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op: "list-poses", project: projectId }) })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data?.poses)) {
          const names = data.poses.map((p: { name: string }) => p.name).filter((n: string) => typeof n === "string");
          if (names.length) setPoseList(names);
        }
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [projectId]);

  const [leftTab, setLeftTab] = React.useState<LeftTab>("media");
  const [propTab, setPropTab] = React.useState<PropTab>("transform");
  const [canvasZoom, setCanvasZoom] = React.useState(1);
  const [previewVolume, setPreviewVolume] = React.useState(1);
  const [previewMuted, setPreviewMuted] = React.useState(false);
  const [armedProps, setArmedProps] = React.useState<Record<string, string[]>>({});
  const [selectedKeyframe, setSelectedKeyframe] = React.useState<KeyframeTarget | null>(null);
  const [autoFocusText, setAutoFocusText] = React.useState(false);
  const [showShortcuts, setShowShortcuts] = React.useState(false);
  const [saveState, setSaveState] = React.useState<"idle" | "saving" | "saved">("idle");
  const localSaveGuard = React.useRef(false);
  const [leftPanelWidth, setLeftPanelWidth] = React.useState(220);
  const [rightPanelWidth, setRightPanelWidth] = React.useState(280);
  const [rightPanelMode, setRightPanelMode] = React.useState<"properties" | "agent">("properties");
  const [timeEditing, setTimeEditing] = React.useState(false);
  const [timeInput, setTimeInput] = React.useState("");
  const [exportOpen, setExportOpen] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const [exportState, setExportState] = React.useState<{ status: string; message?: string; outputUrl?: string; elapsedSec?: number } | null>(null);
  const clipboardRef = React.useRef<{ kind: string; label: string; duration: number; metadata: Record<string, unknown> }[]>([]);

  const saveRef = React.useRef<{ editorDoc: EditorDoc; doc: IsaacVerseEditDoc } | null>(null);
  saveRef.current = editorDoc && doc ? { editorDoc, doc } : null;

  React.useEffect(() => {
    let active = true;
    loadProject(projectId).then((snapshot) => {
      if (!active) return;
      if (!snapshot.editDoc) throw new Error("Project has no edit document");
      setDoc(snapshot.editDoc);
      const projected = snapshot.editorDoc || projectEditDocToEditor(snapshot.editDoc, { projectId });
      setEditorDoc(migrateEditorDoc(projected));
      setStatusMessage(`Loaded ${projectId} · ${snapshot.state.currentVersion}`);
    }).catch((error: unknown) => {
      if (active) setLoadError(error instanceof Error ? error.message : String(error));
    });
    return () => { active = false; };
  }, [projectId]);

  React.useEffect(() => {
    const unsub = subscribeToChanges((changedId) => {
      if (changedId !== projectId) return;
      if (localSaveGuard.current) return;
      loadProject(projectId).then((snapshot) => {
        if (!snapshot.editDoc) return;
        setDoc(snapshot.editDoc);
        const projected = snapshot.editorDoc || projectEditDocToEditor(snapshot.editDoc, { projectId });
        setEditorDoc(migrateEditorDoc(projected));
        setStatusMessage(`Synced from external change · ${snapshot.state.currentVersion}`);
      }).catch(() => { /* ignore sync errors */ });
    });
    return unsub;
  }, [projectId]);

  React.useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    const onFrame = ({ detail }: { detail: { frame: number } }) => setCurrentFrame(detail.frame);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    player.addEventListener("frameupdate", onFrame);
    player.addEventListener("play", onPlay);
    player.addEventListener("pause", onPause);
    return () => {
      player.removeEventListener("frameupdate", onFrame);
      player.removeEventListener("play", onPlay);
      player.removeEventListener("pause", onPause);
    };
  }, [doc?.version]);

  const derivedAssets: EditorAsset[] = React.useMemo(() => {
    if (!editorDoc) return [];
    const seen = new Map<string, EditorAsset>();
    const addAsset = (src: string, kind: EditorAsset["kind"], name: string, provenance: EditorAsset["provenance"] = "project") => {
      if (!seen.has(src)) seen.set(src, { id: seen.size ? `media:${seen.size}` : "media:0", name, src, kind, provenance });
    };
    for (const track of editorDoc.tracks) {
      for (const clip of track.clips) {
        const src = typeof clip.metadata.src === "string" ? clip.metadata.src : undefined;
        if (!src) continue;
        if (clip.kind === "voice" || clip.kind === "music" || clip.kind === "audio-event") addAsset(src, "audio", clip.label);
        else if (clip.metadata.assetKind === "video") addAsset(src, "video", clip.label);
        else addAsset(src, "image", clip.label);
      }
    }
    for (const asset of editorDoc.assets || []) addAsset(asset.src, asset.kind, asset.name, asset.provenance);
    return [...seen.values()].map((asset, index) => ({ ...asset, id: editorDoc.assets?.find((a) => a.src === asset.src)?.id || `media:${index}` }));
  }, [editorDoc]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return;
      if (e.code === "Space") { e.preventDefault(); togglePlay(); return; }
      if (e.key === "t" || e.key === "T") { void handleAddText("heading"); return; }
      if (e.key === "s" || e.key === "S") {
        const clip = selectedClip;
        if (clip && currentSec > clip.range.startSec && currentSec < clip.range.endSec) { void handleSplit(clip, currentSec); }
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") { void handleDeleteClips(); return; }
      if ((e.ctrlKey || e.metaKey) && (e.key === "z" || e.key === "Z")) { e.preventDefault(); if (e.shiftKey) void handleRedo(); else void handleUndo(); return; }
      if ((e.ctrlKey || e.metaKey) && (e.key === "d" || e.key === "D")) { e.preventDefault(); if (selectedClip) void handleDuplicate(selectedClip.id); return; }
      if ((e.ctrlKey || e.metaKey) && (e.key === "c" || e.key === "C")) { if (selectedClipIds.length) handleCopy(); return; }
      if ((e.ctrlKey || e.metaKey) && (e.key === "v" || e.key === "V")) { void handlePaste(); return; }
      if ((e.ctrlKey || e.metaKey) && (e.key === "g" || e.key === "G")) { e.preventDefault(); if (e.shiftKey) { for (const clipId of selectedClipIds) void handleUngroup(clipId); } else void handleGroup(); return; }
      if (e.key === "Escape") { setSelectedClipIds([]); setShowShortcuts(false); return; }
      if (e.key === "?") { e.preventDefault(); setShowShortcuts((v) => !v); return; }
      if (e.key.startsWith("Arrow") && selectedClipIds.length) {
        const step = e.shiftKey ? 0.05 : 0.01;
        for (const clipId of selectedClipIds) {
          const clip = editorDoc?.tracks.flatMap((t) => t.clips).find((c) => c.id === clipId);
          if (!clip) continue;
          const x = typeof clip.metadata.x === "number" ? clip.metadata.x : 0.1;
          const y = typeof clip.metadata.y === "number" ? clip.metadata.y : 0.1;
          if (e.key === "ArrowLeft") void commitClip(clipId, { x: x - step });
          if (e.key === "ArrowRight") void commitClip(clipId, { x: x + step });
          if (e.key === "ArrowUp") void commitClip(clipId, { y: y - step });
          if (e.key === "ArrowDown") void commitClip(clipId, { y: y + step });
        }
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const playerInputProps = React.useMemo(() => (doc && editorDoc ? { doc, editor: editorDoc } : null), [doc, editorDoc]);

  if (!doc || !editorDoc) return <div className="ve-loading"><strong>{loadError ? "Load error" : "Loading project"}</strong><span>{loadError || projectId}</span></div>;

  const fps = doc.fps;
  const durationSec = Math.max(documentDuration(doc), editorDoc.durationSec);
  const currentSec = currentFrame / fps;
  const selectedClip = selectedClipIds.length === 1 ? editorDoc.tracks.flatMap((t) => t.clips).find((c) => c.id === selectedClipIds[0]) : undefined;
  const selectedTrack = selectedClip ? editorDoc.tracks.find((t) => t.id === selectedClip.trackId) : undefined;
  const canDelete = Boolean(selectedClip) && selectedTrack?.id !== "video-main";
  const overlayClips = editorDoc.tracks.filter((t) => t.kind === "overlay" || t.kind === "text").flatMap((t) => t.clips);

  const saveRevision = async (next: EditorDoc, message: string, opts?: { pushUndo?: boolean }) => {
    const current = saveRef.current;
    if (!current) return;
    if (opts?.pushUndo !== false) {
      setEditorUndo((cur) => [...cur, current.editorDoc]);
      setEditorRedo([]);
    }
    setSaveState("saving");
    localSaveGuard.current = true;
    const saved = await saveEditor(projectId, next, current.doc.version ?? "v001");
    setEditorDoc(saved);
    setStatusMessage(message);
    setSaveState("saved");
    setTimeout(() => { setSaveState("idle"); localSaveGuard.current = false; }, 1500);
    return saved;
  };
  const handleAddPresence = (options: { pose: string; position: string; size: string; motion: string }) => {
    if (!editorDoc) return;
    const clip = selectedClipIds.length === 1 ? editorDoc.tracks.flatMap((track) => track.clips).find((c) => c.id === selectedClipIds[0]) : undefined;
    if (!clip || clip.kind !== "beat") return;
    const next = addCharacterPresenceClip(editorDoc, {
      pose: options.pose,
      position: options.position as never,
      size: options.size as never,
      motion: options.motion as never,
      startSec: clip.range.startSec,
      durationSec: clip.range.endSec - clip.range.startSec,
    });
    void saveRevision(next, `Added character presence (${options.pose})`);
  };

  const selectedKeyframesAt = (clipId: string, timeSec: number) => {
    const clip = editorDoc.tracks.flatMap((t) => t.clips).find((c) => c.id === clipId);
    if (!clip) return false;
    const record = clip.metadata.keyframes as Record<string, { t: number }[]> | undefined;
    return Object.values(record || {}).some((keys) => keys.some((key) => Math.abs(key.t - (timeSec - clip.range.startSec)) < 0.02));
  };

  const commitClip = async (clipId: string, changes: Record<string, unknown>) => {
    const clip = editorDoc.tracks.flatMap((t) => t.clips).find((c) => c.id === clipId);
    if (!clip) return;
    const armed = armedProps[clipId] || [];
    const keyframed: Record<string, number> = {};
    const plain: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(changes)) {
      if (armed.includes(key) && NUMERIC_KEYFRAME_PROPS.includes(key) && typeof value === "number") keyframed[key] = value;
      else plain[key] = value;
    }
    let next = editorDoc;
    for (const [property, value] of Object.entries(keyframed)) {
      next = addClipKeyframe(next, clipId, property, currentSec, value);
    }
    if (Object.keys(plain).length) next = setEditorClipMetadata(next, clipId, plain);
    if (next !== editorDoc) await saveRevision(next, `Updated ${clip.label}`);
  };

  const togglePlay = () => {
    const player = playerRef.current;
    if (!player) return;
    if (player.isPlaying()) player.pause();
    else player.play();
  };

  const seek = (sec: number) => {
    const clamped = Math.min(durationSec, Math.max(0, sec));
    playerRef.current?.seekTo(Math.round(clamped * fps));
    setCurrentFrame(Math.round(clamped * fps));
  };

  const seekFromEditor = (sec: number) => {
    setActiveTool("select");
    seek(sec);
  };

  const handleVolumeChange = (volume: number) => {
    setPreviewVolume(volume);
    setPreviewMuted(false);
    playerRef.current?.setVolume(volume);
  };

  const toggleMute = () => {
    const muted = !previewMuted;
    setPreviewMuted(muted);
    playerRef.current?.setVolume(muted ? 0 : previewVolume);
  };

  const handleFullscreen = () => {
    const stage = stageWrapRef.current;
    if (!stage) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void stage.requestFullscreen?.();
  };

  const applyZOrder = async (clipId: string, action: "forward" | "backward" | "front" | "back") => {
    const zs = overlayClips.map((c) => (typeof c.metadata.z === "number" ? c.metadata.z : 10));
    const current = editorDoc.tracks.flatMap((t) => t.clips).find((c) => c.id === clipId);
    if (!current) return;
    const curZ = typeof current.metadata.z === "number" ? current.metadata.z : 10;
    let nextZ = curZ;
    if (action === "front") nextZ = (zs.length ? Math.max(...zs) : 10) + 1;
    else if (action === "back") nextZ = (zs.length ? Math.min(...zs) : 10) - 1;
    else if (action === "forward") nextZ = curZ + 2;
    else nextZ = curZ - 2;
    await commitClip(clipId, { z: nextZ });
  };

  const handleDuplicate = async (clipId: string) => {
    try {
      const next = duplicateEditorClip(editorDoc, clipId, currentSec);
      await saveRevision(next, "Duplicated clip");
    } catch (e) { setStatusMessage(e instanceof Error ? e.message : String(e)); }
  };

  const handleDeleteClips = async () => {
    if (!selectedClipIds.length) return;
    try {
      let next = editorDoc;
      for (const clipId of selectedClipIds) {
        const clip = next.tracks.flatMap((t) => t.clips).find((c) => c.id === clipId);
        if (!clip) continue;
        const track = next.tracks.find((t) => t.id === clip.trackId);
        if (track?.id === "video-main") continue;
        next = deleteEditorClip(next, clipId);
      }
      await saveRevision(next, `Deleted ${selectedClipIds.length} clip(s)`);
      setSelectedClipIds([]);
    } catch (e) { setStatusMessage(e instanceof Error ? e.message : String(e)); }
  };

  const handleCopy = () => {
    const clips = editorDoc.tracks.flatMap((t) => t.clips).filter((c) => selectedClipIds.includes(c.id));
    clipboardRef.current = clips.map((clip) => ({ kind: clip.kind, label: clip.label, duration: clip.range.endSec - clip.range.startSec, metadata: { ...clip.metadata } }));
    setStatusMessage(`Copied ${clips.length} clip(s)`);
  };

  const handlePaste = async () => {
    const items = clipboardRef.current;
    if (!items.length) return;
    try {
      let next = editorDoc;
      let added = 0;
      let offset = 0;
      for (const item of items) {
        const clip: EditorClip = {
          id: `clip:paste:${Date.now()}:${offset}`,
          kind: item.kind as EditorClip["kind"],
          trackId: item.kind === "voice" || item.kind === "music" || item.kind === "audio-event" ? (next.tracks.find((t) => t.kind === item.kind || t.id === "voice" || t.id === "music" || t.id === "sfx")?.id ?? "voice") : (item.metadata.isTextClip ? "text-overlay" : next.tracks.find((t) => t.metadata?.userCreated === true && (t.kind === "overlay" || t.kind === "text"))?.id ?? `track:overlay:paste:${Date.now()}`),
          range: { startSec: Math.min(durationSec, currentSec + offset), endSec: Math.min(durationSec + item.duration, currentSec + offset + item.duration) },
          sourceRange: undefined,
          label: item.label,
          source: {},
          linkedClipIds: [],
          locked: false,
          muted: false,
          hidden: false,
          metadata: item.metadata,
        };
        const targetExists = next.tracks.some((t) => t.id === clip.trackId);
        if (targetExists) next = addClipToTrack(next, clip.trackId, clip);
        else {
          const newTrack = {
            id: clip.trackId,
            kind: item.metadata.isTextClip ? "text" as const : "overlay" as const,
            name: item.metadata.isTextClip ? "Overlay" : "Overlay",
            order: next.tracks.length,
            locked: false, muted: false, solo: false, hidden: false,
            source: { kind: "generated" as const, generatorId: "paste" },
            accepts: ["image" as const, "video" as const, "text" as const],
            capabilities: { visual: true, audio: false, canvas: true, trim: true, split: true, gain: false, fade: false, mute: false, solo: false },
            clips: [clip],
            metadata: { userCreated: true },
          };
          next = { ...next, tracks: [...next.tracks, newTrack] };
        }
        added += 1;
        offset += 0.2;
      }
      await saveRevision(next, `Pasted ${added} clip(s)`);
    } catch (e) { setStatusMessage(e instanceof Error ? e.message : String(e)); }
  };

  const handleUpload = async (file: File) => {
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error || new Error("Read failed"));
        reader.readAsDataURL(file);
      });
      const response = await fetch("/api/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: file.name, data }) });
      const payload = await response.json() as { url?: string; error?: string };
      if (!response.ok || !payload.url) throw new Error(payload.error || "Upload failed");
      const kind = file.type.startsWith("audio/") ? "audio" as const : file.type.startsWith("video/") ? "video" as const : "image" as const;
      const next: EditorDoc = {
        ...editorDoc,
        assets: [...(editorDoc.assets || []), { id: `asset:${Date.now()}`, name: file.name, src: payload.url, kind, provenance: "local-upload" as const }],
        revision: { ...editorDoc.revision, revision: editorDoc.revision.revision + 1 },
      };
      await saveRevision(next, `Uploaded ${file.name}`);
    } catch (e) { setStatusMessage(e instanceof Error ? e.message : String(e)); }
  };

  const handleAddText = async (preset: "heading" | "body" | "caption" | "lower-third" = "heading") => {
    try {
      const text = preset === "heading" ? "Add a heading" : preset === "body" ? "Add body text" : preset === "caption" ? "Caption" : "Lower third";
      const next = addTextClip(editorDoc, text, currentSec, 3, preset);
      await saveRevision(next, "Added text clip");
      const newClip = next.tracks.flatMap((t) => t.clips).find((c) => c.metadata.isTextClip && Math.abs(c.range.startSec - currentSec) < 0.1);
      if (newClip) { setSelectedClipIds([newClip.id]); setPropTab("text"); setAutoFocusText(true); }
    } catch (e) { setStatusMessage(e instanceof Error ? e.message : String(e)); }
  };

  const handleAddAssetAtPlayhead = async (assetId: string) => {
    try {
      const asset = editorDoc.assets?.find((candidate) => candidate.id === assetId);
      if (!asset) throw new Error("Unknown asset");
      const next = asset.kind === "audio" ? addAssetToAudioTrack(editorDoc, asset, currentSec) : addOverlayClip(editorDoc, assetId, currentSec);
      await saveRevision(next, `Added ${asset.name} to timeline`);
    } catch (e) { setStatusMessage(e instanceof Error ? e.message : String(e)); }
  };

  const addAssetToAudioTrack = (editor: EditorDoc, asset: EditorAsset, startSec: number): EditorDoc => {
    const audioTrack = editor.tracks.find((t) => (t.kind === "music" || t.kind === "voice" || t.kind === "sfx") && (t.metadata?.userCreated === true || t.id === "music"));
    const clip: EditorClip = {
      id: `clip:audio:${asset.id}:${Date.now()}`,
      kind: "music",
      trackId: audioTrack?.id ?? "music",
      range: { startSec, endSec: Math.min(editor.durationSec, startSec + 3) },
      label: asset.name,
      source: { assetId: asset.id },
      linkedClipIds: [],
      locked: false, muted: false, hidden: false,
      metadata: { src: asset.src, assetId: asset.id, assetKind: "audio", gainDb: -6, speed: 1 },
    };
    return addClipToTrack(editor, clip.trackId, clip);
  };

  const handleApplyFilterOrEffect = async (filterId: string) => {
    if (!selectedClip) { setStatusMessage("Select an overlay or text clip first."); return; }
    await commitClip(selectedClip.id, { filter: filterId });
  };

  const handleAddTransition = async (type: string) => {
    try {
      const next = addTransitionClip(editorDoc, currentSec, type, 0.5);
      await saveRevision(next, `Added ${type} transition`);
    } catch (e) { setStatusMessage(e instanceof Error ? e.message : String(e)); }
  };

  const handleAddTransitionAt = async (timeSec: number, type: string) => {
    try {
      const next = addTransitionClip(editorDoc, timeSec, type, 0.5);
      await saveRevision(next, `Added ${type} transition at ${timeSec.toFixed(1)}s`);
    } catch (e) { setStatusMessage(e instanceof Error ? e.message : String(e)); }
  };

  const handleBrandColor = async (color: string) => {
    if (!selectedClip) { setStatusMessage("Select a text clip first."); return; }
    await commitClip(selectedClip.id, { color });
  };

  const handleBrandFont = async (font: string) => {
    if (!selectedClip) { setStatusMessage("Select a text clip first."); return; }
    await commitClip(selectedClip.id, { fontFamily: font });
  };

  const handleSplit = async (clip: EditorClip, timeSec: number) => {
    try {
      const next = splitEditorClip(editorDoc, clip.id, timeSec);
      await saveRevision(next, `Split ${clip.label} at ${formatTime(timeSec)}`);
    } catch (e) { setStatusMessage(e instanceof Error ? e.message : String(e)); }
  };

  const handleTrimLive = (clip: EditorClip, edge: "start" | "end", timeSec: number) => {
    try {
      setEditorDoc(trimEditorClip(editorDoc, clip.id, edge, timeSec, 1 / fps));
    } catch { /* ignore */ }
  };

  const handleTrimCommit = async (clip: EditorClip, edge: "start" | "end", timeSec: number) => {
    try {
      const next = trimEditorClip(editorDoc, clip.id, edge, timeSec, 1 / fps);
      await saveRevision(next, `Trimmed ${clip.label}`);
    } catch (e) { setStatusMessage(e instanceof Error ? e.message : String(e)); }
  };

  const handleRipple = async (fromSec: number, deltaSec: number) => {
    try {
      const next = rippleEditorDoc(editorDoc, fromSec, deltaSec);
      await saveRevision(next, `Rippled ${deltaSec}s`);
    } catch (e) { setStatusMessage(e instanceof Error ? e.message : String(e)); }
  };

  const handleTrackState = async (trackId: string, changes: { muted?: boolean; solo?: boolean; locked?: boolean; hidden?: boolean }) => {
    try {
      await saveRevision(setEditorTrackState(editorDoc, trackId, changes), "Updated track");
    } catch (e) { setStatusMessage(e instanceof Error ? e.message : String(e)); }
  };

  const handleRenameTrack = async (trackId: string, name: string) => {
    try {
      await saveRevision(renameEditorTrack(editorDoc, trackId, name), `Renamed track to ${name}`);
    } catch (e) { setStatusMessage(e instanceof Error ? e.message : String(e)); }
  };

  const handleAddLayer = async (kind: "overlay" | "audio") => {
    try {
      await saveRevision(addTrackLayer(editorDoc, kind), `Added ${kind} layer`);
    } catch (e) { setStatusMessage(e instanceof Error ? e.message : String(e)); }
  };

  const handleMoveClip = async (clipId: string, newStartSec: number) => {
    try {
      await saveRevision(moveClipInTimeSafe(editorDoc, clipId, newStartSec), "Moved clip");
    } catch (e) { setStatusMessage(e instanceof Error ? e.message : String(e)); }
  };

  const handleDropOnTrack = async (trackId: string, payload: { src: string; kind: string; assetId?: string; name?: string }, timeSec: number) => {
    try {
      let next = editorDoc;
      if (payload.kind === "audio") {
        const clip: EditorClip = {
          id: `clip:audio:${Date.now()}`,
          kind: "music",
          trackId,
          range: { startSec: timeSec, endSec: Math.min(durationSec, timeSec + 3) },
          label: payload.name || "Audio",
          source: {},
          linkedClipIds: [],
          locked: false, muted: false, hidden: false,
          metadata: { src: payload.src, assetKind: "audio", gainDb: -6, speed: 1 },
        };
        next = addClipToTrack(next, trackId, clip);
      } else {
        const assetId = payload.assetId || `asset:drop:${Date.now()}`;
        if (!next.assets?.some((asset) => asset.id === assetId)) {
          next = { ...next, assets: [...(next.assets || []), { id: assetId, name: payload.name || "Media", src: payload.src, kind: (payload.kind as "image" | "video"), provenance: "local-upload" as const }] };
        }
        next = addOverlayClip(next, assetId, timeSec);
      }
      await saveRevision(next, `Added ${payload.name || payload.kind} to timeline`);
    } catch (e) { setStatusMessage(e instanceof Error ? e.message : String(e)); }
  };

  const handleGroup = async () => {
    if (selectedClipIds.length < 2) return;
    try {
      const next = groupClips(editorDoc, selectedClipIds);
      await saveRevision(next, `Grouped ${selectedClipIds.length} elements`);
    } catch (e) { setStatusMessage(e instanceof Error ? e.message : String(e)); }
  };

  const handleUngroup = async (clipId: string) => {
    try {
      const next = ungroupClipsByMember(editorDoc, clipId);
      if (next !== editorDoc) await saveRevision(next, "Ungrouped");
    } catch (e) { setStatusMessage(e instanceof Error ? e.message : String(e)); }
  };

  const handleCanvasMove = async (clipId: string, x: number, y: number) => {
    await commitClip(clipId, { x, y });
  };

  const handleCanvasResize = async (clipId: string, patch: { x: number; y: number; w: number; h: number }) => {
    await commitClip(clipId, patch);
  };

  const handleCanvasRotate = async (clipId: string, rotation: number) => {
    await commitClip(clipId, { rotation });
  };

  const handleZOrder = async (clipId: string, action: "forward" | "backward" | "front" | "back") => {
    await applyZOrder(clipId, action);
  };

  const handleFlip = async (clipId: string, axis: "h" | "v") => {
    const clip = editorDoc.tracks.flatMap((t) => t.clips).find((c) => c.id === clipId);
    if (!clip) return;
    const key = axis === "h" ? "flipH" : "flipV";
    await commitClip(clipId, { [key]: !clip.metadata[key] });
  };

  const handleSetSpeed = async (speed: number) => {
    if (!selectedClip) return;
    try {
      const next = setEditorClipSpeed(editorDoc, selectedClip.id, speed);
      await saveRevision(next, `Set speed to ${speed}x`);
    } catch (e) { setStatusMessage(e instanceof Error ? e.message : String(e)); }
  };

  const handleToggleArm = (property: string, currentValue: number) => {
    if (!selectedClip) return;
    const clipId = selectedClip.id;
    const armed = armedProps[clipId] || [];
    const already = armed.includes(property);
    if (already) {
      const hasKey = selectedKeyframesAt(clipId, currentSec);
      if (hasKey) {
        const next = removeClipKeyframe(editorDoc, clipId, property, currentSec);
        void saveRevision(next, `Removed ${property} keyframe`);
      }
      setArmedProps((cur) => ({ ...cur, [clipId]: armed.filter((p) => p !== property) }));
      return;
    }
    setArmedProps((cur) => ({ ...cur, [clipId]: [...armed, property] }));
    const next = addClipKeyframe(editorDoc, clipId, property, currentSec, currentValue);
    void saveRevision(next, `Keyframed ${property}`);
  };

  const handleUndo = async () => {
    const prev = editorUndo[editorUndo.length - 1];
    if (!prev || !doc) return;
    try {
      const saved = await saveEditor(projectId, prev, doc.version ?? "v001");
      setEditorUndo((cur) => cur.slice(0, -1));
      setEditorRedo((cur) => [...cur, editorDoc]);
      setEditorDoc(saved);
      setStatusMessage("Undo");
    } catch (e) { setStatusMessage(e instanceof Error ? e.message : String(e)); }
  };

  const handleRedo = async () => {
    const next = editorRedo[editorRedo.length - 1];
    if (!next || !doc) return;
    try {
      const saved = await saveEditor(projectId, next, doc.version ?? "v001");
      setEditorRedo((cur) => cur.slice(0, -1));
      setEditorUndo((cur) => [...cur, editorDoc]);
      setEditorDoc(saved);
      setStatusMessage("Redo");
    } catch (e) { setStatusMessage(e instanceof Error ? e.message : String(e)); }
  };

  const handleExport = async (settings: { resolution: number; quality: string }) => {
    setExporting(true);
    setExportState({ status: "rendering", elapsedSec: 0 });
    try {
      const response = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, quality: settings.quality, scale: settings.resolution / 1080 }),
      });
      const payload = await response.json() as { jobId?: string; error?: string; outputPath?: string };
      if (!response.ok || !payload.jobId) throw new Error(payload.error || "Render start failed");
      const jobId = payload.jobId;
      const startedAt = Date.now();
      const poll = setInterval(async () => {
        try {
          const statusResponse = await fetch(`/api/render/status?projectId=${projectId}&jobId=${jobId}`);
          const status = await statusResponse.json() as { status: string; message?: string; outputUrl?: string };
          if (status.status === "done") {
            clearInterval(poll);
            setExportState({ status: "done", outputUrl: status.outputUrl });
            setExporting(false);
          } else if (status.status === "error") {
            clearInterval(poll);
            setExportState({ status: "error", message: status.message });
            setExporting(false);
          } else {
            setExportState({ status: "rendering", elapsedSec: Math.round((Date.now() - startedAt) / 1000) });
          }
        } catch {
          setExportState({ status: "rendering", elapsedSec: Math.round((Date.now() - startedAt) / 1000) });
        }
      }, 1500);
    } catch (e) {
      setExportState({ status: "error", message: e instanceof Error ? e.message : String(e) });
      setExporting(false);
    }
  };

  const onResizerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = timelineHeight;
    const onMove = (ev: PointerEvent) => {
      const vh = window.innerHeight;
      setTimelineHeight(Math.min(Math.round(vh * 0.72), Math.max(160, startH + (startY - ev.clientY))));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
    document.body.style.userSelect = "none";
    document.body.style.cursor = "row-resize";
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <div className="video-editor" style={{ "--timeline-height": `${timelineHeight}px` } as React.CSSProperties}>
      <header className="ve-header">
        <div className="ve-header-left">
          {onExit ? <button type="button" className="ve-back-btn" onClick={onExit} aria-label="Back to projects" title="Back to projects">←</button> : null}
          <h1>IsaacVerse Editor</h1>
          <small>{projectId} · {doc.version ?? "v001"} · 1920×1080 · {fps} fps</small>
        </div>
        <div className="ve-header-right">
          {onOpenStudio ? <button className="ve-btn ve-studio-btn" type="button" onClick={onOpenStudio} title="Mở Asset Studio — tạo poses cho character">🎨 Asset Studio</button> : null}
          <button onClick={handleUndo} disabled={!editorUndo.length} aria-label="Undo" title={`Undo (${editorUndo.length})`}>↶{editorUndo.length ? <sup>{editorUndo.length}</sup> : null}</button>
          <button onClick={handleRedo} disabled={!editorRedo.length} aria-label="Redo" title={`Redo (${editorRedo.length})`}>↷{editorRedo.length ? <sup>{editorRedo.length}</sup> : null}</button>
          <button className="ve-btn primary ve-export-btn" type="button" onClick={() => setExportOpen(true)}>Export</button>
        </div>
      </header>

      <div className="ve-body" style={{ gridTemplateColumns: `${leftPanelWidth}px 4px 1fr 4px ${rightPanelWidth}px` }}>
        <LeftRail
          tab={leftTab}
          onTabChange={setLeftTab}
          editor={editorDoc}
          derivedAssets={derivedAssets}
          selectedClip={selectedClip}
          onUpload={(file) => void handleUpload(file)}
          onAddText={(preset) => void handleAddText(preset)}
          onAddAssetAtPlayhead={(assetId) => void handleAddAssetAtPlayhead(assetId)}
          onApplyFilter={(filterId) => void handleApplyFilterOrEffect(filterId)}
          onApplyEffect={(effectId) => void handleApplyFilterOrEffect(effectId)}
          onAddTransition={(type) => void handleAddTransition(type)}
          onApplyBrandColor={(color) => void handleBrandColor(color)}
          onApplyBrandFont={(font) => void handleBrandFont(font)}
        />
        <div className="ve-panel-divider ve-divider-left" role="separator" aria-label="Resize left panel" onPointerDown={(e) => { e.preventDefault(); const startX = e.clientX; const startW = leftPanelWidth; const onMove = (ev: PointerEvent) => setLeftPanelWidth(Math.max(140, Math.min(400, startW + (ev.clientX - startX)))); const onUp = () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); document.body.style.cursor = ""; document.body.style.userSelect = ""; }; window.addEventListener("pointermove", onMove); window.addEventListener("pointerup", onUp); document.body.style.cursor = "col-resize"; document.body.style.userSelect = "none"; }} />

        <main className="ve-preview">
          <div className="ve-canvas-wrap" ref={stageWrapRef}>
            <ResponsivePlayer playerRef={playerRef} doc={doc} editor={editorDoc} durationSec={durationSec} zoom={canvasZoom}>
              <InteractiveCanvas
                editor={editorDoc}
                currentSec={currentSec}
                selectionClipIds={selectedClipIds}
                groups={(editorDoc.groups || []).map((g) => ({ id: g.id, name: g.name, clipIds: g.clipIds }))}
                onSelect={(ids) => { setSelectedClipIds(ids); setPropTab("transform"); }}
                onMoveCommit={(clipId, x, y) => void handleCanvasMove(clipId, x, y)}
                onResizeCommit={(clipId, patch) => void handleCanvasResize(clipId, patch)}
                onRotateCommit={(clipId, rotation) => void handleCanvasRotate(clipId, rotation)}
                onZOrder={(clipId, action) => void handleZOrder(clipId, action)}
                onFlip={(clipId, axis) => void handleFlip(clipId, axis)}
                onDuplicate={(clipId) => void handleDuplicate(clipId)}
                onDelete={(clipId) => { setSelectedClipIds([clipId]); void handleDeleteClips(); }}
                onGroup={(clipIds) => { setSelectedClipIds(clipIds); void handleGroup(); }}
                onUngroup={(clipId) => void handleUngroup(clipId)}
                onTextEdit={(clipId, text) => void commitClip(clipId, { text, label: text.slice(0, 30) || "Text" })}
              />
            </ResponsivePlayer>
          </div>
          <div className="ve-transport" aria-label="Playback controls">
            <button type="button" onClick={() => seek(0)} aria-label="Go to start" title="Go to start">⏮</button>
            <button type="button" className="ve-play" onClick={togglePlay} aria-label={isPlaying ? "Pause" : "Play"}>{isPlaying ? "⏸" : "▶"}</button>
            <button type="button" onClick={() => seek(durationSec)} aria-label="Go to end" title="Go to end">⏭</button>
            {timeEditing ? (
              <input className="ve-time-input" type="text" value={timeInput} autoFocus aria-label="Seek to time" placeholder="0:07.5" onBlur={() => { const parts = timeInput.split(":"); let sec = 0; if (parts.length === 2) sec = parseInt(parts[0]) * 60 + parseFloat(parts[1]); else sec = parseFloat(timeInput); if (Number.isFinite(sec)) seek(sec); setTimeEditing(false); }} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setTimeEditing(false); }} onChange={(e) => setTimeInput(e.target.value)} />
            ) : (
              <button className="ve-time-display" type="button" onClick={() => { setTimeInput(formatTime(currentSec)); setTimeEditing(true); }} title="Click to seek">{formatTime(currentSec)} / {formatTime(durationSec)}</button>
            )}
            <span className="ve-transport-spacer" />
            <button type="button" onClick={toggleMute} aria-label={previewMuted ? "Unmute preview" : "Mute preview"}>{previewMuted ? "🔇" : "🔊"}</button>
            <input className="ve-volume" type="range" min={0} max={1} step={0.05} value={previewMuted ? 0 : previewVolume} aria-label="Preview volume" onChange={(e) => handleVolumeChange(Number(e.target.value))} />
            <select className="ve-zoom-select" value={canvasZoom} aria-label="Canvas zoom" onChange={(e) => setCanvasZoom(Number(e.target.value))}>
              <option value={1}>Fit</option>
              <option value={0.5}>50%</option>
              <option value={0.75}>75%</option>
              <option value={1.25}>125%</option>
              <option value={1.5}>150%</option>
              <option value={2}>200%</option>
            </select>
            <button type="button" onClick={handleFullscreen} aria-label="Fullscreen preview" title="Fullscreen preview">⛶</button>
          </div>
        </main>

        <div className="ve-panel-divider ve-divider-right" role="separator" aria-label="Resize right panel" onPointerDown={(e) => { e.preventDefault(); const startX = e.clientX; const startW = rightPanelWidth; const onMove = (ev: PointerEvent) => setRightPanelWidth(Math.max(180, Math.min(500, startW - (ev.clientX - startX)))); const onUp = () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); document.body.style.cursor = ""; document.body.style.userSelect = ""; }; window.addEventListener("pointermove", onMove); window.addEventListener("pointerup", onUp); document.body.style.cursor = "col-resize"; document.body.style.userSelect = "none"; }} />

        <aside className="ve-right-panel" style={{ width: rightPanelWidth }}>
          <div className="ve-right-tabs">
            <button className={`ve-right-tab ${rightPanelMode === "properties" ? "active" : ""}`} onClick={() => setRightPanelMode("properties")}>Properties</button>
            <button className={`ve-right-tab ${rightPanelMode === "agent" ? "active" : ""}`} onClick={() => setRightPanelMode("agent")}>Agent</button>
          </div>
          {rightPanelMode === "agent" ? (
            <AgentPanel projectId={projectId} currentSec={currentSec} />
          ) : selectedClip ? (
            <PropertiesPanel
              clip={selectedClip}
              tab={propTab}
              onTabChange={setPropTab}
              autoFocusText={autoFocusText}
              onAutoFocusTextDone={() => setAutoFocusText(false)}
              armedProps={armedProps[selectedClip.id] || []}
              onToggleArm={(property, currentValue) => handleToggleArm(property, currentValue)}
              selectedKeyframe={selectedKeyframe}
              onSetEasing={(property, t, easing) => {
                const next = setClipKeyframeEasing(editorDoc, selectedClip.id, property, t, easing);
                void saveRevision(next, "Updated keyframe easing");
              }}
              onCommit={(changes) => void commitClip(selectedClip.id, changes)}
              onCommitRange={(range) => {
                const next = setEditorClipRange(editorDoc, selectedClip.id, range);
                void saveRevision(next, "Updated clip timing");
              }}
              onDelete={() => void handleDeleteClips()}
              onDuplicate={() => void handleDuplicate(selectedClip.id)}
              canDelete={canDelete}
              onZOrder={(action) => void handleZOrder(selectedClip.id, action)}
              onFlip={(axis) => void handleFlip(selectedClip.id, axis)}
              onSetSpeed={(speed) => void handleSetSpeed(speed)}
              poseList={poseList}
              onAddPresence={handleAddPresence}
            />
          ) : (
            <div className="ve-project-panel">
              <div className="ve-panel-title">Canvas</div>
              <div className="ve-prop-section">
                <label className="ve-prop-field">
                  <span>Aspect ratio</span>
                  <select value="16:9" disabled>
                    <option>16:9 (1920×1080)</option>
                  </select>
                </label>
                <label className="ve-prop-field">
                  <span>Frame rate</span>
                  <select value={fps} disabled>
                    <option value={30}>30 fps</option>
                  </select>
                </label>
              </div>
              <div className="ve-prop-section">
                <span className="ve-prop-label-row"><span>Duration</span></span>
                <span>{formatTime(durationSec)}</span>
                <span className="ve-prop-label-row"><span>Version</span></span>
                <span>{doc.version ?? "v001"}</span>
              </div>
              <div className="ve-panel-title">Shortcuts</div>
              <div className="ve-shortcuts">
                <span>Space — play/pause</span>
                <span>T — add text</span>
                <span>S — split clip</span>
                <span>Del — delete</span>
                <span>Ctrl+D — duplicate</span>
                <span>Ctrl+C/V — copy/paste</span>
                <span>Ctrl+G — group</span>
                <span>Ctrl+Z — undo</span>
                <span>? — show all shortcuts</span>
                <span>Double-click text — edit inline</span>
              </div>
            </div>
          )}
        </aside>
      </div>

      <div className="ve-timeline-resizer" role="separator" aria-orientation="horizontal" aria-label="Resize timeline" onPointerDown={onResizerPointerDown} />

      <div className="ve-timeline-dock">
        <EditorTimeline
          editor={editorDoc}
          selectionClipIds={selectedClipIds}
          currentSec={currentSec}
          zoom={editorZoom}
          onZoomChange={setEditorZoom}
          onSeek={seekFromEditor}
          onSelectClip={(clip) => { setSelectedClipIds([clip.id]); setPropTab("transform"); }}
          onTrimClip={handleTrimLive}
          onTrimCommit={(clip, edge, timeSec) => void handleTrimCommit(clip, edge, timeSec)}
          activeTool={activeTool}
          onToolChange={setActiveTool}
          onSplitClip={(clip, timeSec) => void handleSplit(clip, timeSec)}
          onRipple={(fromSec, deltaSec) => void handleRipple(fromSec, deltaSec)}
          onTrackStateChange={(trackId, changes) => void handleTrackState(trackId, changes)}
          onRenameTrack={(trackId, name) => void handleRenameTrack(trackId, name)}
          onAddLayer={(kind) => void handleAddLayer(kind)}
          onMoveClip={(clipId, newStartSec) => void handleMoveClip(clipId, newStartSec)}
          onDropAssetOnTrack={(trackId, payload, timeSec) => void handleDropOnTrack(trackId, payload, timeSec)}
          onSelectKeyframe={(clipId, property, t) => setSelectedKeyframe({ clipId, property, t })}
          onMoveKeyframe={(clipId, property, fromSec, toSec) => {
            const next = moveClipKeyframe(editorDoc, clipId, property, fromSec, toSec);
            void saveRevision(next, "Moved keyframe");
          }}
          onDropEffectOnTrack={(trackId, effectId) => {
            const next = setTrackFilter(editorDoc, trackId, effectId);
            void saveRevision(next, `Applied ${effectId} to track`);
          }}
          onAddTransitionAt={(timeSec, transitionType) => void handleAddTransitionAt(timeSec, transitionType)}
          canUndo={editorUndo.length > 0}
          canRedo={editorRedo.length > 0}
          onUndo={() => void handleUndo()}
          onRedo={() => void handleRedo()}
        />
      </div>

      <div className="ve-status-bar"><span>{statusMessage}</span><span className={`ve-autosave ${saveState}`}>{saveState === "saving" ? "saving..." : saveState === "saved" ? "saved ✓" : ""}</span></div>

      {showShortcuts ? (
        <div className="ve-shortcut-overlay" onClick={() => setShowShortcuts(false)}>
          <div className="ve-shortcut-panel" onClick={(e) => e.stopPropagation()}>
            <h3>Keyboard shortcuts</h3>
            <div className="sc"><span>Play / Pause</span><kbd>Space</kbd></div>
            <div className="sc"><span>Add text</span><kbd>T</kbd></div>
            <div className="sc"><span>Split clip</span><kbd>S</kbd></div>
            <div className="sc"><span>Delete</span><kbd>Del</kbd></div>
            <div className="sc"><span>Undo</span><kbd>Ctrl+Z</kbd></div>
            <div className="sc"><span>Redo</span><kbd>Ctrl+Shift+Z</kbd></div>
            <div className="sc"><span>Duplicate</span><kbd>Ctrl+D</kbd></div>
            <div className="sc"><span>Copy</span><kbd>Ctrl+C</kbd></div>
            <div className="sc"><span>Paste</span><kbd>Ctrl+V</kbd></div>
            <div className="sc"><span>Group</span><kbd>Ctrl+G</kbd></div>
            <div className="sc"><span>Ungroup</span><kbd>Ctrl+Shift+G</kbd></div>
            <div className="sc"><span>Nudge element</span><kbd>Arrows</kbd></div>
            <div className="sc"><span>Nudge 5x</span><kbd>Shift+Arrows</kbd></div>
            <div className="sc"><span>Deselect</span><kbd>Esc</kbd></div>
            <div className="sc"><span>This help</span><kbd>?</kbd></div>
          </div>
        </div>
      ) : null}

      <ExportDialog open={exportOpen} durationSec={durationSec} onClose={() => setExportOpen(false)} onExport={(settings) => void handleExport(settings)} exporting={exporting} exportState={exportState} />
    </div>
  );
};

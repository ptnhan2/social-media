import React from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { IsaacVerseEditVideo } from "../../../shared/isaacverse/EditVideo";
import { applyPatch as applyLocalPatch, type ApplyScope, type EditPatch, type FeedbackCategory, type FeedbackRecord } from "../../../shared/isaacverse/feedback";
import type { IsaacVerseEditDoc, SemanticBeat } from "../../../shared/isaacverse/types";
import type { EditorClip, EditorDoc } from "../../../shared/isaacverse/editor";
import { projectEditDocToEditor } from "../../../shared/isaacverse/editorProjection";
import { beatAudioSummary, beatEndSec, beatMotionSummary, beatQaStatus, createFeedbackRecord, treatmentLabel } from "./model";
import { applyPatch as applyPersistedPatch, artifactUrl, handoffToKilo, loadKiloInbox, loadProject, loadReviewQueue, operate, rollbackVersion as rollbackPersistedVersion, saveEditor, saveFeedback, saveReviewQueue, updateKiloHandoff } from "./api";
import type { OperationResult } from "../../../shared/isaacverse/operations";
import { EditSurface } from "../canvas/EditSurface";
import { canvasElementsToPatch, editBeatToCanvas, hasCanvasChanges } from "../canvas/beatAdapter";
import type { CanvasElement } from "../canvas/types";
import { CANVAS_H, CANVAS_W } from "../canvas/types";
import { deriveReviewSlices, frameRangeForReviewSlice, type FeedbackRequest, type ReviewQueue, type ReviewSlice, type ReviewStatus } from "../../../shared/isaacverse/review";
import { downsampleWaveform } from "./waveform";
import { EditorTimeline } from "../editor/EditorTimeline";
import { editorReducer, initialEditorState } from "../editor/editorReducer";
import { addAssetTrack, deleteEditorTrack, reorderEditorTrack, rippleEditorDoc, setEditorClipAudioState, setEditorTrackState, setEditorTransitionState, splitEditorClip, trimEditorClip } from "../editor/editorOperations";

type PreviewMode = "before" | "after";
type VersionEntry = { id: string; patch: EditPatch; before: IsaacVerseEditDoc; after: IsaacVerseEditDoc; appliedAt: string };

const feedbackOptions: { id: FeedbackCategory; label: string }[] = [
  { id: "too-busy", label: "Too busy" },
  { id: "too-slow", label: "Too slow" },
  { id: "wrong-visual", label: "Wrong visual" },
  { id: "weak-transition", label: "Weak transition" },
  { id: "motion-too-strong", label: "Motion too strong" },
  { id: "motion-too-flat", label: "Motion too flat" },
  { id: "text-unreadable", label: "Text unreadable" },
  { id: "wrong-typography", label: "Wrong typography" },
  { id: "sfx-too-loud", label: "SFX too loud" },
  { id: "sfx-missing", label: "SFX missing" },
  { id: "music-covers-voice", label: "Music covers voice" },
  { id: "asset-generic", label: "Asset feels generic" },
  { id: "not-cinematic", label: "Not cinematic" },
  { id: "not-supporting-story", label: "Doesn't support story" },
  { id: "custom", label: "Custom note" },
];

const formatTime = (seconds: number) => {
  const safe = Math.max(0, seconds);
  return `${Math.floor(safe / 60)}:${String(Math.floor(safe % 60)).padStart(2, "0")}`;
};

const formatExactTime = (seconds: number) => `${Math.floor(Math.max(0, seconds) / 60)}:${String((Math.max(0, seconds) % 60).toFixed(2)).padStart(5, "0")}`;

const qaText: Record<ReturnType<typeof beatQaStatus>, string> = {
  ready: "Ready",
  review: "Review",
  attention: "Attention",
};

const treatmentGlyph: Record<string, string> = {
  "audience-demand-proof": "AUD",
  "screen-proof-in-world": "SCR",
  "host-reflection-cinematic": "HOST",
  "semantic-diagram": "MAP",
  "candidate-comparison": "TAKE",
  "process-timeline": "FLOW",
  "cinematic-metaphor": "MET",
  "chapter-card": "CH",
};

const documentDuration = (doc: IsaacVerseEditDoc) => Math.max(1, ...doc.beats.map(beatEndSec), ...(doc.transitions || []).map((transition) => transition.atSec + transition.durationSec));

const beatAsset = (beat: SemanticBeat) => beat.treatment.assets.find((asset) => asset.kind === "screen" || asset.kind === "image" || asset.kind === "character");

const ResponsivePlayer: React.FC<{
  playerRef: React.RefObject<PlayerRef>;
  doc: IsaacVerseEditDoc;
  durationSec: number;
  inFrame: number;
  outFrame: number;
}> = ({ playerRef, doc, durationSec, inFrame, outFrame }) => {
  const hostRef = React.useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = React.useState({ width: 0, height: 0 });

  React.useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof ResizeObserver === "undefined") return;
    const updateStageSize = () => {
      const rect = host.getBoundingClientRect();
      const aspect = doc.width / doc.height;
      const width = Math.min(rect.width, rect.height * aspect);
      setStageSize({ width: Math.max(0, width), height: Math.max(0, width / aspect) });
    };
    updateStageSize();
    const observer = new ResizeObserver(updateStageSize);
    observer.observe(host);
    return () => observer.disconnect();
  }, [doc.width, doc.height]);

  return (
    <div ref={hostRef} className="composer-player-stage">
      <div className="composer-player-stage-inner" style={{ width: stageSize.width, height: stageSize.height }}>
        <Player
          ref={playerRef}
          component={IsaacVerseEditVideo}
          inputProps={{ doc }}
          durationInFrames={Math.ceil(durationSec * doc.fps)}
          fps={doc.fps}
          compositionWidth={doc.width}
          compositionHeight={doc.height}
          inFrame={inFrame}
          outFrame={outFrame}
          initialFrame={inFrame}
          style={{ width: "100%", height: "100%" }}
          controls
          loop
          moveToBeginningWhenEnded
          acknowledgeRemotionLicense
        />
      </div>
    </div>
  );
};

const BeatThumbnail: React.FC<{ beat: SemanticBeat }> = ({ beat }) => {
  const asset = beatAsset(beat);
  return (
    <div className={`composer-thumb treatment-${beat.treatment.id}`}>
      {asset ? <img src={asset.src} alt="" /> : <span>{treatmentGlyph[beat.treatment.id] ?? "SHOT"}</span>}
      <i />
    </div>
  );
};

const Waveform: React.FC<{ src?: string; dense?: boolean }> = ({ src, dense = false }) => {
  const [levels, setLevels] = React.useState<number[] | null>(null);
  React.useEffect(() => {
    let active = true;
    if (!src || typeof window === "undefined") { setLevels(null); return () => { active = false; }; }
    const AudioContextCtor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return () => { active = false; };
    const context = new AudioContextCtor();
    fetch(src).then((response) => response.arrayBuffer()).then((data) => context.decodeAudioData(data)).then((buffer) => {
      if (active) setLevels(downsampleWaveform(buffer.getChannelData(0), dense ? 22 : 16));
      void context.close();
    }).catch(() => { if (active) setLevels(null); void context.close(); });
    return () => { active = false; void context.close(); };
  }, [src, dense]);
  const bars = levels || Array.from({ length: dense ? 22 : 16 }, () => 0.22);
  return <span className={`composer-waveform ${dense ? "dense" : ""}`} aria-label={src ? "Audio waveform" : "Waveform unavailable"}>{bars.map((level, index) => <i key={index} style={{ height: `${Math.max(10, level * 100)}%` }} />)}</span>;
};

const BeatCard: React.FC<{
  beat: SemanticBeat;
  index: number;
  doc: IsaacVerseEditDoc;
  selected: boolean;
  feedbackCount: number;
  onSelect: () => void;
}> = ({ beat, index, doc, selected, feedbackCount, onSelect }) => {
  const audio = beatAudioSummary(doc, beat.id);
  const qa = beatQaStatus(doc, beat);
  return (
    <button className={`composer-beat ${selected ? "selected" : ""}`} onClick={onSelect} aria-pressed={selected}>
      <span className="composer-beat-num">{String(index + 1).padStart(2, "0")}</span>
      <span className="composer-beat-main">
        <span className="composer-beat-topline"><strong>{formatTime(beat.startSec)}–{formatTime(beatEndSec(beat))}</strong><em className={`qa qa-${qa}`}><b />{qaText[qa]}</em></span>
        <span className="composer-beat-story">{beat.transcript}</span>
        <span className="composer-beat-meta">{beat.journeySlot} <b>·</b> {treatmentLabel(beat.treatment.id)}</span>
        <span className="composer-beat-evidence"><span>{beat.treatment.assets.length} assets</span><span>{audio.sfxCount} SFX</span><span>{audio.density === "none" ? "audio review" : `${audio.density} mix`}</span></span>
      </span>
      <BeatThumbnail beat={beat} />
      {feedbackCount ? <span className="composer-feedback-dot">{feedbackCount}</span> : null}
    </button>
  );
};

const Timeline: React.FC<{
  doc: IsaacVerseEditDoc;
  durationSec: number;
  activeStartSec: number;
  activeEndSec: number;
  slices: ReviewSlice[];
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onSeek: (seconds: number) => void;
  selectedBeatId: string;
  currentSec: number;
  onSelect: (beat: SemanticBeat) => void;
  onSelectSlice: (slice: ReviewSlice) => void;
}> = ({ doc, durationSec, activeStartSec, activeEndSec, slices, zoom, onZoomChange, onSeek, selectedBeatId, currentSec, onSelect, onSelectSlice }) => (
  <div className="composer-timeline-wrap">
    <div className="composer-timeline-head"><span>BEAT TIMELINE</span><span className="composer-timeline-tools"><button onClick={() => onZoomChange(Math.max(1, zoom - 1))}>-</button><b>{zoom}x</b><button onClick={() => onZoomChange(Math.min(4, zoom + 1))}>+</button><em>{formatTime(currentSec)} / {formatTime(durationSec)}</em></span></div>
    <div className="composer-timeline" style={{ "--playhead": `${Math.min(100, Math.max(0, currentSec / durationSec * 100))}%`, width: `${zoom * 100}%` } as React.CSSProperties} onClick={(event) => { if ((event.target as HTMLElement).closest("button")) return; const rect = event.currentTarget.getBoundingClientRect(); onSeek(Math.min(durationSec, Math.max(0, ((event.clientX - rect.left) / rect.width) * durationSec))); }}>
      <div className="composer-playhead" />
      <div className="composer-live-range" style={{ left: `${activeStartSec / durationSec * 100}%`, width: `${(activeEndSec - activeStartSec) / durationSec * 100}%` }} />
      {doc.beats.map((beat) => (
        <button
          key={beat.id}
          className={`composer-timeline-beat ${selectedBeatId === beat.id ? "active" : ""}`}
          style={{ left: `${beat.startSec / durationSec * 100}%`, width: `${beat.durationSec / durationSec * 100}%` }}
          onClick={() => onSelect(beat)}
          title={`${beat.transcript} (${formatTime(beat.startSec)}–${formatTime(beatEndSec(beat))})`}
        >
          <span>{treatmentGlyph[beat.treatment.id] ?? "SHOT"}</span>
        </button>
      ))}
    </div>
    <div className="composer-slice-lane"><span>EVENTS</span><div>{slices.filter((slice) => slice.source !== "beat").map((slice) => <button key={slice.id} className={`composer-slice-marker slice-${slice.source}`} style={{ left: `${slice.startSec / durationSec * 100}%`, width: `${Math.max(0.7, (slice.endSec - slice.startSec) / durationSec * 100)}%` }} title={`${slice.label} ${formatExactTime(slice.startSec)}–${formatExactTime(slice.endSec)}`} onClick={() => onSelectSlice(slice)}>{slice.source}</button>)}</div></div>
    <div className="composer-track-stack">
      <Track label="VO" tone="cyan" doc={doc} durationSec={durationSec} kind="voice" />
      <Track label="MUSIC" tone="amber" doc={doc} durationSec={durationSec} kind="music" />
      <Track label="VISUAL" tone="coral" doc={doc} durationSec={durationSec} kind="visual" />
      <Track label="TEXT" tone="coral" doc={doc} durationSec={durationSec} kind="text" />
      <Track label="SFX" tone="violet" doc={doc} durationSec={durationSec} kind="sfx" />
       </div>
     </div>
);

const Track: React.FC<{ label: string; tone: string; doc: IsaacVerseEditDoc; durationSec: number; kind: "voice" | "music" | "visual" | "text" | "sfx" }> = ({ label, tone, doc, durationSec, kind }) => (
  <div className="composer-track"><span className="composer-track-label">{label}</span><div className={`composer-track-line ${tone}`}>
    {doc.beats.map((beat) => {
      const audio = beatAudioSummary(doc, beat.id);
      const visible = kind === "visual" || (kind === "text" && Boolean(beat.elements?.some((element) => element.kind === "text"))) || (kind === "voice" && audio.hasVoice) || (kind === "sfx" && audio.sfxCount > 0) || (kind === "music" && Boolean(doc.audioPlan?.music.length));
      return visible ? <i key={beat.id} style={{ left: `${beat.startSec / durationSec * 100}%`, width: `${beat.durationSec / durationSec * 100}%` }} /> : null;
    })}
  </div></div>
);

const BeatCanvasEditor: React.FC<{ beat: SemanticBeat; onPatch: (patch: EditPatch) => void; selectedElementId?: string; onSelectElement?: (elementId: string) => void }> = ({ beat, onPatch, selectedElementId, onSelectElement }) => {
  const [elements, setElements] = React.useState<CanvasElement[]>(() => editBeatToCanvas(beat));
  const [selectedIds, setSelectedIds] = React.useState<string[]>(() => selectedElementId ? [selectedElementId] : []);
  const surfaceRef = React.useRef<HTMLDivElement>(null);
  const [surfaceScale, setSurfaceScale] = React.useState(1);
  React.useEffect(() => { setElements(editBeatToCanvas(beat)); setSelectedIds(selectedElementId ? [selectedElementId] : []); }, [beat.id, beat.revision, selectedElementId]);
  React.useEffect(() => {
    const node = surfaceRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const updateScale = () => {
      const rect = node.getBoundingClientRect();
      setSurfaceScale(Math.min(1, Math.max(0.01, (rect.width - 20) / CANVAS_W), Math.max(0.01, (rect.height - 20) / CANVAS_H)));
    };
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const selectedCanvasElement = elements.find((element) => element.id === selectedIds[0]);
  return <div className="composer-beat-canvas" ref={surfaceRef}><div className="composer-canvas-heading"><span>DIRECT BEAT CANVAS</span><small>geometry and text become a selected-beat patch · drop uploaded assets here</small></div><EditSurface scale={surfaceScale} elements={elements} selectedIds={selectedIds} onSelect={(ids) => { setSelectedIds(ids); if (ids[0]) onSelectElement?.(elements.find((element) => element.id === ids[0])?.sourceElementId || ids[0]); }} onLive={(updater) => setElements(updater)} onGestureStart={() => undefined} onGestureEnd={() => undefined} onDropAsset={(src, x, y) => { const sourceElementId = `${beat.id}:asset:${Date.now()}`; setElements((current) => [...current, { id: `${sourceElementId}:canvas`, sourceElementId, type: "image", x, y, w: 220, h: 160, rotation: 0, opacity: 1, locked: false, visible: true, name: "Uploaded asset", src, imgRender: "photo-card", fit: "contain" }]); setSelectedIds([`${sourceElementId}:canvas`]); }} /><div className="composer-canvas-actions"><span>{elements.length - 1} editable elements · {selectedIds.length} selected</span>{selectedCanvasElement && (selectedCanvasElement.type === "image" || selectedCanvasElement.type === "video") ? <label className="composer-canvas-fit">Fit<select aria-label="Canvas asset fit" value={selectedCanvasElement.fit || "contain"} onChange={(event) => setElements((current) => current.map((element) => element.id === selectedCanvasElement.id ? { ...element, fit: event.target.value as "cover" | "contain" } : element))}><option value="contain">Contain</option><option value="cover">Cover</option></select></label> : null}<button className="tb-btn primary" disabled={!hasCanvasChanges(beat, elements)} onClick={() => onPatch(canvasElementsToPatch(beat, elements))}>Preview canvas patch</button></div></div>;
};

export const ComposerReview: React.FC<{ onClose?: () => void; projectId?: string }> = ({ onClose, projectId = "isaacverse-final" }) => {
  const playerRef = React.useRef<PlayerRef>(null);
  const [doc, setDoc] = React.useState<IsaacVerseEditDoc | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [selectedBeatId, setSelectedBeatId] = React.useState("");
  const [selectedSliceId, setSelectedSliceId] = React.useState<string | undefined>();
  const [customSlice, setCustomSlice] = React.useState<ReviewSlice | undefined>();
  const [customStartInput, setCustomStartInput] = React.useState(0);
  const [customEndInput, setCustomEndInput] = React.useState(1);
  const [category, setCategory] = React.useState<FeedbackCategory>("too-busy");
  const [applyScope, setApplyScope] = React.useState<ApplyScope>("this_instance");
  const [note, setNote] = React.useState("");
  const [pendingPatch, setPendingPatch] = React.useState<EditPatch | null>(null);
  const [pendingHandoffId, setPendingHandoffId] = React.useState<string | undefined>();
  const [feedback, setFeedback] = React.useState<FeedbackRecord[]>([]);
  const [history, setHistory] = React.useState<VersionEntry[]>([]);
  const [persistedVersions, setPersistedVersions] = React.useState<{ version: string; editDoc: IsaacVerseEditDoc }[]>([]);
  const [targetElementId, setTargetElementId] = React.useState<string | undefined>();
  const [alternatives, setAlternatives] = React.useState<EditPatch[]>([]);
  const [similarBeatIds, setSimilarBeatIds] = React.useState<string[]>([]);
  const [batchPatches, setBatchPatches] = React.useState<EditPatch[]>([]);
  const [rulePreview, setRulePreview] = React.useState<string | null>(null);
  const [chatText, setChatText] = React.useState("");
  const [chatMessages, setChatMessages] = React.useState<{ role: "you" | "agent"; text: string }[]>([]);
  const [kiloHandoffs, setKiloHandoffs] = React.useState<FeedbackRequest[]>([]);
  const [reviewQueue, setReviewQueue] = React.useState<ReviewQueue | null>(null);
  const [operationBusy, setOperationBusy] = React.useState(false);
  const [previewMode, setPreviewMode] = React.useState<PreviewMode>("after");
  const [currentFrame, setCurrentFrame] = React.useState(0);
  const [editorState, dispatchEditor] = React.useReducer(editorReducer, initialEditorState);
  const [editorZoom, setEditorZoom] = React.useState(1);
  const [persistedEditorDoc, setPersistedEditorDoc] = React.useState<EditorDoc | null>(null);
  const [editorUndo, setEditorUndo] = React.useState<EditorDoc[]>([]);
  const [editorRedo, setEditorRedo] = React.useState<EditorDoc[]>([]);
  const [mode, setMode] = React.useState<"review" | "edit">("review");
  const [rangeMode, setRangeMode] = React.useState<"full" | "beat" | "context">("beat");
  const [timelineZoom, setTimelineZoom] = React.useState(1);
  const [statusMessage, setStatusMessage] = React.useState("Loading persisted project state.");
  const [timelineHeight, setTimelineHeight] = React.useState(() => typeof window !== "undefined" ? Math.round(window.innerHeight * 0.42) : 340);
  const onTimelineResizerPointerDown = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startY = event.clientY;
    const startHeight = timelineHeight;
    const onMove = (e: PointerEvent) => {
      const vh = window.innerHeight;
      const max = Math.round(vh * 0.72);
      const min = 160;
      setTimelineHeight(Math.min(max, Math.max(min, startHeight + (startY - e.clientY))));
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
  }, [timelineHeight]);
  const editorDoc = React.useMemo(() => {
    if (!doc) return null;
    if (!pendingPatch && persistedEditorDoc && persistedEditorDoc.revision.baseEditVersion === doc.version) return persistedEditorDoc;
    const sourceDoc = pendingPatch ? applyLocalPatch(doc, pendingPatch) : doc;
    return projectEditDocToEditor(sourceDoc, { projectId });
  }, [doc, pendingPatch, persistedEditorDoc, projectId]);

  React.useEffect(() => {
    let active = true;
    loadProject(projectId).then((snapshot) => {
      if (!active) return;
      if (!snapshot.editDoc) throw new Error("Project has no edit document");
      setDoc(snapshot.editDoc);
      setPersistedEditorDoc(snapshot.editorDoc || null);
      setSelectedBeatId(snapshot.editDoc.beats[0]?.id ?? "");
      setFeedback(snapshot.feedback);
      setPersistedVersions(snapshot.versions);
      setStatusMessage(`Loaded ${projectId} ${snapshot.state.currentVersion} from disk.`);
      loadKiloInbox(projectId).then(setKiloHandoffs).catch(() => undefined);
      loadReviewQueue(projectId).then(setReviewQueue).catch(() => undefined);
    }).catch((error: unknown) => {
      if (!active) return;
      setLoadError(error instanceof Error ? error.message : String(error));
    });
    return () => { active = false; };
  }, [projectId]);

  React.useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    const onFrame = ({ detail }: { detail: { frame: number } }) => setCurrentFrame(detail.frame);
    player.addEventListener("frameupdate", onFrame);
    return () => player.removeEventListener("frameupdate", onFrame);
  }, [previewMode, doc?.version]);

  React.useEffect(() => {
    if (!doc) return;
    const beat = doc.beats.find((candidate) => candidate.id === selectedBeatId);
    if (!beat) return;
    const slice = selectedSliceId ? deriveReviewSlices(doc).find((candidate) => candidate.id === selectedSliceId) : undefined;
    const sliceStart = slice?.startSec ?? beat.startSec;
    const startSec = rangeMode === "full" ? 0 : rangeMode === "context" ? Math.max(0, sliceStart - 0.45) : sliceStart;
    const previewFrame = Math.min(Math.max(0, Math.ceil(durationSec * doc.fps) - 1), Math.round(startSec * doc.fps) + Math.min(15, Math.max(1, Math.round(doc.fps * 0.35))));
    playerRef.current?.seekTo(previewFrame);
  }, [doc, selectedBeatId, selectedSliceId, rangeMode]);

  React.useEffect(() => {
    const refresh = () => loadKiloInbox(projectId).then((requests) => {
      setKiloHandoffs(requests);
      const result = selectedSliceId ? requests.find((request) => request.slice.id === selectedSliceId && request.result?.patch && (request.status === "previewed" || request.status === "claimed")) : undefined;
      if (result?.result?.patch && !pendingPatch) {
        setPendingHandoffId(result.id);
        setPendingPatch(result.result.patch);
        setPreviewMode("after");
        setStatusMessage(result.result.diagnosis || `Kilo returned a patch for ${result.slice.label}.`);
      }
    }).catch(() => undefined);
    refresh();
    const interval = window.setInterval(refresh, 3000);
    return () => window.clearInterval(interval);
  }, [projectId, selectedSliceId, pendingPatch]);

  if (!doc || !editorDoc) return <div className="composer-loading"><strong>{loadError ? "Composer could not load the project" : "Loading Composer project"}</strong><span>{loadError || projectId}</span>{onClose ? <button className="ce-mode" onClick={onClose}>Back</button> : null}</div>;

  const selected = doc.beats.find((beat) => beat.id === selectedBeatId) ?? doc.beats[0];
  const durationSec = Math.max(documentDuration(doc), editorDoc.durationSec);
  const reviewSlices = deriveReviewSlices(doc);
  const selectedSlice = customSlice || reviewSlices.find((slice) => slice.id === selectedSliceId) || reviewSlices.find((slice) => slice.source === "beat" && slice.target.beatId === selected.id);
  const reviewStartSec = selectedSlice?.startSec ?? selected.startSec;
  const reviewEndSec = selectedSlice?.endSec ?? beatEndSec(selected);
  const activeStartSec = rangeMode === "full" ? 0 : rangeMode === "context" ? Math.max(0, reviewStartSec - 0.45) : reviewStartSec;
  const activeEndSec = rangeMode === "full" ? durationSec : rangeMode === "context" ? Math.min(durationSec, reviewEndSec + 0.45) : reviewEndSec;
  const activeRange = frameRangeForReviewSlice({ id: "live-range", videoId: projectId, source: rangeMode === "full" ? "custom" : selectedSlice?.source ?? "beat", label: selectedSlice?.label ?? selected.id, target: { ...selectedSlice?.target, beatId: selected.id, startSec: activeStartSec, endSec: activeEndSec }, startSec: activeStartSec, endSec: activeEndSec, modalities: selectedSlice?.modalities ?? ["visual"], status: "unreviewed" }, doc.fps, durationSec);
  const previewDoc = pendingPatch ? applyLocalPatch(doc, pendingPatch) : doc;
  const currentSec = currentFrame / doc.fps;
  const selectedAudio = beatAudioSummary(doc, selected.id);
  const waveformSrc = selectedAudio.hasVoice ? doc.audioPlan?.voice[0]?.src : doc.audioPlan?.music[0]?.src;
  const selectedQa = beatQaStatus(doc, selected);
  const latestFeedback = feedback.filter((record) => record.target.beatId === selected.id).slice(-4).reverse();
  const selectedTimelineClip = editorState.selection.clipId ? editorDoc.tracks.flatMap((track) => track.clips).find((clip) => clip.id === editorState.selection.clipId) : undefined;

  const saveEditorRevision = async (next: EditorDoc, message: string) => {
    const saved = await saveEditor(projectId, next, doc.version ?? "v001");
    setEditorUndo((current) => [...current, editorDoc]);
    setEditorRedo([]);
    setPersistedEditorDoc(saved);
    setStatusMessage(message);
    return saved;
  };

  const uploadProjectAsset = async (file: File) => {
    try {
      const data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error || new Error("Unable to read asset")); reader.readAsDataURL(file); });
      const response = await fetch("/api/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: file.name, data }) });
      const payload = await response.json() as { url?: string; error?: string };
      if (!response.ok || !payload.url) throw new Error(payload.error || "Asset upload failed");
      const next = { ...editorDoc, assets: [...(editorDoc.assets || []), { id: `asset:${Date.now()}`, name: file.name, src: payload.url, kind: file.type.startsWith("audio/") ? "audio" as const : file.type.startsWith("video/") ? "video" as const : "image" as const, provenance: "local-upload" as const }], revision: { ...editorDoc.revision, revision: editorDoc.revision.revision + 1 } };
      await saveEditorRevision(next, `Uploaded ${file.name}. Drag it into the editor canvas.`);
    } catch (error) { setStatusMessage(error instanceof Error ? error.message : String(error)); }
  };

  const updateAudioClip = async (changes: { gainDb?: number; fadeInSec?: number; fadeOutSec?: number; muted?: boolean }) => {
    if (!selectedTimelineClip || (selectedTimelineClip.kind !== "voice" && selectedTimelineClip.kind !== "music" && selectedTimelineClip.kind !== "audio-event")) return;
    try {
      const next = setEditorClipAudioState(editorDoc, selectedTimelineClip.id, changes);
      await saveEditorRevision(next, `Updated audio controls for ${selectedTimelineClip.label}.`);
    } catch (error) { setStatusMessage(error instanceof Error ? error.message : String(error)); }
  };

  const updateTransitionClip = async (changes: { transitionType?: string; durationSec?: number }) => {
    if (!selectedTimelineClip || selectedTimelineClip.kind !== "transition") return;
    try {
      const next = setEditorTransitionState(editorDoc, selectedTimelineClip.id, changes);
      await saveEditorRevision(next, `Updated transition ${selectedTimelineClip.label}.`);
    } catch (error) { setStatusMessage(error instanceof Error ? error.message : String(error)); }
  };

  const selectBeat = (beat: SemanticBeat) => {
    setSelectedBeatId(beat.id);
    setSelectedSliceId(deriveReviewSlices(doc).find((slice) => slice.source === "beat" && slice.target.beatId === beat.id)?.id);
    setCustomSlice(undefined);
    setCustomStartInput(beat.startSec);
    setCustomEndInput(beatEndSec(beat));
    setPendingPatch(null);
    setPendingHandoffId(undefined);
    setAlternatives([]);
    setBatchPatches([]);
    setSimilarBeatIds([]);
    setTargetElementId(undefined);
    setRangeMode("beat");
    setPreviewMode("after");
    playerRef.current?.seekTo(Math.round(beat.startSec * doc.fps));
    setStatusMessage(`Reviewing ${beat.id}. Feedback will be anchored to this beat.`);
  };

  const selectSlice = (slice: ReviewSlice) => {
    if (!slice.target.beatId) return;
    setSelectedBeatId(slice.target.beatId);
    setSelectedSliceId(slice.id);
    setCustomSlice(undefined);
    setTargetElementId(slice.target.elementId);
    setRangeMode("beat");
    setPendingPatch(null);
    setPendingHandoffId(undefined);
    setPreviewMode("after");
    playerRef.current?.seekTo(Math.round(slice.startSec * doc.fps));
    setStatusMessage(`Reviewing ${slice.label} at ${formatExactTime(slice.startSec)}–${formatExactTime(slice.endSec)}. Target captured automatically.`);
  };

  const markReviewStatus = async (status: ReviewStatus) => {
    if (!selectedSlice) return;
    const entries = [...(reviewQueue?.entries || []).filter((entry) => entry.sliceId !== selectedSlice.id), { sliceId: selectedSlice.id, status, updatedAt: new Date().toISOString() }];
    try {
      const saved = await saveReviewQueue(projectId, entries);
      setReviewQueue(saved);
      setStatusMessage(`${selectedSlice.label} marked ${status}. Beat and scene rollups remain derived from slice statuses.`);
    } catch (error) { setStatusMessage(error instanceof Error ? error.message : String(error)); }
  };

  const seek = (seconds: number) => {
    const clamped = Math.min(durationSec, Math.max(0, seconds));
    playerRef.current?.seekTo(Math.round(clamped * doc.fps));
    setCurrentFrame(Math.round(clamped * doc.fps));
  };

  const seekFromEditor = (seconds: number) => {
    dispatchEditor({ type: "setPlayhead", currentSec: seconds, isPlaying: false });
    seek(seconds);
  };

  const selectEditorClip = (clip: EditorClip) => {
    dispatchEditor({ type: "selectClip", trackId: clip.trackId, clipId: clip.id, source: clip.source });
    const source = clip.source;
    const slice = reviewSlices.find((candidate) => source.motionPhaseId && candidate.source === "motion-phase" && candidate.target.motionPhaseId === source.motionPhaseId)
      || reviewSlices.find((candidate) => source.elementId && candidate.source === "element" && candidate.target.elementId === source.elementId)
      || reviewSlices.find((candidate) => source.audioCueId && candidate.source === "audio-event" && candidate.target.audioCueId === source.audioCueId)
      || reviewSlices.find((candidate) => source.transitionId && candidate.source === "transition" && candidate.target.transitionId === source.transitionId)
      || reviewSlices.find((candidate) => source.shotId && candidate.source === "shot" && candidate.target.shotId === source.shotId)
      || reviewSlices.find((candidate) => source.beatId && candidate.source === "beat" && candidate.target.beatId === source.beatId);
    if (source.elementId) setMode("edit");
    if (slice) selectSlice(slice);
    else seekFromEditor(clip.range.startSec);
  };

  const trimTimelineClip = (clip: EditorClip, edge: "start" | "end", timeSec: number) => {
    const beatId = clip.source.beatId;
    const beat = beatId ? doc.beats.find((candidate) => candidate.id === beatId) : undefined;
    const minimum = 1 / doc.fps;
    const boundedTime = edge === "start"
      ? Math.min(Math.max(timeSec, clip.range.startSec), clip.range.endSec - minimum)
      : Math.max(Math.min(timeSec, clip.range.endSec), clip.range.startSec + minimum);
    if (!beat) {
      if (clip.kind === "voice" || clip.kind === "music") setStatusMessage(`Trim preview prepared for ${clip.label}; release the handle to save the audio timeline revision.`);
      else setStatusMessage("This timeline clip is not yet connected to a canonical semantic timing patch.");
      return;
    }
    const operation = clip.source.elementId
      ? { op: "updateElement" as const, beatId: beat.id, elementId: clip.source.elementId, path: edge === "start" ? "startSec" : "endSec", value: boundedTime - beat.startSec }
      : clip.source.beatId && clip.kind === "beat"
        ? { op: "updateBeat" as const, beatId: beat.id, changes: edge === "start" ? { startSec: boundedTime, durationSec: beatEndSec(beat) - boundedTime } : { durationSec: boundedTime - beat.startSec } }
        : undefined;
    if (!operation) {
      setStatusMessage("Trim preview is currently available for semantic beat and element clips; audio trim is next.");
      return;
    }
    const patch: EditPatch = { id: `patch-editor-trim-${Date.now()}`, videoId: projectId, baseVersion: doc.version ?? "v001", reason: `Trim ${clip.label} ${edge}.`, operations: [operation], affectedRange: clip.range, status: "draft" };
    setPendingPatch(patch);
    setPreviewMode("after");
    setStatusMessage(`Trim preview prepared for ${clip.label}. Apply it only after reviewing the new timing.`);
  };

  const commitAudioTrim = async (clip: EditorClip, edge: "start" | "end", timeSec: number) => {
    if (clip.kind !== "voice" && clip.kind !== "music" && clip.kind !== "audio-event") return;
    try {
      const next = trimEditorClip(editorDoc, clip.id, edge, timeSec, 1 / doc.fps);
      await saveEditorRevision(next, `Trimmed ${clip.label} and saved the editor revision.`);
    } catch (error) { setStatusMessage(error instanceof Error ? error.message : String(error)); }
  };

  const prepareElementPatch = (path: string, value: unknown) => {
    if (!targetElementId) {
      setStatusMessage("Select an element before editing its timing or geometry.");
      return;
    }
    const patch: EditPatch = { id: `patch-editor-element-${Date.now()}`, videoId: projectId, baseVersion: doc.version ?? "v001", reason: `Update ${path} for ${targetElementId}.`, operations: [{ op: "updateElement", beatId: selected.id, elementId: targetElementId, path, value }], affectedRange: { startSec: selected.startSec, endSec: beatEndSec(selected) }, status: "draft" };
    setPendingPatch(patch);
    setPreviewMode("after");
    setStatusMessage(`Element ${path} preview prepared. Review before applying.`);
  };

  const prepareMotionPatch = (phaseId: string, field: "startSec" | "durationSec" | "cameraScale", value: number) => {
    const phases = (selected.motionPhases || []).map((phase) => phase.id !== phaseId ? phase : field === "cameraScale" ? { ...phase, params: { ...(phase.params || {}), cameraScale: value } } : { ...phase, [field]: value });
    const patch: EditPatch = { id: `patch-editor-motion-${Date.now()}`, videoId: projectId, baseVersion: doc.version ?? "v001", reason: `Update motion phase ${phaseId} ${field}.`, operations: [{ op: "updateBeat", beatId: selected.id, changes: { motionPhases: phases } }], affectedRange: { startSec: selected.startSec, endSec: beatEndSec(selected) }, status: "draft" };
    setPendingPatch(patch);
    setPreviewMode("after");
    setStatusMessage(`Motion ${field} preview prepared. Review before applying.`);
  };

  const prepareAssetReplacement = (assetId: string, replacementId: string) => {
    const replacement = editorDoc.assets?.find((asset) => asset.id === replacementId);
    if (!replacement) return;
    const kind = replacement.kind === "audio" ? "audio" as const : replacement.kind === "video" ? "video" as const : "image" as const;
    const operations: EditPatch["operations"] = [];
    if (!doc.assets?.some((asset) => asset.id === replacement.id)) operations.push({ op: "addAsset", asset: { id: replacement.id, kind, src: replacement.src, description: replacement.name } });
    operations.push({ op: "replaceAsset", assetId, replacementAssetId: replacement.id });
    const patch: EditPatch = { id: `patch-editor-asset-${Date.now()}`, videoId: projectId, baseVersion: doc.version ?? "v001", reason: `Replace ${assetId} with ${replacement.name}.`, operations, affectedRange: { startSec: selected.startSec, endSec: beatEndSec(selected) }, status: "draft" };
    setPendingPatch(patch);
    setPreviewMode("after");
    setStatusMessage(`Asset replacement preview prepared for ${assetId}.`);
  };

  const splitTimelineClip = async (clip: EditorClip, timeSec: number) => {
    if (pendingPatch) { setStatusMessage("Discard the current patch preview before splitting another clip."); return; }
    try {
      const next = splitEditorClip(editorDoc, clip.id, timeSec);
      await saveEditorRevision(next, `Split ${clip.label} at ${formatExactTime(timeSec)} and saved the editor revision.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const rippleTimeline = async (fromSec: number, deltaSec: number) => {
    if (pendingPatch) { setStatusMessage("Discard the current patch preview before rippling the timeline."); return; }
    try {
      const next = rippleEditorDoc(editorDoc, fromSec, deltaSec);
      await saveEditorRevision(next, `Ripple ${deltaSec >= 0 ? "inserted" : "closed"} ${Math.abs(deltaSec).toFixed(1)}s from ${formatExactTime(fromSec)}.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const updateEditorTrack = async (trackId: string, changes: { muted?: boolean; solo?: boolean; locked?: boolean; hidden?: boolean }) => {
    try {
      const next = setEditorTrackState(editorDoc, trackId, changes);
      await saveEditorRevision(next, `Updated ${next.tracks.find((track) => track.id === trackId)?.name || trackId} track state.`);
    } catch (error) { setStatusMessage(error instanceof Error ? error.message : String(error)); }
  };

  const moveEditorTrack = async (trackId: string, order: number) => {
    try {
      const next = reorderEditorTrack(editorDoc, trackId, order);
      await saveEditorRevision(next, `Reordered ${next.tracks.find((track) => track.id === trackId)?.name || trackId}.`);
    } catch (error) { setStatusMessage(error instanceof Error ? error.message : String(error)); }
  };

  const addAssetTrackToTimeline = async (assetKind: "image" | "video" | "audio", assetId: string) => {
    try {
      const next = addAssetTrack(editorDoc, assetKind, assetId, currentSec);
      await saveEditorRevision(next, `Added a source-backed ${assetKind} track from ${assetId}.`);
    } catch (error) { setStatusMessage(error instanceof Error ? error.message : String(error)); }
  };

  const deleteEditorTrackFromTimeline = async (trackId: string) => {
    try {
      const next = deleteEditorTrack(editorDoc, trackId, "delete-clips");
      await saveEditorRevision(next, `Deleted track ${trackId} and its clips explicitly.`);
    } catch (error) { setStatusMessage(error instanceof Error ? error.message : String(error)); }
  };

  const undoEditorRevision = async () => {
    const previous = editorUndo[editorUndo.length - 1];
    if (!previous) return;
    try {
      const saved = await saveEditor(projectId, previous, doc.version ?? "v001");
      setEditorUndo((current) => current.slice(0, -1));
      setEditorRedo((current) => [...current, editorDoc]);
      setPersistedEditorDoc(saved);
      setStatusMessage("Undid the last editor operation.");
    } catch (error) { setStatusMessage(error instanceof Error ? error.message : String(error)); }
  };

  const redoEditorRevision = async () => {
    const next = editorRedo[editorRedo.length - 1];
    if (!next) return;
    try {
      const saved = await saveEditor(projectId, next, doc.version ?? "v001");
      setEditorRedo((current) => current.slice(0, -1));
      setEditorUndo((current) => [...current, editorDoc]);
      setPersistedEditorDoc(saved);
      setStatusMessage("Redid the editor operation.");
    } catch (error) { setStatusMessage(error instanceof Error ? error.message : String(error)); }
  };

  const createCustomSlice = (startSec: number, endSec: number) => {
    const start = Math.max(0, Math.min(durationSec, startSec));
    const end = Math.max(start + 0.05, Math.min(durationSec, endSec));
    const slice: ReviewSlice = { id: `${projectId}:custom:${start.toFixed(3)}-${end.toFixed(3)}`, videoId: projectId, source: "custom", label: "custom review range", target: { beatId: selected.id, startSec: start, endSec: end }, startSec: start, endSec: end, modalities: ["story", "visual", "motion", "voice", "music", "sfx", "mix"], status: "unreviewed" };
    setCustomSlice(slice);
    setSelectedSliceId(slice.id);
    setRangeMode("beat");
    playerRef.current?.seekTo(Math.round(start * doc.fps));
    setStatusMessage(`Custom review range selected: ${formatExactTime(start)}–${formatExactTime(end)}.`);
  };

  const playFullVideo = () => { setRangeMode("full"); playerRef.current?.seekTo(0); playerRef.current?.play(); };
  const playSelectedBeat = () => { setRangeMode("beat"); playerRef.current?.seekTo(Math.round(selected.startSec * doc.fps)); playerRef.current?.play(); };
  const playSelectedContext = () => { setRangeMode("context"); playerRef.current?.seekTo(Math.round(Math.max(0, selected.startSec - 0.45) * doc.fps)); playerRef.current?.play(); };

  const updateFeedbackStatus = async (recordId: string, changes: Partial<FeedbackRecord>) => {
    const record = feedback.find((item) => item.id === recordId);
    if (!record) return;
    const updated = { ...record, ...changes };
    setFeedback((current) => current.map((item) => item.id === recordId ? updated : item));
    await saveFeedback(projectId, updated);
  };

  const makeFeedback = async () => {
    const id = `feedback-${Date.now()}`;
    const slice = selectedSlice;
    const scope = slice?.source === "element" ? "element" : slice?.source === "shot" ? "shot" : ["audio-event", "voice", "music"].includes(slice?.source || "") ? "audio" : "beat";
    const record = createFeedbackRecord({ id, createdAt: new Date().toISOString(), doc, beat: selected, category, note, applyScope, scope, reviewSliceId: slice?.id, elementId: slice?.target.elementId || targetElementId, shotId: slice?.target.shotId || selected.shotIds?.[0], motionPhaseId: slice?.target.motionPhaseId, audioCueId: slice?.target.audioCueId, startSec: slice?.startSec, endSec: slice?.endSec, modality: slice?.modalities.join(",") });
    setFeedback((current) => [...current, record]);
    await saveFeedback(projectId, record);
    setOperationBusy(true);
    let operation: OperationResult;
    try {
      const target = { reviewSliceId: slice?.id, beatId: selected.id, shotId: slice?.target.shotId || selected.shotIds?.[0], elementId: slice?.target.elementId || targetElementId, motionPhaseId: slice?.target.motionPhaseId, audioCueId: slice?.target.audioCueId, startSec: slice?.startSec ?? selected.startSec, endSec: slice?.endSec ?? beatEndSec(selected) };
      await operate({ operation: "inspect_segment", projectId, target });
      operation = await operate({ operation: "diagnose_feedback", projectId, target, category, note });
    } catch (error) {
      setOperationBusy(false);
      setStatusMessage(error instanceof Error ? error.message : String(error));
      return;
    }
    setOperationBusy(false);
    const patch = operation.patch;
    if (patch) {
      const updatedRecord = { ...record, patchId: patch.id, status: "previewed" as const, diagnosis: operation.diagnosis || patch.reason };
      setFeedback((current) => current.map((item) => item.id === id ? updatedRecord : item));
      await saveFeedback(projectId, updatedRecord);
      setPendingPatch(patch);
    }
    setPreviewMode(patch ? "after" : "before");
    setNote("");
    setStatusMessage(patch ? `${operation.diagnosis || patch.reason} Compare the local render before applying.` : operation.message || operation.diagnosis || "Feedback saved; explicit approval is required for this operation.");
  };

  const handOffSelectedToKilo = async () => {
    const slice = selectedTimelineClip ? {
      id: `${projectId}:editor-clip:${selectedTimelineClip.id}`,
      videoId: projectId,
      source: "custom" as const,
      label: selectedTimelineClip.label,
      target: { sceneId: selected.sceneId, beatId: selectedTimelineClip.source.beatId || selected.id, shotId: selectedTimelineClip.source.shotId, elementId: selectedTimelineClip.source.elementId, motionPhaseId: selectedTimelineClip.source.motionPhaseId, audioCueId: selectedTimelineClip.source.audioCueId, transitionId: selectedTimelineClip.source.transitionId, startSec: selectedTimelineClip.range.startSec, endSec: selectedTimelineClip.range.endSec },
      startSec: selectedTimelineClip.range.startSec,
      endSec: selectedTimelineClip.range.endSec,
      modalities: selectedSlice?.modalities || ["visual", "motion", "voice", "music", "sfx"],
      transcript: selected.transcript,
      status: "unreviewed" as const,
    } : selectedSlice;
    if (!slice) { setStatusMessage("Select a review slice before handing it to Kilo."); return; }
    setCustomSlice(slice);
    setSelectedSliceId(slice.id);
    const id = `feedback-kilo-${Date.now()}`;
    const request: FeedbackRequest = {
      id,
      projectId,
      version: doc.version ?? "v001",
      slice,
      category,
      modality: slice.modalities[0] || "visual",
      note: note || undefined,
      requestedAction: "diagnose_and_patch",
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    const record = createFeedbackRecord({ id, createdAt: request.createdAt, doc, beat: selected, category, note, applyScope, scope: slice.source === "element" ? "element" : slice.source === "shot" ? "shot" : "beat", reviewSliceId: slice.id, elementId: slice.target.elementId, shotId: slice.target.shotId, motionPhaseId: slice.target.motionPhaseId, audioCueId: slice.target.audioCueId, startSec: slice.startSec, endSec: slice.endSec, modality: request.modality });
    try {
      await saveFeedback(projectId, record);
      const result = await handoffToKilo(projectId, request);
      setKiloHandoffs((current) => [...current, request]);
      setStatusMessage(`Kilo handoff created: ${result.promptPath}. Run /review-pending in Kilo.`);
    } catch (error) { setStatusMessage(error instanceof Error ? error.message : String(error)); }
  };

  const applyPending = async () => {
    if (!pendingPatch) return;
    if (applyScope !== "this_instance") {
      setStatusMessage("Batch and future-rule scopes are captured for review, but this pilot only applies local beat patches.");
      return;
    }
    const before = doc;
    setOperationBusy(true);
    try {
      const saved = await applyPersistedPatch(projectId, pendingPatch, doc.version ?? "v001");
      const after = saved.editDoc;
      setDoc(after);
      setPersistedEditorDoc(null);
      setPersistedVersions((current) => [...current, { version: saved.version, editDoc: after }]);
      setHistory((current) => [...current, { id: saved.version, patch: pendingPatch, before, after, appliedAt: new Date().toISOString() }]);
      const applied = feedback.find((item) => item.patchId === pendingPatch.id);
      if (applied) await updateFeedbackStatus(applied.id, { status: "applied", version: saved.version });
      if (pendingHandoffId) await updateKiloHandoff(projectId, pendingHandoffId, { status: "applied" });
      setPendingPatch(null);
      setPendingHandoffId(undefined);
      setPreviewMode("after");
      setStatusMessage(`Patch applied to ${selected.id} and saved as ${saved.version}.`);
    } catch (error) { setStatusMessage(error instanceof Error ? error.message : String(error)); }
    finally { setOperationBusy(false); }
  };

  const rollbackPending = async () => {
    if (!pendingPatch) return;
    const record = feedback.find((item) => item.patchId === pendingPatch.id);
    if (record) await updateFeedbackStatus(record.id, { status: "rolled_back" });
    if (pendingHandoffId) await updateKiloHandoff(projectId, pendingHandoffId, { status: "rejected" });
    setPendingPatch(null);
    setPendingHandoffId(undefined);
    setPreviewMode("before");
    setStatusMessage("Preview discarded. The current edit remains unchanged.");
  };

  const rollbackVersion = async (version: VersionEntry) => {
    setOperationBusy(true);
    try {
      const targetVersion = version.before.version || "v001";
      const saved = await rollbackPersistedVersion(projectId, targetVersion, doc.version ?? "v001");
      setDoc(saved.editDoc);
      setPersistedVersions((current) => [...current, { version: saved.version, editDoc: saved.editDoc }]);
      setHistory((current) => current.filter((item) => item.id !== version.id));
      const record = feedback.find((item) => item.patchId === version.patch.id);
      if (record) await updateFeedbackStatus(record.id, { status: "rolled_back", version: saved.version });
      setStatusMessage(`${version.id} rolled back and saved as ${saved.version}.`);
    } catch (error) { setStatusMessage(error instanceof Error ? error.message : String(error)); }
    finally { setOperationBusy(false); }
  };

  const generateAlternatives = async () => {
    setOperationBusy(true);
    const treatmentIds = (["semantic-diagram", "process-timeline", "host-reflection-cinematic"] as const).filter((id) => id !== selected.treatment.id).slice(0, 3);
    try {
      const results = await Promise.all(treatmentIds.map((treatmentId) => operate({ operation: "replace_treatment", projectId, target: { beatId: selected.id, startSec: selected.startSec, endSec: beatEndSec(selected) }, treatmentId, params: { subtitle: selected.transcript, title: selected.narrativeFunction } })));
      setAlternatives(results.flatMap((item) => item.patch ? [item.patch] : []));
      setStatusMessage("Three local treatment alternatives are ready. Selecting one replaces only this beat.");
    } catch (error) { setStatusMessage(error instanceof Error ? error.message : String(error)); }
    finally { setOperationBusy(false); }
  };

  const generateSimilar = async () => {
    setOperationBusy(true);
    const matches = doc.beats.filter((beat) => beat.id !== selected.id && beat.treatment.id === selected.treatment.id);
    setSimilarBeatIds(matches.map((beat) => beat.id));
    try {
      const results = await Promise.all(matches.map((beat) => operate({ operation: "diagnose_feedback", projectId, target: { beatId: beat.id, startSec: beat.startSec, endSec: beatEndSec(beat) }, category, note })));
      setBatchPatches(results.flatMap((item) => item.patch ? [item.patch] : []));
      setStatusMessage(`${matches.length} similar beats found. Review the batch before approval.`);
    } catch (error) { setStatusMessage(error instanceof Error ? error.message : String(error)); }
    finally { setOperationBusy(false); }
  };

  const applyBatch = async () => {
    if (!batchPatches.length) return;
    setOperationBusy(true);
    try {
      let current = doc;
      for (const patch of batchPatches) {
        const saved = await applyPersistedPatch(projectId, patch, current.version ?? "v001");
        current = saved.editDoc;
      }
      setDoc(current);
      setBatchPatches([]);
      setStatusMessage(`Approved and applied ${similarBeatIds.length} similar-beat patches.`);
    } catch (error) { setStatusMessage(error instanceof Error ? error.message : String(error)); }
    finally { setOperationBusy(false); }
  };

  const promoteRule = async () => {
    setRulePreview(`Rule candidate: ${category} for ${selected.treatment.id}. This explicit action writes a future-instance rule; it does not rewrite the current beat.`);
    setOperationBusy(true);
    try {
      const response = await operate({ operation: "promote_feedback_rule", projectId, category, treatmentId: selected.treatment.id, note, confirm: true });
      setStatusMessage(response.status === "ok" ? "Future rule promoted explicitly. Current and past beats remain unchanged." : response.message || "Future-rule promotion requires approval.");
    } catch (error) { setStatusMessage(error instanceof Error ? error.message : String(error)); }
    finally { setOperationBusy(false); }
  };

  const sendScopedChat = async () => {
    if (!chatText.trim()) return;
    const message = chatText.trim();
    setChatMessages((current) => [...current, { role: "you", text: message }]);
    setChatText("");
    setOperationBusy(true);
    try {
      const response = await operate({ operation: "diagnose_feedback", projectId, target: { reviewSliceId: selectedSlice?.id, beatId: selected.id, shotId: selectedSlice?.target.shotId || selected.shotIds?.[0], elementId: selectedSlice?.target.elementId || targetElementId, motionPhaseId: selectedSlice?.target.motionPhaseId, audioCueId: selectedSlice?.target.audioCueId, startSec: selectedSlice?.startSec ?? selected.startSec, endSec: selectedSlice?.endSec ?? beatEndSec(selected) }, category: "custom", note: message });
      setChatMessages((current) => [...current, { role: "agent", text: response.diagnosis || response.message || "The scoped note was recorded." }]);
    } catch (error) { setChatMessages((current) => [...current, { role: "agent", text: error instanceof Error ? error.message : String(error) }]); }
    finally { setOperationBusy(false); }
  };

  const beatIndex = new Map(doc.beats.map((beat, index) => [beat.id, index]));
  const renderBeatCard = (beat: SemanticBeat) => <BeatCard key={beat.id} beat={beat} index={beatIndex.get(beat.id) ?? 0} doc={doc} selected={selected.id === beat.id} feedbackCount={feedback.filter((record) => record.target.beatId === beat.id).length} onSelect={() => selectBeat(beat)} />;

  return (
    <div className="composer-review" style={{ "--timeline-height": `${timelineHeight}px` } as React.CSSProperties}>
      <header className="composer-review-head">
        <div className="composer-brand-lockup">
          <div className="composer-eyebrow"><span className="composer-signal" /> ISAACVERSE</div>
          <h2>Untitled video <span>{projectId} · {doc.version ?? "v001"}</span></h2>
          <p>Edit the cut directly. Agent changes stay scoped to the selected clip.</p>
        </div>
        <div className="composer-review-actions">
          <span className="composer-version">{doc.version ?? "v001"}</span>
          <button className={`ce-mode ${mode === "review" ? "on" : ""}`} onClick={() => setMode("review")}>Preview</button>
          <button className={`ce-mode ${mode === "edit" ? "on" : ""}`} onClick={() => setMode("edit")}>Edit on canvas</button>
          {onClose ? <button className="modal-close" onClick={onClose} aria-label="Close Composer">×</button> : null}
        </div>
      </header>

      <div className="composer-status-line"><span>{statusMessage}</span><span className="composer-status-target">review <b>{reviewQueue?.rollup.approved || 0}/{reviewQueue?.rollup.slices || reviewSlices.length}</b> approved · target <b>{selectedSlice?.id || selected.id}</b> · {formatExactTime(reviewStartSec)}–{formatExactTime(reviewEndSec)}</span></div>

      <div className="composer-review-grid">
        <aside className="composer-beats composer-panel">
          <div className="composer-panel-title"><span>Scenes</span><small>{doc.beats.length} clips / {durationSec.toFixed(1)}s</small></div>
          <div className="composer-beat-list">
            {doc.scenes?.length ? doc.scenes.map((scene) => <React.Fragment key={scene.id}><div className="composer-scene-label">Scene {String(scene.index).padStart(2, "0")} <small>{formatTime(scene.startSec)}–{formatTime(scene.startSec + scene.durationSec)}</small></div>{scene.beatIds.map((beatId) => doc.beats.find((beat) => beat.id === beatId)).filter((beat): beat is SemanticBeat => Boolean(beat)).map(renderBeatCard)}</React.Fragment>) : doc.beats.map(renderBeatCard)}
          </div>
        </aside>

        <main className="composer-player-pane">
           <div className="composer-player-label"><span>{previewMode === "after" && pendingPatch ? "PATCH PREVIEW" : "PREVIEW"}</span><span>{mode === "edit" ? "canvas edit" : "selected clip"}</span></div>
            <div className="composer-player-frame">
               <ResponsivePlayer playerRef={playerRef} doc={previewMode === "after" ? previewDoc : doc} durationSec={durationSec} inFrame={activeRange.inFrame} outFrame={activeRange.outFrame} />
               {mode === "edit" ? <div className="composer-edit-overlay"><BeatCanvasEditor beat={selected} selectedElementId={targetElementId} onSelectElement={(elementId) => { const clip = editorDoc.tracks.flatMap((track) => track.clips).find((candidate) => candidate.source.elementId === elementId); if (clip) selectEditorClip(clip); }} onPatch={(patch) => { setPendingPatch(patch); setMode("review"); setPreviewMode("after"); setStatusMessage(`Canvas patch prepared for ${selected.id}. Apply it only after review.`); }} /></div> : null}
             {pendingPatch ? <div className="composer-preview-switch"><button className={previewMode === "before" ? "active" : ""} onClick={() => setPreviewMode("before")}>Before</button><button className={previewMode === "after" ? "active" : ""} onClick={() => setPreviewMode("after")}>After</button></div> : null}
           </div>
            <div className="composer-range-controls"><button className={rangeMode === "full" ? "active" : ""} onClick={playFullVideo}>Full video</button><button className={rangeMode === "beat" ? "active" : ""} onClick={playSelectedBeat}>Play beat</button><button className={rangeMode === "context" ? "active" : ""} onClick={playSelectedContext}>Play with context</button><span>{formatTime(activeStartSec)}–{formatTime(activeEndSec)}</span></div>
            <div className="composer-custom-range"><span>Custom range</span><input aria-label="Custom range start" type="number" min={0} max={durationSec} step={0.01} value={customStartInput} onChange={(event) => setCustomStartInput(Number(event.target.value))} /><input aria-label="Custom range end" type="number" min={0} max={durationSec} step={0.01} value={customEndInput} onChange={(event) => setCustomEndInput(Number(event.target.value))} /><button onClick={() => createCustomSlice(customStartInput, customEndInput)}>Select range</button></div>
           <div className="composer-scrub-row"><span>{formatTime(currentSec)}</span><input aria-label="Seek video" type="range" min={0} max={durationSec} step={0.01} value={Math.min(durationSec, currentSec)} onChange={(event) => seek(Number(event.target.value))} /><span>{formatTime(durationSec)}</span></div>
           {pendingPatch ? <div className="composer-patch-banner"><div className="composer-patch-copy"><span className="composer-patch-kicker">PATCH PREVIEW / LOCAL ONLY</span><strong>{pendingPatch.reason}</strong><small>{pendingPatch.operations.length} operation · target {selected.id} · {formatTime(pendingPatch.affectedRange.startSec)}–{formatTime(pendingPatch.affectedRange.endSec)}</small>{pendingPatch.cascade ? <small className="composer-cascade-warning">Timeline reflow: {pendingPatch.cascade.affectedBeatIds.length} downstream beats will move.</small> : null}</div><div className="composer-patch-actions"><button className="tb-btn" onClick={rollbackPending}>Discard</button><button className="tb-btn primary" onClick={applyPending} disabled={applyScope !== "this_instance"}>Apply to beat</button></div></div> : null}
        </main>

        <aside className="composer-inspector composer-panel">
           <div className="composer-panel-title"><span>Inspector</span><small className={`qa qa-${selectedQa}`}><b />{qaText[selectedQa]}</small></div>
           <div className="composer-agent-quickbar"><div><strong>Agent edit</strong><small>{selectedTimelineClip?.label || selected.id}</small></div><div><button type="button" onClick={makeFeedback} disabled={operationBusy}>{operationBusy ? "Working" : "Fix"}</button><button type="button" className="primary" onClick={handOffSelectedToKilo} disabled={operationBusy}>Ask agent</button></div></div>
           <div className="composer-selected-title"><span>{selected.journeySlot}</span><strong>{treatmentLabel(selected.treatment.id)}</strong><small>{formatTime(selected.startSec)}–{formatTime(beatEndSec(selected))}</small></div>
            <div className="composer-transcript"><span>TRANSCRIPT</span><blockquote>“{selected.transcript}”</blockquote></div>
            <details className="composer-review-context"><summary>Review context <small>{reviewQueue?.entries.find((entry) => entry.sliceId === selectedSlice?.id)?.status || "unreviewed"}</small></summary><div className="composer-slice-context"><span>REVIEW SLICE</span><strong>{selectedSlice?.label || "Beat context"}</strong><small>{selectedSlice?.source || "beat"} · {selectedSlice?.modalities.join(" / ") || "story / visual"}</small></div><div className="composer-review-actions-panel"><span>Review status: <b>{reviewQueue?.entries.find((entry) => entry.sliceId === selectedSlice?.id)?.status || "unreviewed"}</b></span><button onClick={() => markReviewStatus("approved")}>Approve range</button><button onClick={() => markReviewStatus("needs-fix")}>Needs fix</button></div><div className="composer-evidence-grid"><div><span>STORY FUNCTION</span><strong>{selected.narrativeFunction}</strong></div><div><span>TREATMENT</span><strong>{selected.treatment.id}</strong></div><div><span>MOTION</span><strong>{beatMotionSummary(selected)}</strong></div><div><span>AUDIO</span><strong>{selectedAudio.density} / {selectedAudio.sfxCount} SFX</strong></div></div></details>
            <div className="composer-inspector-section"><div className="composer-section-heading">Asset slots <small>{selected.treatment.assets.length}</small></div><div className="composer-asset-list">{selected.treatment.assets.length ? selected.treatment.assets.map((asset) => <div className="composer-asset" key={asset.id}><span className="asset-kind">{asset.kind}</span><span>{asset.id}</span><small>{asset.src.split("/").pop()}</small>{editorDoc.assets?.length ? <select aria-label={`Replace ${asset.id}`} value="" onChange={(event) => { if (event.target.value) prepareAssetReplacement(asset.id, event.target.value); }}><option value="">Replace with local asset…</option>{editorDoc.assets.map((replacement) => <option value={replacement.id} key={replacement.id}>{replacement.name}</option>)}</select> : null}</div>) : <span className="composer-muted">Generated treatment, no external asset slot.</span>}</div><label className="composer-asset-upload">Upload local asset<input aria-label="Upload project asset" type="file" accept="image/*,video/*,audio/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadProjectAsset(file); event.currentTarget.value = ""; }} /></label>{editorDoc.assets?.length ? <div className="composer-uploaded-assets">{editorDoc.assets.map((asset) => <button type="button" draggable key={asset.id} title={asset.src} onDragStart={(event) => event.dataTransfer.setData("application/x-isaacverse-asset", asset.src)}><span>{asset.name}</span><small>{asset.provenance}</small></button>)}</div> : null}</div>
            <div className="composer-inspector-section"><div className="composer-section-heading">Audio cues <small>{selectedAudio.sfxCount} SFX</small></div><div className="composer-audio-summary"><Waveform src={waveformSrc} dense={selectedAudio.density === "dense"} /><span>{selectedAudio.hasVoice ? "VO anchored" : "VO timing review"} · {selectedAudio.hasMusicDuck ? "music ducked" : "no duck zone"}</span></div></div>
            {selectedTimelineClip && (selectedTimelineClip.kind === "voice" || selectedTimelineClip.kind === "music" || selectedTimelineClip.kind === "audio-event") ? <div className="composer-inspector-section composer-audio-editor"><div className="composer-section-heading">Audio clip controls <small>{selectedTimelineClip.label}</small></div><div className="composer-element-fields"><label>Gain dB<input type="number" step="0.5" value={typeof selectedTimelineClip.metadata.gainDb === "number" ? selectedTimelineClip.metadata.gainDb : 0} onChange={(event) => updateAudioClip({ gainDb: Number(event.target.value) })} /></label><label>Fade in<input type="number" step="0.01" min="0" value={typeof selectedTimelineClip.metadata.fadeInSec === "number" ? selectedTimelineClip.metadata.fadeInSec : 0} onChange={(event) => updateAudioClip({ fadeInSec: Number(event.target.value) })} /></label><label>Fade out<input type="number" step="0.01" min="0" value={typeof selectedTimelineClip.metadata.fadeOutSec === "number" ? selectedTimelineClip.metadata.fadeOutSec : 0} onChange={(event) => updateAudioClip({ fadeOutSec: Number(event.target.value) })} /></label><button type="button" className={selectedTimelineClip.muted ? "active" : ""} onClick={() => updateAudioClip({ muted: !selectedTimelineClip.muted })}>{selectedTimelineClip.muted ? "Unmute clip" : "Mute clip"}</button></div></div> : null}
            {selectedTimelineClip?.kind === "transition" ? <div className="composer-inspector-section composer-transition-editor"><div className="composer-section-heading">Transition controls <small>{selectedTimelineClip.label}</small></div><div className="composer-element-fields"><label>Type<select aria-label="Transition type" value={typeof selectedTimelineClip.metadata.transitionType === "string" ? selectedTimelineClip.metadata.transitionType : "fade"} onChange={(event) => updateTransitionClip({ transitionType: event.target.value })}><option value="fade">Fade</option><option value="flash">Flash</option><option value="blur">Blur</option><option value="light-leak">Light leak</option></select></label><label>Duration<input aria-label="Transition duration" type="number" step="0.01" min="0.05" value={selectedTimelineClip.range.endSec - selectedTimelineClip.range.startSec} onChange={(event) => updateTransitionClip({ durationSec: Number(event.target.value) })} /></label></div></div> : null}
            <div className="composer-inspector-section"><div className="composer-section-heading">Target element <small>{selected.elements?.length ?? 0}</small></div><div className="composer-element-targets"><button className={!targetElementId ? "active" : ""} aria-pressed={!targetElementId} onClick={() => setTargetElementId(undefined)}>Whole beat</button>{selected.elements?.map((element) => <button key={element.id} className={targetElementId === element.id ? "active" : ""} aria-pressed={targetElementId === element.id} onClick={() => setTargetElementId(element.id)}>{element.role}<small>{element.id}</small></button>)}</div></div>
            {targetElementId ? (() => { const element = selected.elements?.find((candidate) => candidate.id === targetElementId); if (!element) return null; const geometry = element.geometry || { x: 0, y: 0, width: 0, height: 0 }; return <div className="composer-inspector-section composer-element-editor"><div className="composer-section-heading">Element timing & geometry <small>{element.role}</small></div><div className="composer-element-fields"><label>Start<input type="number" step="0.01" value={element.startSec ?? 0} onChange={(event) => prepareElementPatch("startSec", Number(event.target.value))} /></label><label>End<input type="number" step="0.01" value={element.endSec ?? selected.durationSec} onChange={(event) => prepareElementPatch("endSec", Number(event.target.value))} /></label><label>X<input type="number" step="1" value={geometry.x} onChange={(event) => prepareElementPatch("geometry.x", Number(event.target.value))} /></label><label>Y<input type="number" step="1" value={geometry.y} onChange={(event) => prepareElementPatch("geometry.y", Number(event.target.value))} /></label><label>W<input type="number" step="1" value={geometry.width} onChange={(event) => prepareElementPatch("geometry.width", Number(event.target.value))} /></label><label>H<input type="number" step="1" value={geometry.height} onChange={(event) => prepareElementPatch("geometry.height", Number(event.target.value))} /></label></div></div>; })() : null}
            {selected.motionPhases?.length ? <div className="composer-inspector-section composer-motion-editor"><div className="composer-section-heading">Motion phases <small>{selected.motionPhases.length}</small></div>{selected.motionPhases.map((phase) => <div className="composer-motion-phase" key={phase.id}><strong>{phase.name}</strong><small>{phase.purpose}</small><div className="composer-element-fields"><label>Start<input type="number" step="0.01" value={phase.startSec} onChange={(event) => prepareMotionPatch(phase.id, "startSec", Number(event.target.value))} /></label><label>Duration<input type="number" step="0.01" value={phase.durationSec} onChange={(event) => prepareMotionPatch(phase.id, "durationSec", Number(event.target.value))} /></label><label>Camera scale<input type="number" step="0.01" min="1" value={typeof phase.params?.cameraScale === "number" ? phase.params.cameraScale : 1.12} onChange={(event) => prepareMotionPatch(phase.id, "cameraScale", Number(event.target.value))} /></label></div></div>)}</div> : null}

           <details className="composer-agent-details"><summary>Agent &amp; review details <small>{latestFeedback.length + kiloHandoffs.length} records</small></summary><div className="composer-agent-details-body"><div className="composer-feedback-box"><div className="composer-panel-title feedback-title"><span>What feels wrong?</span><small>feedback becomes a record</small></div><div className="feedback-options">{feedbackOptions.map((option) => <button key={option.id} aria-pressed={category === option.id} className={category === option.id ? "active" : ""} onClick={() => setCategory(option.id)}>{option.label}</button>)}</div><textarea className="composer-note" placeholder="Optional note for the agent…" value={note} onChange={(event) => setNote(event.target.value)} /><div className="composer-apply-scope"><label htmlFor="apply-scope">Apply scope</label><select id="apply-scope" value={applyScope} onChange={(event) => setApplyScope(event.target.value as ApplyScope)}><option value="this_instance">This beat only</option><option value="similar_instances">Similar beats (approval required)</option><option value="future_rule">Future rule (explicit)</option></select></div><small className="composer-scope-note">Batch and future-rule choices are recorded, but this pilot applies only local beat patches.</small><div className="composer-feedback-actions"><button className="composer-fix" onClick={makeFeedback} disabled={operationBusy}>{operationBusy ? "Working…" : "Diagnose locally"}</button><button className="tb-btn primary" onClick={handOffSelectedToKilo} disabled={operationBusy}>Hand off to Kilo</button><button className="tb-btn" onClick={generateAlternatives} disabled={operationBusy}>Try alternatives</button><button className="tb-btn" onClick={generateSimilar} disabled={operationBusy}>Fix all similar</button><button className="tb-btn" onClick={promoteRule} disabled={operationBusy}>Preview future rule</button></div><div className="composer-scope">Target captured automatically: <strong>{selectedSlice?.id || targetElementId || selected.id}</strong>. No timestamp or treatment ID required.</div></div>

           {alternatives.length ? <div className="composer-history composer-alternatives"><div className="composer-section-heading">Alternative treatments <small>{alternatives.length} candidates</small></div>{alternatives.map((patch) => <button key={patch.id} className="composer-alternative" onClick={() => { setPendingPatch(patch); setPreviewMode("after"); setStatusMessage(`Alternative selected for ${selected.id}. Review before applying.`); }}><strong>{patch.operations[0]?.op === "replaceTreatment" ? treatmentLabel(patch.operations[0].treatmentId) : "Local patch"}</strong><small>{patch.reason}</small></button>)}</div> : null}
           {batchPatches.length ? <div className="composer-history composer-batch-review"><div className="composer-section-heading">Similar-beat batch <small>{batchPatches.length} patches / {similarBeatIds.length} matches</small></div><p>Review this explicit batch before applying it to matching treatment instances.</p><button className="tb-btn primary" onClick={applyBatch} disabled={operationBusy}>Approve batch</button></div> : null}
           {rulePreview ? <div className="composer-history composer-rule-preview"><div className="composer-section-heading">Future rule preview <small>not applied</small></div><p>{rulePreview}</p><button className="tb-btn" onClick={() => setRulePreview(null)}>Discard rule preview</button></div> : null}
           <div className="composer-chat-box"><div className="composer-section-heading">Scoped agent note <small>{targetElementId || selected.id}</small></div>{chatMessages.length ? <div className="composer-chat-history">{chatMessages.slice(-4).map((message, index) => <div key={`${message.role}-${index}`} className={`composer-chat-message ${message.role}`}><b>{message.role === "you" ? "YOU" : "AGENT"}</b><span>{message.text}</span></div>)}</div> : null}<textarea value={chatText} onChange={(event) => setChatText(event.target.value)} placeholder="Ask about this beat only…" /><button className="tb-btn" onClick={sendScopedChat} disabled={operationBusy || !chatText.trim()}>Send scoped note</button></div>

           {kiloHandoffs.length ? <div className="composer-history composer-kilo-inbox"><div className="composer-section-heading">Kilo inbox <small>{kiloHandoffs.filter((request) => request.status === "pending").length} pending</small></div>{kiloHandoffs.slice().reverse().slice(0, 5).map((request) => <div key={request.id} className="composer-kilo-request"><div className="composer-history-row"><span>{request.modality} · {request.slice.label}</span><small>{request.status}</small></div>{request.result?.diagnosis ? <p>{request.result.diagnosis}</p> : null}{request.result?.beforePath || request.result?.afterPath ? <div className="composer-kilo-artifacts">{request.result.beforePath ? <video controls preload="metadata" src={artifactUrl(projectId, request.result.beforePath)} /> : null}{request.result.afterPath ? <video controls preload="metadata" src={artifactUrl(projectId, request.result.afterPath)} /> : null}</div> : null}</div>)}</div> : null}

          {latestFeedback.length ? <div className="composer-history"><div className="composer-section-heading">Feedback history <small>{feedback.length} total</small></div>{latestFeedback.map((record) => <div key={record.id} className="composer-history-row"><span>{record.category}</span><small>{record.status}</small></div>)}</div> : null}
           {persistedVersions.length || history.length ? <div className="composer-history"><div className="composer-section-heading">Version history <small>{persistedVersions.length || history.length} versions</small></div>{persistedVersions.slice().reverse().map((version) => <div key={version.version} className="composer-history-row"><span>{version.version} · persisted edit</span>{version.version !== doc.version ? <button onClick={() => rollbackPersistedVersion(projectId, version.version, doc.version ?? "v001").then((saved) => { setDoc(saved.editDoc); setPersistedVersions((current) => [...current, { version: saved.version, editDoc: saved.editDoc }]); setStatusMessage(`Rolled back to ${version.version}; saved as ${saved.version}.`); }).catch((error: unknown) => setStatusMessage(error instanceof Error ? error.message : String(error)))}>Rollback</button> : <small>current</small>}</div>)}{history.slice().reverse().map((version) => <div key={`local-${version.id}`} className="composer-history-row"><span>{version.id} · {version.patch.reason}</span><button onClick={() => rollbackVersion(version)}>Rollback</button></div>)}</div> : null}</div></details>
         </aside>
       </div>
        <div className="composer-timeline-resizer" role="separator" aria-orientation="horizontal" aria-label="Resize timeline height" onPointerDown={onTimelineResizerPointerDown} />
        <div className="composer-timeline-dock">
         <EditorTimeline editor={editorDoc} selection={editorState.selection} playhead={{ ...editorState.playhead, currentSec }} zoom={editorZoom} onZoomChange={setEditorZoom} onSeek={seekFromEditor} onSelectClip={selectEditorClip} onTrimClip={trimTimelineClip} onTrimCommit={commitAudioTrim} activeTool={editorState.activeTool} onToolChange={(tool) => dispatchEditor({ type: "setActiveTool", tool })} onSplitClip={splitTimelineClip} onRipple={rippleTimeline} onTrackStateChange={updateEditorTrack} onMoveTrack={moveEditorTrack} onAddAssetTrack={addAssetTrackToTimeline} onDeleteTrack={deleteEditorTrackFromTimeline} canUndo={editorUndo.length > 0} canRedo={editorRedo.length > 0} onUndo={undoEditorRevision} onRedo={redoEditorRevision} />
       </div>
     </div>
  );
};

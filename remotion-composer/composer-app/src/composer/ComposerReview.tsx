import React from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { IsaacVerseEditVideo } from "../../../shared/isaacverse/EditVideo";
import { applyPatch as applyLocalPatch, type ApplyScope, type EditPatch, type FeedbackCategory, type FeedbackRecord } from "../../../shared/isaacverse/feedback";
import type { IsaacVerseEditDoc, SemanticBeat } from "../../../shared/isaacverse/types";
import { beatAudioSummary, beatEndSec, beatMotionSummary, beatQaStatus, createFeedbackRecord, treatmentLabel } from "./model";
import { applyPatch as applyPersistedPatch, artifactUrl, handoffToKilo, loadKiloInbox, loadProject, loadReviewQueue, operate, rollbackVersion as rollbackPersistedVersion, saveFeedback, saveReviewQueue, updateKiloHandoff } from "./api";
import type { OperationResult } from "../../../shared/isaacverse/operations";
import { EditSurface } from "../canvas/EditSurface";
import { canvasElementsToPatch, editBeatToCanvas } from "../canvas/beatAdapter";
import type { CanvasElement } from "../canvas/types";
import { deriveReviewSlices, frameRangeForReviewSlice, type FeedbackRequest, type ReviewQueue, type ReviewSlice, type ReviewStatus } from "../../../shared/isaacverse/review";
import { downsampleWaveform } from "./waveform";

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

const BeatCanvasEditor: React.FC<{ beat: SemanticBeat; onPatch: (patch: EditPatch) => void }> = ({ beat, onPatch }) => {
  const [elements, setElements] = React.useState<CanvasElement[]>(() => editBeatToCanvas(beat));
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  React.useEffect(() => { setElements(editBeatToCanvas(beat)); setSelectedIds([]); }, [beat.id, beat.revision]);
  return <div className="composer-beat-canvas"><div className="composer-canvas-heading"><span>DIRECT BEAT CANVAS</span><small>geometry and text become a selected-beat patch</small></div><EditSurface elements={elements} selectedIds={selectedIds} onSelect={(ids) => setSelectedIds(ids)} onLive={(updater) => setElements(updater)} onGestureStart={() => undefined} onGestureEnd={() => undefined} /><div className="composer-canvas-actions"><span>{elements.length - 1} editable elements · {selectedIds.length} selected</span><button className="tb-btn primary" onClick={() => onPatch(canvasElementsToPatch(beat, elements))}>Preview canvas patch</button></div></div>;
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
  const [mode, setMode] = React.useState<"review" | "edit">("review");
  const [rangeMode, setRangeMode] = React.useState<"full" | "beat" | "context">("beat");
  const [timelineZoom, setTimelineZoom] = React.useState(1);
  const [statusMessage, setStatusMessage] = React.useState("Loading persisted project state.");

  React.useEffect(() => {
    let active = true;
    loadProject(projectId).then((snapshot) => {
      if (!active) return;
      if (!snapshot.editDoc) throw new Error("Project has no edit document");
      setDoc(snapshot.editDoc);
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
    playerRef.current?.seekTo(Math.round(startSec * doc.fps));
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

  if (!doc) return <div className="composer-loading"><strong>{loadError ? "Composer could not load the project" : "Loading Composer project"}</strong><span>{loadError || projectId}</span>{onClose ? <button className="ce-mode" onClick={onClose}>Back</button> : null}</div>;

  const selected = doc.beats.find((beat) => beat.id === selectedBeatId) ?? doc.beats[0];
  const durationSec = documentDuration(doc);
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
    const slice = selectedSlice;
    if (!slice) { setStatusMessage("Select a review slice before handing it to Kilo."); return; }
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
    <div className="composer-review">
      <header className="composer-review-head">
        <div className="composer-brand-lockup">
          <div className="composer-eyebrow"><span className="composer-signal" /> ISAACVERSE / COMPOSER</div>
          <h2>Segment Review <span>{projectId} / persisted</span></h2>
          <p>Inspect the story beat, not a generic layout. Every correction stays local until you promote it.</p>
        </div>
        <div className="composer-review-actions">
          <span className="composer-version">{doc.version ?? "v001"}</span>
          <button className={`ce-mode ${mode === "review" ? "on" : ""}`} onClick={() => setMode("review")}>Review</button>
          <button className={`ce-mode ${mode === "edit" ? "on" : ""}`} onClick={() => setMode("edit")}>Edit beat</button>
          {onClose ? <button className="modal-close" onClick={onClose} aria-label="Close Composer">×</button> : null}
        </div>
      </header>

      <div className="composer-status-line"><span>{statusMessage}</span><span className="composer-status-target">review <b>{reviewQueue?.rollup.approved || 0}/{reviewQueue?.rollup.slices || reviewSlices.length}</b> approved · target <b>{selectedSlice?.id || selected.id}</b> · {formatExactTime(reviewStartSec)}–{formatExactTime(reviewEndSec)}</span></div>

      <div className="composer-review-grid">
        <aside className="composer-beats composer-panel">
          <div className="composer-panel-title"><span>Video map</span><small>{doc.beats.length} beats / {durationSec.toFixed(1)}s</small></div>
          <div className="composer-beat-list">
            {doc.scenes?.length ? doc.scenes.map((scene) => <React.Fragment key={scene.id}><div className="composer-scene-label">Scene {String(scene.index).padStart(2, "0")} <small>{formatTime(scene.startSec)}–{formatTime(scene.startSec + scene.durationSec)}</small></div>{scene.beatIds.map((beatId) => doc.beats.find((beat) => beat.id === beatId)).filter((beat): beat is SemanticBeat => Boolean(beat)).map(renderBeatCard)}</React.Fragment>) : doc.beats.map(renderBeatCard)}
          </div>
        </aside>

        <main className="composer-player-pane">
          <div className="composer-player-label"><span>{previewMode === "after" && pendingPatch ? "PATCH PREVIEW" : "CURRENT CUT"}</span><span>{mode === "edit" ? "edit scope: selected beat" : "review scope: selected beat"}</span></div>
           <div className="composer-player-frame">
             {mode === "edit" ? <BeatCanvasEditor beat={selected} onPatch={(patch) => { setPendingPatch(patch); setMode("review"); setPreviewMode("after"); setStatusMessage(`Canvas patch prepared for ${selected.id}. Apply it only after review.`); }} /> : <Player ref={playerRef} component={IsaacVerseEditVideo} inputProps={{ doc: previewMode === "after" ? previewDoc : doc }} durationInFrames={Math.ceil(durationSec * doc.fps)} fps={doc.fps} compositionWidth={doc.width} compositionHeight={doc.height} inFrame={activeRange.inFrame} outFrame={activeRange.outFrame} initialFrame={activeRange.inFrame} style={{ width: "100%", aspectRatio: "16/9" }} controls loop moveToBeginningWhenEnded acknowledgeRemotionLicense />}
             {pendingPatch ? <div className="composer-preview-switch"><button className={previewMode === "before" ? "active" : ""} onClick={() => setPreviewMode("before")}>Before</button><button className={previewMode === "after" ? "active" : ""} onClick={() => setPreviewMode("after")}>After</button></div> : null}
           </div>
            <div className="composer-range-controls"><button className={rangeMode === "full" ? "active" : ""} onClick={playFullVideo}>Full video</button><button className={rangeMode === "beat" ? "active" : ""} onClick={playSelectedBeat}>Play beat</button><button className={rangeMode === "context" ? "active" : ""} onClick={playSelectedContext}>Play with context</button><span>{formatTime(activeStartSec)}–{formatTime(activeEndSec)}</span></div>
            <div className="composer-custom-range"><span>Custom range</span><input aria-label="Custom range start" type="number" min={0} max={durationSec} step={0.01} value={customStartInput} onChange={(event) => setCustomStartInput(Number(event.target.value))} /><input aria-label="Custom range end" type="number" min={0} max={durationSec} step={0.01} value={customEndInput} onChange={(event) => setCustomEndInput(Number(event.target.value))} /><button onClick={() => createCustomSlice(customStartInput, customEndInput)}>Select range</button></div>
           <div className="composer-scrub-row"><span>{formatTime(currentSec)}</span><input aria-label="Seek video" type="range" min={0} max={durationSec} step={0.01} value={Math.min(durationSec, currentSec)} onChange={(event) => seek(Number(event.target.value))} /><span>{formatTime(durationSec)}</span></div>
           <Timeline doc={doc} durationSec={durationSec} activeStartSec={activeStartSec} activeEndSec={activeEndSec} slices={reviewSlices} zoom={timelineZoom} onZoomChange={setTimelineZoom} onSeek={seek} selectedBeatId={selected.id} currentSec={currentSec} onSelect={selectBeat} onSelectSlice={selectSlice} />
           {pendingPatch ? <div className="composer-patch-banner"><div className="composer-patch-copy"><span className="composer-patch-kicker">PATCH PREVIEW / LOCAL ONLY</span><strong>{pendingPatch.reason}</strong><small>{pendingPatch.operations.length} operation · target {selected.id} · {formatTime(pendingPatch.affectedRange.startSec)}–{formatTime(pendingPatch.affectedRange.endSec)}</small>{pendingPatch.cascade ? <small className="composer-cascade-warning">Timeline reflow: {pendingPatch.cascade.affectedBeatIds.length} downstream beats will move.</small> : null}</div><div className="composer-patch-actions"><button className="tb-btn" onClick={rollbackPending}>Discard</button><button className="tb-btn primary" onClick={applyPending} disabled={applyScope !== "this_instance"}>Apply to beat</button></div></div> : null}
        </main>

        <aside className="composer-inspector composer-panel">
          <div className="composer-panel-title"><span>Beat inspector</span><small className={`qa qa-${selectedQa}`}><b />{qaText[selectedQa]}</small></div>
           <div className="composer-selected-title"><span>{selected.journeySlot}</span><strong>{treatmentLabel(selected.treatment.id)}</strong><small>{formatTime(selected.startSec)}–{formatTime(beatEndSec(selected))}</small></div>
           <div className="composer-transcript"><span>TRANSCRIPT</span><blockquote>“{selected.transcript}”</blockquote></div>
           <div className="composer-slice-context"><span>REVIEW SLICE</span><strong>{selectedSlice?.label || "Beat context"}</strong><small>{selectedSlice?.source || "beat"} · {selectedSlice?.modalities.join(" / ") || "story / visual"}</small></div>
           <div className="composer-review-actions-panel"><span>Review status: <b>{reviewQueue?.entries.find((entry) => entry.sliceId === selectedSlice?.id)?.status || "unreviewed"}</b></span><button onClick={() => markReviewStatus("approved")}>Approve range</button><button onClick={() => markReviewStatus("needs-fix")}>Needs fix</button></div>
          <div className="composer-evidence-grid"><div><span>STORY FUNCTION</span><strong>{selected.narrativeFunction}</strong></div><div><span>TREATMENT</span><strong>{selected.treatment.id}</strong></div><div><span>MOTION</span><strong>{beatMotionSummary(selected)}</strong></div><div><span>AUDIO</span><strong>{selectedAudio.density} / {selectedAudio.sfxCount} SFX</strong></div></div>
           <div className="composer-inspector-section"><div className="composer-section-heading">Asset slots <small>{selected.treatment.assets.length}</small></div><div className="composer-asset-list">{selected.treatment.assets.length ? selected.treatment.assets.map((asset) => <div className="composer-asset" key={asset.id}><span className="asset-kind">{asset.kind}</span><span>{asset.id}</span><small>{asset.src.split("/").pop()}</small></div>) : <span className="composer-muted">Generated treatment, no external asset slot.</span>}</div></div>
            <div className="composer-inspector-section"><div className="composer-section-heading">Audio cues <small>{selectedAudio.sfxCount} SFX</small></div><div className="composer-audio-summary"><Waveform src={waveformSrc} dense={selectedAudio.density === "dense"} /><span>{selectedAudio.hasVoice ? "VO anchored" : "VO timing review"} · {selectedAudio.hasMusicDuck ? "music ducked" : "no duck zone"}</span></div></div>
           <div className="composer-inspector-section"><div className="composer-section-heading">Target element <small>{selected.elements?.length ?? 0}</small></div><div className="composer-element-targets"><button className={!targetElementId ? "active" : ""} aria-pressed={!targetElementId} onClick={() => setTargetElementId(undefined)}>Whole beat</button>{selected.elements?.map((element) => <button key={element.id} className={targetElementId === element.id ? "active" : ""} aria-pressed={targetElementId === element.id} onClick={() => setTargetElementId(element.id)}>{element.role}<small>{element.id}</small></button>)}</div></div>

           <div className="composer-feedback-box"><div className="composer-panel-title feedback-title"><span>What feels wrong?</span><small>feedback becomes a record</small></div><div className="feedback-options">{feedbackOptions.map((option) => <button key={option.id} aria-pressed={category === option.id} className={category === option.id ? "active" : ""} onClick={() => setCategory(option.id)}>{option.label}</button>)}</div><textarea className="composer-note" placeholder="Optional note for the agent…" value={note} onChange={(event) => setNote(event.target.value)} /><div className="composer-apply-scope"><label htmlFor="apply-scope">Apply scope</label><select id="apply-scope" value={applyScope} onChange={(event) => setApplyScope(event.target.value as ApplyScope)}><option value="this_instance">This beat only</option><option value="similar_instances">Similar beats (approval required)</option><option value="future_rule">Future rule (explicit)</option></select></div><small className="composer-scope-note">Batch and future-rule choices are recorded, but this pilot applies only local beat patches.</small><div className="composer-feedback-actions"><button className="composer-fix" onClick={makeFeedback} disabled={operationBusy}>{operationBusy ? "Working…" : "Diagnose locally"}</button><button className="tb-btn primary" onClick={handOffSelectedToKilo} disabled={operationBusy}>Hand off to Kilo</button><button className="tb-btn" onClick={generateAlternatives} disabled={operationBusy}>Try alternatives</button><button className="tb-btn" onClick={generateSimilar} disabled={operationBusy}>Fix all similar</button><button className="tb-btn" onClick={promoteRule} disabled={operationBusy}>Preview future rule</button></div><div className="composer-scope">Target captured automatically: <strong>{selectedSlice?.id || targetElementId || selected.id}</strong>. No timestamp or treatment ID required.</div></div>

           {alternatives.length ? <div className="composer-history composer-alternatives"><div className="composer-section-heading">Alternative treatments <small>{alternatives.length} candidates</small></div>{alternatives.map((patch) => <button key={patch.id} className="composer-alternative" onClick={() => { setPendingPatch(patch); setPreviewMode("after"); setStatusMessage(`Alternative selected for ${selected.id}. Review before applying.`); }}><strong>{patch.operations[0]?.op === "replaceTreatment" ? treatmentLabel(patch.operations[0].treatmentId) : "Local patch"}</strong><small>{patch.reason}</small></button>)}</div> : null}
           {batchPatches.length ? <div className="composer-history composer-batch-review"><div className="composer-section-heading">Similar-beat batch <small>{batchPatches.length} patches / {similarBeatIds.length} matches</small></div><p>Review this explicit batch before applying it to matching treatment instances.</p><button className="tb-btn primary" onClick={applyBatch} disabled={operationBusy}>Approve batch</button></div> : null}
           {rulePreview ? <div className="composer-history composer-rule-preview"><div className="composer-section-heading">Future rule preview <small>not applied</small></div><p>{rulePreview}</p><button className="tb-btn" onClick={() => setRulePreview(null)}>Discard rule preview</button></div> : null}
           <div className="composer-chat-box"><div className="composer-section-heading">Scoped agent note <small>{targetElementId || selected.id}</small></div>{chatMessages.length ? <div className="composer-chat-history">{chatMessages.slice(-4).map((message, index) => <div key={`${message.role}-${index}`} className={`composer-chat-message ${message.role}`}><b>{message.role === "you" ? "YOU" : "AGENT"}</b><span>{message.text}</span></div>)}</div> : null}<textarea value={chatText} onChange={(event) => setChatText(event.target.value)} placeholder="Ask about this beat only…" /><button className="tb-btn" onClick={sendScopedChat} disabled={operationBusy || !chatText.trim()}>Send scoped note</button></div>

           {kiloHandoffs.length ? <div className="composer-history composer-kilo-inbox"><div className="composer-section-heading">Kilo inbox <small>{kiloHandoffs.filter((request) => request.status === "pending").length} pending</small></div>{kiloHandoffs.slice().reverse().slice(0, 5).map((request) => <div key={request.id} className="composer-kilo-request"><div className="composer-history-row"><span>{request.modality} · {request.slice.label}</span><small>{request.status}</small></div>{request.result?.diagnosis ? <p>{request.result.diagnosis}</p> : null}{request.result?.beforePath || request.result?.afterPath ? <div className="composer-kilo-artifacts">{request.result.beforePath ? <video controls preload="metadata" src={artifactUrl(projectId, request.result.beforePath)} /> : null}{request.result.afterPath ? <video controls preload="metadata" src={artifactUrl(projectId, request.result.afterPath)} /> : null}</div> : null}</div>)}</div> : null}

          {latestFeedback.length ? <div className="composer-history"><div className="composer-section-heading">Feedback history <small>{feedback.length} total</small></div>{latestFeedback.map((record) => <div key={record.id} className="composer-history-row"><span>{record.category}</span><small>{record.status}</small></div>)}</div> : null}
           {persistedVersions.length || history.length ? <div className="composer-history"><div className="composer-section-heading">Version history <small>{persistedVersions.length || history.length} versions</small></div>{persistedVersions.slice().reverse().map((version) => <div key={version.version} className="composer-history-row"><span>{version.version} · persisted edit</span>{version.version !== doc.version ? <button onClick={() => rollbackPersistedVersion(projectId, version.version, doc.version ?? "v001").then((saved) => { setDoc(saved.editDoc); setPersistedVersions((current) => [...current, { version: saved.version, editDoc: saved.editDoc }]); setStatusMessage(`Rolled back to ${version.version}; saved as ${saved.version}.`); }).catch((error: unknown) => setStatusMessage(error instanceof Error ? error.message : String(error)))}>Rollback</button> : <small>current</small>}</div>)}{history.slice().reverse().map((version) => <div key={`local-${version.id}`} className="composer-history-row"><span>{version.id} · {version.patch.reason}</span><button onClick={() => rollbackVersion(version)}>Rollback</button></div>)}</div> : null}
        </aside>
      </div>
    </div>
  );
};

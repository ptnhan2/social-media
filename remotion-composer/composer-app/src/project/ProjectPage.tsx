import React from "react";
import { fetchApproval, fetchRenders, loadProject, setApproval, setClipMetadata, artifactUrl, type ProjectApproval, type ProjectRender, type ClipMetadataChanges } from "../composer/api";
import type { IsaacVerseEditDoc, EditorClip } from "../../../shared/isaacverse/editor";
import type { VideoDoc } from "../../../shared/isaacverse/schema";
import { useAgentUi } from "../agent/AgentDrawer";

/**
 * CONTENT STUDIO (CONTENT-STUDIO-SPEC — script-centric writing surface).
 * Design: the SCRIPT is the document — beats read as paragraphs (serif,
 * borderless, focus-only affordances). Voice birth controls tuck behind a
 * per-beat toggle; approval is a quiet status strip; the candidate video
 * opens ON DEMAND (never embedded at the script stage — watching lives in
 * the editor). Structure over boxes: whitespace + a left gutter, not nested
 * borders.
 */

type VoiceTake = { id?: string; path?: string; pass?: boolean; durationSec?: number };
type VoiceSettingsShape = { voiceId?: string; modelId?: string; stability?: number; style?: number; speed?: number };

const num = (value: unknown, fallback: number) => (typeof value === "number" && Number.isFinite(value) ? value : fallback);

const pollJob = async (startUrl: string, body: Record<string, unknown>, statusUrl: (jobId: string) => string) => {
  const start = await fetch(startUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json());
  if (!start.jobId) throw new Error(start.error || "job failed to start");
  for (let i = 0; i < 90; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const status = await fetch(statusUrl(start.jobId)).then((r) => r.json());
    if (status.status === "done") return status;
    if (status.status === "error") throw new Error(status.message || "job error");
  }
  throw new Error("job timed out");
};

/** Quiet quote-style prompt — the recipe that generated this script. */
const PromptQuote: React.FC<{ instruction?: string }> = ({ instruction }) => {
  const agent = useAgentUi();
  if (!instruction) return null;
  return (
    <div className="pp-prompt">
      <p className="pp-prompt-text">“{instruction}”</p>
      <button type="button" className="pp-quiet-btn" onClick={() => { agent.setDraftPrompt(instruction); agent.setOpen(true); }}>↻ chạy lại prompt này</button>
    </div>
  );
};

/** ONE beat reads as a document block: script paragraph first, voice birth
 *  controls behind a toggle. The left gutter carries beat number + QC dot. */
const BeatEditor: React.FC<{
  index: number;
  beat: EditorClip;
  voice?: EditorClip;
  projectId: string;
  onChanged: () => void;
}> = ({ index, beat, voice, projectId, onChanged }) => {
  const md = (voice?.metadata ?? {}) as Record<string, unknown>;
  const sentenceText = typeof md.sentenceText === "string" ? md.sentenceText : typeof beat.metadata.transcript === "string" ? String(beat.metadata.transcript) : "";
  const providerText = typeof md.providerText === "string" ? md.providerText : sentenceText;
  const settings = (md.voiceSettings as VoiceSettingsShape) ?? {};
  const qc = md.qc as { pass?: boolean; checks?: { id: string; label: string; pass: boolean; value: string; threshold: string }[]; durationSec?: number; wer?: number | null } | undefined;
  const takes = Array.isArray(md.takes) ? (md.takes as VoiceTake[]) : [];
  const takeId = typeof md.takeId === "string" ? md.takeId : "";
  const treatment = typeof beat.metadata.treatmentId === "string" ? beat.metadata.treatmentId : "?";

  const [draftScript, setDraftScript] = React.useState(sentenceText);
  const [draftDirection, setDraftDirection] = React.useState(providerText);
  const [draftSettings, setDraftSettings] = React.useState({
    voiceId: String(settings.voiceId ?? ""),
    modelId: String(settings.modelId ?? "eleven_v3"),
    speed: String(num(settings.speed, 1)),
    stability: String(num(settings.stability, 0.35)),
  });
  React.useEffect(() => {
    setDraftScript(sentenceText);
    setDraftDirection(providerText);
    setDraftSettings({
      voiceId: String(settings.voiceId ?? ""),
      modelId: String(settings.modelId ?? "eleven_v3"),
      speed: String(num(settings.speed, 1)),
      stability: String(num(settings.stability, 0.35)),
    });
  }, [sentenceText, providerText, settings.voiceId, settings.modelId, settings.speed, settings.stability]);

  const [message, setMessage] = React.useState("");
  const [busy, setBusy] = React.useState<"none" | "saving" | "regen" | `take:${string}`>("none");
  const [voiceOpen, setVoiceOpen] = React.useState(false);
  const [playing, setPlaying] = React.useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const save = async (changes: ClipMetadataChanges, label: string) => {
    if (!voice) { setMessage("Beat chưa có voice — chạy generate trước."); return; }
    setBusy("saving"); setMessage("");
    try {
      await setClipMetadata(projectId, voice.id, changes);
      setMessage(`${label} ✓`);
      onChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally { setBusy("none"); }
  };

  const commitSetting = (key: "voiceId" | "modelId" | "speed" | "stability") => {
    const raw = draftSettings[key];
    if (key === "speed" || key === "stability") {
      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) { setMessage(`${key}: số không hợp lệ`); return; }
      if (Math.abs(parsed - num(settings[key], key === "speed" ? 1 : 0.35)) < 0.0001) return;
      void save({ voiceSettings: { ...settings, [key]: parsed } }, key);
    } else {
      if (raw === String(settings[key] ?? (key === "modelId" ? "eleven_v3" : ""))) return;
      void save({ voiceSettings: { ...settings, [key]: raw } }, key);
    }
  };

  const regen = async () => {
    if (!projectId || !voice) return;
    setBusy("regen"); setMessage("");
    try {
      if (draftDirection !== providerText) {
        await setClipMetadata(projectId, voice.id, { providerText: draftDirection });
      }
      const status = await pollJob("/api/project/audio-regen", { projectId, clipId: voice.id, takes: 2, providerText: draftDirection.trim() || undefined }, (jobId) => `/api/project/audio-regen/status?jobId=${encodeURIComponent(jobId)}`);
      setMessage(`Regen ✓ — QC ${status.result?.qc?.pass === true ? "PASS" : "FAIL"}, ${status.result?.stemDurationSec ?? "?"}s`);
      onChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally { setBusy("none"); }
  };

  const switchTake = async (nextTakeId: string) => {
    setBusy(`take:${nextTakeId}`); setMessage("");
    try {
      const status = await pollJob("/api/project/audio-take", { projectId, clipId: voice!.id, takeId: nextTakeId }, (jobId) => `/api/project/audio-take/status?jobId=${encodeURIComponent(jobId)}`);
      setMessage(`Take switched ✓ — QC ${status.result?.qc?.pass === true ? "PASS" : "FAIL"}`);
      onChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally { setBusy("none"); }
  };

  const playStem = (src: string) => {
    audioRef.current?.pause();
    if (playing === "stem") { setPlaying(null); return; }
    const audio = new Audio(`/${src}`);
    audio.onended = () => setPlaying(null);
    audio.onerror = () => setPlaying(null);
    audioRef.current = audio;
    setPlaying("stem");
    void audio.play().catch(() => setPlaying(null));
  };

  const playTake = (take: VoiceTake) => {
    if (!projectId || !take.id || !take.path) return;
    const filename = String(take.path).split(/[\\/]/).pop();
    if (!filename) return;
    audioRef.current?.pause();
    if (playing === take.id) { setPlaying(null); return; }
    const audio = new Audio(`/${projectId}/voice/takes/${encodeURIComponent(filename)}`);
    audio.onended = () => setPlaying(null);
    audio.onerror = () => setPlaying(null);
    audioRef.current = audio;
    setPlaying(take.id);
    void audio.play().catch(() => setPlaying(null));
  };

  return (
    <article className={`pp-beat ${qc?.pass ? "" : "pp-beat-warn"}`}>
      <div className="pp-beat-gutter">
        <span className="pp-beat-num">{index + 1}</span>
        <span className={`pp-dot ${voice?.metadata.qc ? (qc?.pass ? "ok" : "bad") : "none"}`} title={voice?.metadata.qc ? (qc?.pass ? "QC pass" : "QC fail") : "chưa có VO"} />
      </div>
      <div className="pp-beat-body">
        <textarea className="pp-script" rows={2} value={draftScript} aria-label={`Script beat ${index + 1}`} disabled={!voice}
          onChange={(e) => setDraftScript(e.target.value)}
          onBlur={() => { if (draftScript !== sentenceText && draftScript.trim()) void save({ sentenceText: draftScript.trim() }, "Script"); }} />
        <div className="pp-beat-meta">
          <span className="pp-chip">{treatment}</span>
          <span className="pp-soft">{(beat.range.endSec - beat.range.startSec).toFixed(1)}s</span>
          {typeof voice?.metadata.src === "string" && voice.metadata.src ? (
            <button type="button" className="pp-quiet-btn" aria-label={`Play voice beat ${index + 1}`} onClick={() => playStem(voice.metadata.src as string)}>▶</button>
          ) : null}
          <button type="button" className="pp-quiet-btn pp-voice-toggle" aria-expanded={voiceOpen} onClick={() => setVoiceOpen(!voiceOpen)}>🎙 voice</button>
        </div>

        {voiceOpen ? (
          <div className="pp-voicedetails">
            <label className="pp-vfield">
              <span>direction</span>
              <textarea rows={2} value={draftDirection} aria-label={`Direction beat ${index + 1}`} disabled={!voice}
                onChange={(e) => setDraftDirection(e.target.value)}
                onBlur={() => { if (draftDirection !== providerText) void save({ providerText: draftDirection }, "Direction"); }} />
            </label>
            <div className="pp-vsettings">
              <label><span>voice</span><input type="text" value={draftSettings.voiceId} aria-label={`Voice ID beat ${index + 1}`} disabled={!voice}
                onChange={(e) => setDraftSettings((s) => ({ ...s, voiceId: e.target.value }))} onBlur={() => commitSetting("voiceId")} /></label>
              <label><span>model</span><input type="text" value={draftSettings.modelId} aria-label={`Model beat ${index + 1}`} disabled={!voice}
                onChange={(e) => setDraftSettings((s) => ({ ...s, modelId: e.target.value }))} onBlur={() => commitSetting("modelId")} /></label>
              <label><span>speed</span><input type="number" step="0.05" min="0.7" max="1.2" value={draftSettings.speed} aria-label={`Speed beat ${index + 1}`} disabled={!voice}
                onChange={(e) => setDraftSettings((s) => ({ ...s, speed: e.target.value }))} onBlur={() => commitSetting("speed")} /></label>
              <label><span>stability</span><input type="number" step="0.05" min="0" max="1" value={draftSettings.stability} aria-label={`Stability beat ${index + 1}`} disabled={!voice}
                onChange={(e) => setDraftSettings((s) => ({ ...s, stability: e.target.value }))} onBlur={() => commitSetting("stability")} /></label>
            </div>
            {takes.length ? (
              <div className="pp-takes">
                {takes.map((take) => {
                  const id = typeof take.id === "string" ? take.id : "";
                  const isCurrent = id === takeId;
                  return (
                    <span key={id} className={`pp-take ${isCurrent ? "current" : ""}`}>
                      <button type="button" className="pp-quiet-btn" aria-label={`Play take ${id.split("-take-").pop()}`} disabled={!take.path} onClick={() => playTake(take)}>{playing === id ? "■" : "▶"}</button>
                      <span className="pp-soft">{id.split("-take-").pop()}{typeof take.durationSec === "number" ? ` ${take.durationSec.toFixed(1)}s` : ""}</span>
                      <button type="button" className="pp-quiet-btn" disabled={isCurrent || busy !== "none"} onClick={() => void switchTake(id)}>{isCurrent ? "đang dùng" : "dùng"}</button>
                    </span>
                  );
                })}
              </div>
            ) : null}
            {qc ? (
              <details className="pp-qcdetails">
                <summary>QC {qc.pass ? "✓" : "✗"}</summary>
                <ul>{(qc.checks ?? []).map((check) => <li key={check.id}>{check.pass ? "✓" : "✗"} {check.label}: {check.value} ({check.threshold})</li>)}</ul>
              </details>
            ) : null}
            <div className="pp-voiceactions">
              <button type="button" className="pp-btn pp-regen" disabled={busy !== "none" || !voice} onClick={() => void regen()}>
                {busy === "regen" ? "Regenerating…" : "Regen voice (2 takes + QC)"}
              </button>
            </div>
          </div>
        ) : null}
        {message ? <p className="pp-msg">{message}</p> : null}
        {!voice ? <p className="pp-msg">Chưa có voice clip — chạy generate trước.</p> : null}
      </div>
    </article>
  );
};

/** Approval = quiet status strip. The candidate video opens ON DEMAND in an
 *  overlay — never embedded at the script stage (user directive 29/08). */
const ApprovalStrip: React.FC<{ projectId: string; approval: ProjectApproval | null; candidateUrl?: string; onChanged: () => void }> = ({ projectId, approval, candidateUrl, onChanged }) => {
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [showCandidate, setShowCandidate] = React.useState(false);
  const status = approval?.status ?? "none";
  const submit = async (next: "approved" | "changes_requested") => {
    setBusy(true); setMessage("");
    try {
      await setApproval(projectId, next, note);
      setNote(""); setShowCandidate(false);
      setMessage(next === "approved" ? "Đã KEEP ✓" : "Đã ghi REDO + note ✓");
      onChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally { setBusy(false); }
  };
  return (
    <section className="pp-approval">
      <div className="pp-approval-row">
        <span className={`pp-dot ${status === "approved" ? "ok" : status === "pending" ? "warn" : status === "changes_requested" ? "bad" : "none"}`} />
        <span className="pp-approval-label">
          {status === "approved" ? "Approved" : status === "pending" ? "Chờ bạn duyệt" : status === "changes_requested" ? "Changes requested" : "Chưa cần duyệt"}
          {approval?.summary ? <small> — {approval.summary}</small> : null}
        </span>
        {status === "pending" && candidateUrl ? (
          <button type="button" className="pp-quiet-btn" onClick={() => setShowCandidate(!showCandidate)}>{showCandidate ? "ẩn candidate" : "▶ xem candidate"}</button>
        ) : null}
        <a className="pp-quiet-btn" href="#pp-history" onClick={() => void 0}>history ↗</a>
      </div>
      {status === "pending" && showCandidate && candidateUrl ? (
        <video controls src={candidateUrl} className="pp-candidate" title="Candidate draft" />
      ) : null}
      {status === "pending" ? (
        <div className="pp-approval-form">
          <input className="pp-note-input" aria-label="Approval note" placeholder="note cho agent (bắt buộc khi Redo)" value={note} onChange={(e) => setNote(e.target.value)} />
          <button type="button" className="pp-btn pp-keep" disabled={busy} onClick={() => void submit("approved")}>Keep</button>
          <button type="button" className="pp-btn pp-redo" disabled={busy || !note.trim()} title="Redo yêu cầu note" onClick={() => void submit("changes_requested")}>Redo</button>
        </div>
      ) : null}
      {message ? <p className="pp-msg">{message}</p> : null}
    </section>
  );
};

const HistoryFootnote: React.FC<{ projectId: string }> = ({ projectId }) => {
  const [events, setEvents] = React.useState<TraceEvent[] | null>(null);
  const [open, setOpen] = React.useState<number | null>(null);
  React.useEffect(() => {
    fetch(`/api/project/trace?projectId=${encodeURIComponent(projectId)}`)
      .then((r) => r.json())
      .then((payload) => setEvents(Array.isArray(payload.events) ? payload.events : []))
      .catch(() => setEvents([]));
  }, [projectId]);
  if (events === null || events.length === 0) return null;
  return (
    <details className="pp-footnote" id="pp-history">
      <summary>history — {events.length} bước</summary>
      <ol className="pp-trace">
        {events.map((event, index) => (
          <li key={index} className={`pp-trace-item stage-${event.stage}`}>
            <button type="button" className="pp-trace-head" aria-expanded={open === index} onClick={() => setOpen(open === index ? null : index)}>
              <span className="pp-trace-ts">{event.ts.slice(5, 16).replace("T", " ")}</span>
              <span className="pp-trace-stage">{event.stage}</span>
              <span className="pp-trace-title">{event.title}</span>
            </button>
            {open === index ? <div className="pp-trace-body"><pre className="pp-trace-raw">{JSON.stringify(event.data, null, 1)}</pre></div> : null}
          </li>
        ))}
      </ol>
    </details>
  );
};

type TraceEvent = { ts: string; stage: "plan" | "voice" | "timeline" | "render" | "approval" | "note"; title: string; data?: Record<string, unknown> };

export const ProjectPage: React.FC<{ projectId: string; onOpenEditor: () => void }> = ({ projectId, onOpenEditor }) => {
  const [snapshot, setSnapshot] = React.useState<Awaited<ReturnType<typeof loadProject>> | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [renders, setRenders] = React.useState<ProjectRender[]>([]);

  const refresh = React.useCallback(() => {
    loadProject(projectId).then(setSnapshot).catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
    fetchRenders(projectId).then((payload) => setRenders(payload.renders)).catch(() => setRenders([]));
  }, [projectId]);
  React.useEffect(() => { refresh(); }, [refresh]);

  if (error) return <div className="pp-page"><div className="pp-loading">Load error: {error}</div></div>;
  if (!snapshot) return <div className="pp-page"><div className="pp-loading">Loading project…</div></div>;

  const videoDoc = snapshot.videoDoc as VideoDoc | undefined;
  const editDoc = snapshot.editDoc as IsaacVerseEditDoc | undefined;
  const editorDoc = snapshot.editorDoc as IsaacVerseEditDoc | undefined;
  const allClips = editorDoc?.tracks.flatMap((track) => track.clips) ?? [];
  const beatClips = (editorDoc?.tracks.find((track) => track.id === "video-main")?.clips ?? [])
    .slice()
    .sort((a, b) => a.range.startSec - b.range.startSec);
  const latest = renders[0];
  const approvalPath = `${projectId}`;

  return (
    <div className="pp-page">
      <header className="pp-header">
        <h1>{videoDoc?.idea ? videoDoc.idea : projectId}</h1>
        <div className="pp-header-meta">
          <span className="pp-soft">{projectId} · {String(snapshot.state.stage ?? "?")} · {snapshot.state.currentVersion}</span>
          <button type="button" className="pp-quiet-btn" onClick={onOpenEditor}>mở editor ↗</button>
        </div>
      </header>

      <PromptQuote instruction={typeof editDoc?.instruction === "string" ? editDoc.instruction : undefined} />

      <main className="pp-scriptlist">
        {beatClips.map((beat, index) => {
          const voice = allClips.find((clip) => clip.kind === "voice" && clip.source.beatId === beat.source.beatId);
          return <BeatEditor key={beat.id} index={index} beat={beat} voice={voice} projectId={projectId} onChanged={refresh} />;
        })}
      </main>

      <ApprovalStripFetcher projectId={approvalPath} candidateUrl={latest ? artifactUrl(projectId, latest.path) : undefined} onChanged={refresh} />

      {videoDoc ? (
        <details className="pp-footnote">
          <summary>story</summary>
          <div className="pp-story">
            <p><b>Idea.</b> {videoDoc.idea}</p>
            <p><b>Surface problem.</b> {videoDoc.surfaceProblem}</p>
            <p><b>Deeper problem.</b> {videoDoc.deeperProblem}</p>
            <p><b>Thumbnail promise.</b> {videoDoc.thumbnailPromise}</p>
          </div>
        </details>
      ) : null}

      <HistoryFootnote projectId={projectId} />
    </div>
  );
};

const ApprovalStripFetcher: React.FC<{ projectId: string; candidateUrl?: string; onChanged: () => void }> = ({ projectId, candidateUrl, onChanged }) => {
  const [approval, setApprovalState] = React.useState<ProjectApproval | null>(null);
  React.useEffect(() => {
    fetchApproval(projectId).then(setApprovalState).catch(() => setApprovalState(null));
  }, [projectId, onChanged]);
  return <ApprovalStrip projectId={projectId} approval={approval} candidateUrl={candidateUrl} onChanged={() => { onChanged(); fetchApproval(projectId).then(setApprovalState).catch(() => undefined); }} />;
};

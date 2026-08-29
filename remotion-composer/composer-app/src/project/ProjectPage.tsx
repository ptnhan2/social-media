import React from "react";
import { fetchApproval, fetchRenders, loadProject, setApproval, setClipMetadata, artifactUrl, type ProjectApproval, type ProjectRender, type ClipMetadataChanges } from "../composer/api";
import type { IsaacVerseEditDoc, EditorClip } from "../../../shared/isaacverse/editor";
import type { VideoDoc } from "../../../shared/isaacverse/schema";
import { useAgentUi } from "../agent/AgentDrawer";

/**
 * CONTENT STUDIO (CONTENT-STUDIO-SPEC — script-centric working surface).
 * VISUAL LANGUAGE: the app's own (user directive 30/08 — "làm như video
 * editor + asset studio"): #0d1520 cards with ve-panel-style headers,
 * ve-prop-fields, ve-buttons. One intentional deviation: the script text
 * reads as a document (serif) — inside a proper field frame. Structure per
 * spec: script hero, voice birth on demand, NO embedded video (candidate on
 * demand in the approval card), prompt + history as their own cards.
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

/** The recipe that generated this script — its own card, quote-styled text. */
const PromptCard: React.FC<{ instruction?: string }> = ({ instruction }) => {
  const agent = useAgentUi();
  if (!instruction) return null;
  return (
    <section className="pp-card">
      <div className="pp-card-title">Prompt <small>— công thức sinh script này</small></div>
      <p className="pp-prompt-text">“{instruction}”</p>
      <button type="button" className="ve-btn" onClick={() => { agent.setDraftPrompt(instruction); agent.setOpen(true); }}>↻ Chạy lại prompt này</button>
    </section>
  );
};

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

  const playSrc = (src: string, id: string) => {
    audioRef.current?.pause();
    if (playing === id) { setPlaying(null); return; }
    const audio = new Audio(`/${src}`);
    audio.onended = () => setPlaying(null);
    audio.onerror = () => setPlaying(null);
    audioRef.current = audio;
    setPlaying(id);
    void audio.play().catch(() => setPlaying(null));
  };

  const playTake = (take: VoiceTake) => {
    if (!projectId || !take.id || !take.path) return;
    const filename = String(take.path).split(/[\\/]/).pop();
    if (!filename) return;
    playSrc(`/${projectId}/voice/takes/${filename}`, take.id);
  };

  return (
    <article className="pp-beat">
      <div className="pp-beat-side">
        <span className="pp-beat-num">{index + 1}</span>
        <span className={`pp-dot ${voice?.metadata.qc ? (qc?.pass ? "ok" : "bad") : "none"}`} title={voice?.metadata.qc ? (qc?.pass ? "QC pass" : "QC fail") : "chưa có VO"} />
      </div>
      <div className="pp-beat-main">
        <label className="ve-prop-field pp-script-field">
          <span>Script — beat {index + 1} · {treatment} · {(beat.range.endSec - beat.range.startSec).toFixed(1)}s</span>
          <textarea className="pp-script" rows={2} value={draftScript} aria-label={`Script beat ${index + 1}`} disabled={!voice}
            onChange={(e) => setDraftScript(e.target.value)}
            onBlur={() => { if (draftScript !== sentenceText && draftScript.trim()) void save({ sentenceText: draftScript.trim() }, "Script"); }} />
        </label>
        <div className="pp-beat-tools">
          {typeof voice?.metadata.src === "string" && voice.metadata.src ? (
            <button type="button" className="pp-tool" aria-label={`Play voice beat ${index + 1}`} onClick={() => playSrc(voice.metadata.src as string, `stem-${index}`)}>{playing === `stem-${index}` ? "■ stop" : "▶ nghe"}</button>
          ) : null}
          <button type="button" className="pp-tool" aria-expanded={voiceOpen} onClick={() => setVoiceOpen(!voiceOpen)}>🎙 voice{takes.length ? ` · take ${takeId.split("-take-").pop() ?? ""}` : ""}</button>
        </div>

        {voiceOpen ? (
          <div className="pp-voicedetails">
            <label className="ve-prop-field ve-prop-field-wide">
              <span>Direction (providerText — tags/CAPS)</span>
              <textarea rows={2} value={draftDirection} aria-label={`Direction beat ${index + 1}`} disabled={!voice}
                onChange={(e) => setDraftDirection(e.target.value)}
                onBlur={() => { if (draftDirection !== providerText) void save({ providerText: draftDirection }, "Direction"); }} />
            </label>
            <div className="ve-prop-section">
              <label className="ve-prop-field"><span>Voice</span>
                <input type="text" value={draftSettings.voiceId} aria-label={`Voice ID beat ${index + 1}`} disabled={!voice}
                  onChange={(e) => setDraftSettings((s) => ({ ...s, voiceId: e.target.value }))} onBlur={() => commitSetting("voiceId")} /></label>
              <label className="ve-prop-field"><span>Model</span>
                <input type="text" value={draftSettings.modelId} aria-label={`Model beat ${index + 1}`} disabled={!voice}
                  onChange={(e) => setDraftSettings((s) => ({ ...s, modelId: e.target.value }))} onBlur={() => commitSetting("modelId")} /></label>
              <label className="ve-prop-field"><span>Speed</span>
                <input type="number" step="0.05" min="0.7" max="1.2" value={draftSettings.speed} aria-label={`Speed beat ${index + 1}`} disabled={!voice}
                  onChange={(e) => setDraftSettings((s) => ({ ...s, speed: e.target.value }))} onBlur={() => commitSetting("speed")} /></label>
              <label className="ve-prop-field"><span>Stability</span>
                <input type="number" step="0.05" min="0" max="1" value={draftSettings.stability} aria-label={`Stability beat ${index + 1}`} disabled={!voice}
                  onChange={(e) => setDraftSettings((s) => ({ ...s, stability: e.target.value }))} onBlur={() => commitSetting("stability")} /></label>
            </div>
            {takes.length ? (
              <div className="pp-takes">
                {takes.map((take) => {
                  const id = typeof take.id === "string" ? take.id : "";
                  const isCurrent = id === takeId;
                  return (
                    <span key={id} className={`pp-take ${isCurrent ? "current" : ""}`}>
                      <button type="button" className="pp-tool" aria-label={`Play take ${id.split("-take-").pop()}`} disabled={!take.path} onClick={() => playTake(take)}>{playing === id ? "■" : "▶"}</button>
                      <small>{id.split("-take-").pop()}{typeof take.durationSec === "number" ? ` ${take.durationSec.toFixed(1)}s` : ""}{take.pass ? " ✓" : " ✗"}</small>
                      <button type="button" className="pp-tool" disabled={isCurrent || busy !== "none"} onClick={() => void switchTake(id)}>{isCurrent ? "đang dùng" : "dùng"}</button>
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
            <div>
              <button type="button" className="ve-btn" disabled={busy !== "none" || !voice} onClick={() => void regen()}>
                {busy === "regen" ? "Regenerating…" : "🎙 Regen voice (2 takes + QC)"}
              </button>
            </div>
          </div>
        ) : null}
        {message ? <p className="ve-hint">{message}</p> : null}
        {!voice ? <p className="ve-hint">Chưa có voice clip — chạy generate trước.</p> : null}
      </div>
    </article>
  );
};

const ApprovalCard: React.FC<{ projectId: string; approval: ProjectApproval | null; candidateUrl?: string; onChanged: () => void }> = ({ projectId, approval, candidateUrl, onChanged }) => {
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
      setMessage(next === "approved" ? "Đã KEEP ✓ — agent đọc được ở chu kỳ kế tiếp." : "Đã ghi REDO + note ✓");
      onChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally { setBusy(false); }
  };
  return (
    <section className="pp-card">
      <div className="pp-card-title">Approval
        <small className={status === "approved" ? "pp-ok-text" : status === "pending" ? "pp-warn-text" : status === "changes_requested" ? "pp-bad-text" : ""}>
          {status === "approved" ? "APPROVED" : status === "pending" ? "PENDING REVIEW" : status === "changes_requested" ? "CHANGES REQUESTED" : "chưa cần duyệt"}
        </small>
      </div>
      {approval?.summary ? <p className="ve-hint">{approval.summary}</p> : null}
      {status === "pending" && candidateUrl ? (
        <div>
          <button type="button" className="pp-tool" onClick={() => setShowCandidate(!showCandidate)}>{showCandidate ? "ẩn candidate" : "▶ xem candidate"}</button>
          {showCandidate ? <video controls src={candidateUrl} className="pp-candidate" title="Candidate draft" /> : null}
        </div>
      ) : null}
      {status === "pending" ? (
        <div className="pp-approval-form">
          <input className="ve-prop-field pp-note-input" aria-label="Approval note" placeholder="note cho agent (bắt buộc khi Redo)" value={note} onChange={(e) => setNote(e.target.value)} />
          <button type="button" className="ve-btn pp-keep" disabled={busy} onClick={() => void submit("approved")}>✅ Keep</button>
          <button type="button" className="ve-btn pp-redo" disabled={busy || !note.trim()} title="Redo yêu cầu note" onClick={() => void submit("changes_requested")}>↻ Redo</button>
        </div>
      ) : (
        <p className="ve-hint">{status === "none" ? "Agent sẽ chuyển sang PENDING khi có bản cần duyệt." : "Agent đọc status này ở chu kỳ kế tiếp."}</p>
      )}
      {message ? <p className="ve-hint">{message}</p> : null}
    </section>
  );
};

type TraceEvent = { ts: string; stage: "plan" | "voice" | "timeline" | "render" | "approval" | "note"; title: string; data?: Record<string, unknown> };

const HistoryCard: React.FC<{ projectId: string }> = ({ projectId }) => {
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
    <details className="pp-card pp-collapse">
      <summary className="pp-card-title">History <small>— {events.length} bước</small></summary>
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

export const ProjectPage: React.FC<{ projectId: string; onOpenEditor: () => void }> = ({ projectId, onOpenEditor }) => {
  const [snapshot, setSnapshot] = React.useState<Awaited<ReturnType<typeof loadProject>> | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [renders, setRenders] = React.useState<ProjectRender[]>([]);
  const [approval, setApprovalState] = React.useState<ProjectApproval | null>(null);

  const refresh = React.useCallback(() => {
    loadProject(projectId).then(setSnapshot).catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
    fetchRenders(projectId).then((payload) => setRenders(payload.renders)).catch(() => setRenders([]));
    fetchApproval(projectId).then(setApprovalState).catch(() => setApprovalState(null));
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

  return (
    <div className="pp-page">
      <header className="pp-appbar">
        <div>
          <h1>{videoDoc?.idea ? videoDoc.idea : projectId}</h1>
          <small>{projectId} · {String(snapshot.state.stage ?? "?")} · {snapshot.state.currentVersion}</small>
        </div>
        <button type="button" className="ve-btn primary" onClick={onOpenEditor}>Mở editor ↗</button>
      </header>

      <PromptCard instruction={typeof editDoc?.instruction === "string" ? editDoc.instruction : undefined} />

      <section className="pp-card">
        <div className="pp-card-title">Script <small>— {beatClips.length} beats, sửa trực tiếp</small></div>
        <div className="pp-beats">
          {beatClips.map((beat, index) => {
            const voice = allClips.find((clip) => clip.kind === "voice" && clip.source.beatId === beat.source.beatId);
            return <BeatEditor key={beat.id} index={index} beat={beat} voice={voice} projectId={projectId} onChanged={refresh} />;
          })}
        </div>
      </section>

      <ApprovalCard projectId={projectId} approval={approval} candidateUrl={latest ? artifactUrl(projectId, latest.path) : undefined} onChanged={refresh} />

      {videoDoc ? (
        <details className="pp-card pp-collapse">
          <summary className="pp-card-title">Story</summary>
          <div className="pp-story">
            <p><b>Idea.</b> {videoDoc.idea}</p>
            <p><b>Surface problem.</b> {videoDoc.surfaceProblem}</p>
            <p><b>Deeper problem.</b> {videoDoc.deeperProblem}</p>
            <p><b>Thumbnail promise.</b> {videoDoc.thumbnailPromise}</p>
          </div>
        </details>
      ) : null}

      <HistoryCard projectId={projectId} />
    </div>
  );
};

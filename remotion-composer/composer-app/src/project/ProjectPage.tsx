import React from "react";
import { fetchApproval, fetchRenders, loadProject, setApproval, setClipMetadata, artifactUrl, type ProjectApproval, type ProjectRender, type ClipMetadataChanges } from "../composer/api";
import type { IsaacVerseEditDoc, EditorClip } from "../../../shared/isaacverse/editor";
import type { VideoDoc } from "../../../shared/isaacverse/schema";
import { useAgentUi } from "../agent/AgentDrawer";

/**
 * CONTENT STUDIO (CONTENT-STUDIO-SPEC — script-centric working surface).
 * The script is the LIVING DOCUMENT: agent and human edit the same beats in
 * place. Each beat carries its full voice-birth panel (direction, settings,
 * takes, QC, regen) — DỜI từ editor Audio tab. The prompt layer shows the
 * instruction that generated this script version + re-run affordance.
 * NO video player in the edit loop — watch in the editor (live player);
 * the approval card shows the candidate mp4 only when a verdict is pending.
 */

type TraceEvent = {
  ts: string;
  stage: "plan" | "voice" | "timeline" | "render" | "approval" | "note";
  title: string;
  data?: Record<string, unknown>;
};

type VoiceTake = { id?: string; path?: string; pass?: boolean; durationSec?: number };
type VoiceSettingsShape = { voiceId?: string; modelId?: string; stability?: number; style?: number; speed?: number };

const num = (value: unknown, fallback: number) => (typeof value === "number" && Number.isFinite(value) ? value : fallback);

/** Shared job poller for the regen + take-switch endpoints. */
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

/** Prompt bar — the instruction that generated the current script version,
 *  with re-run: prefill the agent drawer (user tweaks the prompt, sends). */
const PromptBar: React.FC<{ instruction?: string }> = ({ instruction }) => {
  const agent = useAgentUi();
  if (!instruction) {
    return <div className="pp-card pp-promptbar"><span className="pp-prompt-label">📌 Prompt</span><span className="pp-hint">Script này chưa mang prompt sinh ra nó (agent hãy truyền <code>instruction</code> khi gọi write_edit_doc).</span></div>;
  }
  return (
    <div className="pp-card pp-promptbar">
      <span className="pp-prompt-label">📌 Prompt sinh script này</span>
      <p className="pp-prompt-text">{instruction}</p>
      <button type="button" className="pp-btn pp-rerun" title="Sửa prompt này rồi cho agent chạy lại" onClick={() => { agent.setDraftPrompt(instruction); agent.setOpen(true); }}>↻ Chạy lại prompt này</button>
    </div>
  );
};

/** ONE beat = script line + its voice birth panel. Everything editable in
 *  place through the sanctioned write-paths (clip-metadata / audio-regen /
 *  audio-take) — the same endpoints the agent uses. */
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
  React.useEffect(() => { setDraftScript(sentenceText); setDraftDirection(providerText); }, [sentenceText, providerText]);

  const [message, setMessage] = React.useState("");
  const [busy, setBusy] = React.useState<"none" | "saving" | "regen" | `take:${string}`>("none");
  const [playing, setPlaying] = React.useState<string | null>(null);
  const [qcOpen, setQcOpen] = React.useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const save = async (changes: ClipMetadataChanges, label: string) => {
    if (!voice) { setMessage("Beat này chưa có voice clip — chạy generate trước."); return; }
    setBusy("saving"); setMessage("");
    try {
      await setClipMetadata(projectId, voice.id, changes);
      setMessage(`${label} ✓`);
      onChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally { setBusy("none"); }
  };

  const regen = async () => {
    if (!projectId || !voice) return;
    setBusy("regen"); setMessage("");
    try {
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
    <div className="pp-beatedit">
      <div className="pp-beat-head">
        <span className="pp-beat-num">#{index + 1}</span>
        <span className="pp-treatment">{treatment}</span>
        <span className="pp-range">{beat.range.startSec.toFixed(1)}–{beat.range.endSec.toFixed(1)}s</span>
        {qc ? <span className={`pp-qc ${qc.pass ? "pass" : "fail"}`}>{qc.pass ? "QC ✓" : "QC ✗"}</span> : <span className="pp-qc none">no VO</span>}
      </div>

      <label className="pp-field">
        <span>Script <small>(từ — sửa được)</small></span>
        <textarea rows={2} value={draftScript} aria-label={`Script beat ${index + 1}`}
          onChange={(e) => setDraftScript(e.target.value)}
          onBlur={() => { if (draftScript !== sentenceText && draftScript.trim()) void save({ sentenceText: draftScript.trim() }, "Script"); }} />
      </label>

      <label className="pp-field">
        <span>Direction <small>(providerText gửi TTS — tags/CAPS)</small></span>
        <textarea rows={2} value={draftDirection} aria-label={`Direction beat ${index + 1}`}
          onChange={(e) => setDraftDirection(e.target.value)}
          onBlur={() => { if (draftDirection !== providerText) void save({ providerText: draftDirection }, "Direction"); }} />
      </label>

      <div className="pp-settings">
        <label><span>voice</span><input type="text" value={String(settings.voiceId ?? "")} aria-label={`Voice ID beat ${index + 1}`}
          onChange={(e) => void save({ voiceSettings: { ...settings, voiceId: e.target.value } }, "Voice")} /></label>
        <label><span>model</span><input type="text" value={String(settings.modelId ?? "eleven_v3")} aria-label={`Model beat ${index + 1}`}
          onChange={(e) => void save({ voiceSettings: { ...settings, modelId: e.target.value } }, "Model")} /></label>
        <label><span>speed</span><input type="number" step="0.05" min="0.7" max="1.2" value={num(settings.speed, 1)} aria-label={`Speed beat ${index + 1}`}
          onChange={(e) => void save({ voiceSettings: { ...settings, speed: Number(e.target.value) } }, "Speed")} /></label>
        <label><span>stability</span><input type="number" step="0.05" min="0" max="1" value={num(settings.stability, 0.35)} aria-label={`Stability beat ${index + 1}`}
          onChange={(e) => void save({ voiceSettings: { ...settings, stability: Number(e.target.value) } }, "Stability")} /></label>
      </div>

      <div className="pp-beat-actions">
        <button type="button" className="pp-mini pp-regen" disabled={busy !== "none" || !voice} onClick={() => void regen()}>
          {busy === "regen" ? "Regenerating…" : "🎙️ Regen voice (2 takes + QC)"}
        </button>
        {qc ? (
          <button type="button" className="pp-mini" onClick={() => setQcOpen(!qcOpen)}>{qcOpen ? "▾ QC" : "▸ QC"}</button>
        ) : null}
      </div>

      {qcOpen && qc ? (
        <ul className="pp-trace-qc">
          {(qc.checks ?? []).map((check) => <li key={check.id}>{check.pass ? "✓" : "✗"} {check.label}: {check.value} ({check.threshold})</li>)}
          {qc.wer !== null && qc.wer !== undefined ? <li>WER: {(qc.wer * 100).toFixed(1)}%</li> : null}
        </ul>
      ) : null}

      {takes.length ? (
        <div className="pp-takes">
          {takes.map((take) => {
            const id = typeof take.id === "string" ? take.id : "";
            const isCurrent = id === takeId;
            return (
              <span key={id} className={`pp-take-chip ${isCurrent ? "current" : ""}`}>
                <button type="button" className="pp-mini" aria-label={`Play take ${id.split("-take-").pop()} beat ${index + 1}`} disabled={!take.path} onClick={() => playTake(take)}>{playing === id ? "■" : "▶"}</button>
                <small>{id.split("-take-").pop()}{typeof take.durationSec === "number" ? ` ${take.durationSec.toFixed(1)}s` : ""}{take.pass ? " ✓" : " ✗"}</small>
                <button type="button" className="pp-mini" disabled={isCurrent || busy !== "none"} onClick={() => void switchTake(id)}>{isCurrent ? "đang dùng" : "dùng"}</button>
              </span>
            );
          })}
        </div>
      ) : null}

      {message ? <p className="pp-hint">{message}</p> : null}
    </div>
  );
};

const ApprovalCard: React.FC<{ projectId: string; approval: ProjectApproval | null; candidateUrl?: string; onChanged: () => void }> = ({ projectId, approval, candidateUrl, onChanged }) => {
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const status = approval?.status ?? "none";
  const submit = async (next: "approved" | "changes_requested") => {
    setBusy(true); setMessage("");
    try {
      await setApproval(projectId, next, note);
      setNote("");
      setMessage(next === "approved" ? "Đã KEEP — agent đọc được ở chu kỳ kế tiếp." : "Đã ghi REDO + note cho agent.");
      onChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally { setBusy(false); }
  };
  const badge = status === "approved" ? <b className="pp-ok">APPROVED</b>
    : status === "pending" ? <b className="pp-warn">PENDING REVIEW</b>
    : status === "changes_requested" ? <b className="pp-bad">CHANGES REQUESTED</b>
    : <b className="pp-muted">CHƯA CẦN DUYỆT</b>;
  return (
    <div className="pp-card">
      <div className="pp-card-title">Approval {badge}</div>
      {status === "pending" && candidateUrl ? (
        <video controls src={candidateUrl} className="pp-video" title="Candidate draft" />
      ) : null}
      {approval?.summary ? <p className="pp-hint">{approval.summary}</p> : null}
      {approval?.note ? <p className="pp-hint">Note gần nhất: {approval.note}</p> : null}
      {status === "pending" ? (
        <>
          <textarea className="pp-note" rows={2} aria-label="Approval note" placeholder="Note cho agent (bắt buộc khi Redo)" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="pp-actions">
            <button type="button" className="pp-btn pp-keep" disabled={busy} onClick={() => void submit("approved")}>✅ Keep</button>
            <button type="button" className="pp-btn pp-redo" disabled={busy || !note.trim()} title="Redo yêu cầu note" onClick={() => void submit("changes_requested")}>↻ Redo</button>
          </div>
        </>
      ) : (
        <p className="pp-hint">{status === "none" ? "Agent sẽ chuyển sang PENDING khi có bản cần duyệt (request_approval)." : "Agent đọc status này ở chu kỳ kế tiếp. Xem trong editor để kiểm tra working state."}</p>
      )}
      {message ? <p className="pp-hint">{message}</p> : null}
    </div>
  );
};

const ProcessTimeline: React.FC<{ projectId: string }> = ({ projectId }) => {
  const [events, setEvents] = React.useState<TraceEvent[] | null>(null);
  const [open, setOpen] = React.useState<number | null>(null);
  const load = React.useCallback(() => {
    fetch(`/api/project/trace?projectId=${encodeURIComponent(projectId)}`)
      .then((r) => r.json())
      .then((payload) => setEvents(Array.isArray(payload.events) ? payload.events : []))
      .catch(() => setEvents([]));
  }, [projectId]);
  React.useEffect(() => { load(); }, [load]);
  if (events === null) return null;
  return (
    <details className="pp-collapse">
      <summary>History — tiến trình ({events.length} bước)</summary>
      <ol className="pp-trace">
        {events.map((event, index) => (
          <li key={index} className={`pp-trace-item stage-${event.stage}`}>
            <button type="button" className="pp-trace-head" aria-expanded={open === index} onClick={() => setOpen(open === index ? null : index)}>
              <span className="pp-trace-icon">{{ plan: "📝", voice: "🎙️", timeline: "🎞️", render: "🎬", approval: "🚦", note: "📌" }[event.stage] ?? "📌"}</span>
              <span className="pp-trace-stage">{event.stage}</span>
              <span className="pp-trace-title">{event.title}</span>
              <span className="pp-trace-ts">{event.ts.slice(5, 16).replace("T", " ")}</span>
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
      <header className="pp-header">
        <div>
          <h1>{videoDoc?.idea ? videoDoc.idea : projectId}</h1>
          <small>{projectId} · {String(snapshot.state.stage ?? "?")} · {snapshot.state.currentVersion}</small>
        </div>
        <button type="button" className="ve-btn primary" onClick={onOpenEditor}>Mở editor ↗ <small>(xem video + dựng)</small></button>
      </header>

      <PromptBar instruction={typeof editDoc?.instruction === "string" ? editDoc.instruction : undefined} />

      <div className="pp-card">
        <div className="pp-card-title">Script <small>{beatClips.length} beats — sửa trực tiếp, agent sửa qua drawer</small></div>
        <div className="pp-beatlist">
          {beatClips.map((beat, index) => {
            const voice = allClips.find((clip) => clip.kind === "voice" && clip.source.beatId === beat.source.beatId);
            return <BeatEditor key={beat.id} index={index} beat={beat} voice={voice} projectId={projectId} onChanged={refresh} />;
          })}
        </div>
      </div>

      <ApprovalCard projectId={projectId} approval={approval} candidateUrl={latest ? artifactUrl(projectId, latest.path) : undefined} onChanged={refresh} />

      {videoDoc ? (
        <details className="pp-collapse">
          <summary>Story</summary>
          <div className="pp-story">
            <div><b>Idea</b><p>{videoDoc.idea}</p></div>
            <div><b>Surface problem</b><p>{videoDoc.surfaceProblem}</p></div>
            <div><b>Deeper problem</b><p>{videoDoc.deeperProblem}</p></div>
            <div><b>Thumbnail promise</b><p>{videoDoc.thumbnailPromise}</p></div>
          </div>
        </details>
      ) : null}

      <ProcessTimeline projectId={projectId} />
    </div>
  );
};

import React from "react";
import { fetchApproval, fetchRenders, loadProject, setApproval, artifactUrl, type ProjectApproval, type ProjectRender } from "../composer/api";
import type { IsaacVerseEditDoc, EditorClip } from "../../../shared/isaacverse/editor";
import type { VideoDoc } from "../../../shared/isaacverse/schema";

/**
 * PROJECT PAGE (PIPELINE-PRODUCTION-SPEC v3 — stage-surface): the PRESENTATION
 * & APPROVAL surface of one video project. The page's SPINE is the PROCESS —
 * "how this video was made" (idea → plan → voice → timeline → render →
 * approval), recorded live by every pipeline stage into
 * qa/pipeline-log.jsonl. The editor remains the only EDITING surface.
 */

type TraceEvent = {
  ts: string;
  stage: "plan" | "voice" | "timeline" | "render" | "approval" | "note";
  title: string;
  data?: Record<string, unknown>;
};

type TimelineReportShape = {
  ok?: boolean;
  styleVersion?: number | null;
  generatedAt?: string;
  checks?: { id: string; label: string; pass: boolean; detail?: string[] }[];
  warnings?: string[];
};

const formatBytes = (bytes: number) => (bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`);
const shortTime = (iso: string) => iso.slice(5, 16).replace("T", " ");

const STAGE_META: Record<TraceEvent["stage"], { icon: string; label: string }> = {
  plan: { icon: "📝", label: "Plan" },
  voice: { icon: "🎙️", label: "Voice" },
  timeline: { icon: "🎞️", label: "Timeline" },
  render: { icon: "🎬", label: "Render" },
  approval: { icon: "🚦", label: "Approval" },
  note: { icon: "📌", label: "Note" },
};

/** The process spine: chronological events of how this video was made.
 *  Renders whatever the stages recorded — idea inputs, the beats the agent
 *  authored, TTS takes + QC numbers, validation gates, renders, approvals. */
const ProcessTimeline: React.FC<{ projectId: string }> = ({ projectId }) => {
  const [events, setEvents] = React.useState<TraceEvent[] | null>(null);
  const [open, setOpen] = React.useState<number | null>(null);
  React.useEffect(() => {
    fetch(`/api/project/trace?projectId=${encodeURIComponent(projectId)}`)
      .then((r) => r.json())
      .then((payload) => setEvents(Array.isArray(payload.events) ? payload.events : []))
      .catch(() => setEvents([]));
  }, [projectId]);

  if (events === null) return <div className="pp-card"><div className="pp-card-title">Tiến trình</div><p className="pp-hint">Loading…</p></div>;
  return (
    <div className="pp-card">
      <div className="pp-card-title">Tiến trình thực tế — video này được làm ra như thế nào {events.length ? <small>{events.length} bước</small> : null}</div>
      {events.length === 0 ? (
        <p className="pp-hint">Chưa có ghi nhớ tiến trình (trace bắt đầu được ghi từ 29/08 — chạy lại produce flow để có).</p>
      ) : (
        <ol className="pp-trace">
          {events.map((event, index) => {
            const meta = STAGE_META[event.stage] ?? STAGE_META.note;
            const details = event.data ?? {};
            return (
              <li key={index} className={`pp-trace-item stage-${event.stage}`}>
                <button type="button" className="pp-trace-head" aria-expanded={open === index} onClick={() => setOpen(open === index ? null : index)}>
                  <span className="pp-trace-icon">{meta.icon}</span>
                  <span className="pp-trace-stage">{meta.label}</span>
                  <span className="pp-trace-title">{event.title}</span>
                  <span className="pp-trace-ts">{shortTime(event.ts)}</span>
                  <span className="pp-trace-caret">{open === index ? "▾" : "▸"}</span>
                </button>
                {open === index ? <div className="pp-trace-body"><TraceDetails stage={event.stage} data={details} /></div> : null}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
};

const KV: React.FC<{ k: string; v: React.ReactNode }> = ({ k, v }) => (
  <div className="pp-kv"><span>{k}</span><b>{v}</b></div>
);

const TraceDetails: React.FC<{ stage: string; data: Record<string, unknown> }> = ({ stage, data }) => {
  if (stage === "plan") {
    const beats = Array.isArray(data.beats) ? (data.beats as Record<string, unknown>[]) : [];
    const gates = (data.gates ?? {}) as Record<string, unknown>;
    return (
      <>
        {typeof data.idea === "string" && data.idea ? <p className="pp-transcript">💡 {data.idea}</p> : null}
        {beats.map((beat, i) => (
          <div key={i} className="pp-trace-beat">
            <span className="pp-treatment">{String(beat.treatment ?? "?")}</span>
            <span className="pp-trace-text">{String(beat.transcript ?? "")}</span>
            <small>{String(beat.plannedDurationSec ?? "?")}s</small>
          </div>
        ))}
        <KV k="Gates" v={`schema ${gates.schemaIssues ?? 0} · timeline ${gates.timelineIssues ?? 0} issues`} />
      </>
    );
  }
  if (stage === "voice") {
    const takes = Array.isArray(data.takes) ? (data.takes as Record<string, unknown>[]) : [];
    const qc = (data.qc ?? {}) as { pass?: boolean; checks?: string[] };
    return (
      <>
        {typeof data.providerText === "string" ? <p className="pp-trace-text">"{data.providerText}"</p> : null}
        <div className="pp-kv-row">
          {takes.map((take, i) => (
            <KV key={i} k={`take ${String(take.id ?? i).split("-take-").pop()}${take.pass ? " ✓" : " ✗"}`} v={`${take.durationSec ?? "?"}s`} />
          ))}
        </div>
        <ul className="pp-trace-qc">{(qc.checks ?? []).map((check, i) => <li key={i}>{check}</li>)}</ul>
      </>
    );
  }
  if (stage === "timeline") {
    const gates = Array.isArray(data.gates) ? (data.gates as Record<string, unknown>[]) : [];
    return (
      <>
        {gates.map((gate, i) => (
          <KV key={i} k={String(gate.label ?? gate.id ?? "?")} v={gate.pass ? "✓" : `✗ ${(gate.detail as string[] | undefined)?.join("; ") || ""}`} />
        ))}
      </>
    );
  }
  if (stage === "render") {
    return <><KV k="Output" v={String(data.output ?? "?")} /><KV k="Quality" v={String(data.quality ?? "?")} /><KV k="Window" v={`${data.window && typeof data.window === "object" ? (data.window as Record<string, unknown>).startSec : "?"}–${data.window && typeof data.window === "object" ? (data.window as Record<string, unknown>).endSec : "?"}s`} /></>;
  }
  if (stage === "approval") {
    return <><KV k="Status" v={String(data.status ?? "?")} />{typeof data.note === "string" && data.note ? <p className="pp-trace-text">"{data.note}"</p> : null}{typeof data.summary === "string" && data.summary ? <p className="pp-hint">{data.summary}</p> : null}</>;
  }
  return <pre className="pp-trace-raw">{JSON.stringify(data, null, 1)}</pre>;
};

const PipelineCard: React.FC<{ projectId: string }> = ({ projectId }) => {
  const [report, setReport] = React.useState<TimelineReportShape | null>(null);
  const [missing, setMissing] = React.useState(false);
  React.useEffect(() => {
    fetch(`/api/project/timeline-report?projectId=${encodeURIComponent(projectId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((payload) => { if (payload) setReport(payload as TimelineReportShape); else setMissing(true); })
      .catch(() => setMissing(true));
  }, [projectId]);
  return (
    <div className="pp-card">
      <div className="pp-card-title">Pipeline {report ? (report.ok ? <b className="pp-ok">OK</b> : <b className="pp-bad">ATTENTION</b>) : null}</div>
      {missing ? (
        <p className="pp-hint">Chưa generate — agent chạy <code>generate_timeline</code> rồi report hiện ở đây.</p>
      ) : report ? (
        <>
          <ul className="pp-checks">
            {(report.checks ?? []).map((check) => (
              <li key={check.id} className={check.pass ? "pass" : "fail"} title={(check.detail ?? []).join("\n")}>
                <span>{check.pass ? "✓" : "✗"}</span> {check.label}
              </li>
            ))}
          </ul>
          {report.warnings?.length ? (
            <div className="pp-warnings">{report.warnings.map((warning, i) => <div key={i}>⚠ {warning}</div>)}</div>
          ) : null}
          <small className="pp-meta">style v{report.styleVersion ?? "?"} · {report.generatedAt?.slice(0, 16).replace("T", " ")}</small>
        </>
      ) : <p className="pp-hint">Loading…</p>}
    </div>
  );
};

const ApprovalCard: React.FC<{ projectId: string; approval: ProjectApproval | null; onChanged: () => void }> = ({ projectId, approval, onChanged }) => {
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const status = approval?.status ?? "none";
  const submit = async (next: "approved" | "changes_requested") => {
    setBusy(true); setMessage("");
    try {
      await setApproval(projectId, next, note);
      setNote("");
      setMessage(next === "approved" ? "Đã KEEP — agent đọc được quyết định này ở chu kỳ kế tiếp." : "Đã ghi REDO + note cho agent.");
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
      {approval?.summary ? <p className="pp-hint">{approval.summary}</p> : null}
      {approval?.note ? <p className="pp-hint">Note gần nhất: {approval.note}</p> : null}
      {status === "pending" ? (
        <>
          <textarea className="pp-note" rows={2} aria-label="Approval note" placeholder="Note cho agent (bắt buộc khi Redo): còn thiếu gì, cả hai đều tệ, ..." value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="pp-actions">
            <button type="button" className="pp-btn pp-keep" disabled={busy} onClick={() => void submit("approved")}>✅ Keep</button>
            <button type="button" className="pp-btn pp-redo" disabled={busy || !note.trim()} title="Redo yêu cầu note" onClick={() => void submit("changes_requested")}>↻ Redo</button>
          </div>
        </>
      ) : (
        <p className="pp-hint">{status === "none" ? "Agent sẽ chuyển sang PENDING khi có bản cần duyệt (request_approval)." : "Agent đọc status này ở chu kỳ kế tiếp."}</p>
      )}
      {message ? <p className="pp-hint">{message}</p> : null}
    </div>
  );
};

const BeatCards: React.FC<{ editorDoc: IsaacVerseEditDoc }> = ({ editorDoc }) => {
  const [playing, setPlaying] = React.useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const allClips = editorDoc.tracks.flatMap((track) => track.clips);
  const beatClips = (editorDoc.tracks.find((track) => track.id === "video-main")?.clips ?? [])
    .slice()
    .sort((a, b) => a.range.startSec - b.range.startSec);
  const playVoice = (clip: EditorClip) => {
    const src = typeof clip.metadata.src === "string" ? clip.metadata.src : "";
    if (!src) return;
    audioRef.current?.pause();
    if (playing === clip.id) { setPlaying(null); return; }
    const audio = new Audio(`/${src}`);
    audio.onended = () => setPlaying(null);
    audioRef.current = audio;
    setPlaying(clip.id);
    void audio.play().catch(() => setPlaying(null));
  };
  return (
    <div className="pp-card">
      <div className="pp-card-title">Beat plan <small>{beatClips.length} beats · duration thật từ timeline</small></div>
      <div className="pp-beats">
        {beatClips.map((beat, index) => {
          const voice = allClips.find((clip) => clip.kind === "voice" && clip.source.beatId === beat.source.beatId);
          const qc = voice?.metadata.qc as { pass?: boolean } | undefined;
          const transcript = String(voice?.metadata.sentenceText ?? beat.metadata.transcript ?? "");
          const treatment = typeof beat.metadata.treatmentId === "string" ? beat.metadata.treatmentId : "?";
          return (
            <div key={beat.id} className="pp-beat">
              <div className="pp-beat-head">
                <span className="pp-beat-num">#{index + 1}</span>
                <span className="pp-treatment">{treatment}</span>
                <span className="pp-range">{beat.range.startSec.toFixed(1)}–{beat.range.endSec.toFixed(1)}s</span>
                {voice?.metadata.qc ? <span className={`pp-qc ${qc?.pass ? "pass" : "fail"}`}>{qc?.pass ? "QC ✓" : "QC ✗"}</span> : <span className="pp-qc none">no VO</span>}
              </div>
              {transcript ? <p className="pp-transcript">{transcript}</p> : null}
              <div className="pp-beat-meta">
                {voice?.metadata.src ? (
                  <button type="button" className="pp-mini" aria-label={`Play voice beat ${index + 1}`} onClick={() => playVoice(voice)}>{playing === voice.id ? "■ stop" : "▶ voice"}</button>
                ) : null}
                {voice?.metadata.takeId ? <small>take {String(voice.metadata.takeId).split("-take-").pop()}</small> : null}
                {typeof voice?.metadata.breathPadSec === "number" ? <small>pad {voice.metadata.breathPadSec}s</small> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
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
  const latest = renders[0];
  return (
    <div className="pp-page">
      <header className="pp-header">
        <div>
          <h1>{videoDoc?.idea ? videoDoc.idea : projectId}</h1>
          <small>{projectId} · {String(snapshot.state.stage ?? "?")} · {snapshot.state.currentVersion}{videoDoc ? " · story ✓" : ""}</small>
        </div>
        <button type="button" className="ve-btn primary" onClick={onOpenEditor}>Mở editor ↗</button>
      </header>

      <ProcessTimeline projectId={projectId} />

      <div className="pp-grid-top">
        <div className="pp-card pp-player">
          <div className="pp-card-title">Draft mới nhất</div>
          {latest ? (
            <video controls src={artifactUrl(projectId, latest.path)} className="pp-video" />
          ) : (
            <p className="pp-hint">Chưa có render — chạy produce flow (write_edit_doc → voice → generate → render).</p>
          )}
          {renders.length > 1 ? (
            <details className="pp-renders">
              <summary>{renders.length} renders</summary>
              <ul>{renders.map((render) => <li key={render.path}><small>{render.name} · {formatBytes(render.sizeBytes)} · {render.mtimeIso.slice(5, 16).replace("T", " ")}</small></li>)}</ul>
            </details>
          ) : null}
        </div>
        <ApprovalCard projectId={projectId} approval={approval} onChanged={refresh} />
      </div>

      {videoDoc ? (
        <div className="pp-card">
          <div className="pp-card-title">Story</div>
          <div className="pp-story">
            <div><b>Idea</b><p>{videoDoc.idea}</p></div>
            <div><b>Surface problem</b><p>{videoDoc.surfaceProblem}</p></div>
            <div><b>Deeper problem</b><p>{videoDoc.deeperProblem}</p></div>
            <div><b>Thumbnail promise</b><p>{videoDoc.thumbnailPromise}</p></div>
          </div>
        </div>
      ) : null}

      <BeatCards editorDoc={snapshot.editorDoc as IsaacVerseEditDoc} />

      <PipelineCard projectId={projectId} />
    </div>
  );
};

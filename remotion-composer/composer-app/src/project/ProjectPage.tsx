import React from "react";
import { fetchApproval, fetchRenders, loadProject, setApproval, artifactUrl, type ProjectApproval, type ProjectRender } from "../composer/api";
import type { IsaacVerseEditDoc, EditorClip } from "../../../shared/isaacverse/editor";
import type { VideoDoc } from "../../../shared/isaacverse/schema";

/**
 * PROJECT PAGE (PIPELINE-PRODUCTION-SPEC v3 — stage-surface, researched from
 * Fliki/Pictory single-surface + HeyGen blueprint-first + Lovable Plan view):
 * the PRESENTATION & APPROVAL surface of one video project. The editor remains
 * the only EDITING surface — this page composes the same files the agent reads
 * (rule #16 parity): editor doc (truth: real ranges, voice QC), timeline
 * report, renders, video doc story, approval gate.
 */

type TimelineReportShape = {
  ok?: boolean;
  styleVersion?: number | null;
  generatedAt?: string;
  checks?: { id: string; label: string; pass: boolean; detail?: string[] }[];
  warnings?: string[];
};

const formatBytes = (bytes: number) => (bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`);

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
        <PipelineCard projectId={projectId} />
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

      <ApprovalCard projectId={projectId} approval={approval} onChanged={refresh} />
    </div>
  );
};

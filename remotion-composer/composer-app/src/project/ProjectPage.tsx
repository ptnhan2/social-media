import React from "react";
import { fetchApproval, fetchRenders, loadProject, setApproval, setClipMetadata, artifactUrl, fetchStoryDraft, setStoryDraft, subscribeToChanges, type ProjectApproval, type ProjectRender, type ClipMetadataChanges, type StoryDraft } from "../composer/api";
import type { IsaacVerseEditDoc, EditorClip } from "../../../shared/isaacverse/editor";
import type { VideoDoc } from "../../../shared/isaacverse/schema";
import { useAgentUi } from "../agent/AgentDrawer";

/**
 * CONTENT STUDIO (CONTENT-STUDIO-SPEC — script-centric working surface +
 * Creation Flow §5). The JOURNEY is the spine: idea -> story (checkpoint) ->
 * script (checkpoint) -> voice -> video -> approved. Stages derive from
 * artifacts (no redundant state). The studio refreshes LIVE via SSE when the
 * agent writes files — the user watches the journey advance.
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
          <textarea className="pp-script" rows={2} value={draftScript} aria-label={`Script beat ${index + 1}`}
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

type TraceEvent = { ts: string; stage: "idea" | "story" | "plan" | "voice" | "timeline" | "render" | "approval" | "note"; title: string; data?: Record<string, unknown> };

type JourneyStage = "idea" | "story" | "script" | "voice" | "video" | "approved";

/** Derived journey stage — artifacts tell the truth, no stored state.
 *  Story APPROVED moves the journey forward even before the script exists
 *  (the user is now in script-writing territory). */
const deriveStage = (snapshot: { editDoc?: unknown; videoDoc?: unknown }, storyDraft: StoryDraft | null, rendersCount: number, approval: ProjectApproval | null): JourneyStage => {
  if (approval?.status === "approved") return "approved";
  if (rendersCount > 0) return "video";
  const editDoc = snapshot.editDoc as IsaacVerseEditDoc | undefined;
  const hasVoice = (editDoc?.audioPlan as { voice?: unknown[] } | undefined)?.voice?.length;
  if (editDoc?.beats?.some((beat) => String(beat.transcript ?? "").trim()) || hasVoice) return hasVoice ? "voice" : "script";
  if (storyDraft?.status === "approved") return "script";
  if (storyDraft && storyDraft.status !== "none") return "story";
  return "idea";
};

const STAGE_LABELS: { id: JourneyStage; label: string; icon: string }[] = [
  { id: "idea", label: "Ý tưởng", icon: "💡" },
  { id: "story", label: "Story", icon: "📖" },
  { id: "script", label: "Script", icon: "📝" },
  { id: "voice", label: "Voice", icon: "🎙️" },
  { id: "video", label: "Video", icon: "🎬" },
  { id: "approved", label: "Duyệt", icon: "🚦" },
];

const JourneyStepper: React.FC<{ stage: JourneyStage }> = ({ stage }) => {
  const currentIndex = STAGE_LABELS.findIndex((s) => s.id === stage);
  return (
    <nav className="pp-stepper" aria-label="Journey stage">
      {STAGE_LABELS.map((entry, index) => (
        <span key={entry.id} className={`pp-step ${index < currentIndex ? "done" : index === currentIndex ? "current" : ""}`}>
          <span className="pp-step-icon">{index < currentIndex ? "✓" : entry.icon}</span>
          <span className="pp-step-label">{entry.label}</span>
          {index < STAGE_LABELS.length - 1 ? <span className="pp-step-line" /> : null}
        </span>
      ))}
    </nav>
  );
};

/** CREATE MODE: the journey's front door — "Video của bạn về gì?" */
const CreateCard: React.FC<{ onSendIdea: (idea: string) => void }> = ({ onSendIdea }) => {
  const [idea, setIdea] = React.useState("");
  return (
    <section className="pp-card pp-create">
      <div className="pp-card-title">Bắt đầu <small>— video của bạn về gì?</small></div>
      <textarea className="pp-idea-input" rows={3} aria-label="Video idea" placeholder="Mô tả ý tưởng video của bạn... (chủ đề, góc nhìn, đối tượng xem)" value={idea} onChange={(e) => setIdea(e.target.value)} />
      <div>
        <button type="button" className="ve-btn primary" disabled={!idea.trim()} onClick={() => onSendIdea(idea.trim())}>🚀 Bắt đầu với agent</button>
        <p className="ve-hint">Agent sẽ research + đề xuất STORY để bạn duyệt — rồi mới viết script. Bạn chỉnh được mọi thứ ở từng bước.</p>
      </div>
    </section>
  );
};

/** STORY CHECKPOINT: the first review gate — edit fields inline, approve. */
const StoryCard: React.FC<{ projectId: string; draft: StoryDraft; hasScript: boolean; onChanged: () => void }> = ({ projectId, draft, hasScript, onChanged }) => {
  const agent = useAgentUi();
  const [fields, setFields] = React.useState({
    idea: draft.idea ?? "", surfaceProblem: draft.surfaceProblem ?? "",
    deeperProblem: draft.deeperProblem ?? "", thumbnailPromise: draft.thumbnailPromise ?? "",
    viewer: draft.commonGoal?.viewer ?? "", creator: draft.commonGoal?.creator ?? "",
  });
  React.useEffect(() => {
    setFields({
      idea: draft.idea ?? "", surfaceProblem: draft.surfaceProblem ?? "",
      deeperProblem: draft.deeperProblem ?? "", thumbnailPromise: draft.thumbnailPromise ?? "",
      viewer: draft.commonGoal?.viewer ?? "", creator: draft.commonGoal?.creator ?? "",
    });
    setNote("");
  }, [draft.idea, draft.surfaceProblem, draft.deeperProblem, draft.thumbnailPromise, draft.commonGoal?.viewer, draft.commonGoal?.creator]);
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("");

  const storyPayload = () => ({
    idea: fields.idea, surfaceProblem: fields.surfaceProblem,
    deeperProblem: fields.deeperProblem, thumbnailPromise: fields.thumbnailPromise,
    commonGoal: { viewer: fields.viewer, creator: fields.creator },
  });

  const save = async (status: "pending" | "approved" | "changes_requested") => {
    setBusy(true); setMessage("");
    try {
      await setStoryDraft(projectId, { status, story: storyPayload(), originalIdea: draft.originalIdea, note: status === "changes_requested" ? note : undefined });
      setMessage(status === "approved" ? "Story đã duyệt ✓" : status === "changes_requested" ? "Đã gửi yêu cầu sửa cho agent ✓" : "Đã lưu ✓");
      onChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally { setBusy(false); }
  };

  const dirty = fields.idea !== (draft.idea ?? "") || fields.surfaceProblem !== (draft.surfaceProblem ?? "") || fields.deeperProblem !== (draft.deeperProblem ?? "") || fields.thumbnailPromise !== (draft.thumbnailPromise ?? "") || fields.viewer !== (draft.commonGoal?.viewer ?? "") || fields.creator !== (draft.commonGoal?.creator ?? "");
  const canApprove = fields.idea.trim().length > 0 && fields.deeperProblem.trim().length > 0;
  return (
    <section className="pp-card">
      <div className="pp-card-title">Story <small>{draft.status === "approved" ? "— đã duyệt" : draft.status === "pending" ? "— chờ bạn duyệt" : draft.status === "changes_requested" ? "— đã yêu cầu sửa" : ""}</small></div>
      {draft.originalIdea ? <p className="ve-hint">💡 Ý tưởng gốc: {draft.originalIdea}</p> : null}
      <label className="ve-prop-field ve-prop-field-wide"><span>Idea</span>
        <textarea rows={1} value={fields.idea} aria-label="Story idea" disabled={draft.status === "approved"}
          onChange={(e) => setFields((f) => ({ ...f, idea: e.target.value }))} /></label>
      <label className="ve-prop-field ve-prop-field-wide"><span>Surface problem</span>
        <textarea rows={1} value={fields.surfaceProblem} aria-label="Story surface problem" disabled={draft.status === "approved"}
          onChange={(e) => setFields((f) => ({ ...f, surfaceProblem: e.target.value }))} /></label>
      <label className="ve-prop-field ve-prop-field-wide"><span>Deeper problem</span>
        <textarea rows={1} value={fields.deeperProblem} aria-label="Story deeper problem" disabled={draft.status === "approved"}
          onChange={(e) => setFields((f) => ({ ...f, deeperProblem: e.target.value }))} /></label>
      <label className="ve-prop-field ve-prop-field-wide"><span>Thumbnail promise</span>
        <textarea rows={1} value={fields.thumbnailPromise} aria-label="Story thumbnail promise" disabled={draft.status === "approved"}
          onChange={(e) => setFields((f) => ({ ...f, thumbnailPromise: e.target.value }))} /></label>
      <div className="ve-prop-section">
        <label className="ve-prop-field"><span>Viewer goal</span>
          <input type="text" value={fields.viewer} aria-label="Viewer goal" disabled={draft.status === "approved"}
            onChange={(e) => setFields((f) => ({ ...f, viewer: e.target.value }))} /></label>
        <label className="ve-prop-field"><span>Creator goal</span>
          <input type="text" value={fields.creator} aria-label="Creator goal" disabled={draft.status === "approved"}
            onChange={(e) => setFields((f) => ({ ...f, creator: e.target.value }))} /></label>
      </div>
      {draft.status !== "approved" ? (
        <>
          <div className="pp-story-actions">
            {dirty ? <button type="button" className="ve-btn" disabled={busy} onClick={() => void save("pending")}>Lưu sửa</button> : null}
            <button type="button" className="ve-btn pp-keep" disabled={busy || !canApprove} title={canApprove ? "" : "Idea + deeper problem không được để trống"} onClick={() => void save("approved")}>✓ Duyệt story</button>
          </div>
          <details className="pp-request-changes">
            <summary>yêu cầu agent sửa story</summary>
            <input className="pp-note-input" aria-label="Story revision note" placeholder="cần sửa gì? (agent đọc note này rồi re-draft)" value={note} onChange={(e) => setNote(e.target.value)} />
            <button type="button" className="ve-btn pp-redo" disabled={busy || !note.trim()} onClick={() => { void save("changes_requested"); agent.setDraftPrompt(`Story của project ${projectId} bị yêu cầu sửa (xem qa/story-draft.json note). Đọc check_story_review, sửa story theo note rồi draft_story lại.`); agent.setOpen(true); }}>↻ Gửi yêu cầu sửa</button>
          </details>
        </>
      ) : null}
      {message ? <p className="ve-hint">{message}</p> : null}
      {draft.status === "approved" && !hasScript ? (
        <div>
          <button type="button" className="ve-btn primary" onClick={() => { agent.setDraftPrompt(`Story đã duyệt (project ${projectId}). Viết script từ story đã duyệt: gọi write_edit_doc với story ở qa/story-draft.json làm input, instruction = ý tưởng gốc. Sau đó dừng để tôi duyệt script.`); agent.setOpen(true); }}>📝 Viết script →</button>
          <p className="ve-hint">Agent viết script từ story này — bạn duyệt và sửa trong studio như thường lệ.</p>
        </div>
      ) : draft.status === "approved" ? (
        <p className="ve-hint">Script đã tồn tại — sửa trực tiếp trong phần Script phía dưới.</p>
      ) : (
        <p className="ve-hint">Duyệt story để agent tiến sang viết script — hoặc sửa trực tiếp các trường phía trên rồi Lưu.</p>
      )}
    </section>
  );
};

/** GENERATE: the deterministic back-half as ONE button + progress. */
const GenerateCard: React.FC<{ projectId: string; hasScript: boolean; onDone: () => void }> = ({ projectId, hasScript, onDone }) => {
  const [busy, setBusy] = React.useState(false);
  const [step, setStep] = React.useState("");
  const [message, setMessage] = React.useState("");
  const generate = async () => {
    setBusy(true); setStep("voice"); setMessage("");
    try {
      const start = await fetch("/api/project/produce", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId }) }).then((r) => r.json());
      if (!start.jobId) throw new Error(start.error || "produce failed to start");
      for (let i = 0; i < 180; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        const status = await fetch(`/api/project/produce/status?jobId=${encodeURIComponent(start.jobId)}`).then((r) => r.json());
        if (status.step) setStep(status.step);
        if (status.status === "done") {
          setMessage(`Video draft xong ✓ — ${status.result?.durationSec ?? "?"}s, timeline ${status.result?.timelineOk ? "OK" : "có warnings"}`);
          onDone();
          return;
        }
        if (status.status === "error") throw new Error(status.message || "produce error");
      }
      throw new Error("produce timed out");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally { setBusy(false); }
  };
  return (
    <section className="pp-card">
      <div className="pp-card-title">Generate <small>— voice + timeline + draft render</small></div>
      <div>
        <button type="button" className="ve-btn primary" disabled={busy || !hasScript} onClick={() => void generate()}>
          {busy ? `Đang chạy: ${step === "voice" ? "TTS voice" : step === "timeline" ? "timeline" : step === "render" ? "render" : "..."}…` : "🎬 Generate video"}
        </button>
        {!hasScript ? <p className="ve-hint">Cần script (beats có transcript) trước khi generate.</p> : null}
      </div>
      {message ? <p className="ve-hint">{message}</p> : null}
    </section>
  );
};

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
  const agent = useAgentUi();
  const [snapshot, setSnapshot] = React.useState<Awaited<ReturnType<typeof loadProject>> | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [renders, setRenders] = React.useState<ProjectRender[]>([]);
  const [approval, setApprovalState] = React.useState<ProjectApproval | null>(null);
  const [storyDraft, setStoryDraftState] = React.useState<StoryDraft | null>(null);

  const refresh = React.useCallback(() => {
    loadProject(projectId).then((payload) => { setSnapshot(payload); setError(null); }).catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
    fetchRenders(projectId).then((payload) => setRenders(payload.renders)).catch(() => setRenders([]));
    fetchApproval(projectId).then(setApprovalState).catch(() => setApprovalState(null));
    fetchStoryDraft(projectId).then(setStoryDraftState).catch(() => setStoryDraftState(null));
  }, [projectId]);
  React.useEffect(() => { refresh(); }, [refresh]);
  // LIVE journey: the agent writes files -> SSE fires -> the studio reflects
  // the new artifact without the user touching anything
  React.useEffect(() => subscribeToChanges((changedId) => { if (changedId === projectId) refresh(); }), [projectId, refresh]);

  if (error) return <div className="pp-page"><div className="pp-loading">Load error: {error}</div></div>;
  if (!snapshot) return <div className="pp-page"><div className="pp-loading">Loading project…</div></div>;

  const videoDoc = snapshot.videoDoc as VideoDoc | undefined;
  const editDoc = snapshot.editDoc as IsaacVerseEditDoc | undefined;
  const editorDoc = snapshot.editorDoc as IsaacVerseEditDoc | undefined;
  const allClips = editorDoc?.tracks.flatMap((track) => track.clips) ?? [];
  // SCRIPT TRUTH (cold-diff review MAJOR #1): the script checkpoint reads the
  // EDIT-DOC beats — they exist right after write_edit_doc, BEFORE the
  // timeline projection. The editor doc only enriches with voice metadata.
  const editorBeats = (editorDoc?.tracks.find((track) => track.id === "video-main")?.clips ?? [])
    .slice().sort((a, b) => a.range.startSec - b.range.startSec);
  const editBeats = (editDoc?.beats ?? []).map((beat) => ({
    id: `beat:${beat.id}`,
    kind: "beat" as const,
    trackId: "video-main",
    range: { startSec: beat.startSec, endSec: beat.startSec + beat.durationSec },
    label: beat.narrativeFunction ?? beat.id,
    source: { beatId: beat.id },
    metadata: { transcript: beat.transcript, treatmentId: beat.treatment?.id } as Record<string, unknown>,
  }));
  const beatClips = editorBeats.length ? editorBeats : editBeats;
  const latest = renders[0];
  const stage = deriveStage(snapshot, storyDraft, renders.length, approval);
  const hasScript = (editDoc?.beats ?? []).some((beat) => String(beat.transcript ?? "").trim());
  const sendIdeaToAgent = (idea: string) => {
    agent.setDraftPrompt(`Tôi muốn làm video: "${idea}". Hãy dùng tool draft_story (project ${projectId}, idea verbatim, story bạn compose) để đề xuất story — rồi dừng chờ tôi duyệt trong Content Studio.`);
    agent.setOpen(true);
  };

  return (
    <div className="pp-page">
      <header className="pp-appbar">
        <div>
          <h1>{videoDoc?.idea ?? storyDraft?.originalIdea ?? storyDraft?.idea ?? projectId}</h1>
          <small>{projectId} · {String(snapshot.state.stage ?? "?")} · {snapshot.state.currentVersion}</small>
        </div>
        <button type="button" className="ve-btn primary" onClick={onOpenEditor}>Mở editor ↗</button>
      </header>

      <JourneyStepper stage={stage} />

      {stage === "idea" ? <CreateCard onSendIdea={sendIdeaToAgent} /> : null}

      {storyDraft && storyDraft.status !== "none" ? (
        <StoryCard projectId={projectId} draft={storyDraft} hasScript={hasScript} onChanged={refresh} />
      ) : null}

      <PromptCard instruction={typeof editDoc?.instruction === "string" ? editDoc.instruction : undefined} />

      {hasScript ? (
        <section className="pp-card">
          <div className="pp-card-title">Script <small>— {beatClips.length} beats, sửa trực tiếp</small></div>
          <div className="pp-beats">
            {beatClips.map((beat, index) => {
              const voice = allClips.find((clip) => clip.kind === "voice" && clip.source.beatId === beat.source.beatId);
              return <BeatEditor key={beat.id} index={index} beat={beat} voice={voice} projectId={projectId} onChanged={refresh} />;
            })}
          </div>
        </section>
      ) : null}

      {hasScript ? <GenerateCard projectId={projectId} hasScript={hasScript} onDone={refresh} /> : null}

      {stage === "video" || stage === "approved" ? (
        <ApprovalCard projectId={projectId} approval={approval} candidateUrl={latest ? artifactUrl(projectId, latest.path) : undefined} onChanged={refresh} />
      ) : null}

      {videoDoc ? (
        <details className="pp-card pp-collapse">
          <summary className="pp-card-title">Story (final)</summary>
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

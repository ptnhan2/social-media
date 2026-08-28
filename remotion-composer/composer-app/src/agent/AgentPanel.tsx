import React, { useState, useRef, useEffect, Component, ErrorInfo } from "react";
import { useStream } from "@langchain/react";

// agent server port per .kilo/skills/server-lifecycle (langgraph dev --port 2025)
const LANGGRAPH_URL = "http://localhost:2025";
const ASSISTANT_ID = "agent";

// --- Error Boundary ---
class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean; error: string }> {
  state = { hasError: false, error: "" };
  static getDerivedStateFromError(err: Error) { return { hasError: true, error: err.message }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("UI Error:", error, info); }
  render() {
    if (this.state.hasError) return (
      <div className="ap-error"><strong>UI Error:</strong> {this.state.error}<br/>
        <button onClick={() => this.setState({ hasError: false, error: "" })}>Retry</button>
      </div>
    );
    return this.props.children;
  }
}

// --- Helpers ---
function extractVideoPaths(text: string): string[] {
  const paths: string[] = [];
  const regex = /(?:\/workspace\/)?(projects\/[^\s"']+\.mp4)/g;
  let m; while ((m = regex.exec(text)) !== null) paths.push(m[1]);
  return [...new Set(paths)];
}
function videoUrl(path: string): string {
  if (!path) return "";
  // normalize: strip /workspace/ prefix and leading projects/ segment
  let p = path.startsWith("/workspace/") ? path.slice("/workspace/".length) : path;
  if (p.startsWith("projects/")) p = p.slice("projects/".length);
  const parts = p.split("/");
  if (parts.length < 2) return "";
  return `/api/project/artifact?projectId=${encodeURIComponent(parts[0])}&path=${encodeURIComponent(parts.slice(1).join("/"))}`;
}
function parseCritiqueScores(text: string): { aspect: string; score: number }[] {
  const scores: { aspect: string; score: number }[] = [];
  // strip markdown emphasis so "**Composition**: 4/5" matches like "Composition: 4"
  const clean = text.replace(/[*_`#]/g, "");
  const regex = /(composition|color|motion|text\s+legibility|text|pacing)\s*[:\-]?\s*(\d)/gi;
  const seen = new Set<string>();
  let m;
  while ((m = regex.exec(clean)) !== null) {
    let a = m[1].toLowerCase(); if (a.includes("text")) a = "text";
    if (!seen.has(a)) { seen.add(a); scores.push({ aspect: a, score: parseInt(m[2]) }); }
  }
  return scores;
}
function extractTopIssue(text: string): string {
  const lower = text.toLowerCase();
  const idx = lower.indexOf("top issue:");
  if (idx === -1) return "";
  return text.substring(idx + 10).trim().split("\n")[0];
}

// --- Collapsible Tool Call Card ---
function ToolCallCard({ name, args, result }: { name: string; args: string; result?: string }) {
  const [expanded, setExpanded] = useState(false);
  const isTask = name === "task";
  const videos = result ? extractVideoPaths(result) : [];
  const scores = result ? parseCritiqueScores(result) : [];
  const topIssue = result ? extractTopIssue(result) : "";

  return (
    <div className={`ap-tool-card ${isTask ? "ap-tool-task" : ""}`}>
      <div className="ap-tool-card-header" onClick={() => setExpanded(!expanded)}>
        <span className="ap-tool-icon">{isTask ? "📤" : "🔧"}</span>
        <span className="ap-tool-name">{name}</span>
        <span className="ap-tool-expand">{expanded ? "▼" : "▶"}</span>
      </div>
      {!expanded && <div className="ap-tool-args-preview">{args.slice(0, 80)}{args.length > 80 ? "…" : ""}</div>}
      {expanded && (
        <div className="ap-tool-card-body">
          <div className="ap-tool-args-full">{args}</div>
          {result && (
            <>
              {scores.length > 0 && (
                <div className="ap-critique-scores">
                  {scores.map((s, i) => (
                    <span key={i} className={`ap-score ap-score-${s.score <= 2 ? "low" : s.score === 3 ? "mid" : "high"}`}>
                      {s.aspect}: {s.score}/5
                    </span>
                  ))}
                </div>
              )}
              {topIssue && <div className="ap-top-issue">⚠ {topIssue}</div>}
              <pre className="ap-tool-result">{result.slice(0, 500)}{result.length > 500 ? "…" : ""}</pre>
              {videos.map((vp, i) => (
                <div key={i} className="ap-video-inline">
                  <video controls src={videoUrl(vp)} style={{ width: "100%", borderRadius: 6 }} />
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// --- Message renderer ---
function MessageView({ msg }: { msg: any }) {
  const role = msg.type === "human" ? "user" : msg.type === "tool" ? "tool" : "agent";
  let content = msg.content;
  if (typeof content === "object" && content !== null) {
    if (Array.isArray(content)) content = content.map((c: any) => typeof c === "string" ? c : (typeof c?.text === "string" ? c.text : JSON.stringify(c))).join("");
    else content = typeof (content as any).text === "string" ? (content as any).text : JSON.stringify(content);
  }
  content = content || "";

  if (msg.tool_calls && msg.tool_calls.length > 0) {
    return (
      <div className="ap-msg-tool-calls">
        {msg.tool_calls.map((tc: any, i: number) => (
          <ToolCallCard key={i} name={tc.name} args={JSON.stringify(tc.args)} />
        ))}
      </div>
    );
  }

  if (!content && role === "agent") return null;
  if (role === "tool") {
    const videos = extractVideoPaths(content);
    const scores = parseCritiqueScores(content);
    const topIssue = extractTopIssue(content);
    return (
      <div className="ap-msg ap-msg-tool">
        {scores.length > 0 && (
          <div className="ap-critique-scores">
            {scores.map((s, i) => (
              <span key={i} className={`ap-score ap-score-${s.score <= 2 ? "low" : s.score === 3 ? "mid" : "high"}`}>
                {s.aspect}: {s.score}/5
              </span>
            ))}
          </div>
        )}
        {topIssue && <div className="ap-top-issue">⚠ {topIssue}</div>}
        <pre className="ap-tool-result">{content.slice(0, 400)}{content.length > 400 ? "…" : ""}</pre>
        {videos.map((vp, i) => (
          <div key={i} className="ap-video-inline">
            <video controls src={videoUrl(vp)} style={{ width: "100%", borderRadius: 6 }} />
          </div>
        ))}
      </div>
    );
  }

  const videos = extractVideoPaths(content);
  return (
    <div className={`ap-msg ap-msg-${role}`}>
      <div className="ap-msg-content">{content}</div>
      {videos.map((vp, i) => (
        <div key={i} className="ap-video-inline">
          <video controls src={videoUrl(vp)} style={{ width: "100%", borderRadius: 6 }} />
        </div>
      ))}
    </div>
  );
}

// --- Subagent Card ---
function SubagentCard({ subagent }: { subagent: any }) {
  const [expanded, setExpanded] = useState(true);
  const name = subagent?.name || "subagent";
  const status = subagent?.status || "unknown";
  const messages = subagent?.messages || [];

  return (
    <div className="ap-subagent-card">
      <div className="ap-subagent-header" onClick={() => setExpanded(!expanded)}>
        <span className="ap-subagent-icon">🤖</span>
        <span className="ap-subagent-name">{name}</span>
        <span className={`ap-subagent-status ap-status-${status}`}>{status}</span>
        <span className="ap-tool-expand">{expanded ? "▼" : "▶"}</span>
      </div>
      {expanded && messages.length > 0 && (
        <div className="ap-subagent-body">
          {messages.slice(-3).map((m: any, i: number) => (
            <div key={i} className="ap-subagent-msg">{typeof m.content === "string" ? m.content.slice(0, 200) : JSON.stringify(m.content).slice(0, 200)}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Todo List ---
function TodoList({ todos }: { todos: any[] | undefined }) {
  if (!todos || todos.length === 0) return null;
  return (
    <div className="ap-todos">
      <div className="ap-todos-header">📋 Plan</div>
      {todos.map((todo, i) => (
        <div key={i} className={`ap-todo ap-todo-${todo.status || "pending"}`}>
          <span className="ap-todo-status">
            {todo.status === "completed" ? "✅" : todo.status === "in_progress" ? "🔄" : "⬜"}
          </span>
          <span className="ap-todo-content">{todo.content}</span>
        </div>
      ))}
    </div>
  );
}

// --- Score History Tracker ---
function useScoreHistory() {
  const [history, setHistory] = useState<{ cycle: number; scores: { aspect: string; score: number }[] }[]>([]);
  const addScores = (scores: { aspect: string; score: number }[]) => {
    setHistory(prev => [...prev, { cycle: prev.length + 1, scores }]);
  };
  return { history, addScores };
}

function ScoreHistoryChart({ history }: { history: { cycle: number; scores: { aspect: string; score: number }[] }[] }) {
  if (history.length === 0) return null;
  const aspects = history[0]?.scores.map(s => s.aspect) || [];
  const colors: Record<string, string> = { composition: "#60a5fa", color: "#2dd4a0", motion: "#f5b544", text: "#a78bfa", pacing: "#ec6a5e" };
  return (
    <div className="ap-score-chart">
      <div className="ap-score-chart-header">📊 Score History</div>
      <div className="ap-score-chart-body">
        {aspects.map(aspect => {
          const scores = history.map(h => h.scores.find(s => s.aspect === aspect)?.score || 0);
          const max = Math.max(...scores, 5);
          return (
            <div key={aspect} className="ap-score-row">
              <span className="ap-score-label" style={{ color: colors[aspect] || "#888" }}>{aspect}</span>
              <div className="ap-score-bars">
                {scores.map((score, i) => (
                  <div key={i} className="ap-score-bar" style={{
                    height: `${(score / 5) * 100}%`,
                    background: colors[aspect] || "#888",
                    opacity: 0.4 + (i / scores.length) * 0.6,
                  }} title={`Cycle ${i + 1}: ${score}/5`} />
                ))}
              </div>
              <span className="ap-score-value">{scores[scores.length - 1]}/5</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Before/After Video Player ---
function BeforeAfterPlayer({ beforePath, afterPath }: { beforePath: string; afterPath: string }) {
  const beforeUrl = videoUrl(beforePath);
  const afterUrl = videoUrl(afterPath);
  if (!beforeUrl || !afterUrl) return null;
  return (
    <div className="ap-before-after">
      <div className="ap-before-after-header">🎬 Before / After</div>
      <div className="ap-before-after-videos">
        <div className="ap-ba-video">
          <div className="ap-ba-label">Before</div>
          <video controls src={beforeUrl} style={{ width: "100%", borderRadius: 4 }} />
        </div>
        <div className="ap-ba-video">
          <div className="ap-ba-label">After</div>
          <video controls src={afterUrl} style={{ width: "100%", borderRadius: 4 }} />
        </div>
      </div>
    </div>
  );
}

// --- KEEP Gate (protocol v4) — 3-exit human decision ---
function KeepGate({ gate, onDecide, busy }: { gate: any; onDecide: (type: "keep" | "reject", note: string) => void; busy: boolean }) {
  const [note, setNote] = useState("");
  return (
    <div className="ap-approval">
      <div className="ap-approval-desc">
        <strong>KEEP GATE — {gate.knob}: {String(gate.old_value)} → {String(gate.new_value)}</strong>
        <div className="ap-approval-path">📊 {gate.verdict_summary}</div>
        {gate.aspect ? <div className="ap-approval-path">🎯 aspect: {gate.aspect}</div> : null}
        {gate.motivation ? <div className="ap-approval-path">💡 inspired by: {gate.motivation} — phiếu của bạn quy hồi về nguồn này</div> : null}
        {gate.feedback_context ? <div className="ap-approval-path">💬 your feedback: {gate.feedback_context}</div> : null}
      </div>
      <BeforeAfterPlayer beforePath={gate.video_before} afterPath={gate.video_after} />
      <textarea
        className="ap-input ap-note-input"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Góp ý (không bắt buộc): còn thiếu gì? Both bad? — note này thành chu kỳ fix kế tiếp"
        rows={2}
        disabled={busy}
      />
      <div className="ap-approval-actions">
        <button className="ap-approve" disabled={busy} onClick={() => onDecide("keep", note)}>Keep{note.trim() ? " + note" : ""}</button>
        <button className="ap-reject" disabled={busy} onClick={() => onDecide("reject", note)}>Reject{note.trim() ? " + note" : ""}</button>
      </div>
    </div>
  );
}

// --- Main AgentPanel ---
export function AgentPanel({ projectId, currentSec }: { projectId: string; currentSec: number }) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const stream = useStream({
    apiUrl: LANGGRAPH_URL,
    assistantId: ASSISTANT_ID,
  });

  const messages = stream.messages || [];
  const isBusy = stream.isLoading;
  const interrupt = stream.interrupt;
  const todos = (stream as any).values?.todos;
  const subagents = (stream as any).subagents;
  const subagentList = subagents ? [...subagents.values()] : [];
  const { history: scoreHistory, addScores } = useScoreHistory();

  // Track video paths for before/after
  const [videoPaths, setVideoPaths] = useState<string[]>([]);
  useEffect(() => {
    const allContent = messages.map((m: any) => {
      let c = m.content;
      if (typeof c === "object" && c !== null) {
        if (Array.isArray(c)) c = c.map((x: any) => typeof x === "string" ? x : JSON.stringify(x)).join("");
        else c = JSON.stringify(c);
      }
      return c || "";
    }).join("\n");
    const paths = extractVideoPaths(allContent);
    if (paths.length > 0) setVideoPaths(prev => [...new Set([...prev, ...paths])].slice(-4));

    // Track critique scores for history
    for (const m of messages) {
      const c = typeof m.content === "string" ? m.content : JSON.stringify(m.content || "");
      const scores = parseCritiqueScores(c);
      if (scores.length >= 3 && m.type === "tool") {
        addScores(scores);
      }
    }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, subagentList.length]);

  const send = (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || isBusy) return;
    (stream as any).submit(
      { messages: [{ type: "human", content: msg }] },
      { streamSubgraphs: true, config: { recursionLimit: 50 } },
    );
    setInput("");
  };

  const handleApproval = (type: "approve" | "reject") => {
    (stream as any).respond({ decisions: [{ type }] });
  };

  // KEEP gate (protocol v4): interrupt payload {kind:"keep_gate", ...}
  const keepGate = interrupt && interrupt.value && (interrupt.value as any).kind === "keep_gate" ? (interrupt.value as any) : null;
  const handleKeepDecision = (type: "keep" | "reject", note: string) => {
    // v1 commands transport: submit() dispatches run.start WITHOUT a resume —
    // resumes must go through respond(), which targets the pending interrupt.
    (stream as any).respond({ type, note });
  };

  // Parse interrupt for display
  const interruptInfo = (() => {
    if (!interrupt) return null;
    const val = interrupt.value as any;
    const reqs = val?.action_requests || [];
    if (reqs.length > 0) {
      const req = reqs[0];
      const name = req?.name || "tool";
      const args = req?.args || {};
      if (name === "edit_file" || name === "write_file") {
        return { name, path: args.file_path || args.path || "", old: args.old_string?.slice(0, 100) || "", new: args.new_string?.slice(0, 100) || "" };
      }
      return { name, path: JSON.stringify(args).slice(0, 200), old: "", new: "" };
    }
    return { name: "approval", path: JSON.stringify(val).slice(0, 200), old: "", new: "" };
  })();

  return (
    <ErrorBoundary>
      <div className="ap-root">
        {/* Quick actions */}
        <div className="ap-quick-actions">
          <button className="ap-qa-btn" disabled={isBusy || !!interrupt} onClick={() => send("list style knobs")}>Knobs</button>
          <button className="ap-qa-btn" disabled={isBusy || !!interrupt} onClick={() => send("read the style store")}>Read Style</button>
          <button className="ap-qa-btn" disabled={isBusy || !!interrupt} onClick={() => send(`render ${projectId} ${Math.max(0, currentSec - 2).toFixed(1)} to ${(currentSec + 2).toFixed(1)} draft`)}>Render ±2s</button>
          <button className="ap-qa-btn" disabled={isBusy || !!interrupt} onClick={() => send(`render ${projectId} 0 to 4 draft then use the critic subagent to critique the result`)}>Critique</button>
          <button className="ap-qa-btn" disabled={isBusy || !!interrupt} onClick={() => send(`render ${projectId} 0 to 4 draft, critique it, then improve the weakest aspect`)}>Improve</button>
        </div>

        {/* Context bar */}
        <div className="ap-context">
          <span className="ap-ctx-item">📁 {projectId}</span>
          <span className="ap-ctx-item">⏱ {currentSec.toFixed(1)}s</span>
          <span className={`ap-ctx-status ${isBusy ? "busy" : interrupt ? "waiting" : "idle"}`}>
            {isBusy ? "working" : interrupt ? "approval" : "idle"}
          </span>
        </div>

        {/* Todo list */}
        <TodoList todos={todos} />

        {/* Score history chart */}
        <ScoreHistoryChart history={scoreHistory} />

        {/* Before/After player (if 2+ videos) */}
        {videoPaths.length >= 2 && (
          <BeforeAfterPlayer beforePath={videoPaths[videoPaths.length - 2]} afterPath={videoPaths[videoPaths.length - 1]} />
        )}

        {/* Messages */}
        <div className="ap-messages">
          {messages.length === 0 && subagentList.length === 0 && (
            <div className="ap-msg ap-msg-agent">
              <div className="ap-msg-content">
                <strong>Agent ready.</strong> Ask me to render, critique, or change style knobs.
              </div>
            </div>
          )}
          {messages.map((msg: any, i: number) => <MessageView key={i} msg={msg} />)}
          {/* Subagent cards */}
          {subagentList.map((sa: any, i: number) => <SubagentCard key={`sa-${i}`} subagent={sa} />)}
          {isBusy && <div className="ap-msg ap-msg-agent ap-loading-msg">working…</div>}
          <div ref={messagesEndRef} />
        </div>

        {/* Approval bar — permission interrupts (edit_file/write_file on gated paths) */}
        {interrupt && !keepGate && interruptInfo && (
          <div className="ap-approval">
            <div className="ap-approval-desc">
              <strong>Approval needed: {interruptInfo.name}</strong>
              {interruptInfo.path && <div className="ap-approval-path">📄 {interruptInfo.path}</div>}
              {interruptInfo.old && <div className="ap-approval-diff"><span className="ap-diff-old">- {interruptInfo.old}</span><br/><span className="ap-diff-new">+ {interruptInfo.new}</span></div>}
            </div>
            <div className="ap-approval-actions">
              <button className="ap-approve" onClick={() => handleApproval("approve")}>Approve</button>
              <button className="ap-reject" onClick={() => handleApproval("reject")}>Reject</button>
            </div>
          </div>
        )}

        {/* KEEP gate — protocol v4 3-exit decision (videos + note) */}
        {keepGate && (
          <KeepGate gate={keepGate} onDecide={handleKeepDecision} busy={isBusy} />
        )}

        {/* Input */}
        <div className="ap-input-bar">
          <input className="ap-input" value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Ask the agent…" disabled={isBusy || !!interrupt} />
          <button className="ap-send" onClick={() => send()} disabled={isBusy || !!interrupt || !input.trim()}>Send</button>
        </div>
      </div>
    </ErrorBoundary>
  );
}

import React, { useState, useRef, useEffect } from "react";
import { useStream } from "@langchain/react";

const LANGGRAPH_URL = "http://localhost:2024";
const ASSISTANT_ID = "agent";

// --- Helpers ---

function extractVideoPaths(text: string): string[] {
  const paths: string[] = [];
  const regex = /(?:\/workspace\/)?(projects\/[^\s"']+\.mp4)/g;
  let m;
  while ((m = regex.exec(text)) !== null) paths.push(m[1]);
  return [...new Set(paths)];
}

function videoUrl(path: string): string {
  // projects/isaacverse-final/renders/x.mp4 → /api/project/artifact?projectId=isaacverse-final&path=renders/x.mp4
  const parts = path.replace(/^projects\//, "").split("/");
  if (parts.length < 2) return "";
  const projectId = parts[0];
  const relPath = parts.slice(1).join("/");
  return `/api/project/artifact?projectId=${encodeURIComponent(projectId)}&path=${encodeURIComponent(relPath)}`;
}

function parseCritiqueScores(text: string): { aspect: string; score: number }[] {
  const scores: { aspect: string; score: number }[] = [];
  const regex = /(composition|color|motion|text\s+legibility|text|pacing)\s*[:\-]\s*(\d)/gi;
  const seen = new Set<string>();
  let m;
  while ((m = regex.exec(text)) !== null) {
    let aspect = m[1].toLowerCase();
    if (aspect.includes("text")) aspect = "text";
    if (!seen.has(aspect)) {
      seen.add(aspect);
      scores.push({ aspect, score: parseInt(m[2]) });
    }
  }
  return scores;
}

function extractTopIssue(text: string): string {
  const lower = text.toLowerCase();
  const idx = lower.indexOf("top issue:");
  if (idx === -1) return "";
  return text.substring(idx + "top issue:".length).trim().split("\n")[0];
}

// --- Message renderer ---

function MessageView({ msg }: { msg: any }) {
  const role = msg.type === "human" ? "user" : msg.type === "tool" ? "tool" : "agent";
  let content = msg.content;
  if (typeof content === "object" && content !== null) {
    if (Array.isArray(content)) {
      content = content.map((c: any) => (typeof c === "string" ? c : JSON.stringify(c))).join("");
    } else {
      content = JSON.stringify(content);
    }
  }
  content = content || "";

  // Tool call message
  if (msg.tool_calls && msg.tool_calls.length > 0) {
    return (
      <div className="ap-msg ap-msg-tool">
        <div className="ap-tool-header">🔧 {msg.tool_calls.map((tc: any) => tc.name).join(", ")}</div>
        {msg.tool_calls.map((tc: any, i: number) => (
          <div key={i} className="ap-tool-args">{JSON.stringify(tc.args).slice(0, 200)}</div>
        ))}
      </div>
    );
  }

  if (!content && role === "agent") return null;

  const videos = extractVideoPaths(content);
  const scores = role === "tool" ? parseCritiqueScores(content) : [];
  const topIssue = role === "tool" ? extractTopIssue(content) : "";
  const isKnobList = content.includes("treatments.") && content.includes(" = ");

  // Tool result — show truncated with video/critique enrichment
  if (role === "tool") {
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
        <pre className="ap-tool-result">{content.slice(0, 600)}{content.length > 600 ? "…" : ""}</pre>
        {videos.map((vp, i) => (
          <div key={i} className="ap-video-inline">
            <video controls src={videoUrl(vp)} style={{ width: "100%", borderRadius: 6 }} />
          </div>
        ))}
      </div>
    );
  }

  // Agent or user message
  return (
    <div className={`ap-msg ap-msg-${role}`}>
      <div className="ap-msg-content">{content}</div>
      {videos.map((vp, i) => (
        <div key={i} className="ap-video-inline">
          <video controls src={videoUrl(vp)} style={{ width: "100%", borderRadius: 6 }} />
        </div>
      ))}
      {isKnobList && (
        <div className="ap-knob-preview">
          {content.split("\n").filter((l: string) => l.includes(" = ")).slice(0, 8).map((line: string, i: number) => {
            const [path, ...rest] = line.split(" = ");
            return <div key={i} className="ap-knob-line"><span className="ap-knob-path">{path}</span><span className="ap-knob-val">= {rest.join(" = ")}</span></div>;
          })}
        </div>
      )}
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || isBusy) return;
    stream.submit({ messages: [{ type: "human", content: msg }] });
    setInput("");
  };

  const handleApproval = (type: "approve" | "reject") => {
    stream.respond({ decisions: [{ type }] });
  };

  const quickAction = (label: string, prompt: string) => {
    if (isBusy) return;
    send(prompt);
  };

  return (
    <div className="ap-root">
      {/* Quick actions */}
      <div className="ap-quick-actions">
        <button className="ap-qa-btn" disabled={isBusy || !!interrupt}
          onClick={() => quickAction("Knobs", "list style knobs")}>Knobs</button>
        <button className="ap-qa-btn" disabled={isBusy || !!interrupt}
          onClick={() => quickAction("Read", "read style")}>Read Style</button>
        <button className="ap-qa-btn" disabled={isBusy || !!interrupt}
          onClick={() => quickAction("Render", `render ${projectId} ${Math.max(0, currentSec - 2).toFixed(1)} to ${(currentSec + 2).toFixed(1)} draft`)}>Render ±2s</button>
        <button className="ap-qa-btn" disabled={isBusy || !!interrupt}
          onClick={() => quickAction("Critique", `render ${projectId} 0 to 4 draft then visual_critique the result`)}>Critique</button>
        <button className="ap-qa-btn" disabled={isBusy || !!interrupt}
          onClick={() => quickAction("Improve", `render ${projectId} 0 to 4 draft, then visual_critique, then propose_improvement`)}>Improve</button>
      </div>

      {/* Context bar */}
      <div className="ap-context">
        <span className="ap-ctx-item">📁 {projectId}</span>
        <span className="ap-ctx-item">⏱ {currentSec.toFixed(1)}s</span>
        <span className={`ap-ctx-status ${isBusy ? "busy" : interrupt ? "waiting" : "idle"}`}>
          {isBusy ? "working" : interrupt ? "approval" : "idle"}
        </span>
      </div>

      {/* Messages */}
      <div className="ap-messages">
        {messages.length === 0 && (
          <div className="ap-msg ap-msg-agent">
            <div className="ap-msg-content">
              <strong>Agent ready.</strong> Ask me to render, critique, or change style knobs.
              <br/><br/>
              Quick actions above, or type a message below.
            </div>
          </div>
        )}
        {messages.map((msg: any, i: number) => <MessageView key={i} msg={msg} />)}
        {isBusy && <div className="ap-msg ap-msg-agent ap-loading-msg">working…</div>}
        <div ref={messagesEndRef} />
      </div>

      {/* Approval bar */}
      {interrupt && (
        <div className="ap-approval">
          <div className="ap-approval-desc">
            <strong>Style change requested:</strong>
            <pre className="ap-approval-detail">{JSON.stringify(interrupt.value?.action_requests || interrupt.value, null, 2).slice(0, 300)}</pre>
          </div>
          <div className="ap-approval-actions">
            <button className="ap-approve" onClick={() => handleApproval("approve")}>Approve</button>
            <button className="ap-reject" onClick={() => handleApproval("reject")}>Reject</button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="ap-input-bar">
        <input
          className="ap-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask the agent…"
          disabled={isBusy || !!interrupt}
        />
        <button className="ap-send" onClick={() => send()} disabled={isBusy || !!interrupt || !input.trim()}>Send</button>
      </div>
    </div>
  );
}

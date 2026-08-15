import React, { useState, useRef, useEffect, Component, ErrorInfo } from "react";
import { useStream } from "@langchain/react";

const API_URL = "http://localhost:2024";
const ASSISTANT_ID = "agent";

// --- Error Boundary ---
class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean; error: string }> {
  state = { hasError: false, error: "" };
  static getDerivedStateFromError(err: Error) {
    return { hasError: true, error: err.message };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("UI Error:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h3>Something went wrong</h3>
          <p>{this.state.error}</p>
          <button onClick={() => this.setState({ hasError: false, error: "" })}>Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Video Preview ---
function VideoPreview({ path }: { path: string }) {
  const videoUrl = path.startsWith("/workspace/")
    ? `/video/${path.replace("/workspace/", "")}`
    : `/video/${path.replace(/^\.\//, "")}`;
  return (
    <div className="video-preview">
      <video controls src={videoUrl} style={{ width: "100%", borderRadius: "8px" }} />
      <div className="video-path">{path}</div>
    </div>
  );
}

// --- Extract video paths from message content ---
function extractVideoPaths(content: string): string[] {
  const paths: string[] = [];
  // Match /workspace/...mp4 or projects/...mp4
  const regex = /(?:\/workspace\/)?(projects\/[^\s"']+\.mp4)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    paths.push(match[1]);
  }
  return [...new Set(paths)];
}

// --- Style Knob Parser ---
function parseStyleKnobs(text: string): { path: string; value: string }[] {
  const knobs: { path: string; value: string }[] = [];
  const lines = text.split("\n");
  for (const line of lines) {
    const m = line.match(/^(treatments\.\S+)\s*=\s*(.+)$/);
    if (m) {
      knobs.push({ path: m[1], value: m[2] });
    }
  }
  return knobs;
}

export default function App() {
  const [input, setInput] = useState("");
  const [styleKnobs, setStyleKnobs] = useState<{ path: string; value: string }[]>([]);
  const [videoPaths, setVideoPaths] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const stream = useStream({
    apiUrl: API_URL,
    assistantId: ASSISTANT_ID,
  });

  const messages = stream.messages || [];
  const isBusy = stream.isLoading;
  const interrupt = stream.interrupt;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Extract video paths and style knobs from latest messages
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
    if (paths.length > 0) setVideoPaths(paths);

    // Check for style knob listings
    if (allContent.includes("treatments.")) {
      const knobs = parseStyleKnobs(allContent);
      if (knobs.length > 0) setStyleKnobs(knobs);
    }
  }, [messages]);

  const send = () => {
    if (!input.trim() || isBusy) return;
    stream.submit({ messages: [{ type: "human", content: input }] });
    setInput("");
  };

  const handleApproval = (type: "approve" | "reject") => {
    stream.respond({ decisions: [{ type }] });
  };

  const renderMessage = (msg: any, i: number) => {
    let content = msg.content;
    let role = msg.type === "human" ? "user" : msg.type === "tool" ? "tool" : "agent";

    if (msg.tool_calls && msg.tool_calls.length > 0) {
      const calls = msg.tool_calls.map((tc: any) => `${tc.name}(${JSON.stringify(tc.args).slice(0, 100)})`).join("\n");
      return (
        <div key={i} className="msg tool">
          <span className="tool-icon">🔧</span> {calls}
        </div>
      );
    }

    if (typeof content === "object" && content !== null) {
      if (Array.isArray(content)) {
        content = content.map((c: any) => typeof c === "string" ? c : JSON.stringify(c)).join("");
      } else {
        content = JSON.stringify(content);
      }
    }
    content = content || "";
    if (!content && role === "agent") return null;

    // Check for video paths in this specific message
    const msgVideos = extractVideoPaths(content);

    if (role === "tool") {
      const display = typeof content === "string" ? content.slice(0, 500) : String(content).slice(0, 500);
      return (
        <div key={i} className="msg tool">
          <span className="tool-icon">📋</span> {display}
          {msgVideos.map((vp, vi) => <VideoPreview key={vi} path={vp} />)}
        </div>
      );
    }

    return (
      <div key={i} className={`msg ${role}`}>
        {content}
        {msgVideos.map((vp, vi) => <VideoPreview key={vi} path={vp} />)}
      </div>
    );
  };

  return (
    <ErrorBoundary>
      <div className="app">
        <div className="chat-panel">
          <div className="messages">
            {messages.length === 0 && (
              <div className="msg agent">
                <strong>IsaacVerse Harness</strong> — self-improving video agent.<br/>
                Ask me to: render a video, critique it, propose improvements, or list style knobs.
              </div>
            )}
            {messages.map(renderMessage)}
            {isBusy && <div className="msg agent loading">Working...</div>}
            <div ref={messagesEndRef} />
          </div>
          <div className="input-bar">
            <span className={`status-dot ${isBusy ? "busy" : interrupt ? "waiting" : "idle"}`} />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask the agent..."
              disabled={isBusy || !!interrupt}
            />
            <button onClick={send} disabled={isBusy || !!interrupt || !input.trim()}>
              Send
            </button>
          </div>
        </div>

        <div className="side-panel">
          {videoPaths.length > 0 && (
            <>
              <h3>Video Preview</h3>
              <div className="video-list">
                {videoPaths.slice(-2).map((p, i) => <VideoPreview key={i} path={p} />)}
              </div>
            </>
          )}

          <h3>Style Knobs</h3>
          <div className="knob-list">
            {styleKnobs.length === 0 && <div className="knob empty">Ask agent to "list style knobs"</div>}
            {styleKnobs.map((k, i) => (
              <div key={i} className="knob">
                <span className="path">{k.path}</span>
                <span className="val"> = {k.value}</span>
              </div>
            ))}
          </div>

          <h3>Agent Status</h3>
          <div className="knob">
            {isBusy ? "Working..." : interrupt ? "Waiting for approval" : "Idle"}
          </div>
        </div>

        {interrupt && (
          <div className="approval-bar active">
            <div className="desc">
              <strong>Approval needed:</strong>{" "}
              {JSON.stringify(interrupt.value?.action_requests || interrupt.value).slice(0, 200)}
            </div>
            <button className="approve" onClick={() => handleApproval("approve")}>Approve</button>
            <button className="reject" onClick={() => handleApproval("reject")}>Reject</button>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

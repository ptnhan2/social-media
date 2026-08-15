import React, { useState, useRef, useEffect } from "react";
import { useStream } from "@langchain/react";

const API_URL = "http://localhost:2024";
const ASSISTANT_ID = "agent";

export default function App() {
  const [input, setInput] = useState("");
  const [styleKnobs, setStyleKnobs] = useState<string[]>([]);
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

  const send = () => {
    if (!input.trim() || isBusy) return;
    stream.submit({ messages: [{ type: "human", content: input }] });
    setInput("");
  };

  const handleApproval = (type: "approve" | "reject") => {
    // useStream.respond() — the correct API for resuming interrupts
    stream.respond({ decisions: [{ type }] });
  };

  const renderMessage = (msg: any, i: number) => {
    let content = msg.content;
    let role = msg.type === "human" ? "user" : msg.type === "tool" ? "tool" : "agent";

    // Handle tool calls (content is array of objects or msg has tool_calls)
    if (msg.tool_calls && msg.tool_calls.length > 0) {
      const calls = msg.tool_calls.map((tc: any) => `${tc.name}(${JSON.stringify(tc.args)})`).join("\n");
      return <div key={i} className="msg tool">{calls}</div>;
    }

    // Content can be string, array, or object
    if (typeof content === "object" && content !== null) {
      if (Array.isArray(content)) {
        content = content.map((c: any) => typeof c === "string" ? c : JSON.stringify(c)).join("");
      } else {
        content = JSON.stringify(content);
      }
    }
    content = content || "";
    if (!content && role === "agent") return null;

    if (role === "tool") {
      return <div key={i} className="msg tool">{typeof content === "string" ? content.slice(0, 300) : String(content).slice(0, 300)}</div>;
    }
    return <div key={i} className={`msg ${role}`}>{content}</div>;
  };

  return (
    <div className="app">
      <div className="chat-panel">
        <div className="messages">
          {messages.length === 0 && (
            <div className="msg agent">
              IsaacVerse Harness ready. Ask me to read style, change a knob, or render a video.
            </div>
          )}
          {messages.map(renderMessage)}
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
        <h3>Style Knobs</h3>
        <div className="knob-list">
          {styleKnobs.length === 0 && <div className="knob">Ask agent to "list style knobs"</div>}
          {styleKnobs.map((k, i) => {
            const [path, ...rest] = k.split(" = ");
            return (
              <div key={i} className="knob">
                <span className="path">{path}</span>
                <span className="val"> = {rest.join(" = ")}</span>
              </div>
            );
          })}
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
            {JSON.stringify(interrupt.value?.action_requests || interrupt.value)}
          </div>
          <button className="approve" onClick={() => handleApproval("approve")}>Approve</button>
          <button className="reject" onClick={() => handleApproval("reject")}>Reject</button>
        </div>
      )}
    </div>
  );
}

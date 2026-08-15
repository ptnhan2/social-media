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
    stream.submit(null, {
      configs: [{ interrupt_id: interrupt?.id, decision: { type } }],
    });
  };

  const renderMessage = (msg: any, i: number) => {
    const content = msg.content || "";
    const role = msg.type === "human" ? "user" : msg.type === "tool" ? "tool" : "agent";
    if (role === "tool") {
      return <div key={i} className="msg tool">{typeof content === "string" ? content.slice(0, 200) : JSON.stringify(content).slice(0, 200)}</div>;
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

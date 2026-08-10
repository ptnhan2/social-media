// layouts/process-flow.tsx — NEW: 3-4 steps connected by arrows (element_count=4+, composition=horizontal-strip)
// Research: hyperframes "full-width strip — a number line / timeline / enumeration"
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { PaperBg, easeOut } from "../primitives";
import { ItemText } from "../primitives";
import type { Scene } from "../types";

export const ProcessFlow: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const steps = s.items;
  const n = steps.length;
  const colW = 80 / Math.max(n, 1);
  return (
    <AbsoluteFill>
      <PaperBg frame={f} dark={s.dark} driftFrom={s.start} driftTo={s.end} />
      {/* connecting line */}
      <div style={{
        position: "absolute", left: "10%", top: "45%", width: "80%", height: 3,
        background: s.dark ? "#3a4a5a" : "#ccc", zIndex: 1,
      }} />
      {steps.map((step, i) => {
        const x = 10 + colW * i + colW / 2;
        const reveal = easeOut(Math.max(0, f - (step.at) * fps), 10);
        return (
          <div key={i}>
            {/* step circle */}
            <div style={{
              position: "absolute", left: `${x}%`, top: "45%",
              width: 60, height: 60, borderRadius: "50%",
              background: step.color || "#4FC3F7",
              transform: `translate(-50%,-50%) scale(${reveal})`,
              opacity: reveal, zIndex: 3,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "'Archivo Black', sans-serif", fontSize: 24, color: "#fff",
            }}>{i + 1}</div>
            {/* step label */}
            <div style={{
              position: "absolute", left: `${x}%`, top: "58%",
              transform: "translateX(-50%)", opacity: reveal,
              textAlign: "center", maxWidth: `${colW}%`,
              fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 22,
              color: s.dark ? "#F5F0E8" : "#131313", zIndex: 3,
            }}>{step.text}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// layouts/number-callout.tsx — NEW: big stat number + label (element_count=2, composition=single-focal)
// Research: Vox stat card — "large number counting up" + supporting label
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { PaperBg, easeOut } from "../primitives";
import type { Scene } from "../types";

export const NumberCallout: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const number = s.items[0];
  const label = s.items[1];
  const reveal = easeOut(Math.max(0, f - (s.start + 0.3) * fps), 15);
  return (
    <AbsoluteFill>
      <PaperBg frame={f} dark={s.dark} driftFrom={s.start} driftTo={s.end} />
      <div style={{
        position: "absolute", left: "50%", top: "40%",
        transform: `translate(-50%,-50%) scale(${0.8 + reveal * 0.2})`,
        opacity: reveal, textAlign: "center",
      }}>
        <div style={{
          fontFamily: "'Archivo Black', sans-serif", fontSize: 200,
          color: number?.color || "#4FC3F7", lineHeight: 1,
          textShadow: "0 0 30px rgba(79,195,247,0.3)",
        }}>{number?.text}</div>
        {label && (
          <div style={{
            fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 36,
            color: s.dark ? "#B0BEC5" : "#636363", marginTop: 12,
            textTransform: "uppercase", letterSpacing: "2px",
          }}>{label.text}</div>
        )}
      </div>
    </AbsoluteFill>
  );
};

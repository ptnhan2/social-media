// layouts/timeline-strip.tsx — horizontal timeline (researched)
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { PaperBg, easeOut } from "../primitives";
import { useOverrides, useRegister, applyItemOv } from "../../layout-lab/src/lib/overrides";
import type { Scene } from "../types";

export const TimelineStrip: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame();
  const ov = useOverrides();
  const reg = useRegister();
  const { fps } = useVideoConfig();
  const n = Math.max(1, s.items.length);
  const step = 80 / n;
  const lineY = ov.items?.[0]?.y ?? 45;
  return (
    <AbsoluteFill>
      <PaperBg frame={f} dark={s.dark} driftFrom={s.start} driftTo={s.end} />
      <div style={{ position: "absolute", left: "10%", top: `${lineY}%`, width: "80%", height: 3, background: s.dark ? "#3a4a5a" : "#ccc", zIndex: 1 }} />
      {s.items.map((it, i) => {
        const x = 10 + step * i + step / 2;
        reg({ key: `item-${i}`, x, y: lineY, w: 14, h: (52 / 1080) * 100 });
        const reveal = easeOut(Math.max(0, f - it.at * fps), 10);
        return (
          <div key={i} style={{ position: "absolute", left: `${x}%`, top: `${lineY}%`, transform: "translate(-50%,-50%)", opacity: reveal, zIndex: 3, textAlign: "center" }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: applyItemOv(it, ov, i).color || "#4FC3F7", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Archivo Black', sans-serif", fontSize: 20, color: "#fff" }}>{i + 1}</div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 18, color: s.dark ? "#F5F0E8" : "#131313", marginTop: 8, maxWidth: 180 }}>{it.text}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

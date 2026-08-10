// layouts/stacked-cards.tsx — NEW: 3+ overlapping cards (element_count=3+, composition=layered)
// Research: LICA "layered composition" + remotion-templates "photo-stack: overlapping frames with rotation"
import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { PaperBg, easeOut } from "../primitives";
import { ItemText } from "../primitives";
import type { Scene } from "../types";

export const StackedCards: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const imgs = s.img || [];
  const offsets = [
    { x: 35, y: 40, rot: -4, z: 2 },
    { x: 50, y: 45, rot: 1, z: 3 },
    { x: 65, y: 42, rot: 5, z: 4 },
  ];
  return (
    <AbsoluteFill>
      <PaperBg frame={f} dark={s.dark} driftFrom={s.start} driftTo={s.end} />
      {imgs.slice(0, 3).map((img, i) => {
        const o = offsets[i] || offsets[0];
        const reveal = easeOut(Math.max(0, f - (s.start + 0.3 + i * 0.4) * fps), 12);
        return (
          <div key={i} style={{
            position: "absolute", left: `${o.x}%`, top: `${o.y}%`,
            width: "32%", transform: `translate(-50%,-50%) rotate(${o.rot}deg) translateY(${(1-reveal)*30}px)`,
            opacity: reveal, zIndex: o.z,
          }}>
            <div style={{
              background: "#FAF7EF", padding: 8, borderRadius: 4,
              boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
            }}>
              <Img src={staticFile(`sanderson/images/${img}`)} style={{
                width: "100%", aspectRatio: "1.3", objectFit: "cover",
                filter: "saturate(1.1) contrast(1.05)", borderRadius: 2,
              }} />
            </div>
          </div>
        );
      })}
      {s.items.map((it, i) => (
        <ItemText key={i} item={it} sceneStart={s.start} sceneEnd={s.end} dark={s.dark} y={78 + i * 7} />
      ))}
    </AbsoluteFill>
  );
};

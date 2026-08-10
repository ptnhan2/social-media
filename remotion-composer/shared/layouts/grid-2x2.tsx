// layouts/grid-2x2.tsx — NEW: 4 images in 2×2 grid (element_count=4+, composition=grid)
// Research: LICA frame grid — "multi-cell image collage using CSS grid semantics"
import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { PaperBg, CUTOUT_OK } from "../primitives";
import { ItemText } from "../primitives";
import type { Scene } from "../types";

export const Grid2x2: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame();
  const imgs = s.img || [];
  const positions = [
    { x: 28, y: 32, w: 22 }, { x: 72, y: 32, w: 22 },
    { x: 28, y: 68, w: 22 }, { x: 72, y: 68, w: 22 },
  ];
  return (
    <AbsoluteFill>
      <PaperBg frame={f} dark={s.dark} driftFrom={s.start} driftTo={s.end} />
      {imgs.slice(0, 4).map((img, i) => {
        const p = positions[i];
        const seed = 5 + i * 3;
        return (
          <div key={i} style={{
            position: "absolute", left: `${p.x}%`, top: `${p.y}%`,
            width: `${p.w}%`, transform: "translate(-50%,-50%)",
            rotate: `${(i % 2 ? 1 : -1) * 1.5}deg`,
          }}>
            <Img src={staticFile(`sanderson/images/${img}`)} style={{
              width: "100%", aspectRatio: "1", objectFit: "cover",
              filter: "saturate(1.15) contrast(1.1)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              borderRadius: 4,
            }} />
          </div>
        );
      })}
      {s.items.map((it, i) => (
        <ItemText key={i} item={it} sceneStart={s.start} sceneEnd={s.end} dark={s.dark} y={12 + i * 8} />
      ))}
    </AbsoluteFill>
  );
};

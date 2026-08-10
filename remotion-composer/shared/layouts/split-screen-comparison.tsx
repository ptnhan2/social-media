// layouts/split-screen-comparison.tsx — before/after panels (researched)
import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { PaperBg, easeOut, ItemText } from "../primitives";
import { useOverrides, useRegister, applyItemOv } from "../../layout-lab/src/lib/overrides";
import type { Scene } from "../types";

export const SplitScreenComparison: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame();
  const ov = useOverrides();
  const reg = useRegister();
  const { fps } = useVideoConfig();
  const imgs = s.img || [];
  const left = imgs[0];
  const right = imgs[1];
  const reveal = easeOut(Math.max(0, f - (s.start + 0.3) * fps), 14);
  const y = ov.img?.y ?? 46;
  const h = ov.img?.width ?? 60;
  reg({ key: "img", x: 25, y, w: 50, h });
  reg({ key: "img2", x: 75, y, w: 50, h });
  return (
    <AbsoluteFill>
      <PaperBg frame={f} dark={s.dark} driftFrom={s.start} driftTo={s.end} />
      {left && (
        <div style={{ position: "absolute", left: "0%", top: `${y}%`, width: "50%", transform: `translateX(${-(1 - reveal) * 30}%)`, opacity: reveal, zIndex: 3 }}>
          <Img src={staticFile(`sanderson/images/${left}`)} style={{ width: "100%", height: `${h}%`, objectFit: "cover", filter: "saturate(1.1) contrast(1.05)" }} />
          <div style={{ position: "absolute", left: "8%", top: "8%", fontFamily: "'Archivo Black', sans-serif", fontSize: 28, color: "#fff", textShadow: "0 2px 8px rgba(0,0,0,.6)" }}>BEFORE</div>
        </div>
      )}
      {right && (
        <div style={{ position: "absolute", left: "50%", top: `${y}%`, width: "50%", transform: `translateX(${(1 - reveal) * 30}%)`, opacity: reveal, zIndex: 3 }}>
          <Img src={staticFile(`sanderson/images/${right}`)} style={{ width: "100%", height: `${h}%`, objectFit: "cover", filter: "saturate(1.2) contrast(1.1) hue-rotate(-8deg)" }} />
          <div style={{ position: "absolute", left: "8%", top: "8%", fontFamily: "'Archivo Black', sans-serif", fontSize: 28, color: "#fff", textShadow: "0 2px 8px rgba(0,0,0,.6)" }}>AFTER</div>
        </div>
      )}
      <div style={{ position: "absolute", left: "50%", top: `${y - h / 2}%`, width: 3, height: `${h}%`, background: "#fff", transform: "translateX(-50%)", opacity: reveal, zIndex: 4 }} />
      {s.items.map((it, i) => (
        <ItemText key={i} item={applyItemOv(it, ov, i)} sceneStart={s.start} sceneEnd={s.end} dark={s.dark} y={ov.items?.[i]?.y ?? 12 + i * 8} />
      ))}
    </AbsoluteFill>
  );
};

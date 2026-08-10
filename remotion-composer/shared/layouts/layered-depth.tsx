// layouts/layered-depth.tsx — 3-plane parallax (researched)
import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { PaperBg, easeOut, ItemText } from "../primitives";
import { useOverrides, useRegister, applyItemOv } from "../../layout-lab/src/lib/overrides";
import type { Scene } from "../types";

export const LayeredDepth: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame();
  const ov = useOverrides();
  const reg = useRegister();
  const { fps } = useVideoConfig();
  const bg = s.img?.[0];
  const mid = s.img?.[1];
  const reveal = easeOut(Math.max(0, f - (s.start + 0.2) * fps), 16);
  const mx = ov.img?.x ?? 50;
  const my = ov.img?.y ?? 48;
  const mw = ov.img?.width ?? 44;
  reg({ key: "img", x: mx, y: my, w: mw, h: mw * 0.75 });
  return (
    <AbsoluteFill>
      <PaperBg frame={f} dark={s.dark} />
      {bg && (
        <Img src={staticFile(`sanderson/images/${bg}`)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.45, filter: "saturate(0.9) blur(3px)" }} />
      )}
      {mid && (
        <div style={{ position: "absolute", left: `${mx}%`, top: `${my}%`, width: `${mw}%`, transform: `translate(-50%,-50%) translateY(${(1 - reveal) * 40}px)`, opacity: reveal, zIndex: 3 }}>
          <Img src={staticFile(`sanderson/images/${mid}`)} style={{ width: "100%", filter: "saturate(1.15) contrast(1.1)" }} />
        </div>
      )}
      {s.items.map((it, i) => (
        <ItemText key={i} item={applyItemOv(it, ov, i)} sceneStart={s.start} sceneEnd={s.end} dark={s.dark} y={ov.items?.[i]?.y ?? 70 + i * 12} />
      ))}
    </AbsoluteFill>
  );
};

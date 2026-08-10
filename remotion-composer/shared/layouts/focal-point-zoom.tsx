// layouts/focal-point-zoom.tsx — rule-of-thirds focal push (researched)
import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { PaperBg, easeOut, ItemText } from "../primitives";
import { useOverrides, useRegister, applyItemOv } from "../../layout-lab/src/lib/overrides";
import type { Scene } from "../types";

export const FocalPointZoom: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame();
  const ov = useOverrides();
  const reg = useRegister();
  const { fps } = useVideoConfig();
  const img = s.img?.[0];
  const k = easeOut(Math.max(0, f - s.start * fps), 3.5 * fps);
  const zoom = 1.0 + 0.18 * k;
  const fx = ov.img?.x ?? 67;
  const fy = ov.img?.y ?? 38;
  const fw = ov.img?.width ?? 40;
  reg({ key: "img", x: fx, y: fy, w: fw, h: fw * 0.75 });
  return (
    <AbsoluteFill>
      <PaperBg frame={f} dark={s.dark} />
      <div style={{ position: "absolute", left: `${fx}%`, top: `${fy}%`, width: `${fw}%`, transform: `translate(-50%,-50%) scale(${zoom})`, transformOrigin: `${fx}% ${fy}%` }}>
        {img ? <Img src={staticFile(`sanderson/images/${img}`)} style={{ width: "100%", filter: "saturate(1.15) contrast(1.1)" }} /> : <div style={{ width: "100%", aspectRatio: 1, background: "#1f2937", borderRadius: 8 }} />}
      </div>
      {s.items.map((it, i) => (
        <ItemText key={i} item={applyItemOv(it, ov, i)} sceneStart={s.start} sceneEnd={s.end} dark={s.dark} y={ov.items?.[i]?.y ?? 78 + i * 10} />
      ))}
    </AbsoluteFill>
  );
};

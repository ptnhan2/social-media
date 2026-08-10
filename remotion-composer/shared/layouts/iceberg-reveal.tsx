import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import {
  PaperBg, SubjectCutout, PhotoCard, TornFrame, WashiTape, ItemText,
  HighlightSweep, MonoLabel, KaraokeSubtitle, ImperfectionOverlay,
  CUTOUT_OK, resolveAccent, VOX_YELLOW, INK, INTER, MONO, ARCHIVO,
  easeOut, onTwos, hexToRgba,
} from "../primitives";
import type { Scene } from "../types";

const IMG = (n: string) => staticFile(`sanderson/images/${n}`);

export const IcebergView: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const reveal = easeOut(Math.max(0, f - s.start * fps), 2.2 * fps);
  const zoom = 1.3 - reveal * 0.3;
  return (
    <AbsoluteFill>
      <PaperBg frame={f} dark={s.dark} />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "60%",
          width: "56%",
          aspectRatio: "1.6",
          transform: `translate(-50%, -50%) scale(${zoom})`,
          opacity: reveal,
          filter: "drop-shadow(0 6px 10px rgba(60,45,20,0.35))",
          zIndex: 4,
        }}
      >
        <Img src={IMG(s.img![0])} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
      </div>
      {s.items.map((it, i) => (
        <ItemText key={i} item={it} sceneStart={s.start} sceneEnd={s.end} y={i === 0 ? 10 : 22 + i * 11} />
      ))}
    </AbsoluteFill>
  );
};

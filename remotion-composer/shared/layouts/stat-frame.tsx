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

export const StatView: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <PaperBg frame={f} />
      <TornFrame id={`st-${s.start}`} x={50} y={52} width={52} aspect={1.5} rotate={-0.8} seed={17} entrance={s.start + 0.6}>
        <Img src={IMG(s.img![0])} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
      </TornFrame>
      {s.items.map((it, i) => (
        <ItemText key={i} item={it} sceneStart={s.start} sceneEnd={s.end} y={i === 0 ? 10 : 24} />
      ))}
    </AbsoluteFill>
  );
};

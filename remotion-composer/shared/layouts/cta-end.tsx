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

export const CtaView: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <PaperBg frame={f} dark={true} />
      {s.items.map((it, i) => (
        <ItemText key={i} item={it} sceneStart={s.start} sceneEnd={s.end} dark={true} y={i === 0 ? 42 : 68} />
      ))}
    </AbsoluteFill>
  );
};

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

export const BubblesView: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame();
  const first = s.items[0];
  const rest = s.items.slice(1);
  return (
    <AbsoluteFill>
      <PaperBg frame={f} dark={s.dark} />
      <ItemText item={first} sceneStart={s.start} sceneEnd={s.end} y={12} />
      <TornFrame id={`bb1-${s.start}`} x={32} y={50} width={34} aspect={1.5} rotate={-1.2} seed={29} entrance={s.start + 0.8} dark={s.dark}>
        <div style={{ fontFamily: INTER, fontSize: 28, color: s.dark ? "#F5F0E8" : INK, padding: "8%", lineHeight: 1.5, textAlign: "center", fontWeight: 700 }}>
          says A
        </div>
      </TornFrame>
      <TornFrame id={`bb2-${s.start}`} x={68} y={50} width={34} aspect={1.5} rotate={1.2} seed={31} entrance={s.start + 1.6} from="right" dark={s.dark}>
        <div style={{ fontFamily: INTER, fontSize: 28, color: s.dark ? "#F5F0E8" : INK, padding: "8%", lineHeight: 1.5, textAlign: "center", fontWeight: 700 }}>
          means B
        </div>
      </TornFrame>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: 8,
          height: 70,
          background: resolveAccent(VOX_YELLOW, s.dark ?? false),
          opacity: easeOut(Math.max(0, f - (s.start + 2.2) * 30), 8) * 0.85,
          zIndex: 7,
        }}
      />
      {rest.map((it, i) => (
        <ItemText key={i} item={it} sceneStart={s.start} sceneEnd={s.end} y={70 + i * 9} />
      ))}
    </AbsoluteFill>
  );
};

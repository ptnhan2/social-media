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

export const CounterView: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <PaperBg frame={f} dark={s.dark} />
      {s.items.map((it, i) => (
        <TornFrame
          key={i}
          id={`cm-${s.start}-${i}`}
          x={50}
          y={26 + i * 20}
          width={62}
          aspect={5.6}
          rotate={i === 0 ? -1.4 : i === 1 ? 0.6 : -0.4}
          seed={23 + i}
          innerPad={3}
          entrance={it.at - s.start + 0.4}
          from={i % 2 === 0 ? "left" : "right"}
          dark={s.dark}
        >
          <div style={{ display: "flex", alignItems: "center", height: "100%", fontFamily: ARCHIVO, padding: "0 4%" }}>
            <span style={{ fontSize: 40, color: it.color, marginRight: "4%" }}>{it.text.split(" ")[0]}</span>
            <span style={{ fontSize: 30, color: s.dark ? "#F5F0E8" : INK }}>{it.text.split(" ").slice(1).join(" ")}</span>
          </div>
        </TornFrame>
      ))}
      <MonoLabel text="run every session" x={10} y={90} color={s.dark ? "#C9CDD1" : undefined} start={s.start + 1} />
    </AbsoluteFill>
  );
};

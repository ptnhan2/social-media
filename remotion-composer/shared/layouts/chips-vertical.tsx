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

export const ChipsView: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <PaperBg frame={f} dark={s.dark} />
      {s.items.map((it, i) => (
        <div key={i} style={{ position: "absolute", left: "50%", top: `${30 + i * 15}%`, transform: "translateX(-50%)", zIndex: 6 }}>
          <ItemText item={it} sceneStart={s.start} sceneEnd={s.end} dark={s.dark} y={0} />
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: "120%",
              height: "140%",
              transform: "translate(-50%, -50%) rotate(-0.5deg)",
              background: it.color === VOX_YELLOW ? VOX_YELLOW : s.dark ? "#262B30" : "#FAF7EF",
              opacity: easeOut(Math.max(0, f - it.at * 30), 6) * 0.9,
              zIndex: -1,
              borderRadius: 60,
            }}
          />
        </div>
      ))}
      {s.caption ? (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "88%",
            transform: "translate(-50%, -50%)",
            opacity: easeOut(Math.max(0, f - (s.start + (s.end - s.start) * 0.6) * 30), 8),
            fontFamily: MONO,
            fontSize: 24,
            letterSpacing: "2px",
            textTransform: "uppercase",
            color: resolveAccent(VOX_YELLOW, s.dark ?? false),
            zIndex: 6,
          }}
        >
          → {s.caption}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

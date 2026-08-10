import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import {
  PaperBg, SubjectCutout, PhotoCard, TornFrame, WashiTape, ItemText,
  HighlightSweep, MonoLabel, KaraokeSubtitle, ImperfectionOverlay,
  CUTOUT_OK, resolveAccent, VOX_YELLOW, INK, INTER, MONO, ARCHIVO,
  easeOut, onTwos, hexToRgba,
} from "../primitives";
import { useOverrides } from "../../layout-lab/src/lib/overrides";
import type { Scene } from "../types";

const IMG = (n: string) => staticFile(`sanderson/images/${n}`);

export const TextView: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame();
  const ov = useOverrides();
  return (
    <AbsoluteFill>
      <PaperBg frame={f} dark={s.dark} />
      {s.items.map((it, i) => (
        <ItemText key={i} item={it} sceneStart={s.start} sceneEnd={s.end} dark={s.dark} y={ov.items?.[i]?.y ?? Math.min(70, 30 + i * 17)} />
      ))}
      {/* yellow underline sweep under last big item */}
      {s.items.length > 1 ? (
        <HighlightSweep
          start={s.items[s.items.length - 1].at + 0.3}
          end={s.items[s.items.length - 1].at + 1.3}
          x={14}
          y={Math.min(70, 30 + (s.items.length - 1) * 17) + 7}
          width={76}
          height={40}
          rotate={-0.4}
          dark={s.dark}
        />
      ) : null}
    </AbsoluteFill>
  );
};

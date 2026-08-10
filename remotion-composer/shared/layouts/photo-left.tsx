// layouts/photo-left.tsx â€” PORTED from subtext VoxScenes v10 (approved)
// Photo cutout large on one side + plaque text on the other.
// Consumes: primitives (PaperBg, SubjectCutout, PhotoCard, WashiTape, ItemText)
import React from "react";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";
import { PaperBg, SubjectCutout, PhotoCard, WashiTape, CUTOUT_OK } from "../primitives";
import { ItemText } from "../primitives";
import { useOverrides } from "../../layout-lab/src/lib/overrides";
import type { Scene } from "../types";

export const PhotoLeft: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame();
  const ov = useOverrides();
  const imgName = s.img![0];
  const from = (s.motion as any) === "slideR" ? "right" : "left";
  const isCutout = CUTOUT_OK.includes(imgName);
  const img = ov.img || {};
  const x = img.x ?? (from === "right" ? 66 : 34);
  const y = img.y ?? 47;
  const width = img.width ?? (s.dark ? 60 : 56);
  const rotate = img.rotate ?? (from === "right" ? 2.2 : -2.2);
  return (
    <AbsoluteFill>
      <PaperBg frame={f} dark={s.dark} driftFrom={s.start} driftTo={s.end} />
      {isCutout ? (
        <SubjectCutout
          id={`sc-${s.start}`}
          src={staticFile(`sanderson/cutouts/${imgName.replace(/\.(png|jpg|jpeg)$/, ".png")}`)}
          x={x}
          y={y}
          width={width}
          rotate={rotate}
          entrance={s.start + 0.2}
          from={from}
          tone="saturate(1.2) contrast(1.15) brightness(0.95)"
          offsetStroke
          halftone
          halftoneDark={s.dark}
          z={4}
        />
      ) : (
        <PhotoCard
          id={`ph-${s.start}`}
          src={staticFile(`sanderson/images/${imgName}`)}
          x={x}
          y={y}
          width={width}
          rotate={rotate}
          seed={5 + Math.round(s.start)}
          entrance={s.start + 0.2}
          from={from}
          aspect={1.3}
        />
      )}
      <WashiTape x={from === "right" ? 88 : 14} y={12} angle={from === "right" ? -24 : 24} seed={7 + Math.round(s.start)} />
      {s.items.map((it, i) => (
        <ItemText key={i} item={it} sceneStart={s.start} sceneEnd={s.end} dark={s.dark}
          y={ov.items?.[i]?.y ?? (i === 0 ? 16 : 30 + i * 12)} align={from === "right" ? "left" : "right"} />
      ))}
    </AbsoluteFill>
  );
};

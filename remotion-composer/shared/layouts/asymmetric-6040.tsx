// layouts/asymmetric-6040.tsx â€” NEW (draft, from hyperframes layout vocabulary)
// Photo 60% left + caption rail 40% right (editorial asymmetric).
// Research: hyperframes "asymmetric 60/40 â€” a dense diagram + a caption rail"
// Breaks the "center-stack" + "photo-side" mold (only 2 layouts we had).
//
// Layout:
//   layer 0: PaperBg flat
//   layer 1: cutout/photo at x=32, width 48% (occupies left 60% visually)
//   layer 2: text rail right side â€” items stacked at x=82 (right edge),
//            y = 20 + i*18, align right, plaque style
//   layer 3: thin accent vertical bar at x=62 (divider between photo + rail)
//
// Best for: analytical beats â€” "here's the thing (photo) â†’ here's why (text rail)"
import React from "react";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";
import { PaperBg, SubjectCutout, PhotoCard, CUTOUT_OK, resolveAccent } from "../primitives";
import { ItemText } from "../primitives";
import type { Scene } from "../types";

export const Asymmetric6040: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame();
  const imgName = s.img![0];
  const isCutout = CUTOUT_OK.includes(imgName);
  const accent = s.items[0]?.color ? resolveAccent(s.items[0].color, s.dark ?? false) : "#D64541";
  return (
    <AbsoluteFill>
      <PaperBg frame={f} dark={s.dark} driftFrom={s.start} driftTo={s.end} />
      {/* photo: left 60% */}
      {isCutout ? (
        <SubjectCutout
          id={`as-${s.start}`}
          src={staticFile(`sanderson/cutouts/${imgName.replace(/\.(png|jpg|jpeg)$/, ".png")}`)}
          x={32} y={48} width={48} rotate={-1.5}
          entrance={s.start + 0.2} from="left"
          tone="saturate(1.2) contrast(1.15) brightness(0.95)"
          offsetStroke halftone halftoneDark={s.dark} z={4}
        />
      ) : (
        <PhotoCard
          id={`as-${s.start}`}
          src={staticFile(`sanderson/images/${imgName}`)}
          x={32} y={48} width={48} aspect={1.2} rotate={-1}
          seed={5 + Math.round(s.start)}
          entrance={s.start + 0.2} from="left"
        />
      )}
      {/* accent divider bar at x=62 */}
      <div
        style={{
          position: "absolute",
          left: "62%",
          top: "18%",
          width: 3,
          height: "64%",
          background: accent,
          opacity: 0.85,
          zIndex: 3,
        }}
      />
      {/* text rail: right 40%, stacked */}
      {s.items.map((it, i) => (
        <ItemText
          key={i}
          item={it}
          sceneStart={s.start}
          sceneEnd={s.end}
          dark={s.dark}
          y={22 + i * 20}
          align="right"
        />
      ))}
    </AbsoluteFill>
  );
};

// layouts/full-bleed.tsx â€” NEW (draft, from gemini_vox mosaic research)
// Photo fills 100% of frame as background + plaque text overlay bottom-third.
// Research evidence: gemini_vox t=15/30s = full-bleed photo (nÃ¢u/Ä‘á» bÃ£o hÃ²a),
// sat_ratio 0.199 (highest of all refs). Photo IS the background â€” no paper card.
//
// Layout:
//   layer 0: Img full-bleed, object-fit cover, saturate(1.15) â€” the photo is bg
//   layer 1: dark gradient overlay bottom 50% (for text readability)
//   layer 2: plaque text items, bottom-third, left-aligned
//
// Best for: scenes where the image IS the point (landscape, atmosphere, archival)
import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { ItemText } from "../primitives";
import type { Scene } from "../types";

export const FullBleed: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame();
  const imgName = s.img![0];
  return (
    <AbsoluteFill>
      {/* layer 0: full-bleed photo = background */}
      <Img
        src={staticFile(`sanderson/images/${imgName}`)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          filter: "saturate(1.15) contrast(1.1) brightness(0.85)",
        }}
      />
      {/* layer 1: gradient for readability (bottom 55% darkens) */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.4) 35%, transparent 60%)",
        }}
      />
      {/* layer 2: plaque text, bottom-third, left-aligned */}
      {s.items.map((it, i) => (
        <ItemText
          key={i}
          item={it}
          sceneStart={s.start}
          sceneEnd={s.end}
          dark={true}
          y={60 + i * 14}
          align="left"
        />
      ))}
    </AbsoluteFill>
  );
};

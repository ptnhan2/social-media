// layouts/hero-only.tsx — NEW: 1 large element centered, NO text (element_count=1, composition=single-focal)
// Research: hyperframes "primary visual ≥ 40% of canvas" — hero dominates, nothing else
import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { PaperBg, SubjectCutout, CUTOUT_OK } from "../primitives";
import type { Scene } from "../types";

export const HeroOnly: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame();
  const imgName = s.img?.[0] || "scene-4.png";
  const isCutout = CUTOUT_OK.includes(imgName);
  return (
    <AbsoluteFill>
      <PaperBg frame={f} dark={s.dark} driftFrom={s.start} driftTo={s.end} />
      {isCutout ? (
        <SubjectCutout
          id={`hero-${s.start}`}
          src={staticFile(`sanderson/cutouts/${imgName.replace(/\.(png|jpg|jpeg)$/, ".png")}`)}
          x={50} y={48} width={70} rotate={0}
          entrance={s.start + 0.2} from="left"
          tone="saturate(1.2) contrast(1.15) brightness(0.95)"
          offsetStroke offset={10} halftone halftoneDark={s.dark} z={4}
        />
      ) : (
        <Img src={staticFile(`sanderson/images/${imgName}`)} style={{
          position: "absolute", left: "50%", top: "48%",
          width: "70%", transform: "translate(-50%,-50%)",
          objectFit: "contain",
          filter: "saturate(1.15) contrast(1.1)",
        }} />
      )}
    </AbsoluteFill>
  );
};

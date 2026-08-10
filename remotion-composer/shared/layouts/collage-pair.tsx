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

export const CollageView: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame();
  const main = s.img![0];
  const small = s.img![1];
  const mainCut = CUTOUT_OK.includes(main);
  const smallCut = small ? CUTOUT_OK.includes(small) : false;
  const mainItems = s.items.slice(0, 2);
  const subItems = s.items.slice(2);
  return (
    <AbsoluteFill>
      <PaperBg frame={f} />
      {mainCut ? (
        <SubjectCutout id={`cg1-${s.start}`} src={staticFile(`sanderson/cutouts/${main.replace(/\.(png|jpg|jpeg)$/, ".png")}`)} x={38} y={44} width={42} rotate={-2.4} entrance={s.start + 0.2} from="left" />
      ) : (
        <PhotoCard id={`cg1-${s.start}`} src={IMG(main)} x={38} y={44} width={44} aspect={1.1} rotate={-1.5} seed={19} entrance={s.start + 0.2} from="left" shape="circle" />
      )}
      {small ? (
        smallCut ? (
          <SubjectCutout id={`cg2-${s.start}`} src={staticFile(`sanderson/cutouts/${small.replace(/\.(png|jpg|jpeg)$/, ".png")}`)} x={72} y={64} width={24} rotate={3} entrance={s.start + 1.0} from="right" />
        ) : (
          <PhotoCard id={`cg2-${s.start}`} src={IMG(small)} x={72} y={62} width={28} aspect={1.2} rotate={2} seed={21} entrance={s.start + 1.0} from="right" shape="hex" />
        )
      ) : null}
      <WashiTape x={10} y={16} angle={22} seed={23} />
      {mainItems.map((it, i) => (
        <ItemText key={i} item={it} sceneStart={s.start} sceneEnd={s.end} y={i === 0 ? 12 : 26} />
      ))}
      {subItems.map((it, i) => (
        <ItemText key={i} item={it} sceneStart={s.start} sceneEnd={s.end} y={68 + i * 8} align="left" />
      ))}
    </AbsoluteFill>
  );
};

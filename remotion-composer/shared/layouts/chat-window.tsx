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

export const ChatView: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame();
  const mid = s.start + (s.end - s.start) * 0.5;
  const last = s.items[s.items.length - 1];
  const isHighlight = last?.sub === "highlight";
  return (
    <AbsoluteFill>
      <PaperBg frame={f} />
      {/* human line (first item) */}
      <TornFrame id={`ch1-${s.start}`} x={50} y={34} width={46} aspect={4.4} rotate={-1} seed={3} innerPad={3} entrance={s.start + 0.2} from="left">
        <div style={{ fontFamily: INTER, fontWeight: 700, fontSize: 32, color: INK, display: "flex", alignItems: "center", height: "100%", paddingLeft: "4%" }}>
          <span style={{ fontFamily: MONO, fontSize: 16, color: "#8A8F94", marginRight: 14 }}>you</span>
          {s.items[0]?.text}
        </div>
      </TornFrame>
      {/* ai line (last item) */}
      <TornFrame id={`ch2-${s.start}`} x={50} y={60} width={52} aspect={4.4} rotate={1.1} seed={9} innerPad={3} entrance={mid} from="right">
        <div style={{ position: "relative", fontFamily: MONO, fontSize: 26, color: INK, display: "flex", alignItems: "center", height: "100%", paddingLeft: "4%", lineHeight: 1.5 }}>
          <span style={{ fontFamily: MONO, fontSize: 16, color: "#8A8F94", marginRight: 14 }}>ai</span>
          {isHighlight ? <HighlightSweep start={last.at + 0.2} end={last.at + 1.2} x={-4} y={46} width={108} height={40} rotate={-0.4} dark={false} /> : null}
          <span style={{ position: "relative", zIndex: 2 }}>{last.text}</span>
        </div>
      </TornFrame>
      <MonoLabel text="chat window — 3:07 am" x={9} y={86} start={s.start + 0.4} />
    </AbsoluteFill>
  );
};

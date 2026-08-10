// layouts/quote-card.tsx — editorial quote in torn frame (researched)
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { PaperBg, TornFrame, MonoLabel, easeOut } from "../primitives";
import { useOverrides, useRegister, applyItemOv } from "../../layout-lab/src/lib/overrides";
import type { Scene } from "../types";

export const QuoteCard: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame();
  const ov = useOverrides();
  const reg = useRegister();
  const { fps } = useVideoConfig();
  const q = s.items[0];
  const attr = s.items[1];
  const y = ov.items?.[0]?.y ?? 42;
  const size = ov.items?.[0]?.size ?? 56;
  reg({ key: "item-0", x: 50, y, w: 72, h: (size / 1080) * 100 });
  const reveal = easeOut(Math.max(0, f - (s.start + 0.3) * fps), 12);
  return (
    <AbsoluteFill>
      <PaperBg frame={f} dark={s.dark} driftFrom={s.start} driftTo={s.end} />
      <div style={{ position: "absolute", left: "50%", top: `${y}%`, width: "72%", transform: `translate(-50%,-50%) scale(${0.9 + reveal * 0.1})`, opacity: reveal }}>
        <TornFrame id={`qc-${s.start}`} x={50} y={50} width={100} aspect={2.1} rotate={0} seed={11} innerPad={4} entrance={s.start + 0.2} from="none">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: size, color: ov.items?.[0]?.color ?? (s.dark ? "#F5F0E8" : "#131313"), textAlign: "center", padding: "6% 10%", lineHeight: 1.2 }}>
            “{q?.text}”
            {attr && <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 22, color: "#8A8F94", marginTop: 18 }}>— {attr.text}</div>}
          </div>
        </TornFrame>
      </div>
      <MonoLabel text="quote" x={50} y={88} start={s.start + 0.6} />
    </AbsoluteFill>
  );
};

// layouts/triptych.tsx — rule-of-thirds enumeration (researched)
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { PaperBg, easeOut, ItemText } from "../primitives";
import { useOverrides, useRegister, applyItemOv } from "../../layout-lab/src/lib/overrides";
import type { Scene } from "../types";

export const Triptych: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame();
  const ov = useOverrides();
  const reg = useRegister();
  const { fps } = useVideoConfig();
  const n = Math.max(1, s.items.length);
  const colW = 100 / n;
  return (
    <AbsoluteFill>
      <PaperBg frame={f} dark={s.dark} driftFrom={s.start} driftTo={s.end} />
      {s.items.map((it, i) => {
        const x = colW * i + colW / 2;
        const y = ov.items?.[i]?.y ?? 40;
        const size = ov.items?.[i]?.size ?? it.size;
        reg({ key: `item-${i}`, x, y, w: colW * 0.8, h: (size / 1080) * 100 });
        const reveal = easeOut(Math.max(0, f - it.at * fps), 12);
        return (
          <div key={i} style={{ position: "absolute", left: `${x}%`, top: `${y}%`, transform: "translate(-50%,-50%)", width: `${colW * 0.8}%`, opacity: reveal }}>
            <ItemText item={applyItemOv(it, ov, i)} sceneStart={s.start} sceneEnd={s.end} dark={s.dark} y={0} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

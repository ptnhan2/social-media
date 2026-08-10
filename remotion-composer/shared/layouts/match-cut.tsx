// layouts/match-cut.tsx — velocity-matched cut (researched)
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { PaperBg, easeOut } from "../primitives";
import { useOverrides, useRegister, applyItemOv } from "../../layout-lab/src/lib/overrides";
import type { Scene } from "../types";

export const MatchCut: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame();
  const ov = useOverrides();
  const reg = useRegister();
  const { fps } = useVideoConfig();
  const a = s.items[0];
  const b = s.items[1];
  const k = easeOut(Math.max(0, f - (s.start + 0.3) * fps), 1.8 * fps);
  const scale = 0.7 + 0.6 * k;
  const x = ov.img?.x ?? 50;
  const y = ov.img?.y ?? 46;
  reg({ key: "img", x, y, w: 40, h: 22 });
  const cur = applyItemOv(k < 0.5 ? a : b, ov, 0);
  return (
    <AbsoluteFill>
      <PaperBg frame={f} dark={s.dark} />
      <div style={{ position: "absolute", left: `${x}%`, top: `${y}%`, transform: `translate(-50%,-50%) scale(${scale})`, textAlign: "center", zIndex: 3 }}>
        <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: ov.items?.[0]?.size ?? 120, color: cur.color || "#4FC3F7", lineHeight: 1 }}>
          {k < 0.5 ? a?.text : b?.text}
        </div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 24, color: "#8A8F94", marginTop: 10, fontStyle: "italic" }}>{k < 0.5 ? "matches…" : "…cut"}</div>
      </div>
      <div style={{ position: "absolute", left: "50%", top: "82%", transform: "translateX(-50%)", fontFamily: "'Roboto Mono', monospace", fontSize: 14, color: "#8A8F94", letterSpacing: 2, textTransform: "uppercase" }}>velocity-matched cut</div>
    </AbsoluteFill>
  );
};

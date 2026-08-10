// preview/LayoutPreview.tsx — renders any layout LIVE with applied variants.
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { LAYOUTS, OverridesProvider, useOverrides, useRegister } from "../lib/layouts";
import type { Scene } from "../../shared/types";

export type VariantConfig = {
  layoutId: string;
  scene: Scene;
  overrides?: import("../lib/overrides").Overrides;
  motion?: { from: number; to: number };
  texture?: { grain?: number; vignette?: number; halftone?: number };
  palette?: { dark?: boolean; a0?: string; a1?: string; a2?: string };
};

export const LayoutPreview: React.FC<{ config: VariantConfig }> = ({ config }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const Comp = LAYOUTS[config.layoutId];
  const overrides = config.overrides || {};
  // Propagate register from parent context (editor) — don't swallow it
  const parentRegister = useRegister();

  if (!Comp) {
    return <AbsoluteFill style={{ background: "#111", color: "#888", display: "flex", alignItems: "center", justifyContent: "center" }}>Layout "{config.layoutId}" has no code yet</AbsoluteFill>;
  }

  // Apply palette at scene level (recolor item accents)
  const pal = config.palette;
  const scene: Scene = pal
    ? { ...config.scene, dark: pal.dark ?? config.scene.dark,
        items: config.scene.items.map((it, i) => ({
          ...it,
          color: i === 0 ? (pal.a0 ?? it.color) : (pal.a1 ?? it.color),
        })) }
    : config.scene;

  // Apply motion: continuous push-in animated over the composition duration
  const motion = config.motion;
  const k = interpolate(frame, [0, Math.max(1, durationInFrames - 1)], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const scale = motion ? motion.from + (motion.to - motion.from) * k : 1;

  return (
    <AbsoluteFill style={{ background: "#0f1117" }}>
      <AbsoluteFill style={{ transform: `scale(${scale})` }}>
        <OverridesProvider value={{ overrides, register: parentRegister }}>
          <Comp s={scene} />
        </OverridesProvider>
      </AbsoluteFill>
      {config.texture ? (
        <AbsoluteFill style={{ pointerEvents: "none", opacity: config.texture.grain ?? 0.15, mixBlendMode: "overlay" }}>
          <svg width="100%" height="100%">
            <filter id="previewGrain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" /></filter>
            <rect width="100%" height="100%" filter="url(#previewGrain)" />
          </svg>
        </AbsoluteFill>
      ) : null}
      {config.texture?.vignette ? (
        <AbsoluteFill style={{ pointerEvents: "none", background: `radial-gradient(ellipse at 50% 45%, transparent 58%, rgba(0,0,0,${config.texture.vignette}) 100%)` }} />
      ) : null}
    </AbsoluteFill>
  );
};

// lib/layouts.ts — import map layoutId → Remotion component (v4: researched types only)
import React from "react";
import { Triptych } from "../../../shared/layouts/triptych";
import { QuoteCard } from "../../../shared/layouts/quote-card";
import { TimelineStrip } from "../../../shared/layouts/timeline-strip";
import { SplitScreenComparison } from "../../../shared/layouts/split-screen-comparison";
import { LayeredDepth } from "../../../shared/layouts/layered-depth";
import { FocalPointZoom } from "../../../shared/layouts/focal-point-zoom";
import { MatchCut } from "../../../shared/layouts/match-cut";
import type { Scene } from "../../../shared/types";

export type LayoutComponent = React.FC<{ s: Scene }>;

export const LAYOUTS: Record<string, LayoutComponent> = {
  "triptych": Triptych,
  "quote-card": QuoteCard,
  "timeline-strip": TimelineStrip,
  "split-screen-comparison": SplitScreenComparison,
  "layered-depth": LayeredDepth,
  "focal-point-zoom": FocalPointZoom,
  "match-cut": MatchCut,
};

export type { Overrides } from "./overrides";
export { OverridesProvider, useOverrides, useRegister, type ElementGeom } from "./overrides";

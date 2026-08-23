/**
 * Character presence grammar — PURE module (no React/remotion imports).
 * Spec: docs/CHARACTER-PRESENCE-SPEC.md
 * Shared by treatments.tsx (render path) and treatmentElements.ts (projection)
 * so both paths resolve the SAME presence config for a beat.
 */

export type PresencePose = "none" | "present" | "think" | "point-right" | "celebrate";
export type PresencePosition = "thirds-tl" | "thirds-tr" | "thirds-bl" | "thirds-br" | "edge-l-in" | "edge-r-in" | "center" | "below-title" | "beside-content" | "lower-third";
export type PresenceMotion = "slide-l" | "slide-r" | "slide-u" | "slide-d" | "pop" | "jump-in" | "drop-in" | "fade-scale" | "peek";
export type PresenceSize = "chip" | "small" | "medium" | "half" | "full";
export type PresenceTiming = "with-title" | "after-title" | "on-emphasis" | "persistent";

export type CharacterPresenceConfig = {
  pose?: PresencePose;
  position?: PresencePosition;
  motion?: PresenceMotion;
  size?: PresenceSize;
  timing?: PresenceTiming;
  startSec?: number;
  opacity?: number;
  enabled?: boolean;
};

export const PRESENCE_HEIGHT: Record<PresenceSize, number> = { chip: 130, small: 216, medium: 378, half: 594, full: 972 };

/** anchor = center of the character box, % of frame (1920x1080). */
export const PRESENCE_ANCHOR: Record<PresencePosition, { left: number; top: number }> = {
  "thirds-tl": { left: 27, top: 24 },
  "thirds-tr": { left: 73, top: 24 },
  "thirds-bl": { left: 27, top: 76 },
  "thirds-br": { left: 73, top: 74 },
  "edge-l-in": { left: 13, top: 55 },
  "edge-r-in": { left: 87, top: 55 },
  center: { left: 50, top: 48 },
  "below-title": { left: 50, top: 64 },
  "beside-content": { left: 85, top: 44 },
  "lower-third": { left: 50, top: 82 },
};

/** Context mapping (spec §3): narrative keyword → presence config. */
export const CONTEXT_PRESENCE: { match: RegExp; config: CharacterPresenceConfig }[] = [
  { match: /problem|false|wrong|fail/i, config: { pose: "think", position: "thirds-tr", motion: "slide-u", size: "small", timing: "after-title" } },
  { match: /reframe|concept|unit|idea|refocus/i, config: { pose: "present", position: "beside-content", motion: "pop", size: "medium", timing: "after-title" } },
  { match: /process|how|workflow|step|repeatable/i, config: { pose: "point-right", position: "edge-l-in", motion: "slide-r", size: "medium", timing: "after-title" } },
  { match: /compare|choice|versus|or\b/i, config: { pose: "point-right", position: "thirds-bl", motion: "peek", size: "small", timing: "after-title" } },
  { match: /failure|mistake|wrong way|avoid/i, config: { pose: "think", position: "thirds-br", motion: "drop-in", size: "small", timing: "on-emphasis" } },
  { match: /rule|deliver|conclusion|resolve|win|usable/i, config: { pose: "celebrate", position: "center", motion: "jump-in", size: "half", timing: "on-emphasis" } },
  { match: /reflect|evidence|context|show/i, config: { pose: "think", position: "lower-third", motion: "fade-scale", size: "medium", timing: "after-title" } },
];

export const DEFAULT_PRESENCE: Required<Omit<CharacterPresenceConfig, "enabled">> = {
  pose: "present", position: "thirds-br", motion: "fade-scale", size: "small",
  timing: "after-title", startSec: 0.7, opacity: 0.95,
};

/** Element-language motion mapping: presence motion → clip animIn preset
 *  (approximation — the editor path has a coarser animation vocabulary). */
export const PRESENCE_TO_CLIP_ANIM: Record<PresenceMotion, string> = {
  "slide-l": "slide-up",
  "slide-r": "slide-up",
  "slide-u": "slide-up",
  "slide-d": "scale",
  pop: "scale",
  "jump-in": "bounce",
  "drop-in": "bounce",
  "fade-scale": "fade",
  peek: "slide-up",
};

export type PresenceStyleLookup = (treatmentId: string) => (CharacterPresenceConfig & { enabled?: boolean }) | null;

/**
 * Resolve presence config for a beat:
 * params.characterPresence override > context mapping (narrativeFunction) >
 * defaults. The store gate (treatments.<id>.characterPresence.enabled)
 * comes through the styleLookup (render path: getStyle; projection: plain
 * store object) — pass null lookup to always enable.
 */
export const resolveCharacterPresence = (
  treatmentId: string,
  params: Record<string, unknown>,
  narrativeFunction: string,
  styleLookup?: PresenceStyleLookup,
): CharacterPresenceConfig | null => {
  if (styleLookup) {
    const storeCfg = styleLookup(treatmentId);
    if (storeCfg && storeCfg.enabled === false) return null;
  }
  const override = params.characterPresence;
  const context = CONTEXT_PRESENCE.find((entry) => entry.match.test(narrativeFunction))?.config ?? {};
  const merged: CharacterPresenceConfig = { ...DEFAULT_PRESENCE, ...context, ...(typeof override === "object" && override ? override as CharacterPresenceConfig : {}) };
  if (merged.enabled === false) return null;
  if (merged.timing === "persistent") merged.startSec = 0;
  if (merged.timing === "with-title") merged.startSec = 0.05;
  return merged;
};

/** Character asset path for a pose (public-relative). */
export const presenceAsset = (pose: PresencePose | undefined): string =>
  !pose || pose === "none"
    ? "isaacverse-final/character/head.svg"
    : `isaacverse-final/character/poses/${pose}.svg`;

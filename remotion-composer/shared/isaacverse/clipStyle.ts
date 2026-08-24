import type { ClipKeyframe, EditorClip } from "./editor";

export type OverlayStyle = {
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  opacity: number;
  scale: number;
};

export type AnimPresetId = "none" | "fade" | "slide-left" | "slide-right" | "slide-up" | "slide-down" | "scale" | "bounce" | "pop" | "spring";

const easingFns: Record<NonNullable<ClipKeyframe["easing"]>, (p: number) => number> = {
  "linear": (p) => p,
  "ease-in": (p) => p * p,
  "ease-out": (p) => 1 - (1 - p) * (1 - p),
  "ease-in-out": (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2),
};

export const keyframeValueAt = (keys: ClipKeyframe[] | undefined, timeSec: number, fallback: number): number => {
  if (!keys || keys.length === 0) return fallback;
  if (timeSec <= keys[0].t) return keys[0].v;
  const last = keys[keys.length - 1];
  if (timeSec >= last.t) return last.v;
  for (let i = 0; i < keys.length - 1; i += 1) {
    const a = keys[i];
    const b = keys[i + 1];
    if (timeSec >= a.t && timeSec <= b.t) {
      const span = Math.max(0.0001, b.t - a.t);
      const p = (timeSec - a.t) / span;
      const eased = (easingFns[b.easing ?? "linear"])(p);
      return a.v + (b.v - a.v) * eased;
    }
  }
  return fallback;
};

const keyframesOf = (clip: EditorClip, property: string): ClipKeyframe[] | undefined => {
  const record = clip.metadata.keyframes as Record<string, ClipKeyframe[]> | undefined;
  return Array.isArray(record?.[property]) ? record[property] : undefined;
};

const animProgress = (preset: string | undefined, phase: "in" | "out", timeSec: number, clipDurationSec: number, animDurationSec: number) => {
  if (!preset || preset === "none") return { active: false, p: 1 };
  const duration = Math.max(0.01, animDurationSec);
  if (phase === "in") {
    if (timeSec >= duration) return { active: false, p: 1 };
    return { active: true, p: Math.max(0, timeSec / duration) };
  }
  const endStart = clipDurationSec - duration;
  if (timeSec <= endStart) return { active: false, p: 1 };
  return { active: true, p: Math.max(0, 1 - (timeSec - endStart) / duration) };
};

export const overlayStyleAt = (clip: EditorClip, timeSec: number): OverlayStyle => {
  const md = clip.metadata;
  const clipDuration = Math.max(0.001, clip.range.endSec - clip.range.startSec);
  const localTime = Math.max(0, Math.min(clipDuration, timeSec - clip.range.startSec));
  const x = keyframeValueAt(keyframesOf(clip, "x"), localTime, typeof md.x === "number" ? md.x : 0.1);
  const y = keyframeValueAt(keyframesOf(clip, "y"), localTime, typeof md.y === "number" ? md.y : 0.1);
  const w = keyframeValueAt(keyframesOf(clip, "w"), localTime, typeof md.w === "number" ? md.w : 0.3);
  const h = keyframeValueAt(keyframesOf(clip, "h"), localTime, typeof md.h === "number" ? md.h : 0.3);
  const rotation = keyframeValueAt(keyframesOf(clip, "rotation"), localTime, typeof md.rotation === "number" ? md.rotation : 0);
  const opacity = keyframeValueAt(keyframesOf(clip, "opacity"), localTime, typeof md.opacity === "number" ? md.opacity : 1);
  let scale = keyframeValueAt(keyframesOf(clip, "scale"), localTime, typeof md.scale === "number" ? md.scale : 1);
  let offsetX = 0;
  let offsetY = 0;
  let animOpacity = 1;

  const animIn = typeof md.animIn === "string" ? md.animIn : undefined;
  const animOut = typeof md.animOut === "string" ? md.animOut : undefined;
  const animDuration = typeof md.animDurationSec === "number" ? md.animDurationSec : 0.5;

  const inState = animProgress(animIn, "in", localTime, clipDuration, animDuration);
  const outState = animProgress(animOut, "out", localTime, clipDuration, animDuration);

  const applyPreset = (preset: string, p: number) => {
    const inv = 1 - p;
    switch (preset) {
      case "fade": animOpacity = Math.min(animOpacity, p); break;
      case "slide-left": offsetX -= inv * 0.5; break;
      case "slide-right": offsetX += inv * 0.5; break;
      case "slide-up": offsetY += inv * 0.4; break;
      case "slide-down": offsetY -= inv * 0.4; break;
      case "scale": scale = Math.min(scale, p); break;
      case "pop": scale *= 1 + inv * 0.25; animOpacity = Math.min(animOpacity, p); break;
      case "bounce": {
        const b = Math.abs(Math.sin(p * Math.PI * 3)) * (1 - p);
        scale *= p + b * 0.4;
        animOpacity = Math.min(animOpacity, Math.max(0, Math.min(1, p * 1.5)));
        break;
      }
      case "spring": {
        // underdamped spring: overshoots once then settles (Remotion
        // damping 18 / stiffness 120 equivalent over the anim duration)
        const v = 1 - Math.exp(-5 * p) * Math.cos(7.5 * p);
        scale *= Math.max(0.01, v);
        animOpacity = Math.min(animOpacity, Math.max(0, Math.min(1, p * 2)));
        break;
      }
      default: break;
    }
  };
  if (inState.active && animIn) applyPreset(animIn, inState.p);
  if (outState.active && animOut) applyPreset(animOut, outState.p);

  return { x: x + offsetX, y: y + offsetY, w, h, rotation, opacity: Math.max(0, Math.min(1, opacity * animOpacity)), scale };
};

export const clipFilterCss = (filter: unknown): string | undefined => {
  if (typeof filter !== "string" || !filter || filter === "none") return undefined;
  const presets: Record<string, string> = {
    "blur": "blur(4px)",
    "sharpen": "contrast(1.15) saturate(1.1)",
    "vignette": "contrast(1.05) brightness(0.96)",
    "grayscale": "grayscale(1)",
    "warm": "sepia(0.25) saturate(1.15)",
    "cool": "hue-rotate(12deg) saturate(1.05)",
    "film": "sepia(0.18) contrast(1.08) brightness(0.98)",
    "bw": "grayscale(1) contrast(1.1)",
  };
  return presets[filter] || undefined;
};

export const SPEED_PRESETS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 4];

export const ANIM_PRESETS: { id: AnimPresetId; label: string }[] = [
  { id: "spring", label: "Spring (overshoot)" },
  { id: "none", label: "None" },
  { id: "fade", label: "Fade" },
  { id: "slide-left", label: "Slide left" },
  { id: "slide-right", label: "Slide right" },
  { id: "slide-up", label: "Slide up" },
  { id: "slide-down", label: "Slide down" },
  { id: "scale", label: "Scale" },
  { id: "bounce", label: "Bounce" },
  { id: "pop", label: "Pop" },
];

export const EFFECT_PRESETS: { id: string; label: string }[] = [
  { id: "none", label: "None" },
  { id: "blur", label: "Blur" },
  { id: "sharpen", label: "Sharpen" },
  { id: "vignette", label: "Vignette" },
  { id: "grayscale", label: "Grayscale" },
];

export const FILTER_PRESETS: { id: string; label: string }[] = [
  { id: "none", label: "None" },
  { id: "warm", label: "Warm" },
  { id: "cool", label: "Cool" },
  { id: "film", label: "Film" },
  { id: "bw", label: "B&W" },
];

export const TRANSITION_PRESETS: { id: string; label: string }[] = [
  { id: "fade", label: "Fade" },
  { id: "flash", label: "Flash" },
  { id: "blur", label: "Blur" },
  { id: "light-leak", label: "Light leak" },
];

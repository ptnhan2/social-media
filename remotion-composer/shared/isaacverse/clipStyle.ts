import type { ClipKeyframe, EditorClip } from "./editor";

export type OverlayStyle = {
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  opacity: number;
  scale: number;
  /** Extra horizontal scale factor (width wipe animations). */
  scaleX: number;
};

export type AnimPresetId = "none" | "fade" | "slide-left" | "slide-right" | "slide-up" | "slide-down" | "scale" | "bounce" | "pop" | "spring" | "fade-slide-up" | "spring-slide-up" | "p-slide-l" | "p-slide-r" | "p-slide-u" | "p-slide-d" | "p-pop" | "p-jump-in" | "p-drop-in" | "p-peek" | "p-fade-scale";

// Frame size constants: slide/presence offsets are baked as frame px (the
// treatments use px offsets) and converted to fractions here.
const FRAME_W = 1920;
const FRAME_H = 1080;

export type SpringConfig = { damping?: number; mass?: number; stiffness?: number; overshootClamping?: boolean };

const DEFAULT_SPRING: Required<SpringConfig> = { damping: 10, mass: 1, stiffness: 100, overshootClamping: false };

const easeCubicOut = (p: number) => 1 - Math.pow(1 - p, 3);

/** Multi-point interpolate with per-segment easing (Remotion interpolate
 * semantics: the easing applies inside the segment containing the input). */
export const interpolatePts = (p: number, input: number[], output: number[], easing: (local: number) => number = easeCubicOut): number => {
  if (p <= input[0]) return output[0];
  const last = input.length - 1;
  if (p >= input[last]) return output[last];
  for (let i = 0; i < last; i += 1) {
    if (p >= input[i] && p <= input[i + 1]) {
      const span = input[i + 1] - input[i];
      const local = span > 0 ? (p - input[i]) / span : 1;
      return output[i] + (output[i + 1] - output[i]) * easing(local);
    }
  }
  return output[last];
};

// ---- Remotion spring EXACT PORT (remotion/dist/cjs/spring/*) ----
// Ported bit-for-bit so the editor render path reproduces Remotion's
// spring() output without importing the remotion package: clipStyle must stay
// importable from node (vitest, esbuild CLI bundles) and the Composer UI.
// Source of truth: treatments.tsx entrance physics calls Remotion's spring —
// any drift here shows up as an E2 parity pixel diff.

interface SpringAnim {
  toValue: number;
  lastTimestamp: number;
  current: number;
  velocity: number;
  prevPosition: number;
}

const springAdvance = (animation: SpringAnim, now: number, config: Required<SpringConfig>): SpringAnim => {
  const { toValue, lastTimestamp, current, velocity } = animation;
  const deltaTime = Math.min(now - lastTimestamp, 64);
  const c = config.damping;
  const m = config.mass;
  const k = config.stiffness;
  const v0 = -velocity;
  const x0 = toValue - current;
  const zeta = c / (2 * Math.sqrt(k * m));
  const omega0 = Math.sqrt(k / m);
  const omega1 = omega0 * Math.sqrt(1 - zeta ** 2);
  const t = deltaTime / 1000;
  const sin1 = Math.sin(omega1 * t);
  const cos1 = Math.cos(omega1 * t);
  const underDampedEnvelope = Math.exp(-zeta * omega0 * t);
  const underDampedFrag1 = underDampedEnvelope * (sin1 * ((v0 + zeta * omega0 * x0) / omega1) + x0 * cos1);
  const underDampedPosition = toValue - underDampedFrag1;
  const underDampedVelocity = zeta * omega0 * underDampedFrag1 - underDampedEnvelope * (cos1 * (v0 + zeta * omega0 * x0) - omega1 * x0 * sin1);
  const criticallyDampedEnvelope = Math.exp(-omega0 * t);
  const criticallyDampedPosition = toValue - criticallyDampedEnvelope * (x0 + (v0 + omega0 * x0) * t);
  const criticallyDampedVelocity = criticallyDampedEnvelope * (v0 * (t * omega0 - 1) + t * x0 * omega0 * omega0);
  return {
    toValue,
    prevPosition: current,
    lastTimestamp: now,
    current: zeta < 1 ? underDampedPosition : criticallyDampedPosition,
    velocity: zeta < 1 ? underDampedVelocity : criticallyDampedVelocity,
  };
};

const springCalculation = (frame: number, fps: number, config: SpringConfig): number => {
  const cfg = { ...DEFAULT_SPRING, ...config };
  let animation: SpringAnim = { lastTimestamp: 0, current: 0, toValue: 1, velocity: 0, prevPosition: 0 };
  const frameClamped = Math.max(0, frame);
  const unevenRest = frameClamped % 1;
  for (let f = 0; f <= Math.floor(frameClamped); f += 1) {
    if (f === Math.floor(frameClamped)) f += unevenRest;
    const time = (f / fps) * 1000;
    animation = springAdvance(animation, time, cfg);
  }
  return animation.current;
};

const measureSpringCache = new Map<string, number>();

const measureSpring = (fps: number, config: SpringConfig, threshold = 0.005): number => {
  const key = [fps, config.damping, config.mass, config.stiffness, config.overshootClamping, threshold].join("-");
  const cached = measureSpringCache.get(key);
  if (cached !== undefined) return cached;
  let frame = 0;
  let finishedFrame = 0;
  let current = springCalculation(frame, fps, config);
  let difference = Math.abs(current - 1);
  while (difference >= threshold) {
    frame += 1;
    current = springCalculation(frame, fps, config);
    difference = Math.abs(current - 1);
  }
  finishedFrame = frame;
  for (let i = 0; i < 20; i += 1) {
    frame += 1;
    current = springCalculation(frame, fps, config);
    difference = Math.abs(current - 1);
    if (difference >= threshold) {
      i = 0;
      finishedFrame = frame + 1;
    }
  }
  measureSpringCache.set(key, finishedFrame);
  return finishedFrame;
};

/** Exact port of Remotion spring() incl. the durationInFrames stretch:
 * time is compressed by naturalDuration/durationInFrames and the value
 * clamps to 1 after durationInFrames. */
export const remotionSpring = (frame: number, fps: number, config: SpringConfig, durationInFrames?: number): number => {
  if (durationInFrames !== undefined && durationInFrames > 0) {
    if (frame > durationInFrames) return 1;
    const natural = measureSpring(fps, config);
    const processed = frame / (durationInFrames / natural);
    return springCalculation(processed, fps, config);
  }
  return springCalculation(frame, fps, config);
};

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
  if (timeSec >= last.t) return last.t === keys[0].t ? keys[0].v : last.v;
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

export const overlayStyleAt = (clip: EditorClip, timeSec: number, fps = 30): OverlayStyle => {
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
  const animEasing = md.animEasing === "cubic-out" ? easeCubicOut : (p: number) => p;
  const slideFrac = (px: number, axis: "x" | "y") => px / (axis === "x" ? FRAME_W : FRAME_H);

  const inState = animProgress(animIn, "in", localTime, clipDuration, animDuration);
  const outState = animProgress(animOut, "out", localTime, clipDuration, animDuration);

  const applyPreset = (preset: string, p: number) => {
    const inv = 1 - p;
    const pe = animEasing(p);
    switch (preset) {
      case "fade": animOpacity = Math.min(animOpacity, pe); break;
      case "slide-left": offsetX -= inv * (typeof md.animSlidePx === "number" ? slideFrac(md.animSlidePx, "x") : 0.5); break;
      case "slide-right": offsetX += inv * (typeof md.animSlidePx === "number" ? slideFrac(md.animSlidePx, "x") : 0.5); break;
      case "slide-up": offsetY += inv * (typeof md.animSlidePx === "number" ? slideFrac(md.animSlidePx, "y") : 0.4); break;
      case "slide-down": offsetY -= inv * (typeof md.animSlidePx === "number" ? slideFrac(md.animSlidePx, "y") : 0.4); break;
      case "fade-slide-up": {
        // title-block entrance (treatments): opacity + translateY(slidePx),
        // BOTH driven by the eased progress (treatment: interpolate cubic-out)
        const slidePx = typeof md.animSlidePx === "number" ? md.animSlidePx : 18;
        offsetY += (1 - pe) * slideFrac(slidePx, "y");
        animOpacity = Math.min(animOpacity, pe);
        break;
      }
      case "spring-slide-up": {
        // ProcessTimeline step entrance: translateY((1-s)*slidePx) + opacity s,
        // s = exact Remotion spring (config via animSpring)
        const cfgS = md.animSpring as { damping?: number; stiffness?: number; mass?: number; durationSec?: number } | undefined;
        const sv = remotionSpring(
          localTime * fps,
          fps,
          cfgS && typeof cfgS.stiffness === "number" ? { damping: cfgS.damping, stiffness: cfgS.stiffness, mass: cfgS.mass } : { damping: 18, stiffness: 150 },
          typeof cfgS?.durationSec === "number" ? Math.max(1, Math.round(cfgS.durationSec * fps)) : Math.max(1, Math.round(animDuration * fps)),
        );
        const slidePx = typeof md.animSlidePx === "number" ? md.animSlidePx : 28;
        offsetY += (1 - sv) * slideFrac(slidePx, "y");
        animOpacity = Math.min(animOpacity, sv);
        break;
      }
      case "scale": scale = Math.min(scale, pe); break;
      case "pop": scale *= 1 + inv * 0.25; animOpacity = Math.min(animOpacity, pe); break;
      case "bounce": {
        const b = Math.abs(Math.sin(p * Math.PI * 3)) * (1 - p);
        scale *= p + b * 0.4;
        animOpacity = Math.min(animOpacity, Math.max(0, Math.min(1, p * 1.5)));
        break;
      }
      case "spring": {
        // Exact Remotion spring when the projection baked a config (E2 parity);
        // legacy analytic fallback keeps UI-created clips animating as before.
        const cfg = md.animSpring as { damping?: number; stiffness?: number; mass?: number; durationSec?: number; from?: number } | undefined;
        if (cfg && typeof cfg === "object" && typeof cfg.stiffness === "number") {
          const s = remotionSpring(
            localTime * fps,
            fps,
            { damping: cfg.damping, stiffness: cfg.stiffness, mass: cfg.mass },
            typeof cfg.durationSec === "number" ? Math.max(1, Math.round(cfg.durationSec * fps)) : undefined,
          );
          const from = typeof cfg.from === "number" ? cfg.from : 0.82;
          scale = from + (1 - from) * s;
          animOpacity = Math.min(animOpacity, s);
        } else {
          const v = 1 - Math.exp(-5 * p) * Math.cos(7.5 * p);
          scale *= Math.max(0.01, v);
          animOpacity = Math.min(animOpacity, Math.max(0, Math.min(1, p * 2)));
        }
        break;
      }
      // ---- presence-exact presets (mirror presenceEntrance in treatments.tsx) ----
      // movement uses cubic-out eased progress (ALWAYS — the treatment hardcodes
      // Easing.out(cubic)); opacity ramps use LINEAR p (treatment math)
      case "p-slide-l": offsetX -= (1 - easeCubicOut(p)) * slideFrac(70, "x"); animOpacity = Math.min(animOpacity, Math.min(1, p * 2)); break;
      case "p-slide-r": offsetX += (1 - easeCubicOut(p)) * slideFrac(70, "x"); animOpacity = Math.min(animOpacity, Math.min(1, p * 2)); break;
      case "p-slide-u": offsetY += (1 - easeCubicOut(p)) * slideFrac(70, "y"); animOpacity = Math.min(animOpacity, Math.min(1, p * 2)); break;
      case "p-slide-d": offsetY -= (1 - easeCubicOut(p)) * slideFrac(70, "y"); animOpacity = Math.min(animOpacity, Math.min(1, p * 2)); break;
      case "p-pop": {
        const pop = remotionSpring(localTime * fps, fps, { damping: 9, stiffness: 170, mass: 0.7 }, Math.max(1, Math.round(animDuration * fps)));
        scale = 0.4 + 0.6 * pop;
        animOpacity = Math.min(animOpacity, Math.min(1, p * 3));
        break;
      }
      case "p-jump-in": {
        const jump = interpolatePts(p, [0, 0.55, 0.8, 1], [0, 1.12, 0.94, 1]);
        offsetY += (1 - jump) * slideFrac(46, "y");
        scale *= 0.86 + 0.14 * jump;
        animOpacity = Math.min(animOpacity, Math.min(1, p * 3));
        break;
      }
      case "p-drop-in": {
        const bounce = interpolatePts(p, [0, 0.6, 0.8, 1], [0, 1.06, 0.97, 1]);
        offsetY -= (1 - bounce) * slideFrac(90, "y");
        animOpacity = Math.min(animOpacity, Math.min(1, p * 3));
        break;
      }
      case "p-peek": offsetX -= (1 - easeCubicOut(p)) * 0.46 * w; animOpacity = Math.min(animOpacity, Math.min(1, p * 4)); break;
      case "p-fade-scale": scale *= 0.85 + 0.15 * easeCubicOut(p); animOpacity = Math.min(animOpacity, easeCubicOut(p)); break;
      default: break;
    }
  };
  if (inState.active && animIn) applyPreset(animIn, inState.p);
  if (outState.active && animOut) applyPreset(animOut, outState.p);

  // Continuous pulse after reveal (DiagramNodeView activePulse): multiplies
  // the group scale — needs fps, frame = localTime * fps.
  const pulse = md.pulse as { amp?: number; radPerFrame?: number } | undefined;
  if (pulse && typeof pulse === "object" && typeof pulse.amp === "number" && typeof pulse.radPerFrame === "number") {
    scale *= 1 + pulse.amp * Math.sin(localTime * fps * pulse.radPerFrame);
  }

  // Width wipe (ChapterCard accent line): independent of animIn — the line
  // wipes 0 -> 1 over its own window while the block entrance (animIn)
  // fades+scales the whole element.
  let scaleX = 1;
  const wipe = md.wipeX as { startSec?: number; durationSec?: number } | undefined;
  if (wipe && typeof wipe === "object") {
    const wStart = typeof wipe.startSec === "number" ? wipe.startSec : 0;
    const wDur = typeof wipe.durationSec === "number" ? Math.max(0.001, wipe.durationSec) : 0.5;
    const wp = Math.max(0, Math.min(1, (localTime - wStart) / wDur));
    scaleX = easeCubicOut(wp);
  }

  return { x: x + offsetX, y: y + offsetY, w, h, rotation, opacity: Math.max(0, Math.min(1, opacity * animOpacity)), scale, scaleX };
};

export const clipFilterCss = (filter: unknown): string | undefined => {
  if (typeof filter !== "string" || !filter || filter === "none") return undefined;
  // Raw CSS passthrough (e.g. "drop-shadow(...) drop-shadow(...)"): the
  // projection bakes treatment-exact filters; preset keys stay supported.
  if (filter.includes("(")) return filter;
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

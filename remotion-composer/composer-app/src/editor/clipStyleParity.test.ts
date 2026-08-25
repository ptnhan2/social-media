import { describe, expect, it } from "vitest";
import { estimateNodeBoxHeight, generateTreatmentElements, NODE_BOX } from "../../../shared/isaacverse/treatmentElements";
import { overlayStyleAt, remotionSpring, clipFilterCss, interpolatePts } from "../../../shared/isaacverse/clipStyle";
import { PRESENCE_ASPECT, PRESENCE_TO_CLIP_ANIM } from "../../../shared/isaacverse/characterPresence";
import type { EditorClip } from "../../../shared/isaacverse/editor";

const makeClip = (metadata: Record<string, unknown>, range: { startSec: number; endSec: number } = { startSec: 0, endSec: 3 }): EditorClip => ({
  id: "test-clip",
  kind: "element",
  trackId: "visual-1",
  range,
  label: "test",
  source: {},
  linkedClipIds: [],
  locked: false,
  muted: false,
  hidden: false,
  metadata,
});

describe("remotionSpring port (E2 parity — must match Remotion's spring exactly)", () => {
  it("settles to 1 and stays clamped after durationInFrames", () => {
    const cfg = { damping: 2, stiffness: 140, mass: 0.8 };
    const dur = 23; // 0.75s @ 30fps
    expect(remotionSpring(0, 30, cfg, dur)).toBe(0);
    const settled = remotionSpring(dur + 10, 30, cfg, dur);
    expect(settled).toBe(1);
  });

  it("is underdamped (overshoots) for the store entrance config damping 2", () => {
    const cfg = { damping: 2, stiffness: 140, mass: 0.8 };
    let max = 0;
    for (let f = 0; f <= 23; f += 1) max = Math.max(max, remotionSpring(f, 30, cfg, 23));
    expect(max).toBeGreaterThan(1.05); // damping 2 → visible overshoot
  });

  it("converges for a well-damped config with at most a tiny overshoot", () => {
    const cfg = { damping: 18, stiffness: 140, mass: 0.8 }; // ζ ≈ 0.85 < 1
    let max = 0;
    let prev = -1;
    for (let f = 0; f <= 60; f += 1) {
      const v = remotionSpring(f, 30, cfg);
      max = Math.max(max, v);
      expect(v).toBeGreaterThanOrEqual(prev - 0.02); // small settle wobble only
      prev = v;
    }
    expect(prev).toBeCloseTo(1, 2);
    expect(max).toBeLessThanOrEqual(1.02);
  });

  it("returns 0 for negative/zero frames", () => {
    expect(remotionSpring(-5, 30, { damping: 10, stiffness: 100 })).toBe(0);
  });
});

describe("overlayStyleAt parity features", () => {
  it("spring preset with animSpring bakes from-scale + spring opacity", () => {
    const clip = makeClip({
      x: 0.25, y: 0.5, w: 0.1, h: 0.05, animIn: "spring", animDurationSec: 0.75,
      animSpring: { damping: 18, stiffness: 140, mass: 0.8, durationSec: 0.75, from: 0.82 },
    });
    const s0 = overlayStyleAt(clip, 0, 30);
    expect(s0.scale).toBeCloseTo(0.82, 3); // starts at `from`
    expect(s0.opacity).toBeCloseTo(0, 3);
    const sEnd = overlayStyleAt(clip, 2.9, 30);
    expect(sEnd.scale).toBeCloseTo(1, 2); // settles at 1
    expect(sEnd.opacity).toBeCloseTo(1, 2);
  });

  it("pulse multiplies scale continuously (activePulse replication)", () => {
    const clip = makeClip({
      x: 0.25, y: 0.5, w: 0.1, h: 0.05,
      pulse: { amp: 0.08, radPerFrame: 1 / 5 },
    });
    const s = overlayStyleAt(clip, 2.5, 30); // frame 75 → sin(15) ≈ 0.65
    expect(s.scale).toBeCloseTo(1 + 0.08 * Math.sin(75 / 5), 4);
  });

  it("fade-slide-up applies eased opacity + translateY(px) offset", () => {
    const clip = makeClip({
      x: 0.1, y: 0.1, w: 0.4, h: 0.03, animIn: "fade-slide-up", animDurationSec: 0.55,
      animSlidePx: 18, animEasing: "cubic-out",
    });
    const half = overlayStyleAt(clip, 0.275, 30); // p=0.5 → cubic-out 0.875
    expect(half.opacity).toBeCloseTo(0.875, 3);
    expect(half.y).toBeCloseTo(0.1 + (1 - 0.875) * (18 / 1080), 5);
    const done = overlayStyleAt(clip, 1.0, 30);
    expect(done.opacity).toBeCloseTo(1, 5);
    expect(done.y).toBeCloseTo(0.1, 5);
  });

  it("spring-slide-up: spring-driven translateY + opacity (process steps)", () => {
    const clip = makeClip({
      x: 0.5, y: 0.4, w: 0.09, h: 0.04, animIn: "spring-slide-up", animDurationSec: 0.6,
      animSlidePx: 28, animSpring: { damping: 18, stiffness: 150, mass: 1, durationSec: 0.6, from: 1 },
    });
    const early = overlayStyleAt(clip, 0.1, 30);
    expect(early.y).toBeGreaterThan(0.4); // still below the resting spot
    expect(early.opacity).toBeLessThan(1);
    const done = overlayStyleAt(clip, 2.5, 30);
    expect(done.y).toBeCloseTo(0.4, 4);
    expect(done.opacity).toBeCloseTo(1, 3);
  });

  it("presence presets: p-slide-l moves ±70px frame-absolute with linear opacity ramp", () => {
    const clip = makeClip({ x: 0.85, y: 0.44, w: 0.15, h: 0.35, animIn: "p-slide-l", animDurationSec: 0.6 });
    const half = overlayStyleAt(clip, 0.3, 30); // p=0.5, eased = 0.875
    expect(half.x).toBeCloseTo(0.85 - (1 - 0.875) * (70 / 1920), 5);
    expect(half.opacity).toBeCloseTo(1, 3); // min(1, p*2)
    const start = overlayStyleAt(clip, 0.05, 30); // p=1/12
    expect(start.opacity).toBeCloseTo(1 / 6, 3);
  });

  it("p-pop uses spring scale 0.4 + 0.6*s", () => {
    const clip = makeClip({ x: 0.85, y: 0.44, w: 0.15, h: 0.35, animIn: "p-pop", animDurationSec: 0.6 });
    const s0 = overlayStyleAt(clip, 0, 30);
    expect(s0.scale).toBeCloseTo(0.4, 3);
    const sEnd = overlayStyleAt(clip, 2, 30);
    expect(sEnd.scale).toBeCloseTo(1, 2);
  });
});

describe("clipFilterCss raw passthrough", () => {
  it("passes raw CSS filter strings through (double drop-shadow)", () => {
    expect(clipFilterCss("drop-shadow(0 6px 22px rgba(0,0,0,0.6)) drop-shadow(0 0 26px #ff6b3533)"))
      .toBe("drop-shadow(0 6px 22px rgba(0,0,0,0.6)) drop-shadow(0 0 26px #ff6b3533)");
  });
  it("still maps preset keys", () => {
    expect(clipFilterCss("blur")).toBe("blur(4px)");
    expect(clipFilterCss("none")).toBeUndefined();
  });
});

describe("interpolatePts (Remotion interpolate semantics)", () => {
  it("applies easing inside the containing segment", () => {
    // jump-in curve [0, 0.55, 0.8, 1] -> [0, 1.12, 0.94, 1]
    expect(interpolatePts(0, [0, 0.55, 0.8, 1], [0, 1.12, 0.94, 1])).toBe(0);
    expect(interpolatePts(0.55, [0, 0.55, 0.8, 1], [0, 1.12, 0.94, 1])).toBeCloseTo(1.12, 6);
    expect(interpolatePts(1, [0, 0.55, 0.8, 1], [0, 1.12, 0.94, 1])).toBe(1);
    const mid = interpolatePts(0.275, [0, 0.55, 0.8, 1], [0, 1.12, 0.94, 1]); // half of first segment, cubic-out
    expect(mid).toBeCloseTo(1.12 * 0.875, 3);
  });
});

describe("node box estimator (DiagramNodeView DOM mirror)", () => {
  it("matches the calibrated DOM measurement for SIGNAL-style nodes", () => {
    // measured 2026-08-25 in Chromium: label 28.8, detail 17.55 → box 83.35
    const { boxH, totalH, labelH, detailH } = estimateNodeBoxHeight("Signal", "what changed");
    expect(labelH).toBeCloseTo(28.8, 2);
    expect(detailH).toBeCloseTo(17.55, 2);
    expect(boxH).toBeCloseTo(83.35, 1);
    expect(totalH).toBeCloseTo(87.35, 1);
  });

  it("wraps long detail text to multiple lines", () => {
    const oneLine = estimateNodeBoxHeight("Node", "short");
    const longDetail = "a very long detail line that definitely exceeds the two hundred thirty pixel inner width";
    const multi = estimateNodeBoxHeight("Node", longDetail);
    expect(multi.detailH).toBeGreaterThan(oneLine.detailH);
    expect(multi.boxH).toBeGreaterThan(oneLine.boxH);
  });
});

describe("semantic-diagram projection (E2 parity fields)", () => {
  const beat = {
    id: "test-beat",
    startSec: 3.5,
    durationSec: 3.5,
    narrativeFunction: "reframe the unit of editing",
    transcript: "",
    shotIds: [],
    treatment: {
      id: "semantic-diagram",
      assets: [],
      params: {
        title: "A cut is a decision",
        kicker: "the smallest useful unit",
        centerLabel: "meaning",
        nodes: [
          { id: "signal", label: "Signal", detail: "what changed", x: 24, y: 52, activeFrom: 0.2 },
          { id: "choice", label: "Choice", detail: "what stays", x: 50, y: 52, activeFrom: 0.8 },
        ],
        edges: [{ from: "signal", to: "choice", revealAt: 0.6 }],
      },
    },
  } as Parameters<typeof generateTreatmentElements>[0];

  const els = generateTreatmentElements(beat);
  const byRole = (suffix: string) => els.filter((el) => el.id.endsWith(suffix));

  it("nodes carry group origin + spring + pulse + dot, and use activeFrom timing", () => {
    const box = byRole("node-0-box")[0];
    expect(box?.groupOriginX).toBeCloseTo(0.24 * 1920, 1);
    expect(box?.animSpring?.from).toBe(0.82);
    expect(box?.pulse).toEqual({ amp: 0.08, radPerFrame: 0.2 });
    expect(box?.startSec).toBe(0.2); // activeFrom, NOT index stagger
    expect(byRole("node-0-dot")).toHaveLength(1);
    expect(byRole("node-1-box")[0]?.startSec).toBe(0.8);
  });

  it("edges are projected in viewBox percent units with store reveal duration", () => {
    const edge = byRole("edge-0")[0];
    expect(edge?.x1).toBe(24); // viewBox units, NOT px
    expect(edge?.y1).toBe(52);
    expect(edge?.x2).toBe(50);
    expect(edge?.startSec).toBe(0.6);
    expect(edge?.elementType).toBe("edge");
  });

  it("footer is right-anchored at (1850, 1035) with normal weight", () => {
    const footer = byRole("footer")[0];
    expect(footer?.x).toBeCloseTo(1350 / 1920, 4);
    expect(footer?.y).toBeCloseTo(1018.2 / 1080, 4);
    expect(footer?.fontWeight).toBe(400);
    expect(footer?.textAlign).toBe("right");
  });

  it("kicker/title use fade-slide-up group entrance and store colors", () => {
    const kicker = byRole("kicker")[0];
    expect(kicker?.animIn).toBe("fade-slide-up");
    expect(kicker?.animSlidePx).toBe(18);
    expect(kicker?.animEasing).toBe("cubic-out");
    const title = byRole("title")[0];
    expect(title?.fontFamily).toContain("Arial Black");
  });

  it("presence element uses exact-fit aspect + p-preset anim", () => {
    const presence = els.find((el) => el.id.endsWith("character-presence"));
    expect(presence).toBeDefined();
    // beat narrative "reframe the unit of editing" matches /reframe|concept|unit/
    // seed 3.5 → variant 0: present, beside-content, pop, medium
    expect(presence?.animIn).toBe(PRESENCE_TO_CLIP_ANIM.pop);
    const expectedW = 378 * PRESENCE_ASPECT.present;
    expect(presence?.w).toBeCloseTo(expectedW / 1920, 3);
    expect(String(presence?.filter)).toContain("drop-shadow(0 0 26px");
  });
});

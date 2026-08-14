import { describe, expect, it } from "vitest";
import type { ClipRange } from "../../../shared/isaacverse/editor";
import { clampClipRange, frameRangeForClip, rippleRanges, snapToFrame, splitClipRange, trimClipRange } from "./time";

describe("editor timeline time math", () => {
  it("converts a clip range to inclusive Player frames", () => {
    expect(frameRangeForClip({ startSec: 1, endSec: 2 }, 30)).toEqual({ startFrame: 30, endFrame: 59 });
  });

  it("snaps seconds to the nearest frame", () => {
    expect(snapToFrame(1.014, 30)).toBeCloseTo(1);
    expect(snapToFrame(1.018, 30)).toBeCloseTo(1.0333333333333334);
  });

  it("clamps a range to document bounds and minimum duration", () => {
    expect(clampClipRange({ startSec: -1, endSec: 0.01 }, { startSec: 0, endSec: 5 }, 0.1)).toEqual({ startSec: 0, endSec: 0.1 });
  });

  it("trims only the requested edge without crossing the other edge", () => {
    expect(trimClipRange({ startSec: 2, endSec: 6 }, "start", 4, 0.25)).toEqual({ startSec: 4, endSec: 6 });
    expect(trimClipRange({ startSec: 2, endSec: 6 }, "end", 1, 0.25)).toEqual({ startSec: 2, endSec: 2.25 });
  });

  it("splits a clip at an interior frame and rejects boundaries", () => {
    expect(splitClipRange({ startSec: 2, endSec: 6 }, 4)).toEqual([{ startSec: 2, endSec: 4 }, { startSec: 4, endSec: 6 }]);
    expect(() => splitClipRange({ startSec: 2, endSec: 6 }, 2)).toThrow("inside");
  });

  it("ripples ranges at or after a boundary while preserving earlier clips", () => {
    const ranges: ClipRange[] = [{ startSec: 0, endSec: 2 }, { startSec: 2.5, endSec: 4 }];
    expect(rippleRanges(ranges, 2, 1)).toEqual([{ startSec: 0, endSec: 2 }, { startSec: 3.5, endSec: 5 }]);
  });
});

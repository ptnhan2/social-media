import { describe, expect, it } from "vitest";
import { cameraPhaseFrames } from "../../../shared/isaacverse/motion";

describe("cameraPhaseFrames", () => {
  it("ends the camera ramp at the declared phase end", () => {
    expect(cameraPhaseFrames(3.5, { startSec: 0, durationSec: 2.8 }, 30)).toEqual({ startFrame: 0, endFrame: 84 });
  });

  it("uses the full beat when no motion phase is declared", () => {
    expect(cameraPhaseFrames(3.5, undefined, 30)).toEqual({ startFrame: 0, endFrame: 105 });
  });
});

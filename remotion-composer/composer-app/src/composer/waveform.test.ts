import { describe, expect, it } from "vitest";
import { downsampleWaveform } from "./waveform";

describe("audio waveform downsampling", () => {
  it("preserves the strongest sample in each visible bin", () => {
    expect(downsampleWaveform([0, 0.2, -0.8, 0.1, 0.4, -0.5, 0.1, 0], 4)).toEqual([0.25, 1, 0.625, 0.125]);
  });
});

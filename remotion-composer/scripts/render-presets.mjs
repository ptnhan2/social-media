export const PRESETS = {
  draft: {
    scale: "0.3333333333333333",
    concurrency: "2",
    x264Preset: "ultrafast",
    crf: "32",
  },
  master: {
    scale: "1",
    concurrency: "2",
    x264Preset: "medium",
    crf: "18",
  },
};

export const preset = (quality) => {
  if (!PRESETS[quality]) throw new Error(`Unknown render quality: ${quality}`);
  return PRESETS[quality];
};

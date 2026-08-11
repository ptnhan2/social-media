export const downsampleWaveform = (samples: ArrayLike<number>, bins: number) => {
  const count = Math.max(1, Math.floor(bins));
  const result = Array.from({ length: count }, () => 0);
  for (let index = 0; index < samples.length; index += 1) {
    const bucket = Math.min(count - 1, Math.floor(index / samples.length * count));
    result[bucket] = Math.max(result[bucket], Math.abs(Number(samples[index]) || 0));
  }
  const max = Math.max(...result, 0.0001);
  return result.map((value) => Math.max(0.08, value / max));
};

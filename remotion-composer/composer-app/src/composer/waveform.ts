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

/** RMS peaks — a real waveform silhouette. Max-per-bucket (downsampleWaveform)
 *  saturates every speech bucket after normalization and reads as solid
 *  blocks on wide clips; RMS keeps the envelope shape. */
export const waveformPeaks = (samples: ArrayLike<number>, bins: number) => {
  const count = Math.max(1, Math.floor(bins));
  const sums = new Float64Array(count);
  const counts = new Float64Array(count);
  for (let index = 0; index < samples.length; index += 1) {
    const bucket = Math.min(count - 1, Math.floor(index / samples.length * count));
    const value = Number(samples[index]) || 0;
    sums[bucket] += value * value;
    counts[bucket] += 1;
  }
  const rms = Array.from({ length: count }, (_, bucket) => Math.sqrt(sums[bucket] / Math.max(1, counts[bucket])));
  const max = Math.max(...rms, 0.0001);
  return rms.map((value) => Math.max(0.05, value / max));
};

/** Decode + peak cache keyed by resolved src — one decode per audio file no
 *  matter how many timeline clips reference it. */
const waveformCache = new Map<string, Promise<number[]>>();
let sharedContext: AudioContext | null = null;

const audioContext = (): AudioContext | null => {
  if (typeof window === "undefined") return null;
  const ctor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!ctor) return null;
  if (!sharedContext) sharedContext = new ctor();
  return sharedContext;
};

export const loadWaveformLevels = (rawSrc: string, bins: number): Promise<number[]> => {
  // timeline clip srcs are project-relative ("slug/audio/x.mp3") — the vite
  // public dir serves them from the root, so anchor them explicitly (a page
  // at a nested path would otherwise resolve them wrong).
  const src = /^([a-z]+:|\/\/|\/)/i.test(rawSrc) ? rawSrc : `/${rawSrc}`;
  const key = `${src}#${Math.round(bins)}`;
  const cached = waveformCache.get(key);
  if (cached) return cached;
  const job = (async () => {
    const context = audioContext();
    if (!context) throw new Error("no AudioContext");
    const response = await fetch(src);
    if (!response.ok) throw new Error(`audio fetch ${response.status}`);
    const buffer = await context.decodeAudioData(await response.arrayBuffer());
    return waveformPeaks(buffer.getChannelData(0), bins);
  })();
  waveformCache.set(key, job);
  job.catch(() => waveformCache.delete(key));
  return job;
};

import { Layer, Pt } from "./types";

/** Module-level image cache keyed by layer.src (URL or dataURL). */
const imageCache = new Map<string, CanvasImageSource>();

export const bridge = (cmd: Record<string, unknown>) =>
  fetch("/api/assets/bridge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
  }).then(async (r) => {
    const data = await r.json();
    if (!r.ok || data.ok === false) throw new Error(data.error || `bridge ${r.status}`);
    return data as Record<string, unknown>;
  });

export function fileUrl(p: string): string {
  let rel = p.replace(/\\/g, "/").replace(/^C:\/?/i, "");
  rel = rel.replace(/^DevWork\/social-media\//i, "");
  return `/api/assets/file?p=${encodeURIComponent(rel)}`;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageCache.set(src, img);
      resolve(img);
    };
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

export function cacheImage(src: string, el: CanvasImageSource): void {
  imageCache.set(src, el);
}

export function cachedImage(src: string): CanvasImageSource | undefined {
  return imageCache.get(src);
}

/** Get (or create) a mutable canvas holding the layer's current pixels. */
export async function getLayerCanvas(layer: Layer): Promise<HTMLCanvasElement> {
  const existing = imageCache.get(layer.src);
  if (existing instanceof HTMLCanvasElement) return existing;
  let source: CanvasImageSource;
  let sw: number;
  let sh: number;
  if (existing instanceof HTMLImageElement) {
    source = existing;
    sw = existing.naturalWidth;
    sh = existing.naturalHeight;
  } else if (existing) {
    source = existing;
    sw = (existing as unknown as HTMLCanvasElement).width;
    sh = (existing as unknown as HTMLCanvasElement).height;
  } else {
    const img = await loadImage(layer.src);
    source = img;
    sw = img.naturalWidth;
    sh = img.naturalHeight;
  }
  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(source, 0, 0);
  imageCache.set(layer.src, canvas);
  return canvas;
}

/** Erase a round stamp at each interpolated point (destination-out). */
export function eraseSegment(
  ctx: CanvasRenderingContext2D,
  from: Pt,
  to: Pt,
  size: number,
  hardness: number,
): void {
  const r = Math.max(1, size / 2);
  const dist = Math.hypot(to.x - from.x, to.y - from.y);
  const step = Math.max(1, r / 3);
  const steps = Math.max(1, Math.ceil(dist / step));
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  for (let i = 0; i <= steps; i++) {
    const t = steps === 0 ? 1 : i / steps;
    const x = from.x + (to.x - from.x) * t;
    const y = from.y + (to.y - from.y) * t;
    if (hardness >= 0.99) {
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const g = ctx.createRadialGradient(x, y, r * hardness, x, y, r);
      g.addColorStop(0, "rgba(0,0,0,1)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalAlpha = 1;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/**
 * Flood-fill selection on ImageData. Returns an alpha mask (0/255 per pixel,
 * length w*h) of pixels within tolerance of the seed color.
 */
export function floodFillMask(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  sx: number,
  sy: number,
  tolerance: number,
  contiguous: boolean,
): Uint8ClampedArray {
  const mask = new Uint8ClampedArray(w * h);
  const idx = (sy * w + sx) * 4;
  const sr = data[idx];
  const sg = data[idx + 1];
  const sb = data[idx + 2];
  const sa = data[idx + 3];
  const tol = tolerance * 2.55;

  const match = (i: number): boolean => {
    const o = i * 4;
    return (
      Math.abs(data[o] - sr) <= tol &&
      Math.abs(data[o + 1] - sg) <= tol &&
      Math.abs(data[o + 2] - sb) <= tol &&
      Math.abs(data[o + 3] - sa) <= tol
    );
  };

  if (!contiguous) {
    for (let i = 0; i < w * h; i++) if (match(i)) mask[i] = 255;
    return mask;
  }

  const stack: number[] = [sy * w + sx];
  const seen = new Uint8Array(w * h);
  while (stack.length) {
    const p = stack.pop()!;
    if (seen[p]) continue;
    seen[p] = 1;
    if (!match(p)) continue;
    mask[p] = 255;
    const x = p % w;
    const y = (p / w) | 0;
    if (x > 0) stack.push(p - 1);
    if (x < w - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - w);
    if (y < h - 1) stack.push(p + w);
  }
  return mask;
}

/** Apply an alpha mask to a canvas: erase masked pixels (mode=delete) or keep only masked (mode=keep). */
export function applyAlphaMask(
  canvas: HTMLCanvasElement,
  mask: Uint8ClampedArray,
  mode: "delete" | "keep",
): void {
  const ctx = canvas.getContext("2d")!;
  const { width: w, height: h } = canvas;
  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;
  for (let i = 0; i < w * h; i++) {
    const m = mask[i] ? 255 : 0;
    if (mode === "delete") {
      if (m) d[i * 4 + 3] = 0;
    } else {
      if (!m) d[i * 4 + 3] = 0;
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

/** Build a tinted preview canvas from an alpha mask (blue overlay). */
export function maskToPreviewCanvas(mask: Uint8ClampedArray, w: number, h: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.createImageData(w, h);
  const d = imageData.data;
  for (let i = 0; i < w * h; i++) {
    if (mask[i]) {
      d[i * 4] = 80;
      d[i * 4 + 1] = 140;
      d[i * 4 + 2] = 255;
      d[i * 4 + 3] = 110;
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/** Upload canvas pixels to the server, returns { path, src }. */
export async function uploadCanvas(canvas: HTMLCanvasElement, projectId: string): Promise<{ path: string; src: string }> {
  const dataUrl = canvas.toDataURL("image/png");
  return uploadDataUrl(dataUrl, projectId);
}

export async function uploadDataUrl(dataUrl: string, projectId: string): Promise<{ path: string; src: string }> {
  const r = await fetch("/api/assets/body", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, data: dataUrl }),
  });
  const data = await r.json();
  if (!r.ok || !data.path) throw new Error(data.error || `upload failed: ${r.status}`);
  return { path: String(data.path), src: fileUrl(String(data.path)) };
}

#!/usr/bin/env node
/**
 * DESIGN AUDIT (deterministic — "typecheck cho design", rule #20 spirit).
 * The frontier-model answer to designing without eyes: the DESIGN SYSTEM is
 * code, and this audit enforces its discipline on the studio CSS block.
 *
 * Checks (on the pp-* block of styles.css):
 * 1. Palette discipline — every hex color must be a declared token value
 *    (--pp-* custom properties) or a token-derived rgba variant.
 * 2. Type scale discipline — every font-size must be one of the scale
 *    [10, 11, 12, 13, 14, 15, 17, 24].
 * 3. Spacing discipline — every padding/margin/gap value must be a multiple
 *    of 4 (the spacing scale), allowing 0 and fractional borders.
 */
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../composer-app/src/styles.css", import.meta.url), "utf-8");
const start = css.indexOf("/* ===== Content Studio");
const end = css.indexOf("/* ===== Agent Panel");
if (start < 0 || end < 0 || end <= start) { console.error("studio CSS block not found"); process.exit(1); }
const block = css.slice(start, end);

const failures = [];

// ---- 1. palette discipline: allowed = the APP palette (v4 reuses the app's
// visual language per user directive — the studio must not invent colors the
// editor/asset-studio don't already use) + a few app-standard extras ----
const APP_PALETTE = new Set([
  "#0b0e14", "#0d1520", "#111827", "#1f2937", "#2b3647", "#12203a",
  "#d8dee9", "#b9bfcc", "#8d96a3", "#7c8797", "#6b7280", "#4b5563",
  "#2563eb", "#60a5fa", "#2dd4a0", "#f5b544", "#ff6b6b", "#ff9b9b",
  "#14532d", "#0d1f18", "#2a1520", "#000", "#fff", "#ffffff",
]);
const rawHexes = [...new Set([...block.matchAll(/#[0-9a-fA-F]{3,6}\b/g)].map((m) => m[0].toLowerCase()))];
for (const hex of rawHexes) {
  if (!APP_PALETTE.has(hex)) failures.push(`palette: ${hex} is not in the app palette — the studio must reuse the editor/asset-studio language`);
}

// ---- 2. type scale ----
const typeScale = new Set([10, 11, 12, 13, 14, 15, 17, 24]);
for (const match of block.matchAll(/font:[^;]*?(\d+(?:\.\d+)?)px/g)) {
  const size = Number(match[1]);
  if (!typeScale.has(size)) failures.push(`type: font-size ${size}px outside scale ${[...typeScale].join("/")}`);
}
for (const match of block.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)) {
  const size = Number(match[1]);
  if (!typeScale.has(size)) failures.push(`type: font-size ${size}px outside scale`);
}

// ---- 3. spacing multiples of 4 ----
for (const match of block.matchAll(/(?:padding|margin|gap)[^:;]*:\s*([^;]+);/g)) {
  const value = match[1];
  for (const px of value.matchAll(/(\d+(?:\.\d+)?)px/g)) {
    const n = Number(px[1]);
    if (n % 4 !== 0 && n > 2) failures.push(`spacing: ${px[1]}px not multiple of 4 (in "${value.trim().slice(0, 40)}")`);
  }
}

// ---- report ----
const summary = { appPaletteColors: APP_PALETTE.size, usedColors: rawHexes.length, failures: failures.length };
console.log(JSON.stringify(summary, null, 2));
if (failures.length) {
  for (const failure of [...new Set(failures)].slice(0, 20)) console.log("  ✗ " + failure);
  process.exit(1);
}
console.log("  ✓ palette: all colors from the app language");
console.log("  ✓ type scale: all sizes on scale");
console.log("  ✓ spacing: all values multiple of 4");

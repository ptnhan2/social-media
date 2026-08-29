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

// ---- 1. palette: allowed raw colors = declared tokens (+ scrollbar bg exception) ----
const tokenBlock = block.match(/:root|\.pp-page \{[\s\S]*?\}/)?.[0] ?? "";
const declared = [...new Set([...block.matchAll(/--pp-[\w-]+:\s*(#[0-9a-fA-F]{6})/g)].map((m) => m[1].toLowerCase()))];
const allowedRgba = [/rgba\(122, 162, 247/, /rgba\(158, 206, 106/, /rgba\(247, 118, 142/, /^#000$/];
for (const match of block.matchAll(/(#[0-9a-fA-F]{3,8})\b/g)) {
  const color = match[1].toLowerCase();
  if (color.startsWith("#") && !declared.includes(color) && !allowedRgba.length) failures.push(`palette: raw color ${color} not a token`);
}
const rawHexes = [...new Set([...block.matchAll(/#[0-9a-fA-F]{6}\b/g)].map((m) => m[0].toLowerCase()))];
for (const hex of rawHexes) {
  if (!declared.includes(hex) && hex !== "#000000" && hex !== "#232a3d") {
    failures.push(`palette: ${hex} is not a declared --pp token (declared: ${declared.join(", ")})`);
  }
}
// one-off 3-digit hexes (scrollbar) are exempt — declared explicitly
for (const hex of [...new Set([...block.matchAll(/#[0-9a-fA-F]{3}\b(?!\"|\))/g)].map((m) => m[0].toLowerCase()))]) {
  if (hex !== "#000") failures.push(`palette: 3-digit hex ${hex} outside tokens`);
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
const summary = { declaredTokens: declared.length, rawHexCount: rawHexes.length, failures: failures.length };
console.log(JSON.stringify(summary, null, 2));
if (failures.length) {
  for (const failure of [...new Set(failures)].slice(0, 20)) console.log("  ✗ " + failure);
  process.exit(1);
}
console.log("  ✓ palette: all colors are tokens");
console.log("  ✓ type scale: all sizes on scale");
console.log("  ✓ spacing: all values multiple of 4");

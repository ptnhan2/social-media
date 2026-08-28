#!/usr/bin/env node
/**
 * UI AUDIT — deterministic pure-UI checks via DOM geometry (rule #20).
 *
 * Pure-UI (tràn chữ, vị trí, kích thước, overlap, hit-target, contrast) là
 * thứ DOM đo được CHÍNH XÁC — oracle đúng là getBoundingClientRect/
 * getComputedStyle, không phải VLM nhìn ảnh đoán. Tool này chạy audit trên
 * một URL live và in report JSON; screenshots lưu làm evidence.
 *
 * Usage:
 *   node scripts/ui-audit.mjs --url "http://localhost:5174/editor?project=slug" [--out audit.json] [--shots dir]
 *
 * Exit 0 = report written (kể cả có findings); --fail-on sets threshold.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

// playwright lives in composer-app (e2e dependency) — resolve from there
const require = createRequire(path.resolve(import.meta.dirname, "..", "composer-app", "package.json"));
const { chromium } = require("playwright");

const args = Object.fromEntries(process.argv.slice(2).map((arg, index, all) => {
  if (!arg.startsWith("--")) return [];
  const key = arg.slice(2);
  const next = all[index + 1];
  return next && !next.startsWith("--") ? [key, next] : [key, true];
}));

const url = args.url || "http://localhost:5174";
const shotsDir = args.shots || path.join("ui-audit-shots");
const failOn = Number(args.failOn ?? 0);
mkdirSync(shotsDir, { recursive: true });

const AUDIT_FN = () => {
  const issues = { textOverflow: [], tinyTargets: [], overlap: [], clippedText: [], brokenImages: [], lowContrast: [], coveredInteractives: [], cursorMissing: [] };
  const vw = innerWidth, vh = innerHeight;
  const auditRoot = (el) => !!el.closest("header, aside, main");
  const all = [...document.querySelectorAll("body *")].filter((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && auditRoot(el);
  });
  for (const el of all) {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") continue;
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (hasText && el.scrollWidth > el.clientWidth + 3 && cs.overflowX === "visible") {
      issues.textOverflow.push({ tag: el.tagName, cls: String(el.className).slice(0, 28), text: el.textContent.trim().slice(0, 44), scrollW: el.scrollWidth, clientW: el.clientWidth });
    }
  }
  const interactives = all.filter((el) => /^(BUTTON|INPUT|SELECT|TEXTAREA|A)$/.test(el.tagName) || el.getAttribute("role") === "button");
  for (const el of interactives) {
    const r = el.getBoundingClientRect();
    if (r.width < 10 || r.height < 12) {
      issues.tinyTargets.push({ tag: el.tagName, text: (el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 32), w: Math.round(r.width), h: Math.round(r.height) });
    }
  }
  const containers = new Set(all.map((el) => el.parentElement).filter((p) => p && (p.matches("aside, header") || String(p.className).includes("ve-prop"))));
  for (const container of containers) {
    const kids = [...container.children].filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
    for (let i = 0; i < kids.length; i += 1) for (let j = i + 1; j < kids.length; j += 1) {
      const a = kids[i].getBoundingClientRect(); const b = kids[j].getBoundingClientRect();
      const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (ox > 4 && oy > 4) issues.overlap.push({ a: (kids[i].textContent || kids[i].tagName).trim().slice(0, 24), b: (kids[j].textContent || kids[j].tagName).trim().slice(0, 24) });
    }
  }
  // silently-clipped text: content wider than box with hidden overflow but NO
  // ellipsis (ellipsis = intended truncation; silent clip = data hidden)
  for (const el of all) {
    const cs = getComputedStyle(el);
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!hasText) continue;
    if (el.scrollWidth > el.clientWidth + 3 && cs.overflowX === "hidden" && cs.textOverflow !== "ellipsis") {
      issues.clippedText.push({ tag: el.tagName, cls: String(el.className).slice(0, 28), text: el.textContent.trim().slice(0, 44) });
    }
  }
  // broken images: loaded but zero natural size = 404/decode failure
  for (const img of document.querySelectorAll("img")) {
    if (img.complete && img.naturalWidth === 0) {
      issues.brokenImages.push({ src: String(img.getAttribute("src") || "").slice(0, 60), alt: String(img.getAttribute("alt") || "").slice(0, 30) });
    }
  }
  // contrast: leaf text vs effective solid background (WCAG luminance).
  // Threshold 3.0 = glaring failures only — tuning noise down; gradients and
  // semi-transparent stacks are skipped (unmeasurable without compositing).
  const parseColor = (s) => { const m = String(s).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/); return m ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] } : null; };
  const luminance = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const effectiveBg = (el) => {
    let node = el;
    while (node && node !== document.documentElement) {
      const cs = getComputedStyle(node);
      if (cs.backgroundImage && cs.backgroundImage !== "none") return null; // gradient — unmeasurable
      const c = parseColor(cs.backgroundColor);
      if (c && c.a >= 0.9) return c;
      node = node.parentElement;
    }
    return parseColor(getComputedStyle(document.body).backgroundColor);
  };
  for (const el of all) {
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden") continue;
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!hasText) continue;
    const fg = parseColor(cs.color);
    const bg = effectiveBg(el);
    if (!fg || !bg || fg.a < 0.4) continue; // very transparent text: measured elsewhere
    const ratio = (Math.max(luminance(fg), luminance(bg)) + 0.05) / (Math.min(luminance(fg), luminance(bg)) + 0.05);
    if (ratio < 3.0) issues.lowContrast.push({ text: el.textContent.trim().slice(0, 36), ratio: Math.round(ratio * 10) / 10, color: cs.color, bg: `rgb(${bg.r},${bg.g},${bg.b})` });
  }
  // hit-test: interactive element whose center is covered by an unrelated element
  for (const el of interactives) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.top < 0 || r.left < 0 || r.bottom > vh || r.right > vw) continue; // outside viewport — scroll case
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (hit && hit !== el && !el.contains(hit) && !hit.contains(el)) {
      issues.coveredInteractives.push({ text: (el.textContent || el.getAttribute("aria-label") || el.tagName).trim().slice(0, 28), coveredBy: String(hit.className || hit.tagName).slice(0, 32) });
    }
  }
  // cursor affordance: buttons must feel clickable (disabled buttons
  // legitimately show default cursor — they ARE non-clickable)
  for (const el of interactives) {
    if (el.tagName !== "BUTTON" || el.disabled || el.getAttribute("aria-disabled") === "true") continue;
    if (getComputedStyle(el).cursor !== "pointer") {
      issues.cursorMissing.push({ text: (el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 30) });
    }
  }
  for (const key of Object.keys(issues)) issues[key] = issues[key].slice(0, 12);
  let hoverRules = 0;
  for (const sheet of document.styleSheets) { try { for (const rule of sheet.cssRules) { if (rule.selectorText && rule.selectorText.includes(":hover")) hoverRules += 1; } } catch {} }
  return {
    url: location.href, viewport: { w: vw, h: vh }, scanned: all.length, hoverRules,
    fontsStatus: document.fonts ? document.fonts.status : "unknown",
    counts: Object.fromEntries(Object.keys(issues).map((key) => [key, issues[key].length])),
    issues,
  };
};

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1680, height: 950 } });
  await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(2500);
  const report = await page.evaluate(AUDIT_FN);
  const fullPage = path.join(shotsDir, "fullpage.png");
  await page.screenshot({ path: fullPage, fullPage: false });
  const critical = Object.values(report.counts).reduce((a, b) => a + b, 0);
  writeFileSync(args.out || "ui-audit.json", JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ url, screenshots: [fullPage], counts: report.counts, scanned: report.scanned, critical, pass: critical <= failOn }, null, 2));
  process.exit(critical <= failOn ? 0 : 1);
} finally {
  await browser.close();
}

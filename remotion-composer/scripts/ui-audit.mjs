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
// Responsive coverage: the full audit runs at EVERY viewport — layout bugs
// that only appear at a breakpoint (overflow, cramped targets, overlaps)
// surface per size. Doc-level horizontal overflow is the core responsive
// failure signal. Default set: desktop → laptop → small laptop → tablet.
const viewportsArg = String(args.viewports || "1920x1080,1366x768,1024x768,768x1024");
const viewports = viewportsArg.split(",").map((spec) => {
  const [w, h] = spec.trim().toLowerCase().split("x").map(Number);
  return { w, h, label: `${w}x${h}` };
}).filter((vp) => vp.w > 200 && vp.h > 200);
mkdirSync(shotsDir, { recursive: true });

const AUDIT_FN = () => {
  const issues = { textOverflow: [], tinyTargets: [], overlap: [], clippedText: [], brokenImages: [], lowContrast: [], coveredInteractives: [], cursorMissing: [], viewportOverflow: [], deadClasses: [] };
  const vw = innerWidth, vh = innerHeight;
  // THE responsive failure signal: the page itself forces horizontal scroll.
  // (Inner scroll containers — the timeline scrolls by design — clip their
  // content, so doc-level scrollWidth only grows on genuine page breakage.)
  const docOverflow = document.documentElement.scrollWidth - vw;
  if (docOverflow > 2) {
    issues.viewportOverflow.push({ px: Math.round(docOverflow), scrollWidth: document.documentElement.scrollWidth, viewportWidth: vw });
  }
  // Dead classes: a ve-* class on a rendered element that NO stylesheet rule
  // defines. This is the EXACT signature of the voice-panel layout bug
  // (a component shipped referencing .ve-prop-grid before the CSS existed —
  // structure looked fine in the a11y tree, layout silently fell apart).
  {
    const defined = new Set();
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          const sel = rule.selectorText || "";
          for (const cls of sel.match(/\.([a-zA-Z0-9_-]+)/g) ?? []) defined.add(cls.slice(1));
        }
      } catch {}
    }
    const seen = new Set();
    for (const el of document.querySelectorAll("[class]")) {
      for (const cls of String(el.className).split(/\s+/)) {
        if (!cls.startsWith("ve-") || seen.has(cls)) continue;
        seen.add(cls);
        if (!defined.has(cls)) issues.deadClasses.push({ cls, on: el.tagName.toLowerCase() });
      }
    }
  }
  const auditRoot = (el) => !!el.closest("header, aside, main, .ve-left-rail");
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
  // hit-test: interactive element whose center is covered by an unrelated element.
  // Elements clipped by an overflow ancestor are SKIPPED — if the ancestor
  // scrolls they are scroll-reachable (not covered); if hidden they are
  // invisible and elementFromPoint would report the covering layer, a false
  // positive (the left-rail media list below its scroll fold).
  const clippedByAncestor = (el, cx, cy) => {
    let node = el.parentElement;
    while (node && node !== document.body) {
      const cs = getComputedStyle(node);
      if (cs.overflowX !== "visible" || cs.overflowY !== "visible") {
        const r = node.getBoundingClientRect();
        if (cx < r.left || cx > r.right || cy < r.top || cy > r.bottom) return true;
      }
      node = node.parentElement;
    }
    return false;
  };
  for (const el of interactives) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.top < 0 || r.left < 0 || r.bottom > vh || r.right > vw) continue; // outside viewport — scroll case
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (clippedByAncestor(el, cx, cy)) continue;
    const hit = document.elementFromPoint(cx, cy);
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
  const page = await browser.newPage({ viewport: { width: viewports[0].w, height: viewports[0].h } });
  await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(2500);
  // STATE NAVIGATION (process gap 2026-08-28): audit interaction states, not
  // just the default page. --click takes comma-separated aria-label substrings;
  // each is clicked before the FIRST viewport pass so stateful UI (properties
  // panels, modals, tabs) gets audited too. A layout bug that only renders in
  // a selected state is invisible to a load-only audit - exactly how the
  // voice-panel grid bug shipped.
  const clicks = String(args.click || "").split(",").map(s => s.trim()).filter(Boolean);
  for (const label of clicks) {
    // "aria-label text" or "aria-label text#3" — the #N suffix selects the
    // Nth match (0-based) when several elements share a label (e.g. eight
    // "Expand beat elements" toggles, one per beat).
    const [text, index] = label.split("#");
    const target = page.locator(`[aria-label*="${text}"]`).nth(Number(index || 0));
    await target.click({ timeout: 8000 });
    await page.waitForTimeout(700);
  }
  const results = [];
  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.w, height: vp.h });
    // let React re-render settle (ResizeObservers, container queries, fit zoom)
    await page.waitForTimeout(800);
    const report = await page.evaluate(AUDIT_FN);
    const shot = path.join(shotsDir, `viewport-${vp.label}.png`);
    await page.screenshot({ path: shot, fullPage: false });
    results.push({ viewport: vp.label, ...report, screenshot: shot });
  }
  const totalCritical = results.reduce((sum, r) => sum + Object.values(r.counts).reduce((a, b) => a + b, 0), 0);
  const summary = {
    url,
    viewports: results.map((r) => ({ viewport: r.viewport, counts: r.counts, scanned: r.scanned, fontsStatus: r.fontsStatus, screenshot: r.screenshot })),
    totalCritical,
    pass: totalCritical <= failOn,
  };
  writeFileSync(args.out || "ui-audit.json", JSON.stringify({ ...summary, details: results }, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  process.exit(summary.pass ? 0 : 1);
} finally {
  await browser.close();
}

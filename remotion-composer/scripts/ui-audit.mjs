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
  const issues = { textOverflow: [], tinyTargets: [], overlap: [], clippedText: [] };
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
  for (const el of all) {
    if (!/^(BUTTON|INPUT|SELECT|TEXTAREA|A)$/.test(el.tagName) && el.getAttribute("role") !== "button") continue;
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
  for (const key of Object.keys(issues)) issues[key] = issues[key].slice(0, 12);
  let hoverRules = 0;
  for (const sheet of document.styleSheets) { try { for (const rule of sheet.cssRules) { if (rule.selectorText && rule.selectorText.includes(":hover")) hoverRules += 1; } } catch {} }
  return {
    url: location.href, viewport: { w: vw, h: vh }, scanned: all.length, hoverRules,
    counts: { textOverflow: issues.textOverflow.length, tinyTargets: issues.tinyTargets.length, overlap: issues.overlap.length, clippedText: issues.clippedText.length },
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
  const critical = report.counts.textOverflow + report.counts.tinyTargets + report.counts.overlap + report.counts.clippedText;
  writeFileSync(args.out || "ui-audit.json", JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ url, screenshots: [fullPage], counts: report.counts, scanned: report.scanned, critical, pass: critical <= failOn }, null, 2));
  process.exit(critical <= failOn ? 0 : 1);
} finally {
  await browser.close();
}

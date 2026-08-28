// L3/L4 probe: Timeline QA tab — report checklist renders (5 checks, 1 known
// schema warning), Generate button wired, warnings surfaced.
import { createRequire } from "node:module";
const require = createRequire(import.meta.dirname + "/../composer-app/package.json");
const { chromium } = require("playwright");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto("http://localhost:5174/editor?project=ai-dialogue-therapy", { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(2500);

await page.locator(".ve-right-tab").filter({ hasText: "Timeline QA" }).click({ timeout: 10000 });
await page.waitForTimeout(1500);

const tabActive = await page.locator(".ve-right-tab.active").textContent().catch(() => "NONE");
const checks = await page.locator(".ve-qa-checks > li").evaluateAll((els) => els.map((el) => ({
  pass: el.classList.contains("pass"),
  label: el.querySelector(".ve-qa-label")?.textContent?.slice(0, 50) ?? "",
})));
const warnings = await page.locator(".ve-qa-warnings li").count();
const generateBtn = await page.locator(".ve-timeline-qa .ve-prop-btn").count();
const btnLabel = await page.locator(".ve-timeline-qa .ve-prop-btn").first().textContent();
const reportStatus = await page.locator(".ve-prop-label-row b").first().textContent().catch(() => "");
const panelBox = await page.locator(".ve-timeline-qa").evaluate((el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), w: Math.round(r.width), h: Math.round(r.height) }; });

await page.screenshot({ path: "ui-audit-shots/timeline-qa-1920.png" });
console.log(JSON.stringify({
  tabActive: tabActive.trim(),
  checkCount: checks.length,
  checks,
  warningCount: warnings,
  generateButton: { present: generateBtn === 1, label: btnLabel.trim() },
  reportStatus: reportStatus.trim(),
  panelBox,
}, null, 2));
await browser.close();

// L3/L4 probe: voice clip selected -> Audio tab -> take switcher rows render
// with play + select buttons, breath pad field, QC readout.
// playwright lives in composer-app (e2e dependency) — resolve from there.
import { createRequire } from "node:module";
const require = createRequire(import.meta.dirname + "/../composer-app/package.json");
const { chromium } = require("playwright");

const url = "http://localhost:5174/editor?project=ai-dialogue-therapy";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(2500);

// 1. click the FIRST voiceover clip on the timeline
const clip = page.locator('[aria-label*="Voiceover clip from 0"]').first();
await clip.click({ timeout: 10000 });
await page.waitForTimeout(800);

// 2. Audio tab must be active with the voice section
const panel = page.locator(".ve-properties");
const tabActive = await page.locator('.ve-prop-tabs [role="tab"][aria-selected="true"]').textContent().catch(() => "NONE");
const takeRows = await page.locator(".ve-take-row").count();
const currentRow = await page.locator(".ve-take-row.current").count();
const playButtons = await page.locator(".ve-take-play").count();
const selectButtons = await page.locator(".ve-take-select:not([disabled])").count();
const padField = await page.locator('.ve-prop-field input[type="number"]').evaluateAll(
  (els) => els.some((el) => Math.abs(Number(el.value) - 0.3) < 0.001),
).catch(() => false);
const qcText = await page.locator(".ve-prop-voice").textContent();

// 3. geometry: take rows must fit inside the right panel (no overflow)
const rowBoxes = await page.locator(".ve-take-row").evaluateAll((els) => els.map((el) => {
  const r = el.getBoundingClientRect();
  return { x: Math.round(r.x), w: Math.round(r.width), h: Math.round(r.height) };
}));
const panelBox = await panel.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), w: Math.round(r.width) }; });
const overflowRows = rowBoxes.filter((b) => b.x + b.w > panelBox.x + panelBox.w + 1).length;

// 4. QC badge on timeline: beat-05 clip currently passes QC -> no badge; count any FAIL badges
const qcBadges = await page.locator(".editor-clip-qc.fail").count();

await page.screenshot({ path: "ui-audit-shots/voice-take-switcher-1920.png" });
console.log(JSON.stringify({
  activeTab: tabActive.trim(),
  takeRows, currentRow, playButtons, selectButtons,
  padFieldPresent: padField,
  qcReadoutShown: /QC/.test(qcText ?? ""),
  rowOverflow: overflowRows,
  qcFailBadgesOnTimeline: qcBadges,
  rowSizes: rowBoxes,
}, null, 2));
await browser.close();

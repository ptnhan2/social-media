// L3 probe: editor Audio tab after slim-down — voice clip selected shows
// breathPad + studio hint, NO direction/takes/regen fields.
import { createRequire } from "node:module";
const require = createRequire(import.meta.dirname + "/../composer-app/package.json");
const { chromium } = require("playwright");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto("http://localhost:5174/editor?project=agent-loop-test", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.locator(".ve-right-tab").first().waitFor({ timeout: 30000 });
await page.locator('[aria-label*="Voiceover clip"]').first().click({ timeout: 10000 });
await page.waitForTimeout(800);
await page.locator('.ve-prop-tabs [role="tab"]').filter({ hasText: "Audio" }).click();
await page.waitForTimeout(500);
const voiceSection = await page.locator(".ve-prop-voice").textContent().catch(() => "NONE");
const breathPadInputs = await page.locator(".ve-prop-voice input[type=number]").count();
const oldTextareas = await page.locator(".ve-prop-voice textarea").count();
const oldButtons = await page.locator(".ve-prop-voice .ve-take-row").count();
const gainField = await page.locator(".ve-prop-section").filter({ hasText: "Gain" }).count();
console.log(JSON.stringify({
  voiceSectionRendered: voiceSection !== "NONE",
  breathPadInputs, oldTextareas, oldTakeRows: oldButtons,
  studioHint: /Content Studio/.test(voiceSection ?? ""),
  gainFadesKept: gainField === 1,
}, null, 2));
await browser.close();

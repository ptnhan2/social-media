// L3/L4 probe: project page with PROCESS TIMELINE as the spine —
// trace events render chronologically (plan → voice → timeline → render),
// expandable with stage data, and the rest (player/approval/beats) follows.
import { createRequire } from "node:module";
const require = createRequire(import.meta.dirname + "/../composer-app/package.json");
const { chromium } = require("playwright");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto("http://localhost:5174/project?project=agent-loop-test", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(3000);

const traceItems = await page.locator(".pp-trace-item").evaluateAll((els) => els.map((el) => ({
  stage: el.className.match(/stage-(\w+)/)?.[1] ?? "?",
  title: el.querySelector(".pp-trace-title")?.textContent ?? "",
})));
// expand the FIRST trace event (the plan) and check its details render
await page.locator(".pp-trace-head").first().click();
await page.waitForTimeout(400);
const planDetails = await page.locator(".pp-trace-body").first().textContent();
// expand a voice event (second head) — accordion is single-open: the only
// body after this click IS the voice body
await page.locator(".pp-trace-head").nth(1).click();
await page.waitForTimeout(400);
const voiceDetails = await page.locator(".pp-trace-body").first().textContent();
const keepBtn = await page.locator(".pp-keep").count();
const videoEl = await page.locator(".pp-video").count();
await page.screenshot({ path: "ui-audit-shots/project-page-trace-1920.png", fullPage: true });

console.log(JSON.stringify({
  traceItems,
  planDetailsHas: { idea: /edits feel off/.test(planDetails ?? ""), beats: /chapter-card/.test(planDetails ?? ""), gates: /Gates/.test(planDetails ?? "") },
  voiceDetailsHas: { providerText: /Every cut looks right/.test(voiceDetails ?? ""), takes: /take/.test(voiceDetails ?? ""), qc: /Clipping|Duration|Tail|Loudness/.test(voiceDetails ?? "") },
  keepBtn, videoEl,
  order: traceItems.map((t) => t.stage).join(" → "),
}, null, 2));
await browser.close();

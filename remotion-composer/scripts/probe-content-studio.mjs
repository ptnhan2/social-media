// L3/L4 probe: Content Studio v2 (writing-surface redesign) — script hero,
// voice details on demand, NO embedded video, approval strip + candidate
// on demand, save flows intact.
import { createRequire } from "node:module";
const require = createRequire(import.meta.dirname + "/../composer-app/package.json");
const { chromium } = require("playwright");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [];
page.on("pageerror", (err) => errors.push(String(err).slice(0, 150)));
page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text().slice(0, 150)); });
await page.goto("http://localhost:5174/project?project=agent-loop-test", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(3000);

// default view: script paragraphs, no inputs wall, no video
const beats = await page.locator(".pp-beat").count();
const scripts = await page.locator(".pp-script").count();
const settingsDefault = await page.locator(".pp-vsettings").count();
const videosDefault = await page.locator("video").count();

// expand beat 1 voice details
await page.locator(".pp-voice-toggle").first().click();
await page.waitForTimeout(500);
const settingsAfterExpand = await page.locator(".pp-vsettings").count();
const directionTa = await page.locator(".pp-vfield textarea").count();
const regenBtn = await page.locator(".pp-regen").count();
const takeChips = await page.locator(".pp-take").count();

// script save flow (real endpoint)
const firstScript = page.locator(".pp-script").first();
const original = await firstScript.inputValue();
await firstScript.fill(original);
await firstScript.blur();
await page.waitForTimeout(800);

// prompt re-run → drawer prefilled
const promptText = await page.locator(".pp-prompt-text").textContent().catch(() => "");
await page.locator("text=chạy lại prompt này").click();
await page.waitForTimeout(700);
const drawerOpen = await page.locator(".ap-drawer:not(.ap-drawer-closed)").count();
const drawerInput = await page.locator(".ap-input").inputValue().catch(() => "");
await page.locator(".ap-drawer-close").click();

// approval: candidate on demand only
const approvalRow = await page.locator(".pp-approval-row").count();
await page.locator("text=xem candidate").click();
await page.waitForTimeout(500);
const candidateVideo = await page.locator(".pp-candidate").count();

await page.screenshot({ path: "ui-audit-shots/content-studio-v2-1920.png", fullPage: true });
console.log(JSON.stringify({
  defaultView: { beats, scripts, settingsDefault, videosDefault },
  voiceDetailsOnDemand: { settingsAfterExpand, directionTa, regenBtn, takeChips },
  promptBar: { hasText: (promptText ?? "").length > 10, rerunOpensDrawer: drawerOpen === 1, prefilled: (drawerInput ?? "").length > 10 },
  approval: { strip: approvalRow, candidateOnDemand: candidateVideo === 1 },
  errors: errors.slice(0, 4),
}, null, 2));
await browser.close();

// L3/L4 probe: CONTENT STUDIO — beat editors with full voice-birth panel,
// prompt bar with instruction, no player in edit loop, approval candidate
// only when pending. Save flow verified through the real endpoint.
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

// --- structure ---
const promptText = await page.locator(".pp-prompt-text").textContent().catch(() => "");
const rerunBtn = await page.locator(".pp-rerun").count();
const beatEditors = await page.locator(".pp-beatedit").count();
const scriptFields = await page.locator(".pp-field textarea").count();
const settingsInputs = await page.locator(".pp-settings input").count();
const regenButtons = await page.locator(".pp-regen").count();
const takeChips = await page.locator(".pp-take-chip").count();
const currentTakes = await page.locator(".pp-take-chip.current").count();
const qcBadges = await page.locator(".pp-beatedit .pp-qc").evaluateAll((els) => els.map((el) => el.textContent?.trim()));
const videoInEditLoop = await page.locator(".pp-grid-top .pp-video, .pp-card:not(:has(.pp-card-title)) .pp-video").count();
const approvalVideo = await page.locator(".pp-card").filter({ hasText: "Approval" }).locator(".pp-video").count();

// --- save flow (real endpoint): edit script text of beat 1 ---
const firstScript = page.locator(".pp-field textarea").first();
const original = await firstScript.inputValue();
await firstScript.fill(original + " (studio test)");
await firstScript.blur();
await page.waitForTimeout(1500);
const savedMsg = await page.locator(".pp-beatedit").first().textContent();
// restore
const firstScript2 = page.locator(".pp-field textarea").first();
await firstScript2.fill(original);
await firstScript2.blur();
await page.waitForTimeout(1500);

// --- prompt re-run: click opens drawer prefilled ---
await page.locator(".pp-rerun").click();
await page.waitForTimeout(800);
const drawerOpen = await page.locator(".ap-drawer:not(.ap-drawer-closed)").count();
const drawerInput = await page.locator(".ap-input").inputValue().catch(() => "");

await page.screenshot({ path: "ui-audit-shots/content-studio-1920.png", fullPage: true });
console.log(JSON.stringify({
  promptBar: { hasInstruction: /thợ|punchy|rhythm/i.test(promptText ?? "") || (promptText ?? "").length > 10, rerunBtn },
  beatEditors, scriptFields, settingsInputs, regenButtons,
  takes: { chips: takeChips, current: currentTakes },
  qcBadges,
  playerInEditLoop: videoInEditLoop,
  approvalCandidateVideo: approvalVideo,
  saveFlow: { saved: /Script ✓/.test(savedMsg ?? ""), restored: (await page.locator(".pp-field textarea").first().inputValue()) === original },
  rerunOpensDrawer: { drawerOpen: drawerOpen === 1, prefilled: (drawerInput ?? "").length > 10 },
  errors: errors.slice(0, 4),
}, null, 2));
await browser.close();

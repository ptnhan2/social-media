// Verify drawer toggle stability: 6 open/close cycles on picker AND editor.
// Close goes through the header ✕ (the FAB hides while open — it used to be
// covered by the drawer, which was the toggle-stall bug).
import { createRequire } from "node:module";
const require = createRequire(import.meta.dirname + "/../composer-app/package.json");
const { chromium } = require("playwright");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [];
page.on("pageerror", (err) => errors.push(String(err).slice(0, 150)));
page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text().slice(0, 150)); });

const toggleLatencies = async (label, rounds) => {
  const results = [];
  for (let i = 0; i < rounds; i += 1) {
    const opening = i % 2 === 0;
    const t0 = Date.now();
    if (opening) {
      await page.locator(".ap-fab").click({ timeout: 5000 });
      await page.locator(".ap-drawer:not(.ap-drawer-closed)").waitFor({ state: "visible", timeout: 5000 });
    } else {
      await page.locator(".ap-drawer-close").click({ timeout: 5000 });
      await page.locator(".ap-drawer-closed").waitFor({ state: "attached", timeout: 5000 });
    }
    results.push(`${opening ? "open" : "close"}#${i + 1}: ${Date.now() - t0}ms`);
  }
  console.log(`${label}: ${results.join(" | ")}`);
};

// --- picker ---
await page.goto("http://localhost:5174/", { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(2000);
await toggleLatencies("PICKER", 6);

// --- editor ---
await page.goto("http://localhost:5174/editor?project=ai-dialogue-therapy", { waitUntil: "networkidle", timeout: 60000 });
await page.locator(".ve-right-tab").first().waitFor({ timeout: 30000 });
await page.waitForTimeout(1500);
await toggleLatencies("EDITOR", 6);

// persistence sanity: input survives close/reopen (panel stays mounted)
await page.locator(".ap-fab").click();
await page.locator(".ap-input").fill("keep-me");
await page.locator(".ap-drawer-close").click();
await page.locator(".ap-fab").click();
const kept = await page.locator(".ap-input").inputValue();
console.log("INPUT SURVIVES CLOSE/REOPEN:", kept === "keep-me");

console.log("ERRORS:", errors.length ? errors.slice(0, 6) : "none");
await browser.close();

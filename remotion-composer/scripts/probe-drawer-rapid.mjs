// Rapid-fire reproduction: open/close/open/close as fast as possible (no
// artificial waits), specifically hunting "the SECOND close gets stuck".
import { createRequire } from "node:module";
const require = createRequire(import.meta.dirname + "/../composer-app/package.json");
const { chromium } = require("playwright");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [];
page.on("pageerror", (err) => errors.push("PAGEERROR: " + String(err).slice(0, 200)));
page.on("console", (msg) => { if (msg.type() === "error") errors.push("CONSOLE: " + msg.text().slice(0, 200)); });

const state = () => page.evaluate(() => {
  const drawer = document.querySelector(".ap-drawer");
  return drawer && !drawer.classList.contains("ap-drawer-closed") ? "OPEN" : "CLOSED";
});

const rapidCycle = async (n) => {
  // OPEN: click FAB
  await page.locator(".ap-fab").click({ timeout: 4000 }).catch(async () => {
    // FAB may be mid-unmount from a previous cycle — retry once after a beat
    await page.waitForTimeout(200);
    await page.locator(".ap-fab").click({ timeout: 4000 });
  });
  let openState = "timeout";
  try { await page.locator(".ap-drawer:not(.ap-drawer-closed)").waitFor({ state: "visible", timeout: 4000 }); openState = "ok"; } catch {}
  // CLOSE: immediately click header ✕ (no wait — user's rapid pattern)
  await page.locator(".ap-drawer-close").click({ timeout: 4000 }).catch(async () => {
    await page.waitForTimeout(200);
    await page.locator(".ap-drawer-close").click({ timeout: 4000 });
  });
  let closeState = "timeout";
  try {
    await page.locator(".ap-drawer-closed").waitFor({ state: "attached", timeout: 4000 });
    closeState = "ok";
  } catch {
    closeState = `STUCK (state=${await state()})`;
  }
  console.log(`cycle#${n}: open=${openState} close=${closeState}`);
};

// --- editor (user's page) ---
await page.goto("http://localhost:5174/editor?project=ai-dialogue-therapy", { waitUntil: "networkidle", timeout: 60000 });
await page.locator(".ve-right-tab").first().waitFor({ timeout: 30000 });
await page.waitForTimeout(1500);
for (let i = 1; i <= 4; i += 1) await rapidCycle(i);

console.log("ERRORS:", errors.length ? errors.slice(0, 8) : "none");
await browser.close();

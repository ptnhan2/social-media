// L3/L4 probe: app-level agent drawer —
// 1. FAB on the project picker; drawer opens with "no project" context
// 2. CLIENT-SIDE navigation (click a project card) — drawer + input text SURVIVE
// 3. Drawer context picks up the project; editor right panel has NO Agent tab
import { createRequire } from "node:module";
const require = createRequire(import.meta.dirname + "/../composer-app/package.json");
const { chromium } = require("playwright");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

// --- picker ---
await page.goto("http://localhost:5174/", { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(2500);
const fabOnPicker = await page.locator(".ap-fab").count();
await page.locator(".ap-fab").click({ timeout: 8000 });
await page.waitForTimeout(1500);
const drawerOpen = await page.locator(".ap-drawer").count();
const noProjectCtx = await page.locator(".ap-context").textContent();
const pickerQuickActions = await page.locator(".ap-qa-btn").count();
await page.locator(".ap-input").fill("persistence-marker-123");

// --- CLIENT-SIDE navigation: click the ai-dialogue-therapy project card ---
const projectCard = page.locator("text=ai-dialogue-therapy").first();
await projectCard.click({ timeout: 10000 });
await page.waitForTimeout(3000);
const urlAfter = page.url();
const fabOnEditor = await page.locator(".ap-fab").count();
const drawerStillOpen = await page.locator(".ap-drawer").count();
const inputKept = await page.locator(".ap-input").inputValue().catch(() => "");
const ctxOnEditor = await page.locator(".ap-context").textContent();
// editor loads its project async — wait for the right panel to mount
await page.locator(".ve-right-tab").first().waitFor({ timeout: 30000 });
const editorRightTabs = await page.locator(".ve-right-tab").evaluateAll((els) => els.map((el) => el.textContent?.trim()));
const drawerHeader = await page.locator(".ap-drawer-header").textContent();
await page.screenshot({ path: "ui-audit-shots/agent-drawer-editor-1920.png" });

console.log(JSON.stringify({
  fabOnPicker,
  drawerOpensFromPicker: drawerOpen === 1,
  pickerContextSaysNoProject: /no project/.test(noProjectCtx ?? ""),
  pickerQuickActions, // 2 project-independent (Knobs, Read Style)
  clientSideNav: { url: urlAfter, isEditor: /\/editor\?project=/.test(urlAfter) },
  survived: {
    fabOnEditor,
    drawerStillOpen: drawerStillOpen === 1,
    inputKept: inputKept === "persistence-marker-123",
    contextShowsProject: /ai-dialogue-therapy/.test(ctxOnEditor ?? ""),
  },
  editorQuickActions: await page.locator(".ap-qa-btn").count(), // 6 with project
  editorRightTabs, // must NOT contain "Agent"
  drawerHeader: drawerHeader?.trim(),
}, null, 2));
await browser.close();

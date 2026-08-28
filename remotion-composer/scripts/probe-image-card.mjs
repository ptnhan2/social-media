// L3/L4 probe: image clip selected -> Image tab renders the M2 query card —
// query field, candidate grid (12 thumbs), provenance line, upload input.
import { createRequire } from "node:module";
const require = createRequire(import.meta.dirname + "/../composer-app/package.json");
const { chromium } = require("playwright");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto("http://localhost:5174/editor?project=ai-dialogue-therapy", { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(2500);

// bg-image clip lives inside beat-06's collapsed element section — expand it
await page.locator(".editor-beat-toggle").nth(5).click({ timeout: 10000 });
await page.waitForTimeout(600);
await page.locator('[aria-label*="bg-image clip from 0:27"]').first().click({ timeout: 10000 });
await page.waitForTimeout(600);
// element clips default to the Transform tab — open the Image tab
await page.locator('.ve-prop-tabs [role="tab"]').filter({ hasText: "Image" }).click({ timeout: 10000 });
await page.waitForTimeout(600);

const activeTab = await page.locator('.ve-prop-tabs [role="tab"][aria-selected="true"]').textContent().catch(() => "NONE");
const imageTab = await page.locator('.ve-prop-tabs [role="tab"]').filter({ hasText: "Image" }).count();
const queryValue = await page.locator(".ve-prop-voice textarea").first().inputValue().catch(() => "");
const candidates = await page.locator(".ve-img-candidate").count();
const thumbsWithBg = await page.locator(".ve-img-candidate").evaluateAll((els) => els.filter((el) => {
  const thumb = el.querySelector(".ve-img-thumb");
  return thumb && getComputedStyle(thumb).backgroundImage !== "none";
}).length);
const uploadInput = await page.locator('.ve-img-upload input[type="file"]').count();
const provenanceText = await page.locator(".ve-prop-voice").textContent();

// geometry: grid must fit inside the right panel, thumbs must have hit area
const gridBox = await page.locator(".ve-img-grid").evaluate((el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), w: Math.round(r.width), h: Math.round(r.height) }; });
const thumbBoxes = await page.locator(".ve-img-thumb").evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; }));
const panelBox = await page.locator(".ve-properties").evaluate((el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), w: Math.round(r.width) }; });
const gridOverflow = gridBox.x + gridBox.w > panelBox.x + panelBox.w + 1;

await page.screenshot({ path: "ui-audit-shots/image-query-card-1920.png" });
console.log(JSON.stringify({
  activeTab: activeTab.trim(),
  imageTabPresent: imageTab === 1,
  queryValue,
  candidates,
  thumbsWithBg,
  uploadInput,
  provenanceShown: /unsplash/.test(provenanceText ?? ""),
  gridBox, thumbCount: thumbBoxes.length,
  minThumbW: Math.min(...thumbBoxes.map((b) => b.w)),
  gridOverflow,
}, null, 2));
await browser.close();

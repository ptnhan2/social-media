// L3/L4 probe: project page (stage-surface) on agent-loop-test —
// header/story/beat-cards/pipeline/player render from real data + approval
// pending gate shows Keep/Redo.
import { createRequire } from "node:module";
const require = createRequire(import.meta.dirname + "/../composer-app/package.json");
const { chromium } = require("playwright");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto("http://localhost:5174/project?project=agent-loop-test", { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(2500);

const header = await page.locator(".pp-header").textContent().catch(() => "");
const beatCards = await page.locator(".pp-beat").count();
const transcripts = await page.locator(".pp-transcript").evaluateAll((els) => els.map((el) => el.textContent?.slice(0, 40)));
const qcBadges = await page.locator(".pp-qc").evaluateAll((els) => els.map((el) => el.textContent?.trim()));
const pipelineChecks = await page.locator(".pp-checks li").count();
const videoEl = await page.locator(".pp-video").count();
const videoSrc = await page.locator(".pp-video").getAttribute("src").catch(() => "");
const approvalStatus = await page.locator(".pp-card").filter({ hasText: "Approval" }).textContent().catch(() => "");
const keepBtn = await page.locator(".pp-keep").count();
const redoBtn = await page.locator(".pp-redo").count();
const storyFacts = await page.locator(".pp-story b").evaluateAll((els) => els.map((el) => el.textContent?.trim()));

// geometry: beat cards must not overflow the page
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);

await page.screenshot({ path: "ui-audit-shots/project-page-1920.png", fullPage: true });

console.log(JSON.stringify({
  headerShowsIdea: /edits feel off/.test(header ?? ""),
  beatCards,
  transcripts,
  qcBadges,
  pipelineChecks,
  videoEl,
  videoSrcOk: /artifact\?projectId=agent-loop-test/.test(videoSrc ?? ""),
  approvalPending: /PENDING REVIEW/.test(approvalStatus ?? ""),
  keepRedoButtons: { keep: keepBtn, redo: redoBtn },
  storyFacts,
  pageOverflow: overflow,
}, null, 2));
await browser.close();

// L3/L4 negative-path probe: a voice clip with qc.pass=false must render the
// red QC badge on the timeline; flipping it back to true must remove it.
// Uses the sanctioned editor-ops bridge (backup + revision bump), reverts
// the flip at the end no matter what.
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
const require = createRequire(import.meta.dirname + "/../composer-app/package.json");
const { chromium } = require("playwright");

const COMPOSER = import.meta.dirname + "/..";
const PROJECT = "ai-dialogue-therapy";
const CLIP = "clip:voice:ai-dialogue-therapy:voice:therapy-beat-03";

const readDoc = () => JSON.parse(readFileSync(path.resolve(COMPOSER, "..", "projects", PROJECT, "editor", "current.json"), "utf8"));
const readQc = () => readDoc().tracks.flatMap((t) => t.clips).find((c) => c.id === CLIP).metadata.qc;
const flipQc = (qc) => execFileSync("node", [
  "scripts/editor-ops.mjs", "--project", PROJECT, "--op", "metadata",
  "--clipId", CLIP, "--changes", JSON.stringify({ qc }),
], { cwd: COMPOSER, encoding: "utf8" });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const countBadges = async () => {
  await page.goto("http://localhost:5174/editor?project=ai-dialogue-therapy", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2500);
  return page.locator(".editor-clip-qc.fail").count();
};

const originalQc = readQc();
let result = { originalPass: originalQc.pass };
try {
  flipQc({ ...originalQc, pass: false });
  result.badgeCountWhenFail = await countBadges();
  await page.screenshot({ path: "ui-audit-shots/qc-badge-fail-1920.png" });
} finally {
  flipQc(originalQc);
  result.badgeCountAfterRevert = await countBadges();
  result.reverted = JSON.stringify(readDoc()) === JSON.stringify(originalQc);
}
console.log(JSON.stringify(result, null, 2));
await browser.close();

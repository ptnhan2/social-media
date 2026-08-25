import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, type Page, type Route } from "@playwright/test";

/**
 * Asset Studio E2E fixtures + bridge mocks.
 *
 * Everything the studio fetches is served from Playwright route mocks —
 * the suite never touches the python bridge, the network, or API keys.
 * The single fixture image (regions.png) is red/blue halves with a green
 * square in the middle so the magic wand has distinct flood-fill regions.
 */

export const PROJECT = "isaacverse-final";
const E2E_DIR = path.dirname(fileURLToPath(import.meta.url));
export const FIXTURE_PATH = path.join(E2E_DIR, "fixtures", "regions.png");
export const FIXTURE_PNG = fs.readFileSync(FIXTURE_PATH);
export const FIXTURE_B64 = FIXTURE_PNG.toString("base64");

/** Deterministic import path the mocks hand back for /api/assets/body. */
export const IMPORTED_PATH = `projects/${PROJECT}/assets/character/bodies/inbox/e2e-fixture.png`;
export const CUT_PATH = `projects/${PROJECT}/assets/character/bodies/inbox/e2e-fixture-cut.png`;

export const studioUrl = () => `/assets?project=${PROJECT}`;

/** Mock every /api/assets/* endpoint the studio talks to. */
export async function mockAssetApi(page: Page): Promise<void> {
  // bridge commands: one fixture response per op (postData() is sync)
  await page.route("**/api/assets/bridge", (route: Route) => {
    const raw = route.request().postData();
    const cmd = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    const op = String(cmd.op ?? "");
    const responses: Record<string, unknown> = {
      "list-inbox": { ok: true, files: [{ name: "e2e-fixture.png", path: IMPORTED_PATH }] },
      "list-poses": { ok: true, poses: [{ name: "present", anchor: {} }, { name: "think", anchor: {} }] },
      "list-recipes": {
        ok: true,
        recipes: {
          "character-head": {
            label: "Nhân vật hoạt hình",
            promptTemplate: "portrait of {style} character, {mood} expression",
            enabled: true,
            fields: [
              {
                name: "style",
                label: "Phong cách",
                options: [{ label: "comic ink" }, { label: "watercolor" }],
              },
              {
                name: "mood",
                label: "Tâm trạng",
                options: [{ label: "tự tin" }, { label: "tư duy" }],
              },
            ],
          },
        },
      },
      "save-recipe": { ok: true, id: "user-e2e" },
      "delete-recipe": { ok: true },
      "save-pose": { ok: true, name: String(cmd.name ?? "") },
      "remove-bg": { ok: true, out: CUT_PATH },
      "polygon-mask": { ok: true, out: CUT_PATH },
      generate: { ok: true, out: CUT_PATH },
    };
    const payload = responses[op] ?? { ok: true };
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(payload) });
  });

  // image serving: always the fixture PNG bytes
  await page.route("**/api/assets/file*", (route: Route) =>
    route.fulfill({ status: 200, contentType: "image/png", body: FIXTURE_PNG }));

  // uploads (import body / wand erase / save pose)
  await page.route("**/api/assets/body", (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ path: IMPORTED_PATH, rel: IMPORTED_PATH }),
    }));

  // stock search (never used in these tests, but keep it deterministic)
  await page.route("**/api/assets/search-stock*", (route: Route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ results: [], page: 1 }) }));
}

/** Fresh studio session (clear persisted state) with all APIs mocked. */
export async function openStudio(page: Page): Promise<void> {
  await page.goto(studioUrl());
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await expect(page.getByTestId("studio-canvas")).toBeVisible();
  await expect(page.getByTestId("tool-move")).toBeVisible();
}

/** Import the fixture image through the REAL drag-drop flow. */
export async function importFixtureImage(page: Page): Promise<void> {
  await page.evaluate(async (b64: string) => {
    const blob = await (await fetch(`data:image/png;base64,${b64}`)).blob();
    const dt = new DataTransfer();
    dt.items.add(new File([blob], "e2e-fixture.png", { type: "image/png" }));
    window.dispatchEvent(new CustomEvent("asset-studio:drop-files", { detail: dt.files }));
  }, FIXTURE_B64);
  await expect(page.getByTestId("layer-item-import-fixture").or(page.locator('[data-testid^="layer-item-"]').first())).toBeVisible({ timeout: 10_000 });
}

/** Studio state via the DEV-only window hook. */
export async function studioState(page: Page): Promise<StoreSnapshot> {
  return page.evaluate(() => {
    const studio = (window as unknown as { __studio?: { getState: () => unknown } }).__studio;
    return studio?.getState() as StoreSnapshot;
  });
}

export interface LayerSnapshot {
  id: string;
  name: string;
  path: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface StoreSnapshot {
  doc: { layers: LayerSnapshot[]; docWidth: number; docHeight: number };
  ui: {
    activeTool: string;
    selectedIds: string[];
    lasso: { points: { x: number; y: number }[]; closed: boolean };
    wand: { layerId: string; alphaMask: unknown } | null;
  };
  viewport: { scale: number; x: number; y: number };
  entries: { label: string; thumb?: string }[];
  pointer: number;
}

/** Convert a document point to page coordinates (where to click the canvas). */
export async function docPointToPage(page: Page, x: number, y: number): Promise<{ x: number; y: number }> {
  const info = await page.evaluate((pt: { x: number; y: number }) => {
    const studio = (window as unknown as { __studio?: { getState: () => StoreSnapshot } }).__studio;
    const state = studio?.getState();
    const stage = document.querySelector(".as4-stage-holder")?.getBoundingClientRect();
    const konva = document.querySelector(".as4-stage-holder .konvajs-content")?.getBoundingClientRect();
    const box = konva ?? stage;
    if (!state || !box) return null;
    // stage container maps doc coords via viewport: pageX = box.left + (docX * scale) + viewport.x
    return {
      x: box.left + pt.x * state.viewport.scale + state.viewport.x,
      y: box.top + pt.y * state.viewport.scale + state.viewport.y,
    };
  }, { x, y });
  if (!info) throw new Error("studio stage not measurable");
  return info;
}

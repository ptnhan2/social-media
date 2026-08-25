import { expect, test } from "@playwright/test";
import {
  docPointToPage,
  importFixtureImage,
  mockAssetApi,
  openStudio,
  studioState,
} from "./studioFixtures";

// The studio suite runs against the Vite dev server (playwright.config
// webServer on :5199) with EVERY /api/assets/* call mocked — see
// studioFixtures.ts. Konva interactions use real mouse events at doc-derived
// coordinates; assertions use DOM (data-testid) + the DEV-only store hook.

test.beforeEach(async ({ page }) => {
  await mockAssetApi(page);
  await openStudio(page);
});

test.describe("boot", () => {
  test("renders the 7 tools, panels and status bar", async ({ page }) => {
    for (const tool of ["move", "lasso", "wand", "eraser", "bgremove", "zoom", "hand"]) {
      await expect(page.getByTestId(`tool-${tool}`)).toBeVisible();
    }
    await expect(page.getByTestId("statusbar")).toBeVisible();
    await expect(page.getByTestId("history-list")).toBeVisible();
    // empty state hint before any import
    await expect(page.getByText("Chưa có layer")).toBeVisible();
  });

  test("shortcut cheat sheet opens with ?", async ({ page }) => {
    await page.keyboard.press("?");
    await expect(page.locator(".as4-shortcuts-modal")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(".as4-shortcuts-modal")).toBeHidden();
  });
});

test.describe("import + layers", () => {
  test("drop-files imports a layer and records history", async ({ page }) => {
    await importFixtureImage(page);
    const state = await studioState(page);
    expect(state.doc.layers).toHaveLength(1);
    expect(state.doc.layers[0].name).toContain("e2e-fixture");
    // first import sets the doc to the image size (120x80 fixture)
    expect(state.doc.docWidth).toBe(120);
    expect(state.doc.docHeight).toBe(80);
    // history has the import entry (thumbnail lands async ~120ms after commit)
    await expect
      .poll(async () => {
        const st = await studioState(page);
        const entry = st.entries.find((e) => e.label.startsWith("Import"));
        return entry?.thumb ?? null;
      })
      .toBeTruthy();
  });

  test("rename via double-click records a Rename history entry", async ({ page }) => {
    await importFixtureImage(page);
    const layer = page.locator('[data-testid^="layer-item-"]').first();
    await layer.dblclick();
    await page.locator(".as4-rename-input").fill("hero body");
    await page.keyboard.press("Enter");
    await expect
      .poll(async () => (await studioState(page)).doc.layers[0].name)
      .toBe("hero body");
    await expect
      .poll(async () => (await studioState(page)).entries.some((e) => e.label.startsWith("Rename")))
      .toBe(true);
  });

  test("session persists across reload (layers + history)", async ({ page }) => {
    await importFixtureImage(page);
    // session persist is debounced 400ms — wait until localStorage holds the layer
    await expect
      .poll(async () =>
        page.evaluate(() => {
          try {
            const raw = window.localStorage.getItem("asset-studio:isaacverse-final");
            return raw ? (JSON.parse(raw) as { doc?: { layers?: unknown[] } }).doc?.layers?.length ?? 0 : 0;
          } catch {
            return 0;
          }
        }),
      )
      .toBeGreaterThan(0);
    await page.reload();
    await expect(page.getByTestId("studio-canvas")).toBeVisible();
    const state = await studioState(page);
    expect(state.doc.layers).toHaveLength(1);
    expect(state.doc.docWidth).toBe(120);
    expect(state.entries.some((e) => e.label.startsWith("Import"))).toBe(true);
  });
});

test.describe("undo / redo", () => {
  test("undo removes the imported layer, redo restores it", async ({ page }) => {
    await importFixtureImage(page);
    await page.getByTitle("Ctrl+Z").click();
    let state = await studioState(page);
    expect(state.doc.layers).toHaveLength(0);
    // the empty-state hint is back
    await expect(page.getByText("Chưa có layer")).toBeVisible();

    await page.getByTitle("Ctrl+Shift+Z").click();
    state = await studioState(page);
    expect(state.doc.layers).toHaveLength(1);
  });
});

test.describe("tools", () => {
  test("clicking a tool activates it (button + state)", async ({ page }) => {
    await expect(page.getByTestId("tool-move")).toHaveAttribute("data-active", "true");
    await page.getByTestId("tool-lasso").click();
    await expect(page.getByTestId("tool-lasso")).toHaveAttribute("data-active", "true");
    const state = await studioState(page);
    expect(state.ui.activeTool).toBe("lasso");
  });

  test("zoom-to-selection frames the selected layer", async ({ page }) => {
    await importFixtureImage(page);
    // select the layer in the panel first
    await page.locator('[data-testid^="layer-item-"]').first().click();
    const before = (await studioState(page)).viewport.scale;
    await page.getByTitle("Zoom to selection").click();
    const after = (await studioState(page)).viewport.scale;
    expect(after).not.toBeCloseTo(before, 4);
  });

  test("lasso: click points, close, apply cut calls the bridge and replaces the layer", async ({ page }) => {
    await importFixtureImage(page);
    await page.locator('[data-testid^="layer-item-"]').first().click();
    await page.getByTestId("tool-lasso").click();

    // four points around the middle of the doc (quadrilateral)
    const doc = (await studioState(page)).doc;
    const pts = [
      { x: doc.docWidth * 0.3, y: doc.docHeight * 0.2 },
      { x: doc.docWidth * 0.7, y: doc.docHeight * 0.2 },
      { x: doc.docWidth * 0.7, y: doc.docHeight * 0.8 },
      { x: doc.docWidth * 0.3, y: doc.docHeight * 0.8 },
    ];
    for (const pt of pts) {
      const at = await docPointToPage(page, pt.x, pt.y);
      await page.mouse.click(at.x, at.y);
    }
    let state = await studioState(page);
    expect(state.ui.lasso.points).toHaveLength(4);

    // close the polygon (Khép) then apply the cut (mocked bridge)
    await page.getByRole("button", { name: "Khép" }).click();
    state = await studioState(page);
    expect(state.ui.lasso.closed).toBe(true);

    await page.getByRole("button", { name: /Apply cut/i }).click();
    await expect
      .poll(async () => (await studioState(page)).entries.some((e) => e.label.startsWith("Lasso cut")))
      .toBe(true);
    // lasso resets to move tool after apply
    expect((await studioState(page)).ui.activeTool).toBe("move");
  });

  test("wand: selecting the red region stores a mask; Delete erases it", async ({ page }) => {
    await importFixtureImage(page);
    await page.locator('[data-testid^="layer-item-"]').first().click();
    await page.getByTestId("tool-wand").click();

    // click the left (red) half of the fixture, well away from the green square
    const doc = (await studioState(page)).doc;
    const at = await docPointToPage(page, doc.docWidth * 0.15, doc.docHeight * 0.5);
    await page.mouse.click(at.x, at.y);

    await expect
      .poll(async () => (await studioState(page)).ui.wand !== null)
      .toBe(true);

    await page.keyboard.press("Delete");
    await expect
      .poll(async () => (await studioState(page)).entries.some((e) => e.label.startsWith("Magic erase")))
      .toBe(true);
  });

  test("eraser: dragging over the layer replaces its image (history entry)", async ({ page }) => {
    await importFixtureImage(page);
    await page.locator('[data-testid^="layer-item-"]').first().click();
    await page.getByTestId("tool-eraser").click();

    const doc = (await studioState(page)).doc;
    const start = await docPointToPage(page, doc.docWidth * 0.2, doc.docHeight * 0.5);
    const end = await docPointToPage(page, doc.docWidth * 0.8, doc.docHeight * 0.5);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 12 });
    await page.mouse.up();

    await expect
      .poll(async () => (await studioState(page)).entries.some((e) => e.label.startsWith("Eraser") || e.label.startsWith("Erase")))
      .toBe(true);
  });
});

test.describe("import panel (mocked bridge)", () => {
  test("poses list renders from list-poses", async ({ page }) => {
    await expect(page.getByText("present", { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("think", { exact: true })).toBeVisible();
  });

  test("inbox grid renders the mocked recent file (upload tab)", async ({ page }) => {
    await page.getByRole("button", { name: "Upload", exact: true }).click();
    // lazy-loaded thumbs start at zero height — assert attachment, not visibility
    await expect(page.getByTestId("inbox-grid")).toBeAttached({ timeout: 10_000 });
    await expect(page.locator('[data-testid="inbox-grid"] .as4-stock-item')).toHaveCount(1);
    await expect(page.locator('[data-testid="inbox-grid"] .as4-stock-item')).toHaveAttribute("title", /e2e-fixture\.png/);
  });
});

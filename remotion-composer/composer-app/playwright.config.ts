import { defineConfig, devices } from "@playwright/test";

/**
 * Asset Studio E2E — deterministic, fully mocked bridge.
 *
 * Strategy (ASSET-STUDIO-SPEC §8):
 * - The Vite dev server (with its /api middleware) boots on a DEDICATED port
 *   so the suite never fights the developer's :5174 server.
 * - Every /api/assets/* call is mocked via page.route with fixture data —
 *   no python bridge, no network, no API keys. Konva canvas interactions are
 *   driven with real mouse events; assertions run against DOM state
 *   (data-testid anchors) + Konva node attributes, NEVER canvas pixels.
 * - Session persistence is tested with a REAL reload (localStorage).
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 40_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 4,
  reporter: process.env.CI ? [["list"]] : [["list"]],
  use: {
    baseURL: "http://localhost:5199",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npx vite --port 5199 --strictPort",
    url: "http://localhost:5199",
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});

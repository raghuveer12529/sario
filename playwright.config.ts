import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  // The multi-step buyer/vendor journeys drive the single-threaded Next.js dev
  // servers hard; too many parallel workers starves them and causes spurious
  // timeouts. Cap workers and allow one retry so the gate stays deterministic.
  workers: 2,
  retries: 1,
  reporter: [["html", { outputFolder: "playwright-report" }]],
  use: {
    baseURL: "http://localhost:3000",
    screenshot: "only-on-failure",
    navigationTimeout: 20000,
    actionTimeout: 15000,
    launchOptions: {
      slowMo: process.env.SLOW_MO ? parseInt(process.env.SLOW_MO) : 0,
    },
  },
  projects: [
    {
      name: "desktop-chrome",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 12"] },
    },
  ],
  /*
  webServer: {
    command: "pnpm --filter @sario/web dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  */
});

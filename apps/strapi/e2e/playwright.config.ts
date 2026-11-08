/**
 * Playwright config for the Strapi admin + public API acceptance suites.
 *
 * The stack is NOT started here (no `webServer`): run
 *   yarn workspace @tiween/admin e2e:up
 * first, then
 *   yarn workspace @tiween/admin test:e2e
 *
 * One worker, no parallelism: both suites publish and unpublish short films on
 * the same database, and the featured/related assertions read the live catalog.
 */
import { defineConfig, devices } from "@playwright/test"

import { BASE_URL, STORAGE_STATE } from "./helpers/env"

export default defineConfig({
  testDir: "./specs",
  // Under `.tmp/`: ESLint and the server tsconfig already ignore `**/.tmp/**`,
  // and the HTML report bundles a JS trace viewer that must never be linted.
  outputDir: "./.tmp/test-results",
  globalSetup: require.resolve("./global-setup"),
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [
    ["list"],
    ["html", { outputFolder: "./.tmp/playwright-report", open: "never" }],
  ],
  use: {
    baseURL: BASE_URL,
    storageState: STORAGE_STATE,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    locale: "en-US",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
  ],
})

/**
 * Logs in to the Strapi admin through the real login form once and saves the
 * browser session (cookies + localStorage) for every spec.
 *
 * "Remember me" is ticked on purpose: without it Strapi keeps the admin token in
 * sessionStorage, which Playwright's storageState does not capture.
 */
import fs from "node:fs"
import path from "node:path"

import { chromium, expect } from "@playwright/test"

import type { FullConfig } from "@playwright/test"

import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  BASE_URL,
  STORAGE_STATE,
} from "./helpers/env"

export default async function globalSetup(_config: FullConfig) {
  const health = await fetch(`${BASE_URL}/_health`).catch(() => null)
  if (!health || health.status >= 400) {
    throw new Error(
      `E2E stack is not reachable at ${BASE_URL} (GET /_health). ` +
        "Start it with `yarn workspace @tiween/admin e2e:up`."
    )
  }

  fs.mkdirSync(path.dirname(STORAGE_STATE), { recursive: true })

  const browser = await chromium.launch()
  const context = await browser.newContext({
    baseURL: BASE_URL,
    locale: "en-US",
  })
  const page = await context.newPage()

  try {
    await page.goto("/admin/auth/login")
    // Required fields render "Email*" / "Password*" labels: match the inputs.
    await page.locator("input[name='email']").fill(ADMIN_EMAIL)
    await page.locator("input[name='password']").fill(ADMIN_PASSWORD)
    const rememberMe = page.getByRole("checkbox", { name: /remember me/i })
    if (await rememberMe.count()) await rememberMe.check()
    await page.getByRole("button", { name: /^log ?in$/i }).click()

    await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 30_000 })
    await expect(page.getByRole("navigation").first()).toBeVisible({
      timeout: 30_000,
    })

    await context.storageState({ path: STORAGE_STATE })
  } catch (error) {
    await page
      .screenshot({
        path: path.join(path.dirname(STORAGE_STATE), "login-failure.png"),
      })
      .catch(() => undefined)
    throw error
  } finally {
    await browser.close()
  }
}

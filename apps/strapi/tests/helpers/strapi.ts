/**
 * Typed Strapi test helpers.
 *
 * Boots a real Strapi instance against SQLite (config/env/test/database.ts)
 * and tears it down cleanly. Reuses a single instance across tests in the
 * same file via the `instance` cache — re-booting Strapi takes 5-15s per
 * file, so we boot once per `describe` group.
 *
 * Usage:
 *   import { setupStrapi, cleanupStrapi } from "../../../../tests/helpers/strapi"
 *
 *   let strapi: Core.Strapi
 *
 *   beforeAll(async () => {
 *     strapi = await setupStrapi()
 *   })
 *
 *   afterAll(async () => {
 *     await cleanupStrapi()
 *   })
 */
import fs from "fs"

import type { Core } from "@strapi/strapi"

const path = require("path")

const { createStrapi } = require("@strapi/strapi")

let instance: Core.Strapi | undefined

export async function setupStrapi(): Promise<Core.Strapi> {
  if (instance) return instance

  process.env.NODE_ENV = "test"
  process.env.DATABASE_CLIENT = "sqlite"
  process.env.DATABASE_FILENAME =
    process.env.DATABASE_FILENAME ?? ".tmp/test.db"

  // Skip Strapi's TypeScript compile step during tests — the repo has
  // pre-existing unrelated TS errors in scripts/crawlers/ and we don't
  // want them to block test execution. The dist/ directory exists from
  // `strapi build`, so we point createStrapi() at it directly.
  const appDir = path.resolve(__dirname, "..", "..")
  const distDir = path.join(appDir, "dist")

  const app = await createStrapi({ appDir, distDir }).load()
  instance = app as Core.Strapi
  await instance.server.mount()
  return instance
}

export async function cleanupStrapi(): Promise<void> {
  if (!instance) return

  const dbSettings = instance.config.get("database.connection") as
    | { connection?: { filename?: string } }
    | undefined

  // strapi.destroy() cancels node-schedule cron jobs, closes server,
  // and tears down the DB pool in the right order. Without it, an in-flight
  // scheduled job can fire after we destroy the connection and throw an
  // unhandled `ERR_UNHANDLED_ERROR` that breaks `yarn test` exit code.

  await (instance as any).destroy()

  const tmpDbFile = dbSettings?.connection?.filename
  if (tmpDbFile && fs.existsSync(tmpDbFile)) {
    await fs.promises.unlink(tmpDbFile)
  }

  instance = undefined
}

export function getStrapi(): Core.Strapi {
  if (!instance) {
    throw new Error("Strapi not booted. Call setupStrapi() first.")
  }
  return instance
}

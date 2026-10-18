import request from "supertest"

import type { Core } from "@strapi/strapi"

import { createAdminSession } from "./helpers/admin"
import { cleanupStrapi, setupStrapi } from "./helpers/strapi"

/**
 * Characterization suite: the Strapi semantics Phase 1 (short-film catalog
 * backend) relies on, pinned against a real booted Strapi on SQLite.
 *
 * KEPT, not throwaway. Each `describe` block records what the installed Strapi
 * version ACTUALLY does for one assumption (A1..A13 in 01-RESEARCH.md) and
 * asserts it, so a Strapi upgrade that changes the behaviour fails here, loudly,
 * instead of silently breaking the publish guard, the importer or the locale
 * overlay built on top of it.
 *
 * Named `*.service.test.ts` so it only runs under the opt-in integration
 * project (`yarn workspace @tiween/admin test:integration`) and never in the
 * default `yarn test` gate. Boot suites must run serially (`--runInBand`).
 */

// Suite-specific SQLite file: must be set BEFORE the helpers are imported so a
// leaked `.tmp/test.db` from another suite is never reused.
process.env.DATABASE_FILENAME = ".tmp/strapi-semantics.db"

jest.setTimeout(120000)

let strapi: Core.Strapi
let adminToken: string
let destroyAdmin: () => Promise<void>

const api = () => request((strapi as any).server.httpServer)

beforeAll(async () => {
  strapi = await setupStrapi()
  const session = await createAdminSession(strapi)
  adminToken = session.token
  destroyAdmin = session.destroy
})

afterAll(async () => {
  await destroyAdmin?.()
  await cleanupStrapi()
})

describe("smoke: harness boots with the expected i18n and creative-works plugin", () => {
  it("resolves the default locale to fr", async () => {
    const defaultLocale = await strapi
      .plugin("i18n")
      .service("locales")
      .getDefaultLocale()
    expect(defaultLocale).toBe("fr")
  })

  it("answers the persons search route without a server error", async () => {
    const res = await api().get("/api/creative-works/persons/search?q=a")
    expect(res.status).toBeLessThan(500)
  })

  it("holds an admin session token", () => {
    expect(typeof adminToken).toBe("string")
    expect(adminToken.length).toBeGreaterThan(0)
  })
})

// @vitest-environment node
/**
 * REAL env-chain coverage for the purchase flag (Story 3.12).
 *
 * Every other suite stubs either `@/env.mjs` (post-validation shape) or
 * `@/lib/feature-flags` itself, so a wiring defect — e.g. a typo'd key in
 * `runtimeEnv`, or `optionalZodBoolean` not coercing the way the I/O matrix
 * promises — would ship with all tests green and the flag permanently OFF (or
 * ON). This suite exercises the unmocked chain:
 *
 *   process.env.NEXT_PUBLIC_TICKET_PURCHASE_ENABLED
 *     → env.mjs (createEnv + optionalZodBoolean)
 *       → isTicketPurchaseEnabled()
 *
 * Only `./navigation` is mocked (its `createNavigation` module-scope call
 * cannot run in the node test environment); env validation and the helper run
 * for real, re-imported per case via `vi.resetModules()`.
 */
import { afterAll, describe, expect, it, vi } from "vitest"

// `env.mjs` validates on import — seed the required server vars first (same
// pattern as the node-environment route suites).
process.env.NODE_ENV = "development"
process.env.APP_PUBLIC_URL ||= "http://localhost:3000"
process.env.STRAPI_URL ||= "http://strapi.test"
process.env.STRAPI_REST_READONLY_API_KEY ||= "test-key"

vi.mock("./navigation", () => ({
  routing: { locales: ["ar", "fr", "en"], defaultLocale: "fr" },
}))

async function flagWithRawEnv(value: string | undefined): Promise<boolean> {
  vi.resetModules()
  if (value === undefined) {
    delete process.env.NEXT_PUBLIC_TICKET_PURCHASE_ENABLED
  } else {
    process.env.NEXT_PUBLIC_TICKET_PURCHASE_ENABLED = value
  }
  const { isTicketPurchaseEnabled } = await import("./feature-flags")
  return isTicketPurchaseEnabled()
}

afterAll(() => {
  delete process.env.NEXT_PUBLIC_TICKET_PURCHASE_ENABLED
})

describe("isTicketPurchaseEnabled through the real env.mjs schema", () => {
  it('returns true for the literal "true"', async () => {
    await expect(flagWithRawEnv("true")).resolves.toBe(true)
  })

  it('coerces case-insensitively ("TRUE" enables)', async () => {
    await expect(flagWithRawEnv("TRUE")).resolves.toBe(true)
  })

  it("defaults OFF when the var is absent", async () => {
    await expect(flagWithRawEnv(undefined)).resolves.toBe(false)
  })

  it("treats the empty string as OFF (emptyStringAsUndefined)", async () => {
    await expect(flagWithRawEnv("")).resolves.toBe(false)
  })

  it('coerces a garbage value ("banana") to OFF, not a build error', async () => {
    await expect(flagWithRawEnv("banana")).resolves.toBe(false)
  })

  it('treats "false" as OFF', async () => {
    await expect(flagWithRawEnv("false")).resolves.toBe(false)
  })
})

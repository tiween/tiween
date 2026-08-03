/**
 * Unit tests for the Story 4.2 `ensureSocialProviders` grant-store bootstrap.
 * This bootstrap is the SOLE thing that makes the stock
 * `GET /auth/:provider/callback` reachable (it gates on the provider being
 * `enabled` in the grant store), so its idempotency + field-preservation matter.
 *
 * Env creds are cleared before import so the test is deterministic regardless of
 * the runner's environment (the module reads process.env at load time).
 */

type EnsureFn = (args: { strapi: any }) => Promise<void>

let ensureSocialProviders: EnsureFn

beforeAll(() => {
  delete process.env.GOOGLE_CLIENT_ID
  delete process.env.GOOGLE_CLIENT_SECRET
  delete process.env.GOOGLE_CALLBACK_URL
  delete process.env.FACEBOOK_CLIENT_ID
  delete process.env.FACEBOOK_CLIENT_SECRET
  delete process.env.FACEBOOK_CALLBACK_URL
  jest.resetModules()
  ;({ ensureSocialProviders } = require("./social-providers"))
})

function buildStrapi(initialGrant: unknown) {
  const get = jest.fn(async () => initialGrant)
  const set = jest.fn(async () => undefined)
  const strapi = {
    store: jest.fn(() => ({ get, set })),
    log: { info: jest.fn(), error: jest.fn() },
  }
  return { strapi, get, set }
}

describe("ensureSocialProviders (unit)", () => {
  it("enables google + facebook when the grant store has them disabled", async () => {
    const { strapi, set } = buildStrapi({
      google: { enabled: false },
      facebook: { enabled: false },
    })

    await ensureSocialProviders({ strapi })

    expect(set).toHaveBeenCalledTimes(1)
    const value = set.mock.calls[0][0].value
    expect(value.google.enabled).toBe(true)
    expect(value.facebook.enabled).toBe(true)
  })

  it("is idempotent: does not write when both providers are already enabled", async () => {
    const { strapi, set } = buildStrapi({
      google: { enabled: true },
      facebook: { enabled: true },
    })

    await ensureSocialProviders({ strapi })

    expect(set).not.toHaveBeenCalled()
  })

  it("preserves plugin-seeded fields (scope, icon) while flipping enabled", async () => {
    const { strapi, set } = buildStrapi({
      google: { enabled: false, icon: "google", scope: ["email"] },
      facebook: { enabled: false, icon: "facebook-square", scope: ["email"] },
    })

    await ensureSocialProviders({ strapi })

    const value = set.mock.calls[0][0].value
    expect(value.google).toMatchObject({
      enabled: true,
      icon: "google",
      scope: ["email"],
    })
  })

  it("handles a missing/empty grant store (null) without throwing", async () => {
    const { strapi, set } = buildStrapi(null)

    await expect(ensureSocialProviders({ strapi })).resolves.toBeUndefined()
    const value = set.mock.calls[0][0].value
    expect(value.google.enabled).toBe(true)
    expect(value.facebook.enabled).toBe(true)
  })
})

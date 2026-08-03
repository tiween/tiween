/**
 * Unit test for the venues bootstrap website-URL lifecycle (DW-15).
 *
 * The subscriber is the only layer that covers draft saves (the schema `regex`
 * is skipped for drafts by the entity validator) and Document Service / seed
 * writes, so its contract is pinned here with a mocked `strapi.db.lifecycles`:
 * a valid or absent `website` is a no-op, a malformed one throws before any DB
 * write, and the subscription targets `plugin::venues.venue`.
 */
import bootstrap from "../bootstrap"
import venuesPlugin from "../index"

type LifecycleHandler = (event: {
  params?: { data?: Record<string, unknown> | Record<string, unknown>[] }
}) => void | Promise<void>

interface Subscription {
  models: string[]
  beforeCreate: LifecycleHandler
  beforeCreateMany: LifecycleHandler
  beforeUpdate: LifecycleHandler
  beforeUpdateMany: LifecycleHandler
}

async function boot(): Promise<Subscription> {
  const subscribe = jest.fn()
  const strapi = {
    db: { lifecycles: { subscribe } },
    log: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
  } as unknown as Parameters<typeof bootstrap>[0]["strapi"]

  await bootstrap({ strapi })

  expect(subscribe).toHaveBeenCalledTimes(1)
  return subscribe.mock.calls[0][0] as Subscription
}

describe("venues bootstrap website validation (unit)", () => {
  it("subscribes the single AND bulk write hooks on plugin::venues.venue", async () => {
    const sub = await boot()

    expect(sub.models).toEqual(["plugin::venues.venue"])
    for (const hook of [
      "beforeCreate",
      "beforeCreateMany",
      "beforeUpdate",
      "beforeUpdateMany",
    ] as const) {
      expect(typeof sub[hook]).toBe("function")
    }
  })

  it("is the bootstrap the plugin actually registers", () => {
    // Without this, dropping `bootstrap` from the plugin's server entry would
    // leave every test above green while zero validation runs in production.
    expect(venuesPlugin.bootstrap).toBe(bootstrap)
  })

  it.each(["beforeCreate", "beforeUpdate"] as const)(
    "%s passes a valid website through",
    async (hook) => {
      const sub = await boot()

      expect(() =>
        sub[hook]({ params: { data: { website: "https://cinemamadart.tn" } } })
      ).not.toThrow()
    }
  )

  it.each(["beforeCreate", "beforeUpdate"] as const)(
    "%s passes a payload without a website key through",
    async (hook) => {
      const sub = await boot()

      expect(() =>
        sub[hook]({ params: { data: { name: "Madart" } } })
      ).not.toThrow()
      expect(() => sub[hook]({ params: {} })).not.toThrow()
      expect(() => sub[hook]({})).not.toThrow()
    }
  )

  it.each([
    ["free text", "pas de site"],
    ["javascript scheme", "javascript:alert(1)"],
    ["missing scheme", "cinemamadart.tn"],
    ["non-string", 42],
  ])(
    "beforeCreate rejects %s with the INVALID_WEBSITE_URL code",
    async (_label, value) => {
      const sub = await boot()

      expect(() =>
        sub.beforeCreate({ params: { data: { website: value } } })
      ).toThrow()

      try {
        sub.beforeCreate({ params: { data: { website: value } } })
      } catch (err) {
        expect(
          (err as { details?: { code?: string; field?: string } }).details
        ).toMatchObject({ code: "INVALID_WEBSITE_URL", field: "website" })
      }
    }
  )

  it("beforeUpdate rejects a malformed website (draft-save path)", async () => {
    const sub = await boot()

    expect(() =>
      sub.beforeUpdate({ params: { data: { website: "pas de site" } } })
    ).toThrow()
  })

  it("carries a human message alongside the code", async () => {
    const sub = await boot()

    expect(() =>
      sub.beforeCreate({ params: { data: { website: "pas de site" } } })
    ).toThrow("Invalid website URL")
  })

  // NOTE: this covers a future bulk caller, NOT `strapi import` — data-transfer
  // calls `db.lifecycles.disable()` for the whole restore, so no hook fires
  // there at all. See the KNOWN GAP note in `bootstrap.ts`.
  it("validates every entry of a createMany batch", async () => {
    const sub = await boot()

    expect(() =>
      sub.beforeCreateMany({
        params: {
          data: [
            { name: "A", website: "https://a.tn" },
            { name: "B" },
            { name: "C", website: "javascript:alert(1)" },
          ],
        },
      })
    ).toThrow("Invalid website URL")

    expect(() =>
      sub.beforeCreateMany({
        params: {
          data: [{ name: "A", website: "https://a.tn" }, { name: "B" }],
        },
      })
    ).not.toThrow()
  })

  it("validates the shared payload of an updateMany", async () => {
    const sub = await boot()

    expect(() =>
      sub.beforeUpdateMany({ params: { data: { website: "pas de site" } } })
    ).toThrow("Invalid website URL")

    expect(() =>
      sub.beforeUpdateMany({ params: { data: { status: "approved" } } })
    ).not.toThrow()
  })

  it("treats an empty string as clearing the field, not an error", async () => {
    const sub = await boot()

    expect(() =>
      sub.beforeCreate({ params: { data: { website: "" } } })
    ).not.toThrow()
    expect(() =>
      sub.beforeUpdate({ params: { data: { website: null } } })
    ).not.toThrow()
  })
})

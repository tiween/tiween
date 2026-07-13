import plugin from "../../index"
import routes from "../../routes"
import middlewares from "../index"

/**
 * Wiring guard for the DW-19 rate limiter (verification-gap closure).
 *
 * The limiter is unit-tested in isolation, but nothing otherwise verifies that
 * it is actually CONNECTED to its one route. Strapi resolves the route's string
 * `plugin::events-manager.trending-rate-limit` against the plugin's exported
 * `middlewares` map at boot; the unit gate never boots Strapi, so a rename/typo
 * on any side would silently ship an unthrottled route with a green suite. These
 * assertions pin the name across ALL THREE seams — the route reference, the
 * `middlewares/index.ts` map key, and the plugin-root default export that
 * registers that map — plus the route's attached config and the factory's config
 * forwarding.
 */

const MW_KEY = "trending-rate-limit"
const MW_NAME = `plugin::events-manager.${MW_KEY}`

function makeCtx(ip: string) {
  return {
    ip,
    state: {} as Record<string, unknown>,
    status: 200,
    set: jest.fn(),
    body: undefined as unknown,
  }
}

describe("trending rate-limit wiring (unit)", () => {
  it("exports the named middleware factory the route references", () => {
    expect(typeof middlewares[MW_KEY]).toBe("function")
  })

  it("registers the middleware map on the plugin's default export (boot-resolvable)", () => {
    // Strapi resolves `plugin::events-manager.trending-rate-limit` against the
    // plugin default export's `middlewares` property at boot. Dropping/renaming
    // that property (still valid TS ⇒ type-check green, other unit tests green)
    // would ship the route unthrottled. Pin the plugin-root seam to the same map.
    expect((plugin as any).middlewares).toBeDefined()
    expect((plugin as any).middlewares[MW_KEY]).toBe(middlewares[MW_KEY])
  })

  it("attaches exactly that middleware name to /events/trending only", () => {
    const contentApi = routes["content-api"].routes
    const trending = contentApi.find((r: any) => r.path === "/events/trending")

    expect(trending).toBeDefined()
    const entry = (trending as any).config.middlewares.find(
      (m: any) => m.name === MW_NAME
    )
    expect(entry).toBeDefined()
    // Pin the route's ACTUAL attached config (not just the name): a dropped or
    // wrong config here would otherwise silently fall back to the factory default.
    expect(entry.config).toEqual({ max: 100, windowMs: 60000 })
    const names = (trending as any).config.middlewares.map((m: any) => m.name)
    expect(names).toContain(MW_NAME)

    // The sibling routes stay untouched — no rate limiter leaks onto them.
    for (const path of ["/events", "/events/:documentId"]) {
      const r = contentApi.find((x: any) => x.path === path) as any
      expect(r?.config?.middlewares ?? []).toHaveLength(0)
    }
  })

  it("forwards the route's max/windowMs config into the limiter (not silently defaulted)", async () => {
    // Use a `max` that differs from the factory default (100) so a broken config
    // read (falling back to the default) would be caught: with max=2 the 3rd
    // in-window request must be rejected.
    const limiter = middlewares[MW_KEY](
      { max: 2, windowMs: 60_000 },
      { strapi: {} }
    )

    await limiter(
      makeCtx("1.1.1.1"),
      jest.fn(async () => {})
    )
    await limiter(
      makeCtx("1.1.1.1"),
      jest.fn(async () => {})
    )
    const third = makeCtx("1.1.1.1")
    const thirdNext = jest.fn(async () => {})
    await limiter(third, thirdNext)

    expect(third.status).toBe(429)
    expect(thirdNext).not.toHaveBeenCalled()
  })
})

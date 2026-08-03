import plugin from "../../index"
import middlewares from "../../middlewares"
import routes from "../index"

/**
 * The selector feed lives at a literal path under the same prefix as the
 * `:documentId` detail route. Koa matches in registration order, so if
 * `/venues/selector` ever drifts below `/venues/:documentId` the literal segment
 * is read as a documentId, `findVenue` 404s, and — because both the fetcher and
 * the picker are fail-soft — the venue filter silently vanishes site-wide with
 * no error surfaced. Pin the ordering.
 */
describe("venues plugin content-api routes", () => {
  const contentApiRoutes = routes["content-api"].routes

  const indexOf = (path: string) =>
    contentApiRoutes.findIndex((r) => r.method === "GET" && r.path === path)

  it("registers GET /venues/selector before GET /venues/:documentId", () => {
    const selector = indexOf("/venues/selector")
    const detail = indexOf("/venues/:documentId")

    expect(selector).toBeGreaterThanOrEqual(0)
    expect(detail).toBeGreaterThanOrEqual(0)
    expect(selector).toBeLessThan(detail)
  })

  it("exposes the selector feed publicly via the venue controller", () => {
    const selector = contentApiRoutes[indexOf("/venues/selector")]

    expect(selector.handler).toBe("venue.findVenuesForSelector")
    expect(selector.config.auth).toBe(false)
  })
})

/**
 * `POST /venues/register` (Story 7.1) is the public venue-application endpoint.
 * Three things about it are only observable from the route table and would
 * otherwise ship broken with a green suite: it must be reachable WITHOUT auth
 * (a venue owner has no account yet), it must carry the rate-limit middleware
 * (it is an unauthenticated write that provisions a user + a venue), and the
 * middleware name must resolve against the plugin's exported map at boot — the
 * unit gate never boots Strapi, so a rename on either side is invisible without
 * this pin.
 */
describe("venues plugin POST /venues/register route", () => {
  const contentApiRoutes = routes["content-api"].routes as any[]
  const MW_KEY = "registration-rate-limit"
  const MW_NAME = `plugin::venues.${MW_KEY}`

  const register = contentApiRoutes.find(
    (r) => r.method === "POST" && r.path === "/venues/register"
  )

  it("registers the route on the public content-api with auth disabled", () => {
    expect(register).toBeDefined()
    expect(register.handler).toBe("registration.register")
    expect(register.config.auth).toBe(false)
    expect(register.config.policies).toEqual([])
  })

  it("is declared before GET /venues/:documentId", () => {
    const registerIndex = contentApiRoutes.indexOf(register)
    const detailIndex = contentApiRoutes.findIndex(
      (r) => r.method === "GET" && r.path === "/venues/:documentId"
    )

    expect(registerIndex).toBeGreaterThanOrEqual(0)
    expect(detailIndex).toBeGreaterThanOrEqual(0)
    expect(registerIndex).toBeLessThan(detailIndex)
  })

  it("attaches the rate-limit middleware with an explicit config", () => {
    const entry = register.config.middlewares.find(
      (m: any) => m.name === MW_NAME
    )

    expect(entry).toBeDefined()
    // Pin the ACTUAL attached config: a dropped config would silently fall back
    // to the factory default rather than the intended budget.
    expect(entry.config).toEqual({ max: 200, windowMs: 3600000 })
  })

  /**
   * The limiter keys on `ctx.state?.ip ?? ctx.ip`, nothing sets `server.proxy`
   * and nothing populates `ctx.state.ip` — so behind the Next.js proxy ALL
   * legitimate traffic shares one bucket. The cap must therefore stay an abuse
   * backstop, well above any plausible legitimate hourly volume; a
   * business-sized cap (the old 10/hour) rejects the 11th applicant
   * PLATFORM-WIDE. Pin the floor so a future "tightening" cannot silently
   * reintroduce the outage.
   */
  it("keeps the global bucket sized as a backstop, not a business cap", () => {
    const entry = register.config.middlewares.find(
      (m: any) => m.name === MW_NAME
    )

    expect(entry.config.max).toBeGreaterThanOrEqual(100)
  })

  it("resolves that middleware name against the plugin's exported map", () => {
    expect(typeof (middlewares as any)[MW_KEY]).toBe("function")
    expect((plugin as any).middlewares).toBeDefined()
    expect((plugin as any).middlewares[MW_KEY]).toBe(
      (middlewares as any)[MW_KEY]
    )
  })

  it("leaks no rate limiter onto the public read routes", () => {
    for (const path of ["/venues", "/venues/selector", "/venues/:documentId"]) {
      const r = contentApiRoutes.find(
        (x) => x.method === "GET" && x.path === path
      )
      expect(r?.config?.middlewares ?? []).toHaveLength(0)
    }
  })
})

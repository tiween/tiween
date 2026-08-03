import plugin from "../../index"
import middlewares from "../../middlewares"
import policies from "../../policies"
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

/**
 * Story 7.2 adds four LITERAL segments under the `/venues/:documentId` prefix.
 * Koa matches in registration order, so any of them slipping below the id route
 * is read as a documentId: `/venues/me` would 404 for every manager and
 * `/venues/by-slug/x` would 404 for every public page — with a green suite,
 * because nothing else observes the route table.
 *
 * The auth/policy config is equally invisible from the handlers: dropping
 * `plugin::venues.is-venue-manager` would leave the endpoints reachable by any
 * signed-in B2C account, which is precisely the P0 boundary the epic names.
 */
describe("venues plugin story 7.2 routes", () => {
  const contentApiRoutes = routes["content-api"].routes as any[]

  const find = (method: string, path: string) =>
    contentApiRoutes.find((r) => r.method === method && r.path === path)

  const indexOf = (method: string, path: string) =>
    contentApiRoutes.findIndex((r) => r.method === method && r.path === path)

  const POLICY = "plugin::venues.is-venue-manager"

  const GUARDED: [string, string, string][] = [
    ["GET", "/venues/me", "venue-profile.getMine"],
    ["PUT", "/venues/me", "venue-profile.updateMine"],
    [
      "GET",
      "/venues/property-definitions",
      "venue-profile.propertyDefinitions",
    ],
  ]

  /**
   * AUTHENTICATION IS DECLARED BY OMITTING `config.auth`. `@strapi/core`'s
   * route schema (`services/server/routing.js`) validates it as
   * `yup.lazy(v => v === false ? boolean().required()
   *              : object({ scope: array().of(string()).required() }))`
   * under `strict: true`, so `auth: true` is NOT a valid value: it throws
   * `Invalid route config` at BOOT and takes the whole API down. Omitting the
   * key is what makes a content-api route authenticated AND permission-checked
   * against the caller's users-permissions role — the shape every other
   * authenticated route in this repo uses.
   */
  it.each(GUARDED)(
    "%s %s is authenticated (no `auth` key) AND carries the is-venue-manager policy",
    (method, path, handler) => {
      const route = find(method, path)

      expect(route).toBeDefined()
      expect(route.handler).toBe(handler)
      expect(route.config).not.toHaveProperty("auth")
      expect(route.config.policies).toEqual([POLICY])
    }
  )

  it("resolves that policy name against the plugin's exported map", () => {
    // The route string is `plugin::venues.is-venue-manager`; the key below is
    // what it resolves against at boot. The unit gate never boots Strapi, so a
    // rename on either side is otherwise invisible.
    expect(typeof (policies as any)["is-venue-manager"]).toBe("function")
    expect((plugin as any).policies).toBe(policies)
  })

  it("exposes GET /venues/by-slug/:slug publicly with no policy", () => {
    const route = find("GET", "/venues/by-slug/:slug")

    expect(route).toBeDefined()
    expect(route.handler).toBe("venue.findVenueBySlug")
    expect(route.config.auth).toBe(false)
    expect(route.config.policies).toEqual([])
  })

  it.each([
    ["GET", "/venues/me"],
    ["PUT", "/venues/me"],
    ["GET", "/venues/property-definitions"],
    ["GET", "/venues/by-slug/:slug"],
  ])("declares %s %s before GET /venues/:documentId", (method, path) => {
    const routeIndex = indexOf(method, path)
    const detailIndex = indexOf("GET", "/venues/:documentId")

    expect(routeIndex).toBeGreaterThanOrEqual(0)
    expect(detailIndex).toBeGreaterThanOrEqual(0)
    expect(routeIndex).toBeLessThan(detailIndex)
  })

  it("keeps the public reads free of the manager policy", () => {
    for (const path of [
      "/venues",
      "/venues/selector",
      "/venues/by-slug/:slug",
      "/venues/:documentId",
    ]) {
      expect(find("GET", path).config.policies).toEqual([])
    }
  })

  /**
   * BOOT GUARD. Strapi validates every route config with `strict: true`, and
   * `config.auth` only accepts `false` or an object `{ scope: string[] }` — a
   * truthy scalar such as `auth: true` throws `Invalid route config` before a
   * single request is served. No unit test observes boot, so without this pin a
   * boot-breaking route table ships with a fully green suite.
   */
  it("declares no route with a `config.auth` value other than false", () => {
    const allRoutes = [
      ...(routes["content-api"].routes as any[]),
      ...(routes["admin-api"].routes as any[]),
    ]

    for (const route of allRoutes) {
      const auth = route.config?.auth
      if (auth === undefined) continue
      expect({ path: route.path, method: route.method, auth }).toEqual({
        path: route.path,
        method: route.method,
        auth: false,
      })
    }
  })

  it("wires the profile handlers to controllers that actually exist", () => {
    const controllers = (plugin as any).controllers
    const profile = controllers["venue-profile"]({ strapi: {} as any })
    const venue = controllers.venue({ strapi: {} as any })

    for (const action of ["getMine", "updateMine", "propertyDefinitions"]) {
      expect(typeof profile[action]).toBe("function")
    }
    expect(typeof venue.findVenueBySlug).toBe("function")
  })
})

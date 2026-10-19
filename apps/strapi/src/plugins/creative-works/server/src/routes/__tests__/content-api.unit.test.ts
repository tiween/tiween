import contentApi from "../content-api"

/**
 * Route-table contract for the creative-works content API. Order matters:
 * `featured` must be registered above `:slug` or `:slug` captures "featured"
 * (research Pitfall 12), and `auth` is declared as `false` (never `true`, which
 * fails boot with `Invalid route config`).
 */

const RATE_LIMIT = "plugin::creative-works.short-films-rate-limit"

const routes = contentApi.routes as any[]

const SHORT_FILM_PATHS = [
  "/creative-works/short-films",
  "/creative-works/short-films/featured",
  "/creative-works/short-films/:slug/related",
  "/creative-works/short-films/:slug",
]

describe("creative-works content-api route table", () => {
  const shortFilmRoutes = routes.filter((r) =>
    r.path.startsWith("/creative-works/short-films")
  )

  it("lists the short-films routes in the order list, featured, :slug/related, :slug", () => {
    expect(shortFilmRoutes.map((r) => r.path)).toEqual(SHORT_FILM_PATHS)
  })

  it.each(SHORT_FILM_PATHS)(
    "%s is a public GET behind the rate limiter",
    (path) => {
      const route = shortFilmRoutes.find((r) => r.path === path)

      expect(route.method).toBe("GET")
      expect(route.handler.startsWith("short-film.")).toBe(true)
      expect(route.config.auth).toBe(false)
      expect(route.config.policies).toEqual([])
      expect(route.config.middlewares).toEqual([
        { name: RATE_LIMIT, config: { max: 600, windowMs: 60000 } },
      ])
    }
  )

  it("keeps /persons/search", () => {
    const route = routes.find((r) => r.path === "/persons/search")

    expect(route).toBeDefined()
    expect(route.handler).toBe("person.search")
  })
})

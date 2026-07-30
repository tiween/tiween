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

import controllers from "../index"

/**
 * Unit tests for `venue.findVenuesForSelector` query validation (DW-24/DW-25).
 *
 * Focus is the HTTP contract the service does not own:
 *  - Zod validation → `ctx.badRequest("INVALID_QUERY")` (a 400 CODE, never a
 *    500, never prose)
 *  - blank params are trimmed to `undefined` (absent), never a 400
 *  - unknown params are stripped rather than rejected
 *  - defaults (`page: 1`, `pageSize: 100`) reach the service
 *  - the happy path sets the service result directly on `ctx.body`
 */

const RESULT = {
  data: [{ documentId: "v1", name: "A", type: "cinema" }],
  meta: { pagination: { page: 1, pageSize: 100, pageCount: 1, total: 1 } },
}

function buildController(serviceOverrides: Record<string, jest.Mock> = {}) {
  const service = {
    findVenuesForSelector: jest.fn(async () => RESULT),
    ...serviceOverrides,
  }
  const strapi: any = {
    plugin: jest.fn(() => ({ service: jest.fn(() => service) })),
  }
  return { controller: controllers.venue({ strapi }), service }
}

function ctxWith(query: Record<string, unknown> = {}) {
  return {
    query,
    params: {},
    badRequest: jest.fn(),
    notFound: jest.fn(),
  } as any
}

describe("venue controller.findVenuesForSelector (unit)", () => {
  it("sets the service result on ctx.body and applies defaults", async () => {
    const { controller, service } = buildController()
    const ctx = ctxWith({ locale: "fr", type: "cinema" })

    await controller.findVenuesForSelector(ctx)

    expect(service.findVenuesForSelector).toHaveBeenCalledWith({
      locale: "fr",
      type: "cinema",
      page: 1,
      pageSize: 100,
    })
    expect(ctx.body).toEqual(RESULT)
    expect(ctx.badRequest).not.toHaveBeenCalled()
  })

  it("forwards city / region / include and explicit pagination", async () => {
    const { controller, service } = buildController()
    const ctx = ctxWith({
      city: "city-1",
      region: "region-1",
      include: "venue-9",
      page: "2",
      pageSize: "25",
    })

    await controller.findVenuesForSelector(ctx)

    expect(service.findVenuesForSelector).toHaveBeenCalledWith(
      expect.objectContaining({
        city: "city-1",
        region: "region-1",
        include: "venue-9",
        page: 2,
        pageSize: 25,
      })
    )
  })

  it("trims blank/whitespace params to undefined instead of 400ing", async () => {
    const { controller, service } = buildController()
    const ctx = ctxWith({ type: "", city: "  ", region: "", include: "" })

    await controller.findVenuesForSelector(ctx)

    expect(ctx.badRequest).not.toHaveBeenCalled()
    expect(service.findVenuesForSelector).toHaveBeenCalledWith({
      page: 1,
      pageSize: 100,
    })
  })

  it("treats blank page/pageSize as absent and applies the defaults", async () => {
    const { controller, service } = buildController()
    const ctx = ctxWith({ page: "", pageSize: "  " })

    await controller.findVenuesForSelector(ctx)

    expect(ctx.badRequest).not.toHaveBeenCalled()
    expect(service.findVenuesForSelector).toHaveBeenCalledWith({
      page: 1,
      pageSize: 100,
    })
  })

  it("strips unknown query params rather than rejecting them", async () => {
    const { controller, service } = buildController()
    const ctx = ctxWith({ _cacheBust: "123", filters: { status: "pending" } })

    await controller.findVenuesForSelector(ctx)

    expect(ctx.badRequest).not.toHaveBeenCalled()
    const args = service.findVenuesForSelector.mock.calls[0][0]
    expect(args).not.toHaveProperty("_cacheBust")
    expect(args).not.toHaveProperty("filters")
  })

  it.each([
    ["pageSize=0", { pageSize: "0" }],
    ["pageSize=abc", { pageSize: "abc" }],
    ["pageSize over the cap", { pageSize: "500" }],
    ["type=bogus", { type: "bogus" }],
    ["page=-1", { page: "-1" }],
    ["page=abc", { page: "abc" }],
    ["locale too short", { locale: "f" }],
    ["page beyond the depth cap", { page: "10000" }],
  ])("400s with INVALID_QUERY on %s (never a 500)", async (_label, query) => {
    const { controller, service } = buildController()
    const ctx = ctxWith(query)

    await controller.findVenuesForSelector(ctx)

    expect(ctx.badRequest).toHaveBeenCalledWith("INVALID_QUERY")
    expect(service.findVenuesForSelector).not.toHaveBeenCalled()
    expect(ctx.body).toBeUndefined()
  })

  it("tolerates a missing ctx.query", async () => {
    const { controller } = buildController()
    const ctx = ctxWith()
    ctx.query = undefined

    await controller.findVenuesForSelector(ctx)

    expect(ctx.badRequest).not.toHaveBeenCalled()
    expect(ctx.body).toEqual(RESULT)
  })
})

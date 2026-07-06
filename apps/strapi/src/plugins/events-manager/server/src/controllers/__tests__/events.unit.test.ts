import eventsController from "../events"

/**
 * Unit tests for the public `events` controllers (mocked Strapi, Story 3.1a).
 *
 * Focus is the HTTP contract the service does not own:
 *  - Zod query validation → `ctx.badRequest("INVALID_QUERY")` (a 400 CODE, not
 *    a 500, never prose)
 *  - happy path sets the service's v5 result directly on `ctx.body`
 *  - `findEvent` returns `ctx.notFound("EVENT_NOT_FOUND")` when absent
 */

function buildController(serviceOverrides: Record<string, jest.Mock> = {}) {
  const service = {
    findEvents: jest.fn(async () => ({
      data: [],
      meta: { pagination: { page: 1, pageSize: 25, pageCount: 0, total: 0 } },
    })),
    findTrending: jest.fn(async () => ({
      data: [],
      meta: { pagination: { page: 1, pageSize: 25, pageCount: 0, total: 0 } },
    })),
    findEvent: jest.fn(async () => ({ documentId: "e1" })),
    ...serviceOverrides,
  }
  const strapi: any = {
    plugin: jest.fn(() => ({ service: jest.fn(() => service) })),
  }
  return { controller: eventsController({ strapi }), service }
}

function ctxWith(overrides: Record<string, unknown> = {}) {
  return {
    query: {},
    params: {},
    badRequest: jest.fn(),
    notFound: jest.fn(),
    ...overrides,
  } as any
}

describe("events controller.findEvents (unit)", () => {
  it("sets the service v5 result on ctx.body for a valid query", async () => {
    const result = {
      data: [{ documentId: "e1" }],
      meta: { pagination: { page: 1, pageSize: 25, pageCount: 1, total: 1 } },
    }
    const { controller, service } = buildController({
      findEvents: jest.fn(async () => result),
    })
    const ctx = ctxWith({ query: { page: "1", featured: "true" } })

    await controller.findEvents(ctx)

    expect(service.findEvents).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, featured: true })
    )
    expect(ctx.body).toEqual(result)
    expect(ctx.badRequest).not.toHaveBeenCalled()
  })

  it("400s with INVALID_QUERY on a non-numeric page (never a 500)", async () => {
    const { controller, service } = buildController()
    const ctx = ctxWith({ query: { page: "abc" } })

    await controller.findEvents(ctx)

    expect(ctx.badRequest).toHaveBeenCalledWith("INVALID_QUERY")
    expect(service.findEvents).not.toHaveBeenCalled()
    expect(ctx.body).toBeUndefined()
  })

  it("400s with INVALID_QUERY on an unknown eventStatus", async () => {
    const { controller, service } = buildController()
    const ctx = ctxWith({ query: { eventStatus: "bogus" } })

    await controller.findEvents(ctx)

    expect(ctx.badRequest).toHaveBeenCalledWith("INVALID_QUERY")
    expect(service.findEvents).not.toHaveBeenCalled()
  })

  it("400s with INVALID_QUERY on a non-ISO startDate", async () => {
    const { controller } = buildController()
    const ctx = ctxWith({ query: { startDate: "07/05/2026" } })

    await controller.findEvents(ctx)

    expect(ctx.badRequest).toHaveBeenCalledWith("INVALID_QUERY")
  })

  it("400s with INVALID_QUERY when pageSize exceeds the cap", async () => {
    const { controller } = buildController()
    const ctx = ctxWith({ query: { pageSize: "5000" } })

    await controller.findEvents(ctx)

    expect(ctx.badRequest).toHaveBeenCalledWith("INVALID_QUERY")
  })

  it("accepts an allowlisted sort value", async () => {
    const { controller, service } = buildController()
    const ctx = ctxWith({ query: { sort: "title:desc" } })

    await controller.findEvents(ctx)

    expect(ctx.badRequest).not.toHaveBeenCalled()
    expect(service.findEvents).toHaveBeenCalledWith(
      expect.objectContaining({ sort: "title:desc" })
    )
  })

  it("400s with INVALID_QUERY on a non-allowlisted sort (no 500)", async () => {
    const { controller, service } = buildController()
    const ctx = ctxWith({ query: { sort: "ticketsSold:desc" } })

    await controller.findEvents(ctx)

    expect(ctx.badRequest).toHaveBeenCalledWith("INVALID_QUERY")
    expect(service.findEvents).not.toHaveBeenCalled()
  })

  it("accepts a valid range whose bounds carry different UTC offsets", async () => {
    const { controller, service } = buildController()
    // 12:00+05:00 = 07:00Z, before 09:00Z — a valid range. A lexical string
    // compare would wrongly reject this; the instant compare must accept it.
    const ctx = ctxWith({
      query: {
        startDate: "2026-01-01T12:00:00+05:00",
        endDate: "2026-01-01T09:00:00+00:00",
      },
    })

    await controller.findEvents(ctx)

    expect(ctx.badRequest).not.toHaveBeenCalled()
    expect(service.findEvents).toHaveBeenCalled()
  })

  it("400s with INVALID_QUERY when startDate is after endDate", async () => {
    const { controller } = buildController()
    const ctx = ctxWith({
      query: {
        startDate: "2026-08-01T00:00:00.000Z",
        endDate: "2026-07-01T00:00:00.000Z",
      },
    })

    await controller.findEvents(ctx)

    expect(ctx.badRequest).toHaveBeenCalledWith("INVALID_QUERY")
  })

  it("threads valid city + region location params through to the service", async () => {
    const { controller, service } = buildController()
    const ctx = ctxWith({ query: { city: "city-1", region: "region-1" } })

    await controller.findEvents(ctx)

    expect(ctx.badRequest).not.toHaveBeenCalled()
    expect(service.findEvents).toHaveBeenCalledWith(
      expect.objectContaining({ city: "city-1", region: "region-1" })
    )
  })

  it("ignores an empty location param (no 400, no location filter)", async () => {
    const { controller, service } = buildController()
    const ctx = ctxWith({ query: { region: "" } })

    await controller.findEvents(ctx)

    // Empty is stripped, not rejected: the request succeeds with no city/region.
    expect(ctx.badRequest).not.toHaveBeenCalled()
    const arg = service.findEvents.mock.calls[0][0]
    expect(arg.region).toBeUndefined()
    expect(arg.city).toBeUndefined()
  })

  it("ignores a whitespace-only location param (trimmed to no filter, no 400)", async () => {
    const { controller, service } = buildController()
    const ctx = ctxWith({ query: { region: "   " } })

    await controller.findEvents(ctx)

    // Whitespace-only trims to empty → stripped like "", not forwarded as a
    // documentId that would silently match nothing.
    expect(ctx.badRequest).not.toHaveBeenCalled()
    const arg = service.findEvents.mock.calls[0][0]
    expect(arg.region).toBeUndefined()
    expect(arg.city).toBeUndefined()
  })

  it("threads a valid locale through to the service", async () => {
    const { controller, service } = buildController()
    const ctx = ctxWith({ query: { locale: "ar" } })

    await controller.findEvents(ctx)

    expect(service.findEvents).toHaveBeenCalledWith(
      expect.objectContaining({ locale: "ar" })
    )
  })
})

describe("events controller.findTrending (unit)", () => {
  it("delegates to the trending service and sets ctx.body", async () => {
    const result = {
      data: [{ documentId: "t1" }],
      meta: { pagination: { page: 1, pageSize: 25, pageCount: 1, total: 1 } },
    }
    const { controller, service } = buildController({
      findTrending: jest.fn(async () => result),
    })
    const ctx = ctxWith({ query: {} })

    await controller.findTrending(ctx)

    expect(service.findTrending).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, pageSize: 25 })
    )
    expect(ctx.body).toEqual(result)
  })

  it("400s with INVALID_QUERY on an invalid trending page", async () => {
    const { controller } = buildController()
    const ctx = ctxWith({ query: { page: "-1" } })

    await controller.findTrending(ctx)

    expect(ctx.badRequest).toHaveBeenCalledWith("INVALID_QUERY")
  })
})

describe("events controller.findEvent (unit)", () => {
  it("sets data on ctx.body when the event exists", async () => {
    const { controller } = buildController({
      findEvent: jest.fn(async () => ({ documentId: "e1" })),
    })
    const ctx = ctxWith({ params: { documentId: "e1" } })

    await controller.findEvent(ctx)

    expect(ctx.body).toEqual({ data: { documentId: "e1" }, meta: {} })
    expect(ctx.notFound).not.toHaveBeenCalled()
  })

  it("returns EVENT_NOT_FOUND when the event is absent", async () => {
    const { controller } = buildController({
      findEvent: jest.fn(async () => null),
    })
    const ctx = ctxWith({ params: { documentId: "missing" } })

    await controller.findEvent(ctx)

    expect(ctx.notFound).toHaveBeenCalledWith("EVENT_NOT_FOUND")
    expect(ctx.body).toBeUndefined()
  })

  it("passes a valid locale query to the service", async () => {
    const findEvent = jest.fn(async () => ({ documentId: "e1" }))
    const { controller } = buildController({ findEvent })
    const ctx = ctxWith({
      params: { documentId: "e1" },
      query: { locale: "fr" },
    })

    await controller.findEvent(ctx)

    expect(findEvent).toHaveBeenCalledWith("e1", "fr")
  })

  it("400s with INVALID_QUERY on a malformed locale (same guard as list)", async () => {
    const findEvent = jest.fn(async () => ({ documentId: "e1" }))
    const { controller } = buildController({ findEvent })
    const ctx = ctxWith({
      params: { documentId: "e1" },
      query: { locale: "f" }, // 1 char — below the min(2) guard
    })

    await controller.findEvent(ctx)

    expect(ctx.badRequest).toHaveBeenCalledWith("INVALID_QUERY")
    expect(findEvent).not.toHaveBeenCalled()
  })
})

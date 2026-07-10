import ticketTiersController from "../ticket-tiers"

/**
 * Unit tests for the public `ticket-tiers` controller (mocked Strapi,
 * Story 6.1). Focus is the HTTP contract the service does not own:
 *  - Zod param/query validation -> `ctx.badRequest("INVALID_PARAMS")` (a 400
 *    CODE, not a 500, never prose)
 *  - a null service result -> `ctx.notFound("SUB_EVENT_NOT_FOUND")`
 *  - the happy path wraps the service result as the v5 `{ data, meta: {} }`
 *    envelope on `ctx.body`
 */

function buildController(
  findSubEventTicketTiers = jest.fn(async () => ({
    subEventId: "sc1",
    kind: "screening",
    startDateTime: null,
    currency: "TND",
    tiers: [],
  }))
) {
  const service = { findSubEventTicketTiers }
  const strapi: any = {
    plugin: jest.fn(() => ({ service: jest.fn(() => service) })),
  }
  return { controller: ticketTiersController({ strapi }), service }
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

describe("ticket-tiers controller.findTicketTiers (unit)", () => {
  it("wraps the service result as { data, meta: {} } on ctx.body for a valid id", async () => {
    const result = {
      subEventId: "sc1",
      kind: "screening",
      startDateTime: "2026-07-20T20:00:00.000Z",
      currency: "TND",
      tiers: [{ type: "standard", price: 15 }],
    }
    const { controller, service } = buildController(jest.fn(async () => result))
    const ctx = ctxWith({ params: { documentId: "sc1" } })

    await controller.findTicketTiers(ctx)

    expect(service.findSubEventTicketTiers).toHaveBeenCalledWith(
      "sc1",
      undefined
    )
    expect(ctx.body).toEqual({ data: result, meta: {} })
    expect(ctx.badRequest).not.toHaveBeenCalled()
    expect(ctx.notFound).not.toHaveBeenCalled()
  })

  it("passes a valid ?kind through to the service", async () => {
    const { controller, service } = buildController()
    const ctx = ctxWith({
      params: { documentId: "pf1" },
      query: { kind: "performance" },
    })

    await controller.findTicketTiers(ctx)

    expect(service.findSubEventTicketTiers).toHaveBeenCalledWith(
      "pf1",
      "performance"
    )
  })

  it("404s with SUB_EVENT_NOT_FOUND when the service returns null", async () => {
    const { controller } = buildController(jest.fn(async () => null as never))
    const ctx = ctxWith({ params: { documentId: "nope" } })

    await controller.findTicketTiers(ctx)

    expect(ctx.notFound).toHaveBeenCalledWith("SUB_EVENT_NOT_FOUND")
    expect(ctx.body).toBeUndefined()
  })

  it("400s with INVALID_PARAMS on a missing/empty documentId (never a 500)", async () => {
    const { controller, service } = buildController()
    const ctx = ctxWith({ params: { documentId: "" } })

    await controller.findTicketTiers(ctx)

    expect(ctx.badRequest).toHaveBeenCalledWith("INVALID_PARAMS")
    expect(service.findSubEventTicketTiers).not.toHaveBeenCalled()
    expect(ctx.body).toBeUndefined()
  })

  it("400s with INVALID_PARAMS on an unknown ?kind", async () => {
    const { controller, service } = buildController()
    const ctx = ctxWith({
      params: { documentId: "sc1" },
      query: { kind: "bogus" },
    })

    await controller.findTicketTiers(ctx)

    expect(ctx.badRequest).toHaveBeenCalledWith("INVALID_PARAMS")
    expect(service.findSubEventTicketTiers).not.toHaveBeenCalled()
  })
})

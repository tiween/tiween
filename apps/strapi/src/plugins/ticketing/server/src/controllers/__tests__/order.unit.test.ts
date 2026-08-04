import orderController from "../order"

/**
 * Unit tests for the ticketing order controller's error envelope (Story 6.3,
 * PATCH 6). Verifies that `respondError` maps recognized error CODES to their
 * HTTP status and surfaces `error.details.code` (the only thing the client
 * translates), while an UNMAPPED error collapses to a 500 `INTERNAL_ERROR` with
 * a static message that never leaks the internal exception text.
 */

function buildCtx() {
  return {
    request: { body: {}, header: {} as Record<string, unknown> },
    state: {},
    params: {},
    status: 0,
    body: undefined as any,
    badRequest: jest.fn(),
    notFound: jest.fn(),
    set: jest.fn(),
  }
}

function buildStrapi(initCheckout: jest.Mock) {
  return {
    plugin: jest.fn(() => ({
      service: () => ({ initCheckout }),
    })),
  } as any
}

/** Strapi mock exposing the Story 6.4 ticket-read service methods. */
function buildTicketStrapi(overrides: {
  findTicketsForUser?: jest.Mock
  findTicketsForOrder?: jest.Mock
}) {
  return {
    plugin: jest.fn(() => ({
      service: () => ({
        findTicketsForUser: overrides.findTicketsForUser ?? jest.fn(),
        findTicketsForOrder: overrides.findTicketsForOrder ?? jest.fn(),
      }),
    })),
  } as any
}

const TICKET_VIEW = {
  ticketNumber: "TW-1-1",
  type: "standard",
  status: "valid",
  price: 10,
  qrCode: "TWQ1.payload.sig",
  scannedAt: null,
  orderNumber: "TW-1",
  eventTitle: "Inception",
  startDateTime: "2026-08-20T19:30:00.000Z",
  venueName: "Cinéma Le Palace",
}

describe("order controller respondError (unit)", () => {
  it("maps a coded error to its status and surfaces details.code", async () => {
    const err = Object.assign(new Error("sold out"), {
      code: "TICKET_SOLD_OUT",
    })
    const ctx = buildCtx()
    const controller = orderController({
      strapi: buildStrapi(
        jest.fn(async () => {
          throw err
        })
      ),
    })

    await controller.create(ctx)

    expect(ctx.status).toBe(409)
    expect(ctx.body.error.details.code).toBe("TICKET_SOLD_OUT")
  })

  it("maps INVALID_ORDER to 400", async () => {
    const err = Object.assign(new Error("bad order"), { code: "INVALID_ORDER" })
    const ctx = buildCtx()
    const controller = orderController({
      strapi: buildStrapi(
        jest.fn(async () => {
          throw err
        })
      ),
    })

    await controller.create(ctx)

    expect(ctx.status).toBe(400)
    expect(ctx.body.error.details.code).toBe("INVALID_ORDER")
  })

  it("collapses an unmapped error to INTERNAL_ERROR + 500 + a static message (no leak)", async () => {
    const err = new Error("secret internal db connection detail")
    const ctx = buildCtx()
    const controller = orderController({
      strapi: buildStrapi(
        jest.fn(async () => {
          throw err
        })
      ),
    })

    await controller.create(ctx)

    expect(ctx.status).toBe(500)
    expect(ctx.body.error.details.code).toBe("INTERNAL_ERROR")
    expect(ctx.body.error.message).toBe("Checkout failed")
    expect(ctx.body.error.message).not.toContain("secret")
  })
})

describe("order.myTickets (unit)", () => {
  it("returns the caller's tickets, scoped by the JWT documentId", async () => {
    const findTicketsForUser = jest.fn(async () => [TICKET_VIEW])
    const ctx = buildCtx()
    ctx.state = { user: { documentId: "user-1" } } as any
    const controller = orderController({
      strapi: buildTicketStrapi({ findTicketsForUser }),
    })

    await controller.myTickets(ctx)

    expect(findTicketsForUser).toHaveBeenCalledWith("user-1")
    expect(ctx.body).toEqual({ data: [TICKET_VIEW] })
    // The body carries signed entry credentials and is authorized by a HEADER,
    // while every cache in front of Strapi keys on the URL alone.
    expect(ctx.set).toHaveBeenCalledWith("Cache-Control", "private, no-store")
  })

  it("answers 401 UNAUTHORIZED with no data when unauthenticated", async () => {
    const findTicketsForUser = jest.fn()
    const ctx = buildCtx()
    const controller = orderController({
      strapi: buildTicketStrapi({ findTicketsForUser }),
    })

    await controller.myTickets(ctx)

    expect(ctx.status).toBe(401)
    expect(ctx.body.error.details.code).toBe("UNAUTHORIZED")
    expect(ctx.body.data).toBeUndefined()
    expect(findTicketsForUser).not.toHaveBeenCalled()
  })
})

describe("order.orderTickets (unit)", () => {
  it("passes the order number, the JWT user and the header token to the service", async () => {
    const findTicketsForOrder = jest.fn(async () => [TICKET_VIEW])
    const ctx = buildCtx()
    ctx.params = { orderNumber: "TW-1" } as any
    ctx.request.header["x-order-access-token"] = "tok-1"
    ctx.state = { user: { documentId: "user-1" } } as any
    const controller = orderController({
      strapi: buildTicketStrapi({ findTicketsForOrder }),
    })

    await controller.orderTickets(ctx)

    expect(findTicketsForOrder).toHaveBeenCalledWith("TW-1", {
      userId: "user-1",
      accessToken: "tok-1",
    })
    expect(ctx.body).toEqual({ data: [TICKET_VIEW] })
    // Same URL for every holder of the order number, but the response is
    // token-authorized — a shared cache entry would hand one buyer's QR to the
    // next requester.
    expect(ctx.set).toHaveBeenCalledWith("Cache-Control", "private, no-store")
    expect(ctx.set).toHaveBeenCalledWith(
      "Vary",
      "Authorization, x-order-access-token"
    )
  })

  it("ignores a repeated access-token header (array) rather than passing it through", async () => {
    const findTicketsForOrder = jest.fn(async () => [])
    const ctx = buildCtx()
    ctx.params = { orderNumber: "TW-1" } as any
    ctx.request.header["x-order-access-token"] = ["a", "b"]
    const controller = orderController({
      strapi: buildTicketStrapi({ findTicketsForOrder }),
    })

    await controller.orderTickets(ctx)

    expect(findTicketsForOrder).toHaveBeenCalledWith("TW-1", {
      userId: undefined,
      accessToken: undefined,
    })
  })

  it("ignores a `?token=` query — the token is a header, never a URL", async () => {
    const findTicketsForOrder = jest.fn(async () => [])
    const ctx = buildCtx()
    ctx.params = { orderNumber: "TW-1" } as any
    ;(ctx as any).query = { token: "tok-in-url" }
    const controller = orderController({
      strapi: buildTicketStrapi({ findTicketsForOrder }),
    })

    await controller.orderTickets(ctx)

    expect(findTicketsForOrder).toHaveBeenCalledWith("TW-1", {
      userId: undefined,
      accessToken: undefined,
    })
  })

  it("maps FORBIDDEN to 403 with no ticket data", async () => {
    const findTicketsForOrder = jest.fn(async () => {
      throw Object.assign(new Error("nope"), { code: "FORBIDDEN" })
    })
    const ctx = buildCtx()
    ctx.params = { orderNumber: "TW-1" } as any
    ctx.request.header["x-order-access-token"] = "wrong"
    const controller = orderController({
      strapi: buildTicketStrapi({ findTicketsForOrder }),
    })

    await controller.orderTickets(ctx)

    expect(ctx.status).toBe(403)
    expect(ctx.body.error.details.code).toBe("FORBIDDEN")
    expect(ctx.body.data).toBeUndefined()
  })

  it("rejects a missing order number", async () => {
    const ctx = buildCtx()
    const controller = orderController({ strapi: buildTicketStrapi({}) })

    await controller.orderTickets(ctx)

    expect(ctx.badRequest).toHaveBeenCalled()
  })
})

describe("order.findByOrderNumber (unit)", () => {
  /** A fully populated order as the service returns it — secrets and all. */
  const RAW_ORDER = {
    documentId: "order-doc-1",
    orderNumber: "TW-1",
    paymentStatus: "paid",
    currency: "TND",
    totalAmount: 20,
    purchasedAt: "2026-08-04T10:00:00.000Z",
    // Must NEVER reach an anonymous caller of this public route.
    accessToken: "super-secret-access-token",
    guestEmail: "buyer@example.com",
    guestName: "Amine B",
    paymentReference: "ref-1",
    user: { documentId: "user-1" },
    tickets: [
      {
        ticketNumber: "TW-1-1",
        qrCode: "TWQ1.payload.sig",
        qrNonce: "secret-nonce",
      },
      {
        ticketNumber: "TW-1-2",
        qrCode: "TWQ1.payload2.sig2",
        qrNonce: "secret-nonce-2",
      },
    ],
  }

  function buildOrderStrapi(order: unknown) {
    return {
      plugin: jest.fn(() => ({
        service: () => ({ findByOrderNumber: jest.fn(async () => order) }),
      })),
    } as any
  }

  it("returns ONLY the allow-listed status projection", async () => {
    const ctx = buildCtx()
    ctx.params = { orderNumber: "TW-1" } as any
    const controller = orderController({ strapi: buildOrderStrapi(RAW_ORDER) })

    await controller.findByOrderNumber(ctx)

    expect(ctx.body).toEqual({
      data: {
        orderNumber: "TW-1",
        paymentStatus: "paid",
        currency: "TND",
        totalAmount: 20,
        purchasedAt: "2026-08-04T10:00:00.000Z",
        ticketCount: 2,
      },
    })
  })

  it("leaks no secret or PII on this PUBLIC route (custom controllers do not sanitize)", async () => {
    const ctx = buildCtx()
    ctx.params = { orderNumber: "TW-1" } as any
    const controller = orderController({ strapi: buildOrderStrapi(RAW_ORDER) })

    await controller.findByOrderNumber(ctx)
    const serialized = JSON.stringify(ctx.body)

    for (const secret of [
      "super-secret-access-token",
      "TWQ1.payload.sig",
      "secret-nonce",
      "buyer@example.com",
      "Amine B",
      "ref-1",
    ]) {
      expect(serialized).not.toContain(secret)
    }
  })

  it("404s an unknown order number", async () => {
    const ctx = buildCtx()
    ctx.params = { orderNumber: "NOPE" } as any
    const controller = orderController({ strapi: buildOrderStrapi(null) })

    await controller.findByOrderNumber(ctx)

    expect(ctx.notFound).toHaveBeenCalled()
    expect(ctx.body).toBeUndefined()
  })
})

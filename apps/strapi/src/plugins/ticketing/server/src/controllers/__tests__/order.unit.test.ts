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
    request: { body: {} },
    state: {},
    params: {},
    status: 0,
    body: undefined as any,
    badRequest: jest.fn(),
    notFound: jest.fn(),
  }
}

function buildStrapi(initCheckout: jest.Mock) {
  return {
    plugin: jest.fn(() => ({
      service: () => ({ initCheckout }),
    })),
  } as any
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

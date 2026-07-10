import webhookController, { PAYMENT_RESOLVED_EVENT } from "../webhook"

/**
 * Unit tests for the Konnect webhook controller (Story 6.3, PATCH 4).
 *
 * The webhook is UNSIGNED: it never trusts the request body. The controller
 * re-queries Konnect server-to-server for the AUTHORITATIVE status and emits a
 * generic `payments.payment.resolved` event (ticketing subscribes) carrying the
 * re-queried `{ orderId, status, paymentRef }` — never the request payload.
 */

interface StrapiOverrides {
  getPaymentStatus?: jest.Mock
  webhookSecret?: string
}

function buildStrapi(overrides: StrapiOverrides = {}) {
  const getPaymentStatus =
    overrides.getPaymentStatus ??
    jest.fn(async () => ({
      status: "paid",
      orderId: "TW-1",
      amount: 35000,
      paymentRef: "ref-1",
    }))
  const emit = jest.fn(async () => undefined)

  const strapi: any = {
    plugin: jest.fn(() => ({
      service: () => ({ getPaymentStatus }),
    })),
    eventHub: { emit },
    config: {
      get: jest.fn((key: string, fallback: unknown) =>
        key === "plugin::payments.webhookSecret"
          ? overrides.webhookSecret ?? fallback
          : fallback
      ),
    },
    log: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
  }

  return { strapi, getPaymentStatus, emit }
}

function buildCtx(
  init: {
    query?: Record<string, unknown>
    body?: Record<string, unknown>
    headers?: Record<string, unknown>
  } = {}
) {
  return {
    query: init.query ?? {},
    request: { body: init.body ?? {}, headers: init.headers ?? {} },
    status: 0,
    body: undefined as any,
  }
}

describe("webhook.handle (unit)", () => {
  it("missing payment_ref: 200, no re-query, no emit", async () => {
    const deps = buildStrapi()
    const controller = webhookController({ strapi: deps.strapi })
    const ctx = buildCtx()

    await controller.handle(ctx)

    expect(ctx.status).toBe(200)
    expect(ctx.body).toEqual({ received: true })
    expect(deps.getPaymentStatus).not.toHaveBeenCalled()
    expect(deps.emit).not.toHaveBeenCalled()
  })

  it("configured secret + mismatched token: 401 UNAUTHORIZED_WEBHOOK, no emit", async () => {
    const deps = buildStrapi({ webhookSecret: "s3cret" })
    const controller = webhookController({ strapi: deps.strapi })
    const ctx = buildCtx({ query: { payment_ref: "ref-1", token: "wrong" } })

    await controller.handle(ctx)

    expect(ctx.status).toBe(401)
    expect(ctx.body).toEqual({
      error: { details: { code: "UNAUTHORIZED_WEBHOOK" } },
    })
    expect(deps.getPaymentStatus).not.toHaveBeenCalled()
    expect(deps.emit).not.toHaveBeenCalled()
  })

  it("valid ref: re-queries Konnect and emits the AUTHORITATIVE result (not the body)", async () => {
    const deps = buildStrapi()
    const controller = webhookController({ strapi: deps.strapi })
    // The body carries a bogus status/order to prove it is ignored.
    const ctx = buildCtx({
      query: { payment_ref: "ref-1" },
      body: { status: "spoofed", orderId: "EVIL" },
    })

    await controller.handle(ctx)

    expect(deps.getPaymentStatus).toHaveBeenCalledWith("ref-1")
    expect(deps.emit).toHaveBeenCalledWith(PAYMENT_RESOLVED_EVENT, {
      orderId: "TW-1",
      status: "paid",
      paymentRef: "ref-1",
    })
    expect(ctx.status).toBe(200)
    expect(ctx.body).toEqual({ received: true })
  })

  it("re-query throws: still 200, no emit (no Konnect retry storm)", async () => {
    const deps = buildStrapi({
      getPaymentStatus: jest.fn(async () => {
        throw new Error("konnect down")
      }),
    })
    const controller = webhookController({ strapi: deps.strapi })
    const ctx = buildCtx({ query: { payment_ref: "ref-1" } })

    await controller.handle(ctx)

    expect(ctx.status).toBe(200)
    expect(ctx.body).toEqual({ received: true })
    expect(deps.emit).not.toHaveBeenCalled()
  })
})

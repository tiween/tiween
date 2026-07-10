import bootstrap from "../bootstrap"

/**
 * Unit test for the ticketing bootstrap eventHub subscription (Story 6.3,
 * PATCH 5). The `payments` plugin emits `payments.payment.resolved` from its
 * Konnect webhook (never importing ticketing); ticketing subscribes here and
 * runs the idempotent reconcile against `payload.orderId`. A payload without an
 * `orderId` must be a safe no-op.
 */

type Handler = (payload: {
  orderId?: string
  status?: string
  paymentRef?: string
}) => Promise<void> | void

function buildStrapi() {
  const handlers = new Map<string, Handler>()
  const reconcileFromGateway = jest.fn(async () => ({
    orderNumber: "TW-1",
    status: "paid",
    changed: true,
  }))
  const generateQRData = jest.fn(() => "qr")

  const strapi: any = {
    eventHub: {
      on: jest.fn((event: string, handler: Handler) => {
        handlers.set(event, handler)
      }),
    },
    db: {
      lifecycles: { subscribe: jest.fn() },
    },
    documents: jest.fn(() => ({ update: jest.fn(async () => ({})) })),
    plugin: jest.fn(() => ({
      service: () => ({ reconcileFromGateway, generateQRData }),
    })),
    log: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
  }

  return { strapi, handlers, reconcileFromGateway }
}

describe("ticketing bootstrap (unit)", () => {
  it("subscribes and reconciles the order from payload.orderId", async () => {
    const deps = buildStrapi()

    await bootstrap({ strapi: deps.strapi })

    const handler = deps.handlers.get("payments.payment.resolved")
    expect(handler).toBeDefined()

    await handler!({ orderId: "TW-9", status: "paid", paymentRef: "ref-9" })

    expect(deps.reconcileFromGateway).toHaveBeenCalledWith("TW-9")
  })

  it("no-ops when payload.orderId is missing", async () => {
    const deps = buildStrapi()

    await bootstrap({ strapi: deps.strapi })

    const handler = deps.handlers.get("payments.payment.resolved")
    await handler!({ status: "paid", paymentRef: "ref-9" })

    expect(deps.reconcileFromGateway).not.toHaveBeenCalled()
  })
})

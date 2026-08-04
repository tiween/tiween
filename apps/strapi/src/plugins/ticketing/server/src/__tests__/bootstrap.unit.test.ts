import bootstrap from "../bootstrap"

/**
 * Unit test for the ticketing bootstrap eventHub subscription (Story 6.3,
 * PATCH 5). The `payments` plugin emits `payments.payment.resolved` from its
 * Konnect webhook (never importing ticketing); ticketing subscribes here and
 * runs the idempotent reconcile against `payload.orderId`. A payload without an
 * `orderId` must be a safe no-op.
 *
 * Story 6.4 additionally asserts that bootstrap registers NO db lifecycle: the
 * old `ticket` `afterCreate` QR generator minted a credential at ORDER time,
 * i.e. before payment. Issuance now hangs off the paid CAS in
 * `reconcileFromGateway` instead.
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
  const documentUpdate = jest.fn(async () => ({}))

  const strapi: any = {
    eventHub: {
      on: jest.fn((event: string, handler: Handler) => {
        handlers.set(event, handler)
      }),
    },
    db: {
      lifecycles: { subscribe: jest.fn() },
    },
    documents: jest.fn(() => ({ update: documentUpdate })),
    plugin: jest.fn(() => ({
      service: () => ({ reconcileFromGateway }),
    })),
    log: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
  }

  return { strapi, handlers, reconcileFromGateway, documentUpdate }
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

  it("registers NO db lifecycle — a QR must not be minted at order time", async () => {
    const deps = buildStrapi()

    await bootstrap({ strapi: deps.strapi })

    expect(deps.strapi.db.lifecycles.subscribe).not.toHaveBeenCalled()
    expect(deps.documentUpdate).not.toHaveBeenCalled()
  })
})

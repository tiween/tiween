import orderService, { INVALID_ORDER, KONNECT_UNAVAILABLE } from "../order"

/**
 * Unit tests for the Story 6.3 checkout + reconciliation surface of the order
 * service (mocked Strapi — no DB, no boot). Covers the I/O matrix:
 *  - initCheckout: happy path, Konnect init-failure release, sold-out at
 *    reservation, ownership guard, server-trusted pricing mismatch.
 *  - reconcileFromGateway: paid, failed + single release, idempotent terminal,
 *    pending no-op.
 *
 * `payments.public-api` and `events-manager.public-api` are mocked; the real
 * `createOrder` Unit of Work runs against the mocked Document Service.
 */

interface DepOverrides {
  getSubEventContext?: jest.Mock
  adjustInventory?: jest.Mock
  initPayment?: jest.Mock
  getPaymentStatus?: jest.Mock
  documentCreate?: jest.Mock
  documentUpdate?: jest.Mock
  /** Mock for the atomic `strapi.db.query(ORDER_UID).updateMany` CAS. */
  updateMany?: jest.Mock
  findManyResult?: unknown[]
}

function buildStrapi(deps: DepOverrides = {}) {
  const getSubEventContext =
    deps.getSubEventContext ??
    jest.fn(async () => ({
      subEventId: "screening-1",
      kind: "screening",
      eventId: "event-1",
      tiers: [
        { type: "standard", price: 10 },
        { type: "vip", price: 25 },
      ],
    }))

  const adjustInventory = deps.adjustInventory ?? jest.fn(async () => undefined)
  const initPayment =
    deps.initPayment ??
    jest.fn(async () => ({
      payUrl: "https://pay.konnect/x",
      paymentRef: "ref-1",
    }))
  const getPaymentStatus =
    deps.getPaymentStatus ??
    jest.fn(async () => ({
      status: "paid",
      orderId: "TW-1",
      paymentRef: "ref-1",
    }))

  const documentCreate =
    deps.documentCreate ??
    jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({
      ...data,
      documentId: `doc-${data.ticketNumber ?? data.orderNumber}`,
    }))
  const documentUpdate = deps.documentUpdate ?? jest.fn(async () => ({}))
  const documentFindMany = jest.fn(async () => deps.findManyResult ?? [])
  // Atomic compare-and-set on the pending row; default = winner (count 1).
  const updateMany = deps.updateMany ?? jest.fn(async () => ({ count: 1 }))

  const eventsPublicApi = { getSubEventContext, adjustInventory }
  const paymentsPublicApi = { initPayment, getPaymentStatus }

  const strapi: any = {
    documents: jest.fn(() => ({
      create: documentCreate,
      update: documentUpdate,
      findMany: documentFindMany,
    })),
    plugin: jest.fn((name: string) => ({
      service: (svc: string) => {
        if (name === "events-manager" && svc === "public-api") {
          return eventsPublicApi
        }
        if (name === "payments" && svc === "public-api") {
          return paymentsPublicApi
        }
        return {}
      },
    })),
    config: { get: jest.fn((_key: string, fallback: unknown) => fallback) },
    log: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
    db: {
      transaction: jest.fn(async (cb: (ctx: { trx: unknown }) => unknown) =>
        cb({ trx: {} })
      ),
      query: jest.fn(() => ({ updateMany })),
    },
  }

  return {
    strapi,
    getSubEventContext,
    adjustInventory,
    initPayment,
    getPaymentStatus,
    documentCreate,
    documentUpdate,
    updateMany,
  }
}

const checkoutInput = {
  eventId: "event-1",
  screeningId: "screening-1",
  paymentMethod: "card",
  firstName: "Amine",
  lastName: "B",
  email: "buyer@example.com",
  tickets: [
    { type: "standard", price: 10 },
    { type: "vip", price: 25 },
  ],
}

describe("order.initCheckout (unit)", () => {
  it("happy path: reserves inventory, inits Konnect, persists ref + method", async () => {
    const deps = buildStrapi()
    const service = orderService({ strapi: deps.strapi })

    const result = await service.initCheckout(checkoutInput)

    // Reserved once (+2), no release.
    expect(deps.adjustInventory).toHaveBeenCalledTimes(1)
    expect(deps.adjustInventory).toHaveBeenCalledWith(
      "screening-1",
      "screening",
      2
    )

    // Konnect init with the TND total and selected method.
    expect(deps.initPayment).toHaveBeenCalledTimes(1)
    expect(deps.initPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        amountTND: 35,
        methods: ["card"],
        customer: expect.objectContaining({ email: "buyer@example.com" }),
      })
    )

    // Persisted paymentReference + method.
    expect(deps.documentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { paymentReference: "ref-1", paymentMethod: "card" },
      })
    )

    expect(result).toEqual({
      orderNumber: expect.stringMatching(/^TW-/),
      payUrl: "https://pay.konnect/x",
    })
  })

  it("Konnect init failure: releases inventory once and marks order failed", async () => {
    const deps = buildStrapi({
      initPayment: jest.fn(async () => {
        throw Object.assign(new Error("konnect down"), {
          code: "KONNECT_UNAVAILABLE",
        })
      }),
    })
    const service = orderService({ strapi: deps.strapi })

    await expect(service.initCheckout(checkoutInput)).rejects.toMatchObject({
      code: KONNECT_UNAVAILABLE,
    })

    // Reserve (+2) then release (-2) — exactly one release.
    expect(deps.adjustInventory).toHaveBeenCalledTimes(2)
    expect(deps.adjustInventory).toHaveBeenNthCalledWith(
      1,
      "screening-1",
      "screening",
      2
    )
    expect(deps.adjustInventory).toHaveBeenNthCalledWith(
      2,
      "screening-1",
      "screening",
      -2
    )

    // Order marked failed.
    expect(deps.documentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ paymentStatus: "failed" }),
      })
    )
  })

  it("sold out at reservation: no Konnect call, TICKET_SOLD_OUT surfaced", async () => {
    const soldOut = Object.assign(new Error("sold out"), {
      code: "TICKET_SOLD_OUT",
    })
    const deps = buildStrapi({
      adjustInventory: jest.fn(async () => {
        throw soldOut
      }),
    })
    const service = orderService({ strapi: deps.strapi })

    await expect(service.initCheckout(checkoutInput)).rejects.toMatchObject({
      code: "TICKET_SOLD_OUT",
    })
    expect(deps.initPayment).not.toHaveBeenCalled()
  })

  it("ownership guard: sub-event whose parent != eventId is rejected (INVALID_ORDER)", async () => {
    const deps = buildStrapi({
      getSubEventContext: jest.fn(async () => ({
        subEventId: "screening-1",
        kind: "screening",
        eventId: "OTHER-EVENT",
        tiers: [{ type: "standard", price: 10 }],
      })),
    })
    const service = orderService({ strapi: deps.strapi })

    await expect(service.initCheckout(checkoutInput)).rejects.toMatchObject({
      code: INVALID_ORDER,
    })
    expect(deps.adjustInventory).not.toHaveBeenCalled()
    expect(deps.initPayment).not.toHaveBeenCalled()
  })

  it("server-trusted pricing: a mismatched price is rejected (INVALID_ORDER)", async () => {
    const deps = buildStrapi({
      getSubEventContext: jest.fn(async () => ({
        subEventId: "screening-1",
        kind: "screening",
        eventId: "event-1",
        tiers: [
          { type: "standard", price: 10 },
          { type: "vip", price: 25 },
        ],
      })),
    })
    const service = orderService({ strapi: deps.strapi })

    // Client posts an inflated/discounted price for vip.
    const tampered = {
      ...checkoutInput,
      tickets: [{ type: "vip", price: 1 }],
    }

    await expect(service.initCheckout(tampered)).rejects.toMatchObject({
      code: INVALID_ORDER,
    })
    expect(deps.adjustInventory).not.toHaveBeenCalled()
    expect(deps.initPayment).not.toHaveBeenCalled()
  })

  it("unknown ticket type (not among the sub-event tiers) is rejected (INVALID_ORDER)", async () => {
    const deps = buildStrapi()
    const service = orderService({ strapi: deps.strapi })

    // "reduced" is a valid enum value but not one of the returned tiers
    // (standard/vip), so no `tier` matches → INVALID_ORDER (the `!tier` branch).
    const unknownType = {
      ...checkoutInput,
      tickets: [{ type: "reduced", price: 10 }],
    }

    await expect(
      service.initCheckout(unknownType as any)
    ).rejects.toMatchObject({
      code: INVALID_ORDER,
    })
    expect(deps.adjustInventory).not.toHaveBeenCalled()
    expect(deps.initPayment).not.toHaveBeenCalled()
  })

  it("missing guest identity (no email) is rejected before any write", async () => {
    const deps = buildStrapi()
    const service = orderService({ strapi: deps.strapi })

    const { email: _omit, ...noEmail } = checkoutInput

    await expect(service.initCheckout(noEmail as any)).rejects.toMatchObject({
      name: "ValidationError",
    })
    expect(deps.getSubEventContext).not.toHaveBeenCalled()
    expect(deps.adjustInventory).not.toHaveBeenCalled()
  })
})

function pendingOrder(overrides: Record<string, unknown> = {}) {
  return {
    documentId: "order-doc-1",
    orderNumber: "TW-1",
    paymentStatus: "pending",
    paymentReference: "ref-1",
    totalAmount: 35,
    screening: { documentId: "screening-1" },
    tickets: [{}, {}],
    ...overrides,
  }
}

describe("order.reconcileFromGateway (unit)", () => {
  it("paid: CAS-transitions to paid + purchasedAt, no inventory release", async () => {
    const deps = buildStrapi({
      findManyResult: [pendingOrder()],
      // 35 TND → 35000 millimes; matching amount + orderId.
      getPaymentStatus: jest.fn(async () => ({
        status: "paid",
        amount: 35000,
        orderId: "TW-1",
      })),
    })
    const service = orderService({ strapi: deps.strapi })

    const result = await service.reconcileFromGateway("TW-1")

    expect(result).toEqual({
      orderNumber: "TW-1",
      status: "paid",
      changed: true,
    })
    // Terminal transition claimed via the atomic conditional UPDATE.
    expect(deps.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { documentId: "order-doc-1", paymentStatus: "pending" },
        data: expect.objectContaining({ paymentStatus: "paid" }),
      })
    )
    expect(deps.adjustInventory).not.toHaveBeenCalled()
  })

  it("paid but amount mismatched: NOT marked paid, returns pending", async () => {
    const deps = buildStrapi({
      findManyResult: [pendingOrder()],
      // Konnect reports a collected amount that does not match the order total.
      getPaymentStatus: jest.fn(async () => ({
        status: "paid",
        amount: 99999,
        orderId: "TW-1",
      })),
    })
    const service = orderService({ strapi: deps.strapi })

    const result = await service.reconcileFromGateway("TW-1")

    expect(result).toEqual({
      orderNumber: "TW-1",
      status: "pending",
      changed: false,
    })
    // Must never claim the paid transition on a mismatched charge.
    expect(deps.updateMany).not.toHaveBeenCalled()
    expect(deps.adjustInventory).not.toHaveBeenCalled()
  })

  it("failed: CAS-transitions to failed and releases inventory exactly once", async () => {
    const deps = buildStrapi({
      findManyResult: [pendingOrder()],
      getPaymentStatus: jest.fn(async () => ({ status: "failed" })),
    })
    const service = orderService({ strapi: deps.strapi })

    const result = await service.reconcileFromGateway("TW-1")

    expect(result).toEqual({
      orderNumber: "TW-1",
      status: "failed",
      changed: true,
    })
    expect(deps.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { documentId: "order-doc-1", paymentStatus: "pending" },
        data: { paymentStatus: "failed" },
      })
    )
    expect(deps.adjustInventory).toHaveBeenCalledTimes(1)
    expect(deps.adjustInventory).toHaveBeenCalledWith(
      "screening-1",
      "screening",
      -2
    )
  })

  it("lost race on failed: CAS count 0 → no inventory release", async () => {
    const deps = buildStrapi({
      findManyResult: [pendingOrder()],
      getPaymentStatus: jest.fn(async () => ({ status: "failed" })),
      // Another reconcile already transitioned this order.
      updateMany: jest.fn(async () => ({ count: 0 })),
    })
    const service = orderService({ strapi: deps.strapi })

    const result = await service.reconcileFromGateway("TW-1")

    expect(result).toEqual({
      orderNumber: "TW-1",
      status: "failed",
      changed: false,
    })
    // The CAS loser must NOT release inventory (avoid double-release).
    expect(deps.adjustInventory).not.toHaveBeenCalled()
  })

  it("idempotent: an already-paid order is untouched (no re-query, no CAS)", async () => {
    const deps = buildStrapi({
      findManyResult: [pendingOrder({ paymentStatus: "paid" })],
    })
    const service = orderService({ strapi: deps.strapi })

    const result = await service.reconcileFromGateway("TW-1")

    expect(result).toEqual({
      orderNumber: "TW-1",
      status: "paid",
      changed: false,
    })
    expect(deps.getPaymentStatus).not.toHaveBeenCalled()
    expect(deps.updateMany).not.toHaveBeenCalled()
    expect(deps.adjustInventory).not.toHaveBeenCalled()
  })

  it("idempotent: an already-failed order is untouched (no re-query, no CAS, no release)", async () => {
    const deps = buildStrapi({
      findManyResult: [pendingOrder({ paymentStatus: "failed" })],
    })
    const service = orderService({ strapi: deps.strapi })

    const result = await service.reconcileFromGateway("TW-1")

    expect(result).toEqual({
      orderNumber: "TW-1",
      status: "failed",
      changed: false,
    })
    expect(deps.getPaymentStatus).not.toHaveBeenCalled()
    expect(deps.updateMany).not.toHaveBeenCalled()
    expect(deps.adjustInventory).not.toHaveBeenCalled()
  })

  it("pending gateway status leaves the order unchanged", async () => {
    const deps = buildStrapi({
      findManyResult: [pendingOrder()],
      getPaymentStatus: jest.fn(async () => ({ status: "pending" })),
    })
    const service = orderService({ strapi: deps.strapi })

    const result = await service.reconcileFromGateway("TW-1")

    expect(result).toEqual({
      orderNumber: "TW-1",
      status: "pending",
      changed: false,
    })
    expect(deps.updateMany).not.toHaveBeenCalled()
    expect(deps.adjustInventory).not.toHaveBeenCalled()
  })

  it("unknown order number is a safe no-op", async () => {
    const deps = buildStrapi({ findManyResult: [] })
    const service = orderService({ strapi: deps.strapi })

    const result = await service.reconcileFromGateway("NOPE")

    expect(result).toEqual({
      orderNumber: "NOPE",
      status: "not_found",
      changed: false,
    })
    expect(deps.getPaymentStatus).not.toHaveBeenCalled()
  })
})

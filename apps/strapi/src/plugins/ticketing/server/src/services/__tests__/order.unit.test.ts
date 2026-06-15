import orderService from "../order"

/**
 * Unit tests for the ticketing order service (mocked Strapi).
 *
 * These are the MUST-PASS gate for story 2C.4. They cover the transactional
 * unit-of-work invariants without booting Strapi:
 *  - happy path: order + N tickets created, inventory reserved once
 *  - oversell: adjustInventory throws TICKET_SOLD_OUT -> no order, no tickets
 *  - validation failure: bad input rejected before any write
 *  - mid-loop rollback: a ticket-create failure aborts the unit of work
 *
 * The concurrency guarantee is enforced by the atomic capacity-guarded UPDATE
 * inside events-manager `public-api.adjustInventory` (see that service's
 * `public-api.unit.test.ts`); here we assert the order service delegates the
 * reservation to it with the correct args and ordering.
 */

interface MockOrderDeps {
  adjustInventory?: jest.Mock
  documentCreate?: jest.Mock
}

function buildStrapi(deps: MockOrderDeps = {}) {
  const adjustInventory = deps.adjustInventory ?? jest.fn(async () => undefined)

  const documentCreate =
    deps.documentCreate ??
    jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({
      ...data,
      documentId: `doc-${data.ticketNumber ?? data.orderNumber}`,
    }))

  const docService = { create: documentCreate }

  const strapi: any = {
    documents: jest.fn(() => docService),
    plugin: jest.fn(() => ({
      service: jest.fn(() => ({ adjustInventory })),
    })),
    config: { get: jest.fn((_key: string, fallback: unknown) => fallback) },
    // Transaction passes through; a thrown callback rejects (rollback).
    db: {
      transaction: jest.fn(async (cb: (ctx: { trx: unknown }) => unknown) =>
        cb({ trx: { __trx: true } })
      ),
    },
  }

  return { strapi, adjustInventory, documentCreate }
}

const baseInput = {
  guestEmail: "buyer@example.com",
  guestName: "Buyer",
  eventId: "event-1",
  screeningId: "screening-1",
  tickets: [
    { type: "standard", price: 10 },
    { type: "vip", price: 25 },
  ],
}

describe("order.createOrder (unit)", () => {
  it("happy path: reserves inventory, creates order + N tickets", async () => {
    const { strapi, adjustInventory, documentCreate } = buildStrapi()
    const service = orderService({ strapi })

    const result = await service.createOrder(baseInput)

    // Inventory reserved exactly once, with +qty and the screening kind/id.
    expect(adjustInventory).toHaveBeenCalledTimes(1)
    expect(adjustInventory).toHaveBeenCalledWith("screening-1", "screening", 2)

    // One order + two tickets created (3 document creates total).
    expect(documentCreate).toHaveBeenCalledTimes(3)
    expect(result.tickets).toHaveLength(2)
    expect(result.order.totalAmount).toBe(35)
    expect(result.order.currency).toBe("TND")
    expect(result.order.screening).toBe("screening-1")

    // Reservation happens BEFORE the order is created.
    const adjustOrder = adjustInventory.mock.invocationCallOrder[0]
    const firstCreateOrder = documentCreate.mock.invocationCallOrder[0]
    expect(adjustOrder).toBeLessThan(firstCreateOrder)
  })

  it("uses configured default currency", async () => {
    const { strapi, documentCreate } = buildStrapi()
    strapi.config.get = jest.fn((key: string, fallback: unknown) =>
      key === "plugin::ticketing.defaultCurrency" ? "EUR" : fallback
    )
    const service = orderService({ strapi })

    await service.createOrder(baseInput)

    const orderCall = documentCreate.mock.calls[0][0]
    expect(orderCall.data.currency).toBe("EUR")
    expect(strapi.config.get).toHaveBeenCalledWith(
      "plugin::ticketing.defaultCurrency",
      "TND"
    )
  })

  it("oversell: TICKET_SOLD_OUT rejects the order, nothing is created", async () => {
    const soldOut = Object.assign(new Error("sold out"), {
      code: "TICKET_SOLD_OUT",
    })
    const { strapi, documentCreate } = buildStrapi({
      adjustInventory: jest.fn(async () => {
        throw soldOut
      }),
    })
    const service = orderService({ strapi })

    await expect(service.createOrder(baseInput)).rejects.toMatchObject({
      code: "TICKET_SOLD_OUT",
    })

    // No order and no tickets were created.
    expect(documentCreate).not.toHaveBeenCalled()
  })

  it("validation failure: missing XOR sub-event is rejected before any write", async () => {
    const { strapi, adjustInventory, documentCreate } = buildStrapi()
    const service = orderService({ strapi })

    // Neither screeningId nor performanceId -> XOR violation.
    const bad = { ...baseInput, screeningId: undefined }

    await expect(service.createOrder(bad as any)).rejects.toMatchObject({
      name: "ValidationError",
    })
    expect(adjustInventory).not.toHaveBeenCalled()
    expect(documentCreate).not.toHaveBeenCalled()
  })

  it("validation: null screeningId is treated as absent (XOR), routes to performance", async () => {
    const { strapi, adjustInventory } = buildStrapi()
    const service = orderService({ strapi })

    // screeningId: null must NOT count as a provided value; performanceId wins.
    await service.createOrder({
      ...baseInput,
      screeningId: null as any,
      performanceId: "performance-1",
    })

    expect(adjustInventory).toHaveBeenCalledWith(
      "performance-1",
      "performance",
      2
    )
  })

  it("validation failure: both screening AND performance is rejected (XOR)", async () => {
    const { strapi, adjustInventory } = buildStrapi()
    const service = orderService({ strapi })

    const bad = { ...baseInput, performanceId: "performance-9" }

    await expect(service.createOrder(bad)).rejects.toMatchObject({
      name: "ValidationError",
    })
    expect(adjustInventory).not.toHaveBeenCalled()
  })

  it("mid-loop ticket failure rolls back the unit of work", async () => {
    // Order create succeeds, second ticket create throws.
    let call = 0
    const documentCreate = jest.fn(async ({ data }: { data: any }) => {
      call += 1
      // call 1 = order, call 2 = ticket #1, call 3 = ticket #2 (fails)
      if (call === 3) {
        throw new Error("DB write failed mid-loop")
      }
      return { ...data, documentId: `doc-${call}` }
    })

    const { strapi, adjustInventory } = buildStrapi({ documentCreate })
    const service = orderService({ strapi })

    await expect(service.createOrder(baseInput)).rejects.toThrow(
      "DB write failed mid-loop"
    )

    // Inventory was reserved inside the same tx; the rejected transaction
    // callback signals a rollback to strapi.db.transaction.
    expect(adjustInventory).toHaveBeenCalledTimes(1)
    expect(strapi.db.transaction).toHaveBeenCalledTimes(1)
  })

  it("performance path: resolves the performance kind/id", async () => {
    const { strapi, adjustInventory, documentCreate } = buildStrapi()
    const service = orderService({ strapi })

    await service.createOrder({
      ...baseInput,
      screeningId: undefined,
      performanceId: "performance-1",
    })

    expect(adjustInventory).toHaveBeenCalledWith(
      "performance-1",
      "performance",
      2
    )
    const orderCall = documentCreate.mock.calls[0][0]
    expect(orderCall.data.performance).toBe("performance-1")
  })
})

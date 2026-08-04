import orderService, { FORBIDDEN } from "../order"

/**
 * Unit tests for the Story 6.4 ticket-read surface of the order service
 * (mocked Strapi — no DB, no boot). Covers the I/O matrix: owner reads own
 * tickets, guest reads by access token, wrong/missing token, unknown order
 * (indistinguishable from a wrong token), and an unpaid order (authorized but
 * `qrCode: null`). Also asserts the sanitized view never leaks guest PII, the
 * access token or the QR nonce.
 */

const ACCESS_TOKEN = "abcdefghijklmnopqrstuvwxyz012345"

function buildStrapi(findManyResult: unknown[] = []) {
  const documentFindMany = jest.fn(async () => findManyResult)

  const strapi: any = {
    documents: jest.fn(() => ({ findMany: documentFindMany })),
    plugin: jest.fn(() => ({ service: () => ({}) })),
    log: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
  }

  return { strapi, documentFindMany }
}

function paidOrder(overrides: Record<string, unknown> = {}) {
  return {
    documentId: "order-doc-1",
    orderNumber: "TW-1",
    paymentStatus: "paid",
    accessToken: ACCESS_TOKEN,
    // Fields that must NEVER reach a ticket view.
    guestEmail: "buyer@example.com",
    guestName: "Amine B",
    paymentReference: "ref-1",
    user: { documentId: "user-1" },
    event: {
      documentId: "event-1",
      title: "Inception",
      startDateTime: "2026-08-01T10:00:00.000Z",
      venue: { name: "Cinéma Le Palace" },
    },
    screening: { startDateTime: "2026-08-20T19:30:00.000Z" },
    tickets: [
      {
        ticketNumber: "TW-1-1",
        type: "standard",
        status: "valid",
        price: 10,
        qrCode: "TWQ1.payload.sig",
        qrNonce: "secret-nonce",
        scannedAt: null,
      },
    ],
    ...overrides,
  }
}

describe("order.findTicketsForUser (unit)", () => {
  it("returns sanitized views of the caller's paid orders only", async () => {
    const deps = buildStrapi([paidOrder()])
    const service = orderService({ strapi: deps.strapi })

    const views = await service.findTicketsForUser("user-1")

    expect(deps.documentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: { user: { documentId: "user-1" }, paymentStatus: "paid" },
      })
    )
    expect(views).toEqual([
      {
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
      },
    ])
  })

  it("never leaks guest PII, the access token or the QR nonce", async () => {
    const deps = buildStrapi([paidOrder()])
    const service = orderService({ strapi: deps.strapi })

    const serialized = JSON.stringify(
      await service.findTicketsForUser("user-1")
    )

    for (const secret of [
      "buyer@example.com",
      "Amine B",
      "ref-1",
      ACCESS_TOKEN,
      "secret-nonce",
    ]) {
      expect(serialized).not.toContain(secret)
    }
  })

  it("reads an UNBOUNDED page so a frequent buyer loses no older order", async () => {
    const deps = buildStrapi([paidOrder()])
    const service = orderService({ strapi: deps.strapi })

    await service.findTicketsForUser("user-1")

    expect(deps.documentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        // TOP-LEVEL `limit`, which is the only shape the Document Service
        // understands: `@strapi/utils`' query-param transformer accepts
        // `limit`/`start` at the top level and has no `pagination` key, so a
        // nested `pagination: { limit: -1 }` would express the intent without
        // ever applying it.
        limit: -1,
        // `purchasedAt` can be null on a self-healed/legacy paid order, so
        // `createdAt` is the deterministic tie-break.
        sort: ["purchasedAt:desc", "createdAt:desc"],
      })
    )
    const params = deps.documentFindMany.mock.calls[0][0]
    expect(params).not.toHaveProperty("pagination")
  })

  it("returns nothing without a user id (no unscoped read)", async () => {
    const deps = buildStrapi([paidOrder()])
    const service = orderService({ strapi: deps.strapi })

    expect(await service.findTicketsForUser("")).toEqual([])
    expect(deps.documentFindMany).not.toHaveBeenCalled()
  })
})

describe("order.findTicketsForOrder (unit)", () => {
  it("authorizes the owner by JWT-derived userId, without a token", async () => {
    const deps = buildStrapi([paidOrder()])
    const service = orderService({ strapi: deps.strapi })

    const views = await service.findTicketsForOrder("TW-1", {
      userId: "user-1",
    })

    expect(views).toHaveLength(1)
    expect(views[0].qrCode).toBe("TWQ1.payload.sig")
  })

  it("authorizes a guest holding the order access token", async () => {
    const deps = buildStrapi([paidOrder({ user: null })])
    const service = orderService({ strapi: deps.strapi })

    const views = await service.findTicketsForOrder("TW-1", {
      accessToken: ACCESS_TOKEN,
    })

    expect(views).toHaveLength(1)
  })

  it("rejects a wrong token with FORBIDDEN and no data", async () => {
    const deps = buildStrapi([paidOrder({ user: null })])
    const service = orderService({ strapi: deps.strapi })

    await expect(
      service.findTicketsForOrder("TW-1", { accessToken: "x".repeat(32) })
    ).rejects.toMatchObject({ code: FORBIDDEN })
  })

  it("rejects a missing token with FORBIDDEN", async () => {
    const deps = buildStrapi([paidOrder({ user: null })])
    const service = orderService({ strapi: deps.strapi })

    await expect(service.findTicketsForOrder("TW-1", {})).rejects.toMatchObject(
      { code: FORBIDDEN }
    )
  })

  it("rejects a non-owner's JWT with FORBIDDEN", async () => {
    const deps = buildStrapi([paidOrder()])
    const service = orderService({ strapi: deps.strapi })

    await expect(
      service.findTicketsForOrder("TW-1", { userId: "someone-else" })
    ).rejects.toMatchObject({ code: FORBIDDEN })
  })

  it("answers an unknown order number with the SAME FORBIDDEN (no enumeration oracle)", async () => {
    const deps = buildStrapi([])
    const service = orderService({ strapi: deps.strapi })

    await expect(
      service.findTicketsForOrder("UNKNOWN", { accessToken: "x" })
    ).rejects.toMatchObject({ code: FORBIDDEN })
  })

  it("authorizes an unpaid order but withholds the QR (qrCode: null)", async () => {
    const deps = buildStrapi([
      paidOrder({
        paymentStatus: "pending",
        user: null,
        tickets: [
          {
            ticketNumber: "TW-1-1",
            type: "standard",
            status: "valid",
            price: 10,
            qrCode: null,
            scannedAt: null,
          },
        ],
      }),
    ])
    const service = orderService({ strapi: deps.strapi })

    const views = await service.findTicketsForOrder("TW-1", {
      accessToken: ACCESS_TOKEN,
    })

    expect(views).toHaveLength(1)
    expect(views[0].qrCode).toBeNull()
  })
})

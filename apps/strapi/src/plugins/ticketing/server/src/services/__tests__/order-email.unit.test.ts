import { toBuffer } from "qrcode"

import orderEmailService from "../order-email"

/**
 * Unit tests for the Story 6.5 confirmation-email delivery engine (mocked
 * Strapi + mocked `qrcode` — no DB, no boot, no real PNG encoding). Covers the
 * I/O matrix rows: happy path (attachments, marker), idempotency, clear-on-
 * throw, partial-QR gate, recipient/locale resolution, non-paid skip.
 */

jest.mock("qrcode", () => ({
  toBuffer: jest.fn(async (text: string) => Buffer.from(`png:${text}`)),
}))

interface Overrides {
  findManyResult?: unknown[]
  updateMany?: jest.Mock
  send?: jest.Mock
}

function buildStrapi(deps: Overrides = {}) {
  const findMany = jest.fn(async () => deps.findManyResult ?? [])
  const updateMany = deps.updateMany ?? jest.fn(async () => ({ count: 1 }))
  const send = deps.send ?? jest.fn(async () => undefined)

  const strapi: any = {
    documents: jest.fn(() => ({ findMany })),
    db: { query: jest.fn(() => ({ updateMany })) },
    plugins: { email: { services: { email: { send } } } },
    log: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
  }

  return { strapi, findMany, updateMany, send }
}

function paidOrder(overrides: Record<string, unknown> = {}) {
  return {
    documentId: "order-doc-1",
    orderNumber: "TW-1",
    paymentStatus: "paid",
    totalAmount: 35,
    currency: "TND",
    locale: null,
    guestEmail: null,
    guestName: null,
    user: { email: "buyer@example.com", preferredLanguage: "fr" },
    event: {
      title: "Dune 3",
      venue: { name: "Le Colisée" },
    },
    screening: { startDateTime: "2026-09-01T19:00:00.000Z" },
    performance: null,
    tickets: [
      {
        ticketNumber: "TW-1-1",
        type: "standard",
        price: 10,
        qrCode: "TWQ1.payload-1",
      },
      {
        ticketNumber: "TW-1-2",
        type: "vip",
        price: 25,
        qrCode: "TWQ1.payload-2",
      },
    ],
    ...overrides,
  }
}

describe("order-email.sendForOrder (unit)", () => {
  it("happy path: claims the marker, sends one email with per-ticket QR PNGs + .ics", async () => {
    const deps = buildStrapi({ findManyResult: [paidOrder()] })
    const service = orderEmailService({ strapi: deps.strapi })

    await service.sendForOrder("TW-1")

    // Marker CAS claimed on the null-marker row only.
    expect(deps.updateMany).toHaveBeenCalledTimes(1)
    expect(deps.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          documentId: "order-doc-1",
          confirmationEmailSentAt: { $null: true },
        },
        data: { confirmationEmailSentAt: expect.any(Date) },
      })
    )

    // One send, to the account email.
    expect(deps.send).toHaveBeenCalledTimes(1)
    const sent = deps.send.mock.calls[0][0]
    expect(sent.to).toBe("buyer@example.com")
    expect(sent.subject).toContain("Dune 3")
    expect(sent.html).toContain("TW-1")

    // One PNG per ticket + one .ics.
    expect(sent.attachments).toHaveLength(3)
    expect(sent.attachments[0]).toMatchObject({
      filename: "TW-1-1.png",
      contentType: "image/png",
    })
    expect(sent.attachments[1]).toMatchObject({ filename: "TW-1-2.png" })
    expect(sent.attachments[2]).toMatchObject({
      filename: "TW-1.ics",
      contentType: "text/calendar",
    })
    expect(sent.attachments[2].content.toString("utf8")).toContain(
      "BEGIN:VCALENDAR"
    )

    // QR PNGs encode the signed token with the spec'd options.
    expect(toBuffer).toHaveBeenCalledWith("TWQ1.payload-1", {
      errorCorrectionLevel: "M",
      width: 512,
    })

    // The token never leaks into the HTML or subject.
    expect(sent.html).not.toContain("TWQ1.")
    expect(sent.subject).not.toContain("TWQ1.")

    // Plain-text alternative: content present, no markup, no token material.
    expect(sent.text).toContain("TW-1")
    expect(sent.text).toContain("Dune 3")
    expect(sent.text).not.toMatch(/<[a-z][^>]*>/i)
    for (const needle of ["TWQ1.", "accessToken", "qrNonce"]) {
      expect(sent.text).not.toContain(needle)
    }
  })

  it("idempotent: a claimed marker (count 0) sends nothing and writes nothing else", async () => {
    const deps = buildStrapi({
      findManyResult: [paidOrder()],
      updateMany: jest.fn(async () => ({ count: 0 })),
    })
    const service = orderEmailService({ strapi: deps.strapi })

    await service.sendForOrder("TW-1")

    expect(deps.updateMany).toHaveBeenCalledTimes(1)
    expect(deps.send).not.toHaveBeenCalled()
  })

  it("pre-check: a loaded row whose marker is already set performs no CAS write at all", async () => {
    const deps = buildStrapi({
      findManyResult: [
        paidOrder({ confirmationEmailSentAt: "2026-08-06T10:00:00.000Z" }),
      ],
    })
    const service = orderEmailService({ strapi: deps.strapi })

    await service.sendForOrder("TW-1")

    expect(deps.updateMany).not.toHaveBeenCalled()
    expect(deps.send).not.toHaveBeenCalled()
  })

  it("legacy unsigned qrCode (pre-6.4, DW-241): skips send without claiming the marker", async () => {
    const order = paidOrder()
    ;(order.tickets as Array<{ qrCode: string | null }>)[1].qrCode =
      "legacy-plain-json"
    const deps = buildStrapi({ findManyResult: [order] })
    const service = orderEmailService({ strapi: deps.strapi })

    await service.sendForOrder("TW-1")

    expect(deps.updateMany).not.toHaveBeenCalled()
    expect(deps.send).not.toHaveBeenCalled()
    expect(deps.strapi.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("legacy/unsigned")
    )
  })

  it("send throws: marker is best-effort cleared and the error is rethrown", async () => {
    const updateMany = jest.fn(async () => ({ count: 1 }))
    const deps = buildStrapi({
      findManyResult: [paidOrder()],
      updateMany,
      send: jest.fn(async () => {
        throw new Error("EMAIL_SEND_FAILED")
      }),
    })
    const service = orderEmailService({ strapi: deps.strapi })

    await expect(service.sendForOrder("TW-1")).rejects.toThrow(
      "EMAIL_SEND_FAILED"
    )

    // Claim, then clear.
    expect(updateMany).toHaveBeenCalledTimes(2)
    expect(updateMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { documentId: "order-doc-1" },
        data: { confirmationEmailSentAt: null },
      })
    )
  })

  it("partial QR issuance: skips without claiming the marker", async () => {
    const order = paidOrder()
    ;(order.tickets as Array<{ qrCode: string | null }>)[1].qrCode = null
    const deps = buildStrapi({ findManyResult: [order] })
    const service = orderEmailService({ strapi: deps.strapi })

    await service.sendForOrder("TW-1")

    expect(deps.updateMany).not.toHaveBeenCalled()
    expect(deps.send).not.toHaveBeenCalled()
    expect(deps.strapi.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("QR issuance incomplete")
    )
  })

  it("no tickets at all: skips without claiming the marker", async () => {
    const deps = buildStrapi({ findManyResult: [paidOrder({ tickets: [] })] })
    const service = orderEmailService({ strapi: deps.strapi })

    await service.sendForOrder("TW-1")

    expect(deps.updateMany).not.toHaveBeenCalled()
    expect(deps.send).not.toHaveBeenCalled()
  })

  it("no recipient: skips, logs, marker untouched", async () => {
    const deps = buildStrapi({
      findManyResult: [paidOrder({ user: null, guestEmail: null })],
    })
    const service = orderEmailService({ strapi: deps.strapi })

    await service.sendForOrder("TW-1")

    expect(deps.updateMany).not.toHaveBeenCalled()
    expect(deps.send).not.toHaveBeenCalled()
    expect(deps.strapi.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("no recipient")
    )
  })

  it("non-paid order: never emails", async () => {
    const deps = buildStrapi({
      findManyResult: [paidOrder({ paymentStatus: "failed" })],
    })
    const service = orderEmailService({ strapi: deps.strapi })

    await service.sendForOrder("TW-1")

    expect(deps.updateMany).not.toHaveBeenCalled()
    expect(deps.send).not.toHaveBeenCalled()
  })

  it("unknown order: safe no-op", async () => {
    const deps = buildStrapi({ findManyResult: [] })
    const service = orderEmailService({ strapi: deps.strapi })

    await service.sendForOrder("NOPE")

    expect(deps.updateMany).not.toHaveBeenCalled()
    expect(deps.send).not.toHaveBeenCalled()
  })

  it("guest order in Arabic: guest email, arabic copy, guestName greeting, Western numerals", async () => {
    const deps = buildStrapi({
      findManyResult: [
        paidOrder({
          user: null,
          guestEmail: "guest@example.com",
          guestName: "منال",
          locale: "ar",
        }),
      ],
    })
    const service = orderEmailService({ strapi: deps.strapi })

    await service.sendForOrder("TW-1")

    const sent = deps.send.mock.calls[0][0]
    expect(sent.to).toBe("guest@example.com")
    expect(sent.subject).toContain("تذاكرك")
    expect(sent.html).toContain("منال")
    expect(sent.html).not.toMatch(/[٠-٩۰-۹]/)
  })

  it("account order without order.locale falls back to user.preferredLanguage", async () => {
    const deps = buildStrapi({
      findManyResult: [
        paidOrder({
          locale: null,
          user: { email: "buyer@example.com", preferredLanguage: "en" },
        }),
      ],
    })
    const service = orderEmailService({ strapi: deps.strapi })

    await service.sendForOrder("TW-1")

    expect(deps.send.mock.calls[0][0].subject).toContain("Your tickets")
  })

  it("order.locale wins over user.preferredLanguage", async () => {
    const deps = buildStrapi({
      findManyResult: [
        paidOrder({
          locale: "en",
          user: { email: "buyer@example.com", preferredLanguage: "ar" },
        }),
      ],
    })
    const service = orderEmailService({ strapi: deps.strapi })

    await service.sendForOrder("TW-1")

    expect(deps.send.mock.calls[0][0].subject).toContain("Your tickets")
  })

  it("unsupported order.locale with a VALID preferredLanguage: the preference wins", async () => {
    const deps = buildStrapi({
      findManyResult: [
        paidOrder({
          locale: "de",
          user: { email: "buyer@example.com", preferredLanguage: "en" },
        }),
      ],
    })
    const service = orderEmailService({ strapi: deps.strapi })

    await service.sendForOrder("TW-1")

    expect(deps.send.mock.calls[0][0].subject).toContain("Your tickets")
  })

  it("both candidates unsupported: falls back to fr", async () => {
    const deps = buildStrapi({
      findManyResult: [
        paidOrder({
          locale: "de",
          user: { email: "buyer@example.com", preferredLanguage: "xx" },
        }),
      ],
    })
    const service = orderEmailService({ strapi: deps.strapi })

    await service.sendForOrder("TW-1")

    expect(deps.send.mock.calls[0][0].subject).toContain("Vos billets")
  })
})

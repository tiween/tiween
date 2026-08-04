import qrService, {
  MAX_EVENT_TITLE_LENGTH,
  QR_MALFORMED,
  QR_SIGNATURE_INVALID,
  QR_SIGNING_UNAVAILABLE,
  QR_TOKEN_PREFIX,
  QR_UNSUPPORTED_VERSION,
} from "../qr"

/**
 * Unit tests for the Story 6.4 `qr` service (mocked Strapi — no DB, no boot).
 * Covers the I/O matrix: mint/verify round-trip, tampering, unsupported
 * version, malformed input, the fail-closed unset-secret path, and
 * `issueForOrder`'s paid-only / idempotent / self-heal behavior.
 */

const SECRET = "test-qr-secret-do-not-use-in-prod"

interface DepOverrides {
  secret?: string
  findManyResult?: unknown[]
  /** Mock for the per-ticket compare-and-set `db.query(...).updateMany`. */
  ticketUpdateMany?: jest.Mock
}

function buildStrapi(deps: DepOverrides = {}) {
  const ticketUpdateMany =
    deps.ticketUpdateMany ?? jest.fn(async () => ({ count: 1 }))
  const documentFindMany = jest.fn(async () => deps.findManyResult ?? [])

  const strapi: any = {
    documents: jest.fn(() => ({
      findMany: documentFindMany,
    })),
    db: { query: jest.fn(() => ({ updateMany: ticketUpdateMany })) },
    config: {
      get: jest.fn((key: string, fallback: unknown) =>
        key === "plugin::ticketing.qrSecret" ? deps.secret ?? SECRET : fallback
      ),
    },
    log: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
  }

  return { strapi, ticketUpdateMany, documentFindMany }
}

function buildService(deps: DepOverrides = {}) {
  const built = buildStrapi(deps)
  return { ...built, service: qrService({ strapi: built.strapi }) }
}

const PAYLOAD_INPUT = {
  orderNumber: "TW-1",
  ticketNumber: "TW-1-1",
  ticketDocumentId: "ticket-doc-1",
  nonce: "nonce-1",
  ticketType: "standard",
  eventId: "event-1",
  eventTitle: "Inception",
  startDateTime: "2026-08-20T19:30:00.000Z",
}

describe("qr.mint / qr.verify (unit)", () => {
  it("round-trips a genuine token and carries order/ticket/event/showtime", () => {
    const { service } = buildService()

    const token = service.mint(service.buildPayload(PAYLOAD_INPUT))

    expect(token.startsWith(`${QR_TOKEN_PREFIX}.`)).toBe(true)
    expect(token.split(".")).toHaveLength(3)

    const result = service.verify(token)
    expect(result.valid).toBe(true)
    if (!result.valid) throw new Error("unreachable")
    expect(result.payload).toMatchObject({
      v: 1,
      o: "TW-1",
      t: "TW-1-1",
      ti: "ticket-doc-1",
      n: "nonce-1",
      ty: "standard",
      ev: "event-1",
      et: "Inception",
      st: "2026-08-20T19:30:00.000Z",
    })
    expect(typeof result.payload.iat).toBe("number")
  })

  it("rejects a tampered payload with QR_SIGNATURE_INVALID and no payload", () => {
    const { service } = buildService()

    const token = service.mint(service.buildPayload(PAYLOAD_INPUT))
    const [prefix, , signature] = token.split(".")

    // Re-encode an edited payload but keep the original signature.
    const forged = service.encode(
      service.buildPayload({ ...PAYLOAD_INPUT, ticketType: "vip" })
    )
    const result = service.verify(`${prefix}.${forged}.${signature}`)

    expect(result).toEqual({ valid: false, code: QR_SIGNATURE_INVALID })
  })

  it("rejects a token signed with a different secret", () => {
    const minted = buildService({ secret: "other-secret" })
    const token = minted.service.mint(
      minted.service.buildPayload(PAYLOAD_INPUT)
    )

    const { service } = buildService()
    expect(service.verify(token)).toEqual({
      valid: false,
      code: QR_SIGNATURE_INVALID,
    })
  })

  it.each([
    ["abc", QR_MALFORMED],
    ["", QR_MALFORMED],
    ["a.b", QR_MALFORMED],
    ["NOTAPREFIX.a.b", QR_MALFORMED],
    ["TWQ9.x.y", QR_UNSUPPORTED_VERSION],
  ])("rejects %p with %s", (token, code) => {
    const { service } = buildService()
    expect(service.verify(token)).toEqual({ valid: false, code })
  })

  it("rejects a non-string token", () => {
    const { service } = buildService()
    expect(service.verify(undefined)).toEqual({
      valid: false,
      code: QR_MALFORMED,
    })
  })

  it("rejects an undecodable payload segment that carries a valid signature", () => {
    const { service } = buildService()
    const segment = Buffer.from("not json").toString("base64url")
    const token = `${QR_TOKEN_PREFIX}.${segment}.${service.sign(segment)}`

    expect(service.verify(token)).toEqual({ valid: false, code: QR_MALFORMED })
  })

  it("fails closed when the secret is unset (mint throws, verify reports a code)", () => {
    const { service } = buildService({ secret: "" })

    let thrown: unknown
    try {
      service.mint(service.buildPayload(PAYLOAD_INPUT))
    } catch (err) {
      thrown = err
    }
    expect(thrown).toMatchObject({ code: QR_SIGNING_UNAVAILABLE })

    expect(service.verify(`${QR_TOKEN_PREFIX}.a.b`)).toEqual({
      valid: false,
      code: QR_SIGNING_UNAVAILABLE,
    })
  })

  it("generates a distinct nonce per call", () => {
    const { service } = buildService()
    const nonces = new Set(
      Array.from({ length: 50 }, () => service.generateNonce())
    )
    expect(nonces.size).toBe(50)
  })
})

function paidOrder(overrides: Record<string, unknown> = {}) {
  return {
    documentId: "order-doc-1",
    orderNumber: "TW-1",
    paymentStatus: "paid",
    event: {
      documentId: "event-1",
      title: "Inception",
      startDateTime: "2026-08-01T10:00:00.000Z",
    },
    screening: { startDateTime: "2026-08-20T19:30:00.000Z" },
    tickets: [
      { documentId: "t1", ticketNumber: "TW-1-1", type: "standard" },
      { documentId: "t2", ticketNumber: "TW-1-2", type: "vip" },
    ],
    ...overrides,
  }
}

describe("qr payload size bound (unit)", () => {
  it("truncates the event title so a pathological one cannot blow the QR capacity", () => {
    const { service } = buildService()
    const title = "Ω".repeat(5000)

    const payload = service.buildPayload({
      ...PAYLOAD_INPUT,
      eventTitle: title,
    })

    expect(payload.et.length).toBe(MAX_EVENT_TITLE_LENGTH)
    expect(payload.et).toBe(title.slice(0, MAX_EVENT_TITLE_LENGTH))
  })

  it("keeps a worst-case token well inside what qrcode.react can encode", () => {
    const { service } = buildService()

    // `qrcode.react` THROWS "Data too long" past ~1600 chars at level="H", and
    // `TicketList` maps tickets inline with no error boundary — so an
    // over-capacity token would blank the whole page, not just one card. Every
    // other payload field is a bounded identifier, so the truncated title is
    // what makes this ceiling hold.
    const token = service.mint(
      service.buildPayload({
        ...PAYLOAD_INPUT,
        orderNumber: "TW-20260820-999999",
        ticketNumber: "TW-20260820-999999-99",
        ticketDocumentId: "a".repeat(32),
        eventId: "b".repeat(32),
        eventTitle: "Ω".repeat(500),
      })
    )

    expect(token.length).toBeLessThan(800)
  })

  it("leaves a normal title untouched", () => {
    const { service } = buildService()

    const payload = service.buildPayload(PAYLOAD_INPUT)

    expect(payload.et).toBe("Inception")
  })
})

describe("qr.issueForOrder (unit)", () => {
  it("signs every ticket of a paid order with a unique token + nonce", async () => {
    const deps = buildService({ findManyResult: [paidOrder()] })

    const result = await deps.service.issueForOrder("TW-1")

    expect(result).toEqual({ issued: 2, skipped: 0 })
    expect(deps.ticketUpdateMany).toHaveBeenCalledTimes(2)

    const writes = deps.ticketUpdateMany.mock.calls.map(
      ([arg]) =>
        arg as {
          where: { documentId: string; qrCode: unknown }
          data: Record<string, string>
        }
    )
    expect(writes.map((w) => w.where.documentId)).toEqual(["t1", "t2"])
    // Compare-and-set: the write only matches a ticket with NO token yet.
    for (const write of writes) {
      expect(write.where.qrCode).toEqual({ $null: true })
    }

    const tokens = writes.map((w) => w.data.qrCode)
    const nonces = writes.map((w) => w.data.qrNonce)
    // No two tickets share a token or a nonce.
    expect(new Set(tokens).size).toBe(2)
    expect(new Set(nonces).size).toBe(2)

    for (const write of writes) {
      expect(write.data.qrCode.startsWith(`${QR_TOKEN_PREFIX}.`)).toBe(true)
      expect(write.data.qrIssuedAt).toEqual(expect.any(String))
      const verified = deps.service.verify(write.data.qrCode)
      expect(verified.valid).toBe(true)
      if (!verified.valid) throw new Error("unreachable")
      expect(verified.payload.n).toBe(write.data.qrNonce)
      expect(verified.payload.o).toBe("TW-1")
      expect(verified.payload.st).toBe("2026-08-20T19:30:00.000Z")
    }
  })

  it("is a no-op for an order that is not paid", async () => {
    const deps = buildService({
      findManyResult: [paidOrder({ paymentStatus: "pending" })],
    })

    expect(await deps.service.issueForOrder("TW-1")).toEqual({
      issued: 0,
      skipped: 0,
    })
    expect(deps.ticketUpdateMany).not.toHaveBeenCalled()
  })

  it("is idempotent: an already-issued ticket is never re-signed", async () => {
    const deps = buildService({
      findManyResult: [
        paidOrder({
          tickets: [
            {
              documentId: "t1",
              ticketNumber: "TW-1-1",
              type: "standard",
              qrCode: "TWQ1.existing.sig",
            },
            {
              documentId: "t2",
              ticketNumber: "TW-1-2",
              type: "vip",
              qrCode: "TWQ1.existing2.sig",
            },
          ],
        }),
      ],
    })

    expect(await deps.service.issueForOrder("TW-1")).toEqual({
      issued: 0,
      skipped: 2,
    })
    expect(deps.ticketUpdateMany).not.toHaveBeenCalled()
  })

  it("self-heals: only the tickets missing a qrCode are issued", async () => {
    const deps = buildService({
      findManyResult: [
        paidOrder({
          tickets: [
            {
              documentId: "t1",
              ticketNumber: "TW-1-1",
              type: "standard",
              qrCode: "TWQ1.existing.sig",
            },
            { documentId: "t2", ticketNumber: "TW-1-2", type: "vip" },
          ],
        }),
      ],
    })

    expect(await deps.service.issueForOrder("TW-1")).toEqual({
      issued: 1,
      skipped: 1,
    })
    expect(deps.ticketUpdateMany).toHaveBeenCalledTimes(1)
    expect(deps.ticketUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { documentId: "t2", qrCode: { $null: true } },
      })
    )
  })

  it("reports a CAS loser as skipped and never overwrites the winner's token", async () => {
    // A concurrent issuer already wrote both tickets between our populated read
    // and our write: the conditional UPDATE matches no row.
    const ticketUpdateMany = jest.fn(async () => ({ count: 0 }))
    const deps = buildService({
      findManyResult: [paidOrder()],
      ticketUpdateMany,
    })

    expect(await deps.service.issueForOrder("TW-1")).toEqual({
      issued: 0,
      skipped: 2,
    })
    // Every attempted write was guarded by `qrCode IS NULL`, so the token the
    // winner stored is untouched and only ONE valid QR exists per ticket.
    for (const [arg] of ticketUpdateMany.mock.calls as Array<
      [{ where: { qrCode: unknown } }]
    >) {
      expect(arg.where.qrCode).toEqual({ $null: true })
    }
  })

  it("counts a mix of CAS winners and losers correctly", async () => {
    let call = 0
    const ticketUpdateMany = jest.fn(async () => ({
      count: call++ === 0 ? 1 : 0,
    }))
    const deps = buildService({
      findManyResult: [paidOrder()],
      ticketUpdateMany,
    })

    expect(await deps.service.issueForOrder("TW-1")).toEqual({
      issued: 1,
      skipped: 1,
    })
  })

  it("falls back to the event start when the sub-event has no showtime", async () => {
    const deps = buildService({
      findManyResult: [
        paidOrder({
          screening: null,
          tickets: [{ documentId: "t1", ticketNumber: "TW-1-1", type: "vip" }],
        }),
      ],
    })

    await deps.service.issueForOrder("TW-1")

    const [[write]] = deps.ticketUpdateMany.mock.calls as Array<
      [{ data: { qrCode: string } }]
    >
    const verified = deps.service.verify(write.data.qrCode)
    if (!verified.valid) throw new Error("expected a valid token")
    expect(verified.payload.st).toBe("2026-08-01T10:00:00.000Z")
  })

  it("throws QR_SIGNING_UNAVAILABLE (writing nothing) when the secret is unset", async () => {
    const deps = buildService({ secret: "", findManyResult: [paidOrder()] })

    await expect(deps.service.issueForOrder("TW-1")).rejects.toMatchObject({
      code: QR_SIGNING_UNAVAILABLE,
    })
    // No unsigned token is ever written.
    expect(deps.ticketUpdateMany).not.toHaveBeenCalled()
  })

  it("is a safe no-op for an unknown order number", async () => {
    const deps = buildService({ findManyResult: [] })

    expect(await deps.service.issueForOrder("NOPE")).toEqual({
      issued: 0,
      skipped: 0,
    })
    expect(deps.ticketUpdateMany).not.toHaveBeenCalled()
  })
})

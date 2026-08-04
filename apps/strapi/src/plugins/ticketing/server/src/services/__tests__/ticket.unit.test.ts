import ticketService, {
  TICKET_ALREADY_SCANNED,
  TICKET_CANCELLED,
  TICKET_EXPIRED,
  TICKET_NOT_FOUND,
} from "../ticket"

/**
 * Unit tests for `ticket.validate` (Story 6.4). It backs the PUBLIC
 * `GET /tickets/validate/:ticketNumber` route, so it must return error CODES
 * (never prose) and a minimal projection that cannot leak the signing material
 * (`qrCode`/`qrNonce`) or the order's guest PII.
 */

const STORED_TICKET = {
  documentId: "ticket-doc-1",
  ticketNumber: "TW-1-1",
  type: "standard",
  status: "valid",
  price: 10,
  qrCode: "TWQ1.payload.sig",
  qrNonce: "secret-nonce",
  scannedAt: null,
}

function buildService(findManyResult: unknown[]) {
  const documentFindMany = jest.fn(async () => findManyResult)
  const strapi: any = {
    documents: jest.fn(() => ({ findMany: documentFindMany })),
    log: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
  }
  return { service: ticketService({ strapi }), documentFindMany }
}

describe("ticket.validate (unit)", () => {
  it("returns a minimal projection for a valid ticket — no qrCode/qrNonce/order", async () => {
    const { service, documentFindMany } = buildService([STORED_TICKET])

    const result = await service.validate("TW-1-1")

    expect(result).toEqual({
      valid: true,
      ticket: {
        ticketNumber: "TW-1-1",
        type: "standard",
        status: "valid",
        scannedAt: null,
      },
    })
    // The order relation is not even populated — no guest PII can leak.
    expect(documentFindMany).toHaveBeenCalledWith({
      filters: { ticketNumber: "TW-1-1" },
    })
  })

  it("returns TICKET_NOT_FOUND (a code, not prose) for an unknown ticket", async () => {
    const { service } = buildService([])

    expect(await service.validate("NOPE")).toEqual({
      valid: false,
      code: TICKET_NOT_FOUND,
    })
  })

  it.each([
    ["scanned", TICKET_ALREADY_SCANNED],
    ["cancelled", TICKET_CANCELLED],
    ["expired", TICKET_EXPIRED],
  ])("maps status %p to %s", async (status, code) => {
    const { service } = buildService([{ ...STORED_TICKET, status }])

    const result = await service.validate("TW-1-1")

    expect(result.valid).toBe(false)
    expect(result.code).toBe(code)
    expect(JSON.stringify(result)).not.toContain("secret-nonce")
    expect(JSON.stringify(result)).not.toContain("TWQ1.")
  })
})

import publicApiService from "../public-api"

/**
 * Unit tests for events-manager `public-api.adjustInventory` (mocked Strapi).
 *
 * adjustInventory is a Document Service read-modify-write (no raw SQL). We assert
 * its load-bearing invariants:
 *  - it reads the PUBLISHED row (status: "published") of the draftAndPublish doc
 *  - a sale that fits writes ticketsSold = current + delta
 *  - a sale that exceeds capacity throws TICKET_SOLD_OUT and does NOT write
 *  - a refund (delta < 0) decrements, floored at zero
 *  - unknown kind / zero delta / missing document are rejected
 *
 * Concurrency is intentionally NOT covered — it is deferred to Epic 6
 * (read-modify-write is racy by design for now; see deferred-work.md).
 */

interface DocApiMock {
  findOne: jest.Mock
  update: jest.Mock
}

function buildStrapi(
  doc: { ticketsSold: number; ticketsAvailable: number } | null
) {
  const docApi: DocApiMock = {
    findOne: jest.fn(async () =>
      doc ? { documentId: "screening-1", ...doc } : null
    ),
    update: jest.fn(async () => ({ documentId: "screening-1" })),
  }

  const strapi: any = {
    documents: jest.fn(() => docApi),
  }

  return { strapi, docApi }
}

describe("public-api.adjustInventory (unit)", () => {
  it("reads the published row and writes current + delta on a fitting sale", async () => {
    const { strapi, docApi } = buildStrapi({
      ticketsSold: 3,
      ticketsAvailable: 10,
    })
    const service = publicApiService({ strapi })

    await service.adjustInventory("screening-1", "screening", 2)

    expect(strapi.documents).toHaveBeenCalledWith(
      "plugin::events-manager.screening"
    )
    expect(docApi.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        documentId: "screening-1",
        status: "published",
      })
    )
    expect(docApi.update).toHaveBeenCalledWith(
      expect.objectContaining({
        documentId: "screening-1",
        status: "published",
        data: { ticketsSold: 5 },
      })
    )
  })

  it("throws TICKET_SOLD_OUT and does not write when the sale exceeds capacity", async () => {
    const { strapi, docApi } = buildStrapi({
      ticketsSold: 9,
      ticketsAvailable: 10,
    })
    const service = publicApiService({ strapi })

    await expect(
      service.adjustInventory("screening-1", "screening", 2)
    ).rejects.toMatchObject({ code: "TICKET_SOLD_OUT" })
    expect(docApi.update).not.toHaveBeenCalled()
  })

  it("allows a sale that exactly fills remaining capacity", async () => {
    const { strapi, docApi } = buildStrapi({
      ticketsSold: 8,
      ticketsAvailable: 10,
    })
    const service = publicApiService({ strapi })

    await expect(
      service.adjustInventory("screening-1", "screening", 2)
    ).resolves.toBeUndefined()
    expect(docApi.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { ticketsSold: 10 } })
    )
  })

  it("refund (delta < 0) decrements sold count", async () => {
    const { strapi, docApi } = buildStrapi({
      ticketsSold: 4,
      ticketsAvailable: 10,
    })
    const service = publicApiService({ strapi })

    await service.adjustInventory("screening-1", "screening", -1)

    expect(docApi.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { ticketsSold: 3 } })
    )
  })

  it("refund cannot drive sold count below zero", async () => {
    const { strapi, docApi } = buildStrapi({
      ticketsSold: 0,
      ticketsAvailable: 10,
    })
    const service = publicApiService({ strapi })

    await expect(
      service.adjustInventory("screening-1", "screening", -1)
    ).rejects.toMatchObject({ code: "TICKET_SOLD_OUT" })
    expect(docApi.update).not.toHaveBeenCalled()
  })

  it("throws when the sub-event document does not exist", async () => {
    const { strapi, docApi } = buildStrapi(null)
    const service = publicApiService({ strapi })

    await expect(
      service.adjustInventory("missing", "screening", 1)
    ).rejects.toThrow(/not found/)
    expect(docApi.update).not.toHaveBeenCalled()
  })

  it("rejects an unknown sub-event kind", async () => {
    const { strapi } = buildStrapi({ ticketsSold: 0, ticketsAvailable: 10 })
    const service = publicApiService({ strapi })

    await expect(
      service.adjustInventory("x", "balloon" as any, 1)
    ).rejects.toThrow(/Unknown sub-event kind/)
  })

  it("rejects a zero delta", async () => {
    const { strapi } = buildStrapi({ ticketsSold: 0, ticketsAvailable: 10 })
    const service = publicApiService({ strapi })

    await expect(
      service.adjustInventory("screening-1", "screening", 0)
    ).rejects.toThrow(/non-zero integer/)
  })
})

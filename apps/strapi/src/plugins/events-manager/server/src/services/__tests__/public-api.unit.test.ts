import publicApiService from "../public-api"

/**
 * Unit tests for events-manager `public-api.adjustInventory` (mocked Strapi).
 *
 * The oversell race is closed by a single atomic capacity-guarded SQL UPDATE.
 * We cannot assert true DB concurrency here, so we assert the load-bearing
 * invariants of that statement instead:
 *  - the UPDATE carries the capacity guard (ticketsSold + delta <= available)
 *  - the SET is column-relative (ticketsSold = ticketsSold + delta)
 *  - zero affected rows => TICKET_SOLD_OUT
 *  - it binds to the caller's transaction (never opens its own)
 *  - refunds (delta < 0) use a floor guard, not the capacity guard
 */

/** Build a chainable knex-query mock that resolves to `affectedRows`. */
function buildKnexQuery(affectedRows: number) {
  const calls: { method: string; args: unknown[] }[] = []
  const query: any = {}
  const record =
    (method: string) =>
    (...args: unknown[]) => {
      calls.push({ method, args })
      return query
    }
  query.transacting = record("transacting")
  query.where = record("where")
  query.update = record("update")
  query.andWhereRaw = record("andWhereRaw")
  // Awaiting the builder resolves to the affected-row count.
  query.then = (resolve: (v: number) => unknown) => resolve(affectedRows)
  return { query, calls }
}

function buildStrapi(affectedRows: number) {
  const { query, calls } = buildKnexQuery(affectedRows)

  const knex: any = jest.fn(() => query)
  knex.raw = jest.fn((sql: string, bindings: unknown[]) => ({
    __raw: sql,
    bindings,
  }))

  const strapi: any = {
    db: {
      connection: knex,
      metadata: {
        get: jest.fn(() => ({
          tableName: "screenings",
          attributes: {
            documentId: { columnName: "document_id" },
            ticketsSold: { columnName: "tickets_sold" },
            ticketsAvailable: { columnName: "tickets_available" },
          },
        })),
      },
    },
  }

  return { strapi, knex, query, calls }
}

describe("public-api.adjustInventory (unit)", () => {
  const trx = { __trx: true } as any

  it("issues a column-relative, capacity-guarded UPDATE bound to the tx", async () => {
    const { strapi, knex, query, calls } = buildStrapi(1)
    const service = publicApiService({ strapi })

    await service.adjustInventory("screening-1", "screening", 2, trx)

    // Targets the resolved table and binds to the caller's transaction.
    expect(knex).toHaveBeenCalledWith("screenings")
    expect(calls.find((c) => c.method === "transacting")?.args).toEqual([trx])

    // SET tickets_sold = tickets_sold + delta (column-relative, via raw).
    expect(knex.raw).toHaveBeenCalledWith("?? + ?", ["tickets_sold", 2])

    // WHERE document_id = id
    expect(calls.find((c) => c.method === "where")?.args).toEqual([
      "document_id",
      "screening-1",
    ])

    // Capacity guard present: tickets_sold + delta <= tickets_available
    const guard = calls.find((c) => c.method === "andWhereRaw")
    expect(guard?.args).toEqual([
      "?? + ? <= ??",
      ["tickets_sold", 2, "tickets_available"],
    ])
  })

  it("throws TICKET_SOLD_OUT when zero rows pass the guard", async () => {
    const { strapi } = buildStrapi(0)
    const service = publicApiService({ strapi })

    await expect(
      service.adjustInventory("screening-1", "screening", 1, trx)
    ).rejects.toMatchObject({ code: "TICKET_SOLD_OUT" })
  })

  it("does not throw when at least one row is updated", async () => {
    const { strapi } = buildStrapi(1)
    const service = publicApiService({ strapi })

    await expect(
      service.adjustInventory("screening-1", "screening", 1, trx)
    ).resolves.toBeUndefined()
  })

  it("refund (delta < 0) uses a floor guard, not the capacity guard", async () => {
    const { strapi, calls } = buildStrapi(1)
    const service = publicApiService({ strapi })

    await service.adjustInventory("screening-1", "screening", -1, trx)

    const guard = calls.find((c) => c.method === "andWhereRaw")
    expect(guard?.args).toEqual(["?? + ? >= 0", ["tickets_sold", -1]])
  })

  it("rejects an unknown sub-event kind", async () => {
    const { strapi } = buildStrapi(1)
    const service = publicApiService({ strapi })

    await expect(
      service.adjustInventory("x", "balloon" as any, 1, trx)
    ).rejects.toThrow(/Unknown sub-event kind/)
  })

  it("rejects a zero delta", async () => {
    const { strapi } = buildStrapi(1)
    const service = publicApiService({ strapi })

    await expect(
      service.adjustInventory("screening-1", "screening", 0, trx)
    ).rejects.toThrow(/non-zero integer/)
  })
})

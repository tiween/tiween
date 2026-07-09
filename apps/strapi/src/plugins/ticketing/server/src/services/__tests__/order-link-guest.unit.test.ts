import orderService from "../order"

/**
 * Unit tests for `order.linkGuestOrders` (mocked Strapi Document Service).
 *
 * Covers every row of the story 4.6 I/O Matrix without booting Strapi:
 *  - match & link: unlinked matching orders get `user` back-filled, count returned
 *  - case-insensitive: findMany is queried with `$eqi` on the trimmed/lowered email
 *  - no matches: returns 0, no updates
 *  - already linked: orders with a `user` are skipped and not counted
 *  - missing input: empty email/userDocumentId returns 0 without any query
 */

interface MockDeps {
  findMany?: jest.Mock
  update?: jest.Mock
}

function buildStrapi(deps: MockDeps = {}) {
  const findMany = deps.findMany ?? jest.fn(async () => [])
  const update =
    deps.update ??
    jest.fn(async ({ documentId, data }: Record<string, unknown>) => ({
      documentId,
      ...(data as Record<string, unknown>),
    }))

  const docService = { findMany, update }

  const documents = jest.fn(() => docService)

  const strapi: any = { documents }

  return { strapi, documents, findMany, update }
}

describe("order.linkGuestOrders (unit)", () => {
  it("match & link: back-fills user on unlinked matching orders and returns the count", async () => {
    const findMany = jest.fn(async () => [
      { documentId: "order-1", guestEmail: "buyer@x.com", user: null },
      { documentId: "order-2", guestEmail: "buyer@x.com", user: null },
    ])
    const { strapi, update } = buildStrapi({ findMany })
    const service = orderService({ strapi })

    const linked = await service.linkGuestOrders("Buyer@X.com", "user-1")

    expect(linked).toBe(2)
    expect(update).toHaveBeenCalledTimes(2)
    expect(update).toHaveBeenNthCalledWith(1, {
      documentId: "order-1",
      data: { user: "user-1" },
    })
    expect(update).toHaveBeenNthCalledWith(2, {
      documentId: "order-2",
      data: { user: "user-1" },
    })
  })

  it("case-insensitive: queries findMany with $eqi on the trimmed/lowered email", async () => {
    const { strapi, findMany } = buildStrapi()
    const service = orderService({ strapi })

    await service.linkGuestOrders("  BUYER@x.com  ", "user-1")

    expect(findMany).toHaveBeenCalledWith({
      filters: { guestEmail: { $eqi: "buyer@x.com" } },
      populate: ["user"],
    })
  })

  it("no matches: returns 0 and never updates", async () => {
    const { strapi, update } = buildStrapi({
      findMany: jest.fn(async () => []),
    })
    const service = orderService({ strapi })

    const linked = await service.linkGuestOrders("buyer@x.com", "user-1")

    expect(linked).toBe(0)
    expect(update).not.toHaveBeenCalled()
  })

  it("already linked: skips orders that already have a user and does not count them", async () => {
    const findMany = jest.fn(async () => [
      { documentId: "order-1", guestEmail: "buyer@x.com", user: { id: 99 } },
      { documentId: "order-2", guestEmail: "buyer@x.com", user: null },
    ])
    const { strapi, update } = buildStrapi({ findMany })
    const service = orderService({ strapi })

    const linked = await service.linkGuestOrders("buyer@x.com", "user-1")

    expect(linked).toBe(1)
    expect(update).toHaveBeenCalledTimes(1)
    expect(update).toHaveBeenCalledWith({
      documentId: "order-2",
      data: { user: "user-1" },
    })
  })

  it("wildcard guard: skips a $eqi over-match whose guestEmail is not exactly equal", async () => {
    // `$eqi` is `LOWER(col) LIKE LOWER(?)`, so querying `john_doe@x.com` can
    // return `johnxdoe@x.com` (the `_` acting as a wildcard). That row must not
    // be linked; a truly-equal row alongside it still links.
    const findMany = jest.fn(async () => [
      { documentId: "order-1", guestEmail: "johnxdoe@x.com", user: null },
      { documentId: "order-2", guestEmail: "John_Doe@x.com", user: null },
    ])
    const { strapi, update } = buildStrapi({ findMany })
    const service = orderService({ strapi })

    const linked = await service.linkGuestOrders("john_doe@x.com", "user-1")

    expect(linked).toBe(1)
    expect(update).toHaveBeenCalledTimes(1)
    expect(update).toHaveBeenCalledWith({
      documentId: "order-2",
      data: { user: "user-1" },
    })
  })

  it("missing email: returns 0 without querying documents", async () => {
    const { strapi, documents, findMany } = buildStrapi()
    const service = orderService({ strapi })

    const linked = await service.linkGuestOrders("", "user-1")

    expect(linked).toBe(0)
    expect(documents).not.toHaveBeenCalled()
    expect(findMany).not.toHaveBeenCalled()
  })

  it("missing userDocumentId: returns 0 without querying documents", async () => {
    const { strapi, documents, findMany } = buildStrapi()
    const service = orderService({ strapi })

    const linked = await service.linkGuestOrders("buyer@x.com", "")

    expect(linked).toBe(0)
    expect(documents).not.toHaveBeenCalled()
    expect(findMany).not.toHaveBeenCalled()
  })
})

import watchlistService from "../watchlist"

/**
 * Unit tests for the user-engagement `watchlist` service (mocked Strapi),
 * mirroring the events-manager `public-api.unit.test.ts` style.
 *
 * `add` is an idempotent Document Service read-then-create scoped by the user +
 * creative-work `documentId`. `remove` is the symmetric idempotent read-then-
 * delete the whole Story 5.2 feature depends on. We lock their load-bearing
 * invariants:
 *  - add reads existing rows filtered by `{ user, creativeWork }` documentIds;
 *    when a match exists it returns that row and does NOT create a second; when
 *    none exists it creates one scoped to the user + creative-work.
 *  - remove reads the same filtered rows; when a match exists it deletes that
 *    row's `documentId` and returns `true`; when none matches it does NOT call
 *    delete and returns `false` (idempotent — no 404/throw).
 *  - toggle delegates to remove when the item is present.
 *
 * No DB, no boot: `strapi.documents()` is a jest mock.
 */

const WATCHLIST_UID = "plugin::user-engagement.user-watchlist"

interface DocApiMock {
  findMany: jest.Mock
  create: jest.Mock
  delete: jest.Mock
}

function buildStrapi(existing: Array<{ documentId: string }>) {
  const docApi: DocApiMock = {
    findMany: jest.fn(async () => existing),
    create: jest.fn(async () => ({ documentId: "wl-created" })),
    delete: jest.fn(async () => ({ documentId: "wl-deleted" })),
  }
  const strapi: any = {
    documents: jest.fn(() => docApi),
  }
  return { strapi, docApi }
}

describe("watchlist.add (unit)", () => {
  it("returns the existing entry and does NOT create when already watchlisted", async () => {
    const { strapi, docApi } = buildStrapi([{ documentId: "wl-existing" }])
    const service = watchlistService({ strapi })

    const result = await service.add("user-1", "cw-1")

    expect(strapi.documents).toHaveBeenCalledWith(WATCHLIST_UID)
    expect(docApi.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: {
          user: { documentId: "user-1" },
          creativeWork: { documentId: "cw-1" },
        },
      })
    )
    expect(docApi.create).not.toHaveBeenCalled()
    expect(result).toEqual({ documentId: "wl-existing" })
  })

  it("creates a row scoped by user + creativeWork when not present", async () => {
    const { strapi, docApi } = buildStrapi([])
    const service = watchlistService({ strapi })

    await service.add("user-1", "cw-1")

    expect(docApi.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          user: "user-1",
          creativeWork: "cw-1",
          notifyChanges: true,
        }),
      })
    )
  })

  it("stamps an ISO addedAt on the created row", async () => {
    const { strapi, docApi } = buildStrapi([])
    const service = watchlistService({ strapi })

    await service.add("user-2", "cw-2")

    const arg = docApi.create.mock.calls[0][0]
    expect(typeof arg.data.addedAt).toBe("string")
    expect(Number.isNaN(Date.parse(arg.data.addedAt))).toBe(false)
  })
})

describe("watchlist.remove (unit)", () => {
  it("deletes the matching row's documentId and returns true", async () => {
    const { strapi, docApi } = buildStrapi([{ documentId: "wl-existing" }])
    const service = watchlistService({ strapi })

    const result = await service.remove("user-1", "cw-1")

    expect(strapi.documents).toHaveBeenCalledWith(WATCHLIST_UID)
    expect(docApi.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: {
          user: { documentId: "user-1" },
          creativeWork: { documentId: "cw-1" },
        },
      })
    )
    expect(docApi.delete).toHaveBeenCalledWith({ documentId: "wl-existing" })
    expect(result).toBe(true)
  })

  it("is idempotent — does NOT delete and returns false when no row matches", async () => {
    const { strapi, docApi } = buildStrapi([])
    const service = watchlistService({ strapi })

    const result = await service.remove("user-1", "cw-missing")

    expect(docApi.delete).not.toHaveBeenCalled()
    expect(result).toBe(false)
  })
})

describe("watchlist.toggle (unit)", () => {
  it("delegates to remove (deletes the row) when the item is present", async () => {
    const { strapi, docApi } = buildStrapi([{ documentId: "wl-existing" }])
    const service = watchlistService({ strapi })

    const result = await service.toggle("user-1", "cw-1")

    expect(docApi.delete).toHaveBeenCalledWith({ documentId: "wl-existing" })
    expect(docApi.create).not.toHaveBeenCalled()
    expect(result).toEqual({ added: false })
  })

  it("delegates to add (creates a row) when the item is absent", async () => {
    const { strapi, docApi } = buildStrapi([])
    const service = watchlistService({ strapi })

    const result = await service.toggle("user-1", "cw-1")

    expect(docApi.create).toHaveBeenCalled()
    expect(docApi.delete).not.toHaveBeenCalled()
    expect(result).toEqual({ added: true })
  })
})

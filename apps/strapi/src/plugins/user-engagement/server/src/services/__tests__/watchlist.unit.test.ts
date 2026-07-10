import watchlistService from "../watchlist"

/**
 * Unit tests for the user-engagement `watchlist.add` service (mocked Strapi),
 * mirroring the events-manager `public-api.unit.test.ts` style.
 *
 * `add` is an idempotent Document Service read-then-create scoped by the user +
 * creative-work `documentId`. We lock its load-bearing invariants:
 *  - it reads existing rows filtered by `{ user, creativeWork }` documentIds
 *  - when a matching row exists it returns that row and does NOT create a second
 *  - when none exists it creates one scoped to the user + creative-work
 *
 * No DB, no boot: `strapi.documents()` is a jest mock.
 */

const WATCHLIST_UID = "plugin::user-engagement.user-watchlist"

interface DocApiMock {
  findMany: jest.Mock
  create: jest.Mock
}

function buildStrapi(existing: Array<{ documentId: string }>) {
  const docApi: DocApiMock = {
    findMany: jest.fn(async () => existing),
    create: jest.fn(async () => ({ documentId: "wl-created" })),
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

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

/**
 * Story 5.3 — `getUserWatchlist` enriches each row with next/last screening
 * date + venue via the sanctioned events-manager `public-api` facade
 * (`strapi.plugin("events-manager").service("public-api")`), and degrades
 * gracefully when that facade throws (the list still returns, all-null).
 */
interface EnrichStrapi {
  strapi: any
  findMany: jest.Mock
  findScreeningInfoByMovies: jest.Mock
  logError: jest.Mock
}

function buildEnrichStrapi(
  rows: Array<{ documentId: string; creativeWork?: { documentId: string } }>,
  facade: {
    resolve?: Record<
      string,
      {
        nextScreeningDate: string | null
        lastScreeningDate: string | null
        venueName: string | null
      }
    >
    reject?: Error
  }
): EnrichStrapi {
  const findMany = jest.fn(async () => rows)
  const findScreeningInfoByMovies = jest.fn(async () => {
    if (facade.reject) throw facade.reject
    return facade.resolve ?? {}
  })
  const logError = jest.fn()
  const strapi: any = {
    documents: jest.fn(() => ({ findMany })),
    plugin: jest.fn(() => ({
      service: jest.fn(() => ({ findScreeningInfoByMovies })),
    })),
    log: { error: logError },
  }
  return { strapi, findMany, findScreeningInfoByMovies, logError }
}

describe("watchlist.getUserWatchlist (unit)", () => {
  it("calls the facade with the rows' creative-work ids and merges enrichment", async () => {
    const rows = [
      { documentId: "wl-1", creativeWork: { documentId: "cw-1" } },
      { documentId: "wl-2", creativeWork: { documentId: "cw-2" } },
      { documentId: "wl-3", creativeWork: { documentId: "cw-3" } },
    ]
    const { strapi, findScreeningInfoByMovies } = buildEnrichStrapi(rows, {
      resolve: {
        "cw-1": {
          nextScreeningDate: "2026-07-13T00:00:00.000Z",
          lastScreeningDate: "2026-07-08T00:00:00.000Z",
          venueName: "Next Venue",
        },
        "cw-2": {
          nextScreeningDate: null,
          lastScreeningDate: "2026-07-05T00:00:00.000Z",
          venueName: "Past Venue",
        },
      },
    })
    const service = watchlistService({ strapi })

    const result = await service.getUserWatchlist("user-1")

    // Reaches events-manager ONLY through the named facade.
    expect(strapi.plugin).toHaveBeenCalledWith("events-manager")
    expect(findScreeningInfoByMovies).toHaveBeenCalledTimes(1)
    const [idsArg, nowArg] = findScreeningInfoByMovies.mock.calls[0]
    expect(idsArg).toEqual(["cw-1", "cw-2", "cw-3"])
    expect(typeof nowArg).toBe("string")
    expect(Number.isNaN(Date.parse(nowArg))).toBe(false)

    expect(result[0]).toMatchObject({
      documentId: "wl-1",
      nextScreeningDate: "2026-07-13T00:00:00.000Z",
      lastScreeningDate: "2026-07-08T00:00:00.000Z",
      venueName: "Next Venue",
    })
    expect(result[1]).toMatchObject({
      documentId: "wl-2",
      nextScreeningDate: null,
      lastScreeningDate: "2026-07-05T00:00:00.000Z",
      venueName: "Past Venue",
    })
    // cw-3 was absent from the facade record → all-null enrichment.
    expect(result[2]).toMatchObject({
      documentId: "wl-3",
      nextScreeningDate: null,
      lastScreeningDate: null,
      venueName: null,
    })
  })

  it("does not call the facade when there are no rows", async () => {
    const { strapi, findScreeningInfoByMovies } = buildEnrichStrapi([], {})
    const service = watchlistService({ strapi })

    const result = await service.getUserWatchlist("user-1")

    expect(result).toEqual([])
    expect(findScreeningInfoByMovies).not.toHaveBeenCalled()
  })

  it("catches a facade throw and returns rows with all-null enrichment (no throw)", async () => {
    const rows = [{ documentId: "wl-1", creativeWork: { documentId: "cw-1" } }]
    const { strapi, logError } = buildEnrichStrapi(rows, {
      reject: new Error("events-manager down"),
    })
    const service = watchlistService({ strapi })

    const result = await service.getUserWatchlist("user-1")

    expect(logError).toHaveBeenCalled()
    expect(result[0]).toMatchObject({
      documentId: "wl-1",
      nextScreeningDate: null,
      lastScreeningDate: null,
      venueName: null,
    })
  })
})

/**
 * Story 5.5 — cross-device conflict resolution is last-write-wins, delivered by
 * the server's arrival-order idempotent semantics (NOT a new backend feature).
 * The watchlist is a set-membership model, so the final state is fully
 * determined by whichever add/remove the server processes LAST. These cases lock
 * that convergence over a stateful `strapi.documents()` harness whose `findMany`
 * reflects the mutations `create`/`delete` have already applied — so a *sequence*
 * of ops (as either device's write would arrive at the server) converges
 * correctly. Membership is keyed by `(user, creativeWork)` so the harness also
 * honors per-user scoping (a regression there would surface here, not hide).
 */
interface StatefulDocApiMock {
  findMany: jest.Mock
  create: jest.Mock
  delete: jest.Mock
}

function membershipKey(userId: string, creativeWorkId: string) {
  return `${userId}::${creativeWorkId}`
}

function buildStatefulStrapi() {
  // Current set membership, keyed by `(user, creativeWork)` → row documentId.
  const rows = new Map<string, string>()
  let seq = 0

  const docApi: StatefulDocApiMock = {
    findMany: jest.fn(async ({ filters }: any) => {
      const key = membershipKey(
        filters?.user?.documentId,
        filters?.creativeWork?.documentId
      )
      const rowId = rows.get(key)
      return rowId ? [{ documentId: rowId }] : []
    }),
    create: jest.fn(async ({ data }: any) => {
      const rowId = `wl-${(seq += 1)}`
      rows.set(membershipKey(data.user, data.creativeWork), rowId)
      return { documentId: rowId }
    }),
    delete: jest.fn(async ({ documentId }: { documentId: string }) => {
      for (const [key, rowId] of rows.entries()) {
        if (rowId === documentId) {
          rows.delete(key)
          break
        }
      }
      return { documentId }
    }),
  }
  const strapi: any = { documents: jest.fn(() => docApi) }
  return { strapi, docApi, rows }
}

describe("watchlist LWW convergence (Story 5.5, unit)", () => {
  it("add(X) then remove(X) ⇒ final membership is ABSENT (last write wins)", async () => {
    const { strapi, docApi, rows } = buildStatefulStrapi()
    const service = watchlistService({ strapi })

    await service.add("user-1", "cw-1")
    const removed = await service.remove("user-1", "cw-1")

    expect(removed).toBe(true)
    expect(docApi.delete).toHaveBeenCalledTimes(1)
    expect(rows.has(membershipKey("user-1", "cw-1"))).toBe(false)
    expect(await service.isInWatchlist("user-1", "cw-1")).toBe(false)
  })

  it("remove(X) then add(X) ⇒ final membership is PRESENT (last write wins)", async () => {
    const { strapi, docApi, rows } = buildStatefulStrapi()
    const service = watchlistService({ strapi })

    const removed = await service.remove("user-1", "cw-1")
    await service.add("user-1", "cw-1")

    // remove-of-absent is idempotent (no delete, false); the later add creates.
    expect(removed).toBe(false)
    expect(docApi.delete).not.toHaveBeenCalled()
    expect(docApi.create).toHaveBeenCalledTimes(1)
    expect(rows.has(membershipKey("user-1", "cw-1"))).toBe(true)
    expect(await service.isInWatchlist("user-1", "cw-1")).toBe(true)
  })

  it("add(X) then add(X) ⇒ dedupe yields a SINGLE row (no duplicate)", async () => {
    const { strapi, docApi, rows } = buildStatefulStrapi()
    const service = watchlistService({ strapi })

    await service.add("user-1", "cw-1")
    await service.add("user-1", "cw-1")

    // Second add reads the existing row and does NOT create a second.
    expect(docApi.create).toHaveBeenCalledTimes(1)
    expect(rows.size).toBe(1)
  })

  it("scopes membership per user — user A's add is invisible to user B", async () => {
    const { strapi } = buildStatefulStrapi()
    const service = watchlistService({ strapi })

    await service.add("user-A", "cw-1")

    expect(await service.isInWatchlist("user-A", "cw-1")).toBe(true)
    expect(await service.isInWatchlist("user-B", "cw-1")).toBe(false)
    // Removing for B is a no-op; A's membership is untouched.
    expect(await service.remove("user-B", "cw-1")).toBe(false)
    expect(await service.isInWatchlist("user-A", "cw-1")).toBe(true)
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

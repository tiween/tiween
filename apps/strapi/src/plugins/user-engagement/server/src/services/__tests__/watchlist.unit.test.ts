import watchlistSchema from "../../content-types/user-watchlist/schema.json"
import watchlistService, { isUniqueViolation } from "../watchlist"

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

/**
 * Story 5.7 — `add` is idempotent under CONCURRENCY, not just serially.
 *
 * The serial repeat-add case ("pre-check hits the existing row, no second
 * create") is already locked above ("returns the existing entry and does NOT
 * create when already watchlisted") and again in the LWW convergence suite
 * ("add(X) then add(X) ⇒ dedupe yields a SINGLE row"), so it is not duplicated
 * here. What these cases lock is the part the pre-check CANNOT give us:
 *
 *  - every created row carries `dedupeKey === "<userId>:<creativeWorkId>"`,
 *    which is the scalar the DB unique index is built on (a composite unique
 *    across two Strapi v5 relations is not expressible directly);
 *  - when a concurrent add wins the race and our `create` loses the unique
 *    constraint, `add` re-reads the pair and returns the winner's row rather
 *    than surfacing a 500;
 *  - the re-read is defensive: if the winning row is gone by the time we look,
 *    we rethrow rather than return `undefined`;
 *  - only uniqueness conflicts are swallowed — any other create failure still
 *    propagates.
 */
describe("watchlist.add dedupe/race (Story 5.7, unit)", () => {
  /** Strapi harness whose `create` rejects, and whose `findMany` can change. */
  function buildRacingStrapi(
    createError: unknown,
    findManyResults: Array<Array<{ documentId: string }>>
  ) {
    let call = 0
    const docApi = {
      // First call is the pre-check, later calls are the post-conflict re-read.
      findMany: jest.fn(async () => findManyResults[call++] ?? []),
      create: jest.fn(async () => {
        throw createError
      }),
      delete: jest.fn(),
    }
    const strapi: any = { documents: jest.fn(() => docApi) }
    return { strapi, docApi }
  }

  it("stamps dedupeKey = `<userId>:<creativeWorkId>` on the created row", async () => {
    const { strapi, docApi } = buildStrapi([])
    const service = watchlistService({ strapi })

    await service.add("user-7", "cw-7")

    expect(docApi.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ dedupeKey: "user-7:cw-7" }),
      })
    )
  })

  it("catches a unique-constraint violation, re-reads the pair, returns the winner's row", async () => {
    // Postgres unique_violation, as `pg` surfaces it.
    const pgUnique: any = new Error(
      'duplicate key value violates unique constraint "user_watchlists_dedupe_key_unique"'
    )
    pgUnique.code = "23505"

    const { strapi, docApi } = buildRacingStrapi(pgUnique, [
      [], // pre-check: pair absent (the race window)
      [{ documentId: "wl-winner" }], // re-read: the concurrent add's row
    ])
    const service = watchlistService({ strapi })

    const result = await service.add("user-1", "cw-1")

    expect(docApi.create).toHaveBeenCalledTimes(1)
    expect(docApi.findMany).toHaveBeenCalledTimes(2)
    expect(result).toEqual({ documentId: "wl-winner" })
  })

  it("also recovers from the sqlite flavour of the unique violation", async () => {
    const sqliteUnique: any = new Error(
      "insert into `user_watchlists` - UNIQUE constraint failed: user_watchlists.dedupe_key"
    )
    sqliteUnique.code = "SQLITE_CONSTRAINT_UNIQUE"

    const { strapi } = buildRacingStrapi(sqliteUnique, [
      [],
      [{ documentId: "wl-winner" }],
    ])
    const service = watchlistService({ strapi })

    await expect(service.add("user-1", "cw-1")).resolves.toEqual({
      documentId: "wl-winner",
    })
  })

  it("rethrows the original error when the re-read finds nothing (row deleted mid-race)", async () => {
    const pgUnique: any = new Error("duplicate key")
    pgUnique.code = "23505"

    const { strapi } = buildRacingStrapi(pgUnique, [[], []])
    const service = watchlistService({ strapi })

    // Never resolve to `undefined` — that would claim a write that did not land.
    await expect(service.add("user-1", "cw-1")).rejects.toBe(pgUnique)
  })

  it("propagates a non-unique create error untouched", async () => {
    const boom: any = new Error("connection terminated unexpectedly")
    boom.code = "ECONNRESET"

    const { strapi, docApi } = buildRacingStrapi(boom, [
      [],
      [{ documentId: "wl-should-not-be-used" }],
    ])
    const service = watchlistService({ strapi })

    await expect(service.add("user-1", "cw-1")).rejects.toBe(boom)
    // No recovery re-read for a non-uniqueness failure.
    expect(docApi.findMany).toHaveBeenCalledTimes(1)
  })
})

/**
 * Story 5.7 — `dedupeKey` is an internal uniqueness mechanism and must NEVER
 * reach a client (spec: "Do NOT expose dedupeKey in API responses").
 *
 * Marking it `private` in the schema is not sufficient here: Strapi v5 honours
 * `private` in `strapi.contentAPI.sanitize.output()`, which only the CORE
 * controllers call — this plugin's controller assigns the raw service result to
 * `ctx.body`. So the guarantee has to hold at the service boundary, on EVERY
 * path that returns a row.
 */
describe("watchlist dedupeKey is never returned (Story 5.7, unit)", () => {
  const ROW_WITH_KEY = {
    documentId: "wl-1",
    addedAt: "2026-01-01T00:00:00.000Z",
    notifyChanges: true,
    dedupeKey: "user-1:cw-1",
  }

  function buildStrapiReturning(rows: any[], created?: any) {
    const docApi = {
      findMany: jest.fn(async () => rows),
      create: jest.fn(async () => created ?? { ...ROW_WITH_KEY }),
      delete: jest.fn(),
    }
    const strapi: any = { documents: jest.fn(() => docApi) }
    return { strapi, docApi }
  }

  it("fast path (pre-check hit) strips dedupeKey", async () => {
    const { strapi } = buildStrapiReturning([{ ...ROW_WITH_KEY }])
    const service = watchlistService({ strapi })

    const result: any = await service.add("user-1", "cw-1")

    expect(result).not.toHaveProperty("dedupeKey")
    // Everything else survives untouched.
    expect(result).toMatchObject({ documentId: "wl-1", notifyChanges: true })
  })

  it("create path strips dedupeKey from the returned row (but still SENDS it)", async () => {
    const { strapi, docApi } = buildStrapiReturning([])
    const service = watchlistService({ strapi })

    const result: any = await service.add("user-1", "cw-1")

    expect(result).not.toHaveProperty("dedupeKey")
    // The write itself must still carry the key — stripping is read-side only.
    expect(docApi.create.mock.calls[0][0].data.dedupeKey).toBe("user-1:cw-1")
  })

  it("race-recovery path strips dedupeKey from the winner's row", async () => {
    const pgUnique: any = new Error("duplicate key")
    pgUnique.code = "23505"
    let call = 0
    const docApi = {
      findMany: jest.fn(async () =>
        call++ === 0 ? [] : [{ ...ROW_WITH_KEY }]
      ),
      create: jest.fn(async () => {
        throw pgUnique
      }),
      delete: jest.fn(),
    }
    const strapi: any = { documents: jest.fn(() => docApi) }
    const service = watchlistService({ strapi })

    const result: any = await service.add("user-1", "cw-1")

    expect(result).not.toHaveProperty("dedupeKey")
    expect(result.documentId).toBe("wl-1")
  })

  it("getUserWatchlist strips dedupeKey from every row, preserving order and enrichment", async () => {
    const rows = [
      {
        documentId: "wl-1",
        dedupeKey: "user-1:cw-1",
        creativeWork: { documentId: "cw-1" },
      },
      {
        documentId: "wl-2",
        dedupeKey: "user-1:cw-2",
        creativeWork: { documentId: "cw-2" },
      },
    ]
    const { strapi } = buildEnrichStrapi(rows as any, {
      resolve: {
        "cw-1": {
          nextScreeningDate: "2026-07-13T00:00:00.000Z",
          lastScreeningDate: null,
          venueName: "V",
        },
      },
    })
    const service = watchlistService({ strapi })

    const result: any[] = await service.getUserWatchlist("user-1")

    expect(result.map((row) => row.documentId)).toEqual(["wl-1", "wl-2"])
    for (const row of result) {
      expect(row).not.toHaveProperty("dedupeKey")
    }
    expect(result[0]).toMatchObject({
      creativeWork: { documentId: "cw-1" },
      nextScreeningDate: "2026-07-13T00:00:00.000Z",
      lastScreeningDate: null,
      venueName: "V",
    })
  })
})

/**
 * Story 5.7 — a "poisoned" row makes the pair permanently un-addable without a
 * key-based fallback.
 *
 * The controller takes `creativeWorkId` straight from the request body with no
 * existence check, so a create with an unresolvable relation can land a row that
 * HOLDS the dedupeKey but has no `creativeWork` link. Every later `add` would
 * then miss on the relation-filtered pre-check, lose to the unique index, miss
 * again on the relation-filtered re-read, and rethrow — a permanent hard 500 for
 * that pair, unclearable via `remove` (same relation filter).
 */
describe("watchlist.add poisoned-key recovery (Story 5.7, unit)", () => {
  it("falls back to a dedupeKey lookup when the pair re-read comes back empty", async () => {
    const pgUnique: any = new Error("duplicate key")
    pgUnique.code = "23505"

    const results = [
      [], // pre-check on the pair
      [], // post-conflict re-read on the pair — the poisoned row has no link
      [{ documentId: "wl-poisoned", dedupeKey: "user-1:cw-1" }], // by key
    ]
    let call = 0
    const docApi = {
      findMany: jest.fn(async () => results[call++] ?? []),
      create: jest.fn(async () => {
        throw pgUnique
      }),
      delete: jest.fn(),
    }
    const strapi: any = { documents: jest.fn(() => docApi) }
    const service = watchlistService({ strapi })

    const result: any = await service.add("user-1", "cw-1")

    expect(result).toEqual({ documentId: "wl-poisoned" })
    expect(result).not.toHaveProperty("dedupeKey")
    expect(docApi.findMany).toHaveBeenCalledTimes(3)
    // Scoped to the requesting user as well as the key: `dedupeKey` is unique
    // and already embeds `userId`, so this filter is redundant exactly when the
    // key encoding is sound — which is the point of asserting it.
    expect(docApi.findMany).toHaveBeenNthCalledWith(3, {
      filters: { dedupeKey: "user-1:cw-1", user: { documentId: "user-1" } },
    })
  })

  it("still rethrows when the dedupeKey lookup finds nothing either", async () => {
    const pgUnique: any = new Error("duplicate key")
    pgUnique.code = "23505"

    const docApi = {
      findMany: jest.fn(async () => []),
      create: jest.fn(async () => {
        throw pgUnique
      }),
      delete: jest.fn(),
    }
    const strapi: any = { documents: jest.fn(() => docApi) }
    const service = watchlistService({ strapi })

    await expect(service.add("user-1", "cw-1")).rejects.toBe(pgUnique)
  })
})

/**
 * The unique-violation detector has to work across every driver this repo runs
 * on (Postgres in prod, better-sqlite3 in dev/test per `config/database.ts`) and
 * survive Strapi wrapping the driver error.
 */
describe("isUniqueViolation (Story 5.7, unit)", () => {
  it("recognises the structured driver codes", () => {
    expect(
      isUniqueViolation(Object.assign(new Error("x"), { code: "23505" }))
    ).toBe(true)
    expect(
      isUniqueViolation(
        Object.assign(new Error("x"), { code: "SQLITE_CONSTRAINT_UNIQUE" })
      )
    ).toBe(true)
    expect(
      isUniqueViolation(Object.assign(new Error("x"), { code: "ER_DUP_ENTRY" }))
    ).toBe(true)
  })

  it("falls back to the message when the driver code was stripped by a wrapper", () => {
    expect(
      isUniqueViolation(
        new Error("UNIQUE constraint failed: user_watchlists.dedupe_key")
      )
    ).toBe(true)
    expect(
      isUniqueViolation(
        new Error('duplicate key value violates unique constraint "x_unique"')
      )
    ).toBe(true)
  })

  it("unwraps one level of `cause`", () => {
    const wrapped: any = new Error("Document creation failed")
    wrapped.cause = Object.assign(new Error("x"), { code: "23505" })
    expect(isUniqueViolation(wrapped)).toBe(true)
  })

  it("checks BOTH unwrap paths — a non-unique `cause` must not mask a unique `details.originalError`", () => {
    const wrapped: any = new Error("Document creation failed")
    wrapped.cause = new Error("some unrelated context")
    wrapped.details = {
      originalError: Object.assign(new Error("x"), { code: "23505" }),
    }
    expect(isUniqueViolation(wrapped)).toBe(true)
  })

  it("survives a cyclic cause chain instead of overflowing the stack", () => {
    const a: any = new Error("a")
    const b: any = new Error("b")
    a.cause = b
    b.cause = a

    // The whole point: this runs inside a `catch`, so a RangeError here would
    // turn a recoverable race into an unrecoverable crash.
    expect(() => isUniqueViolation(a)).not.toThrow()
    expect(isUniqueViolation(a)).toBe(false)

    // A cycle that DOES contain a unique violation is still detected.
    const c: any = new Error("c")
    const d: any = Object.assign(new Error("d"), { code: "23505" })
    c.cause = d
    d.cause = c
    expect(isUniqueViolation(c)).toBe(true)
  })

  it("returns false for unrelated errors and non-objects", () => {
    expect(isUniqueViolation(new Error("connection terminated"))).toBe(false)
    expect(
      isUniqueViolation(Object.assign(new Error("nope"), { code: "23503" }))
    ).toBe(false)
    expect(isUniqueViolation(null)).toBe(false)
    expect(isUniqueViolation("23505")).toBe(false)
  })

  it("does NOT treat a primary-key collision as the dedupe race", () => {
    // A PK collision on an auto-increment `id` is corruption, not the
    // "a concurrent add won" case this recovery exists for. Swallowing it would
    // route a genuine corruption signal into "re-read and carry on".
    expect(
      isUniqueViolation(
        Object.assign(new Error("x"), {
          code: "SQLITE_CONSTRAINT_PRIMARYKEY",
        })
      )
    ).toBe(false)
  })
})

/**
 * Story 5.7 — the dedupe key is `"<userId>:<creativeWorkId>"`, so `:` is the
 * separator and both halves must be colon-free for the encoding to be
 * reversible. `creativeWorkId` arrives straight from the request body (the
 * controller checks truthiness only), so the type check matters too: without it
 * every object body would coerce to the SAME key, `"<user>:[object Object]"`.
 */
describe("watchlist.add rejects identifiers that would build an ambiguous key", () => {
  function buildBareStrapi() {
    const docApi = {
      findMany: jest.fn(async () => []),
      create: jest.fn(async () => ({ documentId: "wl-1" })),
      delete: jest.fn(),
    }
    return { strapi: { documents: jest.fn(() => docApi) } as any, docApi }
  }

  it.each([
    ["a colon in the creativeWorkId", "user-1", "cw:1"],
    ["a colon in the userId", "user:1", "cw-1"],
    ["a non-string creativeWorkId", "user-1", {} as unknown as string],
    ["an empty creativeWorkId", "user-1", ""],
  ])("throws on %s", async (_label, userId, creativeWorkId) => {
    const { strapi, docApi } = buildBareStrapi()
    const service = watchlistService({ strapi })

    await expect(service.add(userId, creativeWorkId)).rejects.toThrow(
      "INVALID_WATCHLIST_IDENTIFIER"
    )
    // Rejected before any write — no half-formed row can land.
    expect(docApi.create).not.toHaveBeenCalled()
  })

  it("accepts well-formed Strapi documentIds", async () => {
    const { strapi, docApi } = buildBareStrapi()
    const service = watchlistService({ strapi })

    await service.add("kx8t2h9wq1mnb4vc7ry0zjfa", "p3d6l0suew8kna2xvt5hcgqm")

    expect(docApi.create).toHaveBeenCalledTimes(1)
  })
})

/**
 * The whole story rests on ONE schema flag. `"unique": true` is what makes
 * Strapi's schema sync create the `user_watchlists.dedupe_key` UNIQUE index —
 * without it every race test above still passes (they inject the driver error
 * rather than provoke it), the migration still backfills, and the duplicate rows
 * come straight back. `"private": true` is the other half of the contract
 * ("Do NOT expose dedupeKey in API responses") and is defence in depth behind
 * `stripDedupeKey`. Neither is observable from a mocked Document Service, so
 * they are pinned here directly — same pattern as the venue `schema.json` sync
 * guard in `src/shared/__tests__/website-url.unit.test.ts`.
 */
describe("user-watchlist schema.json sync (Story 5.7, unit)", () => {
  const dedupeKey = (
    watchlistSchema as {
      attributes: {
        dedupeKey: { type: string; unique?: boolean; private?: boolean }
      }
    }
  ).attributes.dedupeKey

  it("declares dedupeKey as a unique string", () => {
    expect(dedupeKey).toBeDefined()
    expect(dedupeKey.type).toBe("string")
    // Load-bearing: this flag IS the database-level dedupe guarantee.
    expect(dedupeKey.unique).toBe(true)
  })

  it("declares dedupeKey private", () => {
    expect(dedupeKey.private).toBe(true)
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

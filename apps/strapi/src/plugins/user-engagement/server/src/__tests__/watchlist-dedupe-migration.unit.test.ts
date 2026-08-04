/**
 * Story 5.7 — unit tests for the `database/migrations/…watchlist-dedupe-key.js`
 * backfill.
 *
 * The migration is the single irreversible artifact in this story (`down()`
 * throws by design: collapsed rows are gone), and it is the thing standing
 * between legacy data and a `CREATE UNIQUE INDEX` that fails the boot. Mocking
 * knex would test nothing worth testing, so these cases drive `up()` against a
 * REAL in-memory SQLite database (`better-sqlite3`, the same driver
 * `config/database.ts` uses for dev/test) with the table shapes `resolveNames`
 * resolves, plus a hand-built `db` stub exposing `metadata` + `logger`.
 *
 * What is locked here is the spec's acceptance criterion — "the migration
 * backfills every row and leaves at most one row per pair; re-running it is a
 * no-op" — plus every HALT/skip branch that exists so a bad dataset fails loudly
 * instead of losing rows.
 */

const migration = require("../../../../../../database/migrations/2026.08.04T00.00.00.watchlist-dedupe-key.js")
const knexFactory = require("knex")

const WATCHLIST_UID = "plugin::user-engagement.user-watchlist"

const WATCHLIST_TABLE = "user_watchlists"
const USER_TABLE = "up_users"
const CW_TABLE = "creative_works"
const USER_LNK = "user_watchlists_user_lnk"
const CW_LNK = "user_watchlists_creative_work_lnk"

type Knex = any

function buildMeta(overrides: { dropDedupeAttr?: boolean } = {}) {
  const attributes: Record<string, unknown> = {
    addedAt: { columnName: "added_at" },
    notifyChanges: { columnName: "notify_changes" },
    user: {
      joinTable: {
        name: USER_LNK,
        joinColumn: { name: "user_watchlist_id" },
        inverseJoinColumn: {
          name: "user_id",
          referencedTable: USER_TABLE,
          referencedColumn: "id",
        },
      },
    },
    creativeWork: {
      joinTable: {
        name: CW_LNK,
        joinColumn: { name: "user_watchlist_id" },
        inverseJoinColumn: {
          name: "creative_work_id",
          referencedTable: CW_TABLE,
          referencedColumn: "id",
        },
      },
    },
  }

  if (!overrides.dropDedupeAttr) {
    attributes.dedupeKey = { columnName: "dedupe_key" }
  }

  return { tableName: WATCHLIST_TABLE, attributes }
}

/**
 * `db` stub. `metadata.get()` THROWS for an unknown UID, exactly like
 * @strapi/database's real implementation — that behaviour is what patch 4 had
 * to work around, so the stub must not soften it.
 */
function buildDb(
  options: { pluginLoaded?: boolean; dropDedupeAttr?: boolean } = {}
) {
  const pluginLoaded = options.pluginLoaded !== false
  const meta = buildMeta({ dropDedupeAttr: options.dropDedupeAttr })
  const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }

  return {
    metadata: {
      has: (uid: string) => pluginLoaded && uid === WATCHLIST_UID,
      get: (uid: string) => {
        if (!pluginLoaded || uid !== WATCHLIST_UID) {
          throw new Error(`Metadata for "${uid}" not found`)
        }
        return meta
      },
    },
    logger,
  }
}

function newKnex(): Knex {
  return knexFactory({
    client: "better-sqlite3",
    connection: { filename: ":memory:" },
    useNullAsDefault: true,
  })
}

async function createSchema(
  knex: Knex,
  options: {
    notifyAsText?: boolean
    withDedupeColumn?: boolean
  } = {}
) {
  await knex.schema.createTable(WATCHLIST_TABLE, (table: any) => {
    table.increments("id")
    table.string("document_id")
    table.datetime("added_at")
    if (options.notifyAsText) {
      table.string("notify_changes")
    } else {
      table.boolean("notify_changes")
    }
    if (options.withDedupeColumn) {
      table.string("dedupe_key", 255).nullable()
    }
  })

  for (const name of [USER_TABLE, CW_TABLE]) {
    await knex.schema.createTable(name, (table: any) => {
      table.increments("id")
      table.string("document_id")
    })
  }

  await knex.schema.createTable(USER_LNK, (table: any) => {
    table.increments("id")
    table.integer("user_watchlist_id")
    table.integer("user_id")
  })
  await knex.schema.createTable(CW_LNK, (table: any) => {
    table.increments("id")
    table.integer("user_watchlist_id")
    table.integer("creative_work_id")
  })
}

/** Insert a watchlist row plus (optionally) its user / creative-work links. */
async function insertWatchlistRow(
  knex: Knex,
  row: {
    id: number | null
    addedAt?: string | null
    notifyChanges?: unknown
    dedupeKey?: string | null
    userId?: number | null
    creativeWorkId?: number | null
    /** Insert the creative-work link twice — the Cartesian-blow-up case. */
    duplicateCreativeWorkLink?: boolean
  }
) {
  const payload: Record<string, unknown> = {
    id: row.id,
    document_id: `wl-doc-${row.id}`,
    added_at: row.addedAt ?? null,
    notify_changes: row.notifyChanges ?? null,
  }
  if (row.dedupeKey !== undefined) {
    payload.dedupe_key = row.dedupeKey
  }
  await knex(WATCHLIST_TABLE).insert(payload)

  if (row.userId != null) {
    await knex(USER_LNK).insert({
      user_watchlist_id: row.id,
      user_id: row.userId,
    })
  }
  if (row.creativeWorkId != null) {
    await knex(CW_LNK).insert({
      user_watchlist_id: row.id,
      creative_work_id: row.creativeWorkId,
    })
    if (row.duplicateCreativeWorkLink) {
      await knex(CW_LNK).insert({
        user_watchlist_id: row.id,
        creative_work_id: row.creativeWorkId,
      })
    }
  }
}

/**
 * Real knex, except the migration's one big join SELECT resolves to `rows`.
 * Every schema call and every write still goes to the real database, so the
 * "nothing was deleted" assertions stay meaningful.
 */
function knexWithForcedSelect(real: Knex, rows: unknown[]): Knex {
  const wrapper: any = (arg: unknown) => {
    if (typeof arg === "string" && arg === `${WATCHLIST_TABLE} as w`) {
      const stub: any = {
        leftJoin: () => stub,
        select: () => Promise.resolve(rows),
      }
      return stub
    }
    return real(arg)
  }
  wrapper.schema = real.schema
  return wrapper
}

async function seedTargets(knex: Knex) {
  await knex(USER_TABLE).insert([
    { id: 1, document_id: "user-1" },
    { id: 2, document_id: "user-2" },
  ])
  await knex(CW_TABLE).insert([
    { id: 10, document_id: "cw-10" },
    { id: 20, document_id: "cw-20" },
  ])
}

describe("watchlist dedupe migration — up() against real SQLite", () => {
  let knex: Knex

  afterEach(async () => {
    if (knex) {
      await knex.destroy()
      knex = undefined as unknown as Knex
    }
  })

  it("adds the dedupe_key column when it does not exist yet (schema sync runs after us)", async () => {
    knex = newKnex()
    await createSchema(knex)
    await seedTargets(knex)
    await insertWatchlistRow(knex, {
      id: 1,
      addedAt: "2026-01-01T00:00:00.000Z",
      notifyChanges: true,
      userId: 1,
      creativeWorkId: 10,
    })

    expect(await knex.schema.hasColumn(WATCHLIST_TABLE, "dedupe_key")).toBe(
      false
    )

    await migration.up(knex, buildDb())

    expect(await knex.schema.hasColumn(WATCHLIST_TABLE, "dedupe_key")).toBe(
      true
    )
  })

  it("stamps the correct dedupe_key on every non-orphan row", async () => {
    knex = newKnex()
    await createSchema(knex)
    await seedTargets(knex)
    await insertWatchlistRow(knex, {
      id: 1,
      addedAt: "2026-01-01T00:00:00.000Z",
      notifyChanges: true,
      userId: 1,
      creativeWorkId: 10,
    })
    await insertWatchlistRow(knex, {
      id: 2,
      addedAt: "2026-01-02T00:00:00.000Z",
      notifyChanges: false,
      userId: 2,
      creativeWorkId: 20,
    })

    await migration.up(knex, buildDb())

    const rows = await knex(WATCHLIST_TABLE)
      .select("id", "dedupe_key")
      .orderBy("id")
    expect(rows).toEqual([
      { id: 1, dedupe_key: "user-1:cw-10" },
      { id: 2, dedupe_key: "user-2:cw-20" },
    ])
  })

  it("collapses a duplicate pair to exactly one row, keeping the EARLIEST added_at", async () => {
    knex = newKnex()
    await createSchema(knex)
    await seedTargets(knex)
    // Deliberately insert the LATER row first, with the LOWER id: only the
    // added_at comparison can pick row 2. An inverted comparator keeps row 1.
    await insertWatchlistRow(knex, {
      id: 1,
      addedAt: "2026-03-09T00:00:00.000Z",
      notifyChanges: false,
      userId: 1,
      creativeWorkId: 10,
    })
    await insertWatchlistRow(knex, {
      id: 2,
      addedAt: "2026-01-05T00:00:00.000Z",
      notifyChanges: false,
      userId: 1,
      creativeWorkId: 10,
    })

    await migration.up(knex, buildDb())

    const rows = await knex(WATCHLIST_TABLE).select(
      "id",
      "added_at",
      "dedupe_key"
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe(2)
    expect(rows[0].dedupe_key).toBe("user-1:cw-10")
  })

  it("ORs notify_changes across the collapsed group", async () => {
    knex = newKnex()
    await createSchema(knex)
    await seedTargets(knex)
    // Keeper (earliest) has notify_changes = false; the loser has true.
    await insertWatchlistRow(knex, {
      id: 1,
      addedAt: "2026-01-01T00:00:00.000Z",
      notifyChanges: false,
      userId: 1,
      creativeWorkId: 10,
    })
    await insertWatchlistRow(knex, {
      id: 2,
      addedAt: "2026-02-01T00:00:00.000Z",
      notifyChanges: true,
      userId: 1,
      creativeWorkId: 10,
    })

    await migration.up(knex, buildDb())

    const rows = await knex(WATCHLIST_TABLE).select("id", "notify_changes")
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe(1)
    expect(Boolean(rows[0].notify_changes)).toBe(true)
  })

  it("ORs stringified booleans too (driver representation, patch 9)", async () => {
    knex = newKnex()
    await createSchema(knex, { notifyAsText: true })
    await seedTargets(knex)
    // "true" used to normalise to FALSE, silently dropping a user's opt-in.
    await insertWatchlistRow(knex, {
      id: 1,
      addedAt: "2026-01-01T00:00:00.000Z",
      notifyChanges: "false",
      userId: 1,
      creativeWorkId: 10,
    })
    await insertWatchlistRow(knex, {
      id: 2,
      addedAt: "2026-02-01T00:00:00.000Z",
      notifyChanges: "true",
      userId: 1,
      creativeWorkId: 10,
    })

    await migration.up(knex, buildDb())

    const rows = await knex(WATCHLIST_TABLE).select("id", "notify_changes")
    expect(rows).toHaveLength(1)
    expect(Boolean(rows[0].notify_changes)).toBe(true)
  })

  it("deletes the loser's rows from BOTH link tables", async () => {
    knex = newKnex()
    await createSchema(knex)
    await seedTargets(knex)
    await insertWatchlistRow(knex, {
      id: 1,
      addedAt: "2026-01-01T00:00:00.000Z",
      notifyChanges: true,
      userId: 1,
      creativeWorkId: 10,
    })
    await insertWatchlistRow(knex, {
      id: 2,
      addedAt: "2026-02-01T00:00:00.000Z",
      notifyChanges: true,
      userId: 1,
      creativeWorkId: 10,
    })

    await migration.up(knex, buildDb())

    expect(await knex(USER_LNK).select("user_watchlist_id")).toEqual([
      { user_watchlist_id: 1 },
    ])
    expect(await knex(CW_LNK).select("user_watchlist_id")).toEqual([
      { user_watchlist_id: 1 },
    ])
  })

  it("leaves orphan rows (missing user or creative-work link) in place", async () => {
    knex = newKnex()
    await createSchema(knex)
    await seedTargets(knex)
    await insertWatchlistRow(knex, {
      id: 1,
      addedAt: "2026-01-01T00:00:00.000Z",
      userId: 1,
      creativeWorkId: 10,
    })
    // Missing the user link.
    await insertWatchlistRow(knex, {
      id: 2,
      addedAt: "2026-01-02T00:00:00.000Z",
      creativeWorkId: 10,
    })
    // Missing the creative-work link.
    await insertWatchlistRow(knex, {
      id: 3,
      addedAt: "2026-01-03T00:00:00.000Z",
      userId: 1,
    })

    const db = buildDb()
    await migration.up(knex, db)

    const rows = await knex(WATCHLIST_TABLE)
      .select("id", "dedupe_key")
      .orderBy("id")
    expect(rows).toEqual([
      { id: 1, dedupe_key: "user-1:cw-10" },
      { id: 2, dedupe_key: null },
      { id: 3, dedupe_key: null },
    ])
    expect(db.logger.warn).toHaveBeenCalled()
  })

  it("NULLs a stale dedupe_key on an orphan so it cannot break the unique index", async () => {
    knex = newKnex()
    await createSchema(knex, { withDedupeColumn: true })
    await seedTargets(knex)
    // Live row for the pair…
    await insertWatchlistRow(knex, {
      id: 1,
      addedAt: "2026-01-01T00:00:00.000Z",
      userId: 1,
      creativeWorkId: 10,
    })
    // …and an orphan still carrying that exact key from a previous life.
    await insertWatchlistRow(knex, {
      id: 2,
      addedAt: "2026-01-02T00:00:00.000Z",
      dedupeKey: "user-1:cw-10",
    })

    await migration.up(knex, buildDb())

    const rows = await knex(WATCHLIST_TABLE)
      .select("id", "dedupe_key")
      .orderBy("id")
    expect(rows).toEqual([
      { id: 1, dedupe_key: "user-1:cw-10" },
      { id: 2, dedupe_key: null },
    ])

    // Proof this actually matters: the unique index the schema sync adds right
    // after this migration would have failed on the duplicated key. It does not
    // throw here — that is the assertion.
    await knex.schema.alterTable(WATCHLIST_TABLE, (table: any) => {
      table.unique(["dedupe_key"], {
        indexName: "user_watchlists_dedupe_key_uq",
      })
    })
  })

  it("is a no-op on re-run (same row count, same keys, no throw)", async () => {
    knex = newKnex()
    await createSchema(knex)
    await seedTargets(knex)
    await insertWatchlistRow(knex, {
      id: 1,
      addedAt: "2026-01-01T00:00:00.000Z",
      notifyChanges: true,
      userId: 1,
      creativeWorkId: 10,
    })
    await insertWatchlistRow(knex, {
      id: 2,
      addedAt: "2026-02-01T00:00:00.000Z",
      notifyChanges: false,
      userId: 1,
      creativeWorkId: 10,
    })
    await insertWatchlistRow(knex, {
      id: 3,
      addedAt: "2026-01-03T00:00:00.000Z",
      notifyChanges: true,
      userId: 2,
      creativeWorkId: 20,
    })

    await migration.up(knex, buildDb())
    const afterFirst = await knex(WATCHLIST_TABLE)
      .select("id", "dedupe_key", "notify_changes")
      .orderBy("id")
    expect(afterFirst).toHaveLength(2)

    await expect(migration.up(knex, buildDb())).resolves.toBeUndefined()

    const afterSecond = await knex(WATCHLIST_TABLE)
      .select("id", "dedupe_key", "notify_changes")
      .orderBy("id")
    expect(afterSecond).toEqual(afterFirst)
    expect(await knex(USER_LNK).count({ n: "*" })).toEqual([{ n: 2 }])
    expect(await knex(CW_LNK).count({ n: "*" })).toEqual([{ n: 2 }])
  })

  it("HALTs (throws) instead of dropping rows when a duplicate group has no usable primary key", async () => {
    knex = newKnex()
    await createSchema(knex)
    await seedTargets(knex)
    await insertWatchlistRow(knex, {
      id: 1,
      addedAt: "2026-01-01T00:00:00.000Z",
      notifyChanges: true,
      userId: 1,
      creativeWorkId: 10,
    })
    await insertWatchlistRow(knex, {
      id: 2,
      addedAt: "2026-01-02T00:00:00.000Z",
      notifyChanges: true,
      userId: 1,
      creativeWorkId: 10,
    })

    // A row with a NULL primary key cannot come out of the join (the join is ON
    // `w.id`, and NULL never matches), so this defensive branch is driven by
    // substituting the SELECT result while every write still hits the real DB —
    // which is what lets us assert that nothing was deleted.
    const forced = knexWithForcedSelect(knex, [
      {
        id: 1,
        added_at: "2026-01-01T00:00:00.000Z",
        notify_changes: 1,
        dedupe_key: null,
        user_document_id: "user-1",
        creative_work_document_id: "cw-10",
      },
      {
        id: null,
        added_at: "2026-01-02T00:00:00.000Z",
        notify_changes: 1,
        dedupe_key: null,
        user_document_id: "user-1",
        creative_work_document_id: "cw-10",
      },
    ])

    await expect(migration.up(forced, buildDb())).rejects.toThrow(
      /HALT: duplicate watchlist pair/
    )

    // Nothing was deleted — HALT means stop, not "collapse what you can".
    expect(await knex(WATCHLIST_TABLE).count({ n: "*" })).toEqual([{ n: 2 }])
    expect(await knex(USER_LNK).count({ n: "*" })).toEqual([{ n: 2 }])
  })

  it("HALTs when duplicate link rows make one watchlist row resolve to two pairs (Cartesian)", async () => {
    knex = newKnex()
    await createSchema(knex)
    await seedTargets(knex)
    await insertWatchlistRow(knex, {
      id: 1,
      addedAt: "2026-01-01T00:00:00.000Z",
      notifyChanges: true,
      userId: 1,
      creativeWorkId: 10,
      duplicateCreativeWorkLink: true,
    })

    await expect(migration.up(knex, buildDb())).rejects.toThrow(
      /resolved to\s+more than one/
    )

    // No half-correct backfill: the row is untouched and still present.
    const rows = await knex(WATCHLIST_TABLE).select("id", "dedupe_key")
    expect(rows).toEqual([{ id: 1, dedupe_key: null }])
  })

  it("skips silently when the plugin is not loaded (metadata.get would throw)", async () => {
    knex = newKnex()
    await createSchema(knex)

    await expect(
      migration.up(knex, buildDb({ pluginLoaded: false }))
    ).resolves.toBeUndefined()
    expect(await knex.schema.hasColumn(WATCHLIST_TABLE, "dedupe_key")).toBe(
      false
    )
  })

  it("refuses to run when the dedupeKey attribute is missing (nothing would enforce uniqueness)", async () => {
    knex = newKnex()
    await createSchema(knex)

    await expect(
      migration.up(knex, buildDb({ dropDedupeAttr: true }))
    ).rejects.toThrow(/no `dedupeKey` attribute/)
    expect(await knex.schema.hasColumn(WATCHLIST_TABLE, "dedupe_key")).toBe(
      false
    )
  })

  it("does nothing on a fresh database where the table does not exist yet", async () => {
    knex = newKnex()

    await expect(migration.up(knex, buildDb())).resolves.toBeUndefined()
  })

  it("down() is irreversible by design", async () => {
    await expect(migration.down()).rejects.toThrow(/not supported/)
  })
})

describe("watchlist dedupe migration — pure helpers", () => {
  const { toBool, pickKeeper } = migration.__testables

  it("toBool normalises every driver representation", () => {
    expect(toBool(null)).toBeNull()
    expect(toBool(undefined)).toBeNull()

    expect(toBool(true)).toBe(true)
    expect(toBool(false)).toBe(false)
    expect(toBool(1)).toBe(true)
    expect(toBool(0)).toBe(false)

    // Stringified booleans — "true" used to come back FALSE.
    expect(toBool("true")).toBe(true)
    expect(toBool("TRUE")).toBe(true)
    expect(toBool("false")).toBe(false)
    expect(toBool("1")).toBe(true)
    expect(toBool("0")).toBe(false)
    expect(toBool("t")).toBe(true)
    expect(toBool("f")).toBe(false)

    // MySQL BIT(1) / binary column.
    expect(toBool(Buffer.from([1]))).toBe(true)
    expect(toBool(Buffer.from([0]))).toBe(false)
  })

  it("toBool reports an unrecognised value as UNKNOWN, not as false", () => {
    // `null` means "unknown" and is filtered out of the OR-merge; `false` means
    // "known off" and participates in it. Guessing `false` for a shape we do not
    // understand can therefore CLEAR a user's notifyChanges when it is the only
    // value in its duplicate group — the one direction this migration must
    // never take silently.
    expect(toBool("yes")).toBeNull()
    expect(toBool("nope")).toBeNull()
    expect(toBool(new Date())).toBeNull()
    expect(toBool({})).toBeNull()

    // Still explicitly false, not unknown.
    expect(toBool("")).toBe(false)
  })

  it("pickKeeper keeps the earliest added_at, tie-breaking on the lowest id", () => {
    expect(
      pickKeeper([
        { id: 1, added_at: "2026-03-01T00:00:00.000Z" },
        { id: 2, added_at: "2026-01-01T00:00:00.000Z" },
      ]).id
    ).toBe(2)

    // NULL added_at sorts LAST — a dated row always beats an undated one.
    expect(
      pickKeeper([
        { id: 1, added_at: null },
        { id: 2, added_at: "2026-05-01T00:00:00.000Z" },
      ]).id
    ).toBe(2)

    // Equal timestamps → lowest id.
    expect(
      pickKeeper([
        { id: 9, added_at: "2026-01-01T00:00:00.000Z" },
        { id: 4, added_at: "2026-01-01T00:00:00.000Z" },
      ]).id
    ).toBe(4)
  })

  it("pickKeeper treats the epoch as a real date, not as 'undated'", () => {
    // A driver returning a numeric `0` for added_at means 1970 — the EARLIEST
    // possible row, which must win. A truthiness check would read it as NULL,
    // sort it last, and delete the oldest row as a loser: the exact inversion
    // of the collapse rule, on an irreversible delete.
    expect(
      pickKeeper([
        { id: 1, added_at: 0 },
        { id: 2, added_at: "2026-01-01T00:00:00.000Z" },
      ]).id
    ).toBe(1)

    // An empty string is still not a date, so it keeps sorting last.
    expect(
      pickKeeper([
        { id: 1, added_at: "" },
        { id: 2, added_at: "2026-01-01T00:00:00.000Z" },
      ]).id
    ).toBe(2)
  })
})

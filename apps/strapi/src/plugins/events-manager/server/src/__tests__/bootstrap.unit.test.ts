import bootstrap from "../bootstrap"

/**
 * Unit tests for the events-manager bootstrap's `ensureInventoryCheckConstraint`
 * (DW-3 / DW-8 backstop). The CHECK constraint is added in bootstrap — not a
 * migration — because Strapi runs `database/migrations` BEFORE creating
 * content-type tables, so a migration would crash a fresh Postgres boot. This
 * mocks `strapi.db.connection` (a fake knex) to lock the load-bearing
 * invariants without booting Strapi:
 *  - no-ops on a non-Postgres dialect (SQLite test harness)
 *  - one guarded `ADD CONSTRAINT ... CHECK (...) NOT VALID` per existing table
 *  - skips a table that does not exist yet (`hasTable` false)
 *  - a DDL failure on one table is isolated and non-fatal (boot proceeds)
 */

interface BuildOpts {
  dialect?: string
  clientConfig?: string
  tables?: string[]
  rawImpl?: (sql: string) => Promise<unknown>
}

function buildStrapi({
  dialect = "postgresql",
  clientConfig,
  tables = ["screenings", "performances"],
  rawImpl,
}: BuildOpts = {}) {
  const raw = jest.fn(rawImpl ?? (async () => undefined))
  const hasTable = jest.fn(async (t: string) => tables.includes(t))

  // knex is callable; only the members the ensure touches are stubbed.
  const knex: any = jest.fn(() => ({}))
  knex.client = { dialect, config: { client: clientConfig } }
  knex.schema = { hasTable }
  knex.raw = raw

  const subscribe = jest.fn()
  const strapi: any = {
    db: {
      connection: knex,
      lifecycles: { subscribe },
    },
    log: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
  }

  return { strapi, raw, hasTable, subscribe }
}

describe("events-manager bootstrap: ensureInventoryCheckConstraint (unit)", () => {
  it("adds a NOT VALID CHECK per existing table on Postgres", async () => {
    const { strapi, raw, hasTable } = buildStrapi()

    await bootstrap({ strapi })

    expect(hasTable).toHaveBeenCalledWith("screenings")
    expect(hasTable).toHaveBeenCalledWith("performances")
    expect(raw).toHaveBeenCalledTimes(2)

    const sql = raw.mock.calls.map((c) => c[0] as string).join("\n")
    expect(sql).toContain('ADD CONSTRAINT "chk_screenings_sold_lte_available"')
    expect(sql).toContain(
      'ADD CONSTRAINT "chk_performances_sold_lte_available"'
    )
    expect(sql).toContain("CHECK (tickets_sold <= tickets_available) NOT VALID")
    // Race-safe idempotency, no TOCTOU probe.
    expect(sql).toContain("EXCEPTION WHEN duplicate_object THEN NULL")
  })

  it("detects Postgres via client.config.client too", async () => {
    const { strapi, raw } = buildStrapi({
      dialect: "unknown",
      clientConfig: "postgres",
    })

    await bootstrap({ strapi })

    expect(raw).toHaveBeenCalledTimes(2)
  })

  it("no-ops on a non-Postgres dialect (never issues DDL)", async () => {
    const { strapi, raw, hasTable } = buildStrapi({ dialect: "sqlite3" })

    await bootstrap({ strapi })

    expect(hasTable).not.toHaveBeenCalled()
    expect(raw).not.toHaveBeenCalled()
  })

  it("skips a table that does not exist yet", async () => {
    const { strapi, raw } = buildStrapi({ tables: ["screenings"] })

    await bootstrap({ strapi })

    expect(raw).toHaveBeenCalledTimes(1)
    expect(raw.mock.calls[0][0]).toContain(
      'ADD CONSTRAINT "chk_screenings_sold_lte_available"'
    )
  })

  it("isolates a per-table DDL failure and stays non-fatal", async () => {
    const { strapi, raw } = buildStrapi({
      rawImpl: async (sql: string) => {
        if (sql.includes("screenings")) throw new Error("lock timeout")
        return undefined
      },
    })

    // Must not throw out of bootstrap despite the screenings failure.
    await expect(bootstrap({ strapi })).resolves.toBeUndefined()

    // performances still attempted after screenings failed.
    expect(raw).toHaveBeenCalledTimes(2)
    expect(strapi.log.error).toHaveBeenCalledWith(
      expect.stringContaining("screenings"),
      expect.any(Error)
    )
  })

  it("still registers the schedule-change lifecycle subscriber", async () => {
    const { strapi, subscribe } = buildStrapi()

    await bootstrap({ strapi })

    expect(subscribe).toHaveBeenCalledTimes(1)
  })
})

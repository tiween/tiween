"use strict"

/**
 * Story 5.7 — backfill `user_watchlists.dedupe_key` and collapse legacy
 * duplicate `(user, creativeWork)` pairs, BEFORE the unique index goes live.
 *
 * ---------------------------------------------------------------------------
 * WHY A USER MIGRATION (ordering finding)
 * ---------------------------------------------------------------------------
 * Verified against the vendored Strapi v5 sources in this repo:
 *
 *   node_modules/@strapi/core/dist/Strapi.js          -> bootstrap() calls
 *                                                        `this.db.schema.sync()`
 *   node_modules/@strapi/database/dist/schema/index.js:69-73
 *       async sync () {
 *         if (await db.migrations.shouldRun()) {
 *           await db.migrations.up()      // <-- USER migrations run FIRST
 *           return this.syncSchema()      // <-- then the schema diff/apply
 *         }
 *         ...
 *       }
 *   node_modules/@strapi/database/dist/migrations/index.js -> the user provider
 *       (umzug over `database/migrations/*.{js,sql}`) is ordered BEFORE the
 *       internal provider, and `dir` is `<projectDir>/database/migrations`
 *       (Strapi.js:233-234).
 *
 * So user migrations run BEFORE `syncSchema()`. That is exactly the ordering
 * this story needs: we can clean the data first and let the schema sync then add
 * the unique index onto already-clean rows. No `bootstrap` one-shot fallback is
 * required.
 *
 * The consequence of running first is that the `dedupe_key` COLUMN does not
 * exist yet at migration time (the schema sync is what would create it), so this
 * migration creates it itself — nullable, no index. The subsequent
 * `syncSchema()` diff (schema/diff.js `diffTableColumns`) compares the user
 * schema against the LIVE database schema, finds a matching nullable
 * `varchar(255)` column, and therefore only adds the missing UNIQUE index.
 *
 * ---------------------------------------------------------------------------
 * BEHAVIOUR
 * ---------------------------------------------------------------------------
 *  - Table/column names are resolved from `db.metadata` rather than hardcoded,
 *    so an identifier-shortening or rename upstream cannot silently mis-target.
 *  - Duplicate pairs collapse deterministically: keep the earliest `added_at`
 *    (NULLs sort last), tie-break on the smallest `id` (always unique and
 *    non-null) so the rule can never be ambiguous; OR together `notify_changes`;
 *    delete the losers (and their link rows).
 *  - Orphan rows (missing user link or missing creative-work link) cannot form a
 *    dedupe key: they are logged and SKIPPED, never deleted, and any stale
 *    `dedupe_key` they still carry is NULLed so it cannot collide with a live
 *    row's key when the unique index is created. NULL `dedupe_key` is compatible
 *    with the unique index on both Postgres and SQLite (multiple NULLs allowed).
 *  - Idempotent: re-running recomputes the same keys and finds nothing to
 *    collapse.
 *  - HALT (throw) rather than silently drop rows if a duplicate group cannot be
 *    collapsed deterministically (i.e. a row without a usable `id` tie-break),
 *    or if a watchlist row resolves to more than one pair because its link
 *    table(s) contain duplicate rows (a Cartesian join result).
 */

const WATCHLIST_UID = "plugin::user-engagement.user-watchlist"

/** Resolve the physical names this migration has to touch, from db.metadata. */
function resolveNames(db) {
  // `metadata.get()` THROWS (`Metadata for "..." not found`) rather than
  // returning undefined — see @strapi/database/dist/metadata/metadata.js. So the
  // "plugin not loaded in this app instance" skip has to be expressed with
  // `has()`, or it would be a boot crash instead of a graceful no-op. `has` is
  // guarded in case a future metadata implementation drops it.
  const metadata = db.metadata
  if (typeof metadata.has === "function" && !metadata.has(WATCHLIST_UID)) {
    return null
  }

  const meta = metadata.get(WATCHLIST_UID)
  if (!meta) {
    return null
  }

  const dedupeAttr = meta.attributes.dedupeKey
  const userAttr = meta.attributes.user
  const cwAttr = meta.attributes.creativeWork

  // Load-bearing: the unique index this migration prepares for is added by the
  // schema sync from the `dedupeKey` ATTRIBUTE. If the attribute is gone, the
  // sync adds no index — and falling back to a hardcoded column name would
  // leave a table that looks migrated (stray backfilled column) with zero
  // uniqueness enforcement and no error anywhere. Refuse instead.
  if (!dedupeAttr || !dedupeAttr.columnName) {
    throw new Error(
      "[5.7 watchlist dedupe] user-watchlist has no `dedupeKey` attribute in " +
        "metadata, so the schema sync will never create the unique index. " +
        "Refusing to backfill a column that nothing would enforce."
    )
  }

  if (!userAttr || !cwAttr) {
    throw new Error(
      "[5.7 watchlist dedupe] user-watchlist is missing the `user` and/or " +
        "`creativeWork` relation — refusing to guess the dedupe identity."
    )
  }

  // Both relations are unidirectional manyToOne, so Strapi models them with a
  // join ("link") table. If that ever changes to a join column, the shapes below
  // are wrong and we must not proceed with a half-correct backfill.
  if (!userAttr.joinTable || !cwAttr.joinTable) {
    throw new Error(
      "[5.7 watchlist dedupe] expected `user` and `creativeWork` to use link " +
        "tables; got a different relation storage strategy. Backfill aborted " +
        "so the unique index is not applied to un-deduped data."
    )
  }

  const addedAtAttr = meta.attributes.addedAt
  const notifyAttr = meta.attributes.notifyChanges

  return {
    table: meta.tableName,
    dedupeColumn: dedupeAttr.columnName,
    addedAtColumn: (addedAtAttr && addedAtAttr.columnName) || "added_at",
    notifyColumn: (notifyAttr && notifyAttr.columnName) || "notify_changes",
    user: {
      table: userAttr.joinTable.name,
      fk: userAttr.joinTable.joinColumn.name,
      targetFk: userAttr.joinTable.inverseJoinColumn.name,
      targetTable: userAttr.joinTable.inverseJoinColumn.referencedTable,
      targetId: userAttr.joinTable.inverseJoinColumn.referencedColumn,
    },
    creativeWork: {
      table: cwAttr.joinTable.name,
      fk: cwAttr.joinTable.joinColumn.name,
      targetFk: cwAttr.joinTable.inverseJoinColumn.name,
      targetTable: cwAttr.joinTable.inverseJoinColumn.referencedTable,
      targetId: cwAttr.joinTable.inverseJoinColumn.referencedColumn,
    },
  }
}

/**
 * Normalise a driver-dependent boolean.
 *
 * Booleans come back differently per driver: `true`/`false` (pg), `1`/`0`
 * (sqlite, mysql tinyint), the strings `"1"`/`"0"`/`"t"`/`"f"`/`"true"`/`"false"`
 * (some pg/knex configurations and raw text columns), and a single-byte Buffer
 * for MySQL `BIT(1)`. Getting any of these wrong here silently loses a user's
 * `notify_changes = true` during the OR-merge, so all of them are handled.
 */
function toBool(value) {
  if (value === null || value === undefined) return null
  if (typeof value === "boolean") return value
  if (typeof value === "number") return value !== 0
  if (typeof value === "bigint") return value !== 0n
  if (Buffer.isBuffer(value)) {
    // MySQL BIT(1) / binary(1): true iff any byte is non-zero.
    return value.some((byte) => byte !== 0)
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    if (normalized === "" || normalized === "0" || normalized === "f") {
      return false
    }
    if (normalized === "false") return false
    if (normalized === "1" || normalized === "t" || normalized === "true") {
      return true
    }
    return null
  }
  // Unrecognised shape (Date, object, symbol, ...). Return `null` — "unknown" —
  // rather than `false`. Every other unknown path in this migration preserves
  // information instead of guessing, and a bogus `false` would be counted as a
  // KNOWN false in the OR-merge below, silently clearing a user's
  // `notify_changes` when it is the only value in its group.
  return null
}

/**
 * Deterministic keeper selection: earliest `added_at` wins (NULL sorts last),
 * ties broken by the smallest `id`.
 */
function pickKeeper(rows) {
  return [...rows].sort((a, b) => {
    // `== null`, not a truthiness check: a driver can legitimately return the
    // epoch as numeric `0`, and treating the OLDEST row as undated would sort
    // it last and delete it as a loser — the exact inversion of the rule.
    const ta = a.added_at == null ? Number.NaN : new Date(a.added_at).getTime()
    const tb = b.added_at == null ? Number.NaN : new Date(b.added_at).getTime()
    const va = Number.isNaN(ta) ? Number.POSITIVE_INFINITY : ta
    const vb = Number.isNaN(tb) ? Number.POSITIVE_INFINITY : tb
    if (va !== vb) return va - vb
    return Number(a.id) - Number(b.id)
  })[0]
}

module.exports = {
  async up(knex, db) {
    const names = resolveNames(db)
    if (!names) {
      // Plugin not loaded in this app instance — nothing to do.
      return
    }

    const logger = db.logger || console

    if (!(await knex.schema.hasTable(names.table))) {
      // Fresh database: the table is created by the schema sync right after
      // this migration, already carrying the unique index. Nothing to backfill.
      return
    }

    // 1. Ensure the column exists (the schema sync has not run yet on the boot
    //    that first applies this migration). Nullable + no index here; the sync
    //    adds the UNIQUE index afterwards, once the data below is clean.
    if (!(await knex.schema.hasColumn(names.table, names.dedupeColumn))) {
      await knex.schema.alterTable(names.table, (table) => {
        table.string(names.dedupeColumn, 255).nullable()
      })
    }

    // 2. Read every row with its resolved (user, creativeWork) documentIds.
    const linkTablesExist =
      (await knex.schema.hasTable(names.user.table)) &&
      (await knex.schema.hasTable(names.creativeWork.table))

    if (!linkTablesExist) {
      logger.warn(
        "[5.7 watchlist dedupe] link tables not found; skipping backfill."
      )
      return
    }

    const rows = await knex(`${names.table} as w`)
      .leftJoin(`${names.user.table} as ul`, `ul.${names.user.fk}`, "w.id")
      .leftJoin(
        `${names.user.targetTable} as u`,
        `u.${names.user.targetId}`,
        `ul.${names.user.targetFk}`
      )
      .leftJoin(
        `${names.creativeWork.table} as cl`,
        `cl.${names.creativeWork.fk}`,
        "w.id"
      )
      .leftJoin(
        `${names.creativeWork.targetTable} as c`,
        `c.${names.creativeWork.targetId}`,
        `cl.${names.creativeWork.targetFk}`
      )
      .select(
        "w.id as id",
        `w.${names.addedAtColumn} as added_at`,
        `w.${names.notifyColumn} as notify_changes`,
        `w.${names.dedupeColumn} as dedupe_key`,
        "u.document_id as user_document_id",
        "c.document_id as creative_work_document_id"
      )

    // 3. Guard against a Cartesian blow-up before trusting the join result.
    //    Both `leftJoin`s assume AT MOST ONE link row per side, but Strapi's
    //    manyToOne link tables only carry non-unique FK indexes — a duplicated
    //    link row therefore yields the same watchlist row twice, in two
    //    different key groups. It could then be stamped twice with conflicting
    //    keys, or deleted as some other group's loser. HALT (consistent with the
    //    HALT-on-ambiguity posture below) rather than run a half-correct
    //    backfill against data we cannot interpret.
    const seenRowIds = new Set()
    for (const row of rows) {
      if (seenRowIds.has(row.id)) {
        throw new Error(
          `[5.7 watchlist dedupe] HALT: watchlist row id=${row.id} resolved to ` +
            "more than one (user, creativeWork) pair — its link table(s) hold " +
            "duplicate rows. The backfill cannot decide which pair is real. " +
            "Clean up the duplicate link rows by hand before re-running."
        )
      }
      seenRowIds.add(row.id)
    }

    // 4. Group by dedupe identity; park orphans.
    const groups = new Map()
    const orphanIdsToClear = []
    let orphanCount = 0

    for (const row of rows) {
      if (!row.user_document_id || !row.creative_work_document_id) {
        orphanCount += 1
        // An orphan gets no key — but if it still carries a STALE one from a
        // previous life (e.g. its link row was deleted after an earlier
        // backfill), that value can collide with a live row's key and make the
        // subsequent `CREATE UNIQUE INDEX` fail at boot. NULL is always safe:
        // both Postgres and SQLite allow many NULLs under a unique index.
        if (row.dedupe_key !== null && row.dedupe_key !== undefined) {
          orphanIdsToClear.push(row.id)
        }
        continue
      }
      const key = `${row.user_document_id}:${row.creative_work_document_id}`
      const bucket = groups.get(key)
      if (bucket) {
        bucket.push(row)
      } else {
        groups.set(key, [row])
      }
    }

    if (orphanCount > 0) {
      logger.warn(
        `[5.7 watchlist dedupe] ${orphanCount} watchlist row(s) have a missing ` +
          "user or creative-work link; leaving them in place with a NULL " +
          "dedupe_key (they are not deleted)."
      )
    }

    if (orphanIdsToClear.length > 0) {
      await knex(names.table)
        .whereIn("id", orphanIdsToClear)
        .update({ [names.dedupeColumn]: null })
    }

    // 5. Collapse duplicates, then stamp dedupe_key on every survivor.
    let collapsed = 0
    let stamped = 0

    for (const [key, group] of groups) {
      let keeperRow = group[0]

      if (group.length > 1) {
        // HALT rather than silently drop rows if even the `id` tie-break is
        // unusable — the collapse would not be deterministic.
        const unusable = group.filter(
          (row) => row.id === null || row.id === undefined
        )
        if (unusable.length > 0) {
          throw new Error(
            `[5.7 watchlist dedupe] HALT: duplicate watchlist pair "${key}" ` +
              "contains row(s) without a usable primary key, so the collapse " +
              "rule (earliest added_at, then lowest id) is not deterministic. " +
              "Resolve this data by hand before re-running the migration."
          )
        }

        keeperRow = pickKeeper(group)

        // OR-together notifyChanges across the whole group.
        const flags = group.map((row) => toBool(row.notify_changes))
        const known = flags.filter((flag) => flag !== null)
        const mergedNotify =
          known.length === 0 ? null : known.some((flag) => flag === true)

        const loserIds = group
          .filter((row) => row.id !== keeperRow.id)
          .map((row) => row.id)

        // Delete link rows explicitly — the FKs are ON DELETE CASCADE, but not
        // every dialect/connection has FK enforcement on, so do not rely on it.
        await knex(names.user.table).whereIn(names.user.fk, loserIds).del()
        await knex(names.creativeWork.table)
          .whereIn(names.creativeWork.fk, loserIds)
          .del()
        await knex(names.table).whereIn("id", loserIds).del()

        if (mergedNotify !== null) {
          await knex(names.table)
            .where("id", keeperRow.id)
            .update({ [names.notifyColumn]: mergedNotify })
        }

        collapsed += loserIds.length
      }

      if (keeperRow.dedupe_key !== key) {
        await knex(names.table)
          .where("id", keeperRow.id)
          .update({ [names.dedupeColumn]: key })
        stamped += 1
      }
    }

    logger.info(
      `[5.7 watchlist dedupe] backfill done: ${groups.size} unique pair(s), ` +
        `${stamped} row(s) stamped, ${collapsed} duplicate row(s) collapsed, ` +
        `${orphanCount} orphan row(s) skipped.`
    )
  },

  async down() {
    // Irreversible by design: the collapsed duplicate rows are gone. Dropping
    // the column back out would also fight the content-type schema sync.
    throw new Error(
      "[5.7 watchlist dedupe] down migration is not supported (duplicate rows " +
        "were deleted and cannot be reconstructed)."
    )
  },

  // Pure helpers exposed for unit tests only. Umzug reads `up`/`down`; extra
  // keys are ignored, so this cannot change migration behaviour.
  __testables: { toBool, pickKeeper, resolveNames },
}

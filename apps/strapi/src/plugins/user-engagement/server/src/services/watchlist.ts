import { errors } from "@strapi/utils"

import type { Core } from "@strapi/strapi"
// Compile-time only (`import type`), so this does not create a runtime
// dependency on the events-manager plugin -- the call below still goes through
// the `strapi.plugin(...).service(...)` facade. Importing the producer's own
// type instead of re-declaring it means a rename/addition there breaks here
// loudly rather than silently returning `null` forever.
import type { ScreeningInfo } from "../../../../events-manager/server/src/services/public-api"

const { ValidationError } = errors

const PLUGIN_ID = "user-engagement"
const WATCHLIST_UID = `plugin::${PLUGIN_ID}.user-watchlist`

/**
 * Story 5.7 — recognise a DB unique-constraint violation across every driver
 * this repo runs on, plus whatever wrapper Strapi/knex puts around it.
 *
 * We deliberately do NOT match on "any error that mentions unique" alone at the
 * top level: we check the structured driver signals first (they are exact), and
 * only fall back to a message substring for the wrapped/rethrown cases where the
 * original `code` has been lost.
 *
 * Known signals:
 *  - Postgres (`pg`):        `error.code === "23505"` (unique_violation)
 *  - SQLite (better-sqlite3): `error.code === "SQLITE_CONSTRAINT_UNIQUE"`, and
 *    the message contains "UNIQUE constraint failed"
 *  - MySQL (not used here today, cheap to cover): `code === "ER_DUP_ENTRY"` /
 *    `errno === 1062`
 *
 * Deliberately NOT matched: `SQLITE_CONSTRAINT_PRIMARYKEY`. A primary-key
 * collision on an auto-increment `id` is data corruption, not the dedupe race
 * this recovery path exists for, and classifying it as recoverable would send a
 * genuine corruption signal down the "re-read and carry on" branch.
 *
 * Strapi's Document Service can wrap the driver error, so we also walk BOTH
 * wrapper chains — `error.cause` and `error.details.originalError` — recursively
 * before giving up. The walk carries a `visited` set because those chains are
 * attacker-free but not cycle-free (a rethrown error can end up as its own
 * ancestor); without it a cyclic chain would blow the stack from inside a
 * `catch`, turning a recoverable race into an unrecoverable crash.
 */
export function isUniqueViolation(
  error: unknown,
  visited: Set<unknown> = new Set()
): boolean {
  if (typeof error !== "object" || error === null) {
    return false
  }

  // Cycle guard (see the doc comment above).
  if (visited.has(error)) {
    return false
  }
  visited.add(error)

  const candidate = error as {
    code?: unknown
    errno?: unknown
    message?: unknown
    cause?: unknown
    details?: { originalError?: unknown }
  }

  // 1. Exact driver signals.
  const code = typeof candidate.code === "string" ? candidate.code : undefined
  if (
    code === "23505" || // Postgres unique_violation
    code === "SQLITE_CONSTRAINT_UNIQUE" ||
    code === "ER_DUP_ENTRY"
  ) {
    return true
  }
  if (candidate.errno === 1062) {
    return true
  }

  // 2. Message-substring fallback, for errors whose driver `code` was dropped
  //    by a wrapper (Strapi validation errors carry only the message).
  const message =
    typeof candidate.message === "string" ? candidate.message.toLowerCase() : ""
  if (
    message.includes("unique constraint failed") || // sqlite
    message.includes("duplicate key value violates unique constraint") || // pg
    message.includes("er_dup_entry") ||
    message.includes("this attribute must be unique") // Strapi validation layer
  ) {
    return true
  }

  // 3. Unwrap — Strapi/knex nest the driver error. Check BOTH chains: an error
  //    whose `cause` is unrelated can still carry the real driver error under
  //    `details.originalError`, so a `return` on the first branch would
  //    misclassify it as non-unique.
  if (candidate.cause && isUniqueViolation(candidate.cause, visited)) {
    return true
  }
  if (
    candidate.details?.originalError &&
    isUniqueViolation(candidate.details.originalError, visited)
  ) {
    return true
  }

  return false
}

/**
 * Story 5.7 — `dedupeKey` is an internal DB-uniqueness mechanism and must never
 * reach a client (spec: "Do NOT expose dedupeKey in API responses").
 *
 * The schema marks it `private`, but that is NOT enough here: Strapi v5 applies
 * `private` in `strapi.contentAPI.sanitize.output()`, which only the CORE
 * controllers call. This plugin's `controllers/watchlist.ts` assigns the raw
 * service result straight onto `ctx.body`, and the Document Service does no
 * sanitization of its own — so an unstripped row would ship `dedupeKey` to the
 * client. We therefore strip at the service boundary, which is also the layer
 * this story is scoped to (the controllers are explicitly out of scope).
 */
const stripDedupeKey = <T>(row: T): T => {
  if (typeof row !== "object" || row === null) {
    return row
  }
  const { dedupeKey: _dedupeKey, ...rest } = row as Record<string, unknown>
  return rest as T
}

/**
 * The DB-enforced dedupe identity for a watchlist row.
 *
 * `:` is the separator, so both halves must be colon-free for the key to be an
 * unambiguous encoding of the pair — otherwise two distinct pairs could build
 * the same string and the unique index would reject a legitimate add (or hand
 * back the wrong row). Strapi v5 documentIds are alphanumeric, so this never
 * fires on well-formed input.
 *
 * The type check is load-bearing too: `creativeWorkId` reaches this service
 * straight from the request body (the controller only checks truthiness), so a
 * non-string would be template-coerced — every `{}` collapsing to
 * `"<user>:[object Object]"` and therefore to one shared key.
 */
const buildDedupeKey = (userId: string, creativeWorkId: string) => {
  for (const [label, value] of [
    ["userId", userId],
    ["creativeWorkId", creativeWorkId],
  ] as const) {
    if (typeof value !== "string" || value.length === 0) {
      throw new ValidationError("INVALID_WATCHLIST_IDENTIFIER", {
        field: label,
      })
    }
    if (value.includes(":")) {
      throw new ValidationError("INVALID_WATCHLIST_IDENTIFIER", {
        field: label,
      })
    }
  }

  return `${userId}:${creativeWorkId}`
}

const watchlistService = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Add a creative work to user's watchlist.
   *
   * Idempotent under concurrency (Story 5.7). The `findMany` pre-check stays as
   * the cheap fast path for the common "already saved" case, but correctness now
   * rests on the DB: `dedupeKey` (= `<userId>:<creativeWorkId>`) carries a unique
   * index, so when two concurrent adds both pass the pre-check, the DB adjudicates
   * and exactly one `create` wins. The loser catches the unique violation,
   * re-reads the pair, and returns the winner's row — never a 500.
   *
   * TRANSACTION CAVEAT: this must NOT be called inside an outer
   * `strapi.db.transaction(...)` without wrapping the `create` in its own
   * SAVEPOINT. On Postgres a constraint violation aborts the entire enclosing
   * transaction, so the recovery re-read below would itself fail with `25P02`
   * ("current transaction is aborted") and the "never a 500" guarantee breaks.
   * Today every caller (`toggle`, the controller) invokes it outside a
   * transaction; a future caller that needs one must add the savepoint.
   *
   * The returned row is always stripped of `dedupeKey` (see `stripDedupeKey`).
   */
  async add(userId: string, creativeWorkId: string) {
    const dedupeKey = buildDedupeKey(userId, creativeWorkId)

    const findExisting = () =>
      strapi.documents(WATCHLIST_UID).findMany({
        filters: {
          user: { documentId: userId },
          creativeWork: { documentId: creativeWorkId },
        } as any,
      })

    // Fast path: already in watchlist.
    const existing = await findExisting()

    if (existing.length > 0) {
      return stripDedupeKey(existing[0])
    }

    try {
      const created = await strapi.documents(WATCHLIST_UID).create({
        data: {
          user: userId,
          creativeWork: creativeWorkId,
          addedAt: new Date().toISOString(),
          notifyChanges: true,
          dedupeKey,
        } as any,
      })
      return stripDedupeKey(created)
    } catch (error) {
      // Only a uniqueness conflict is recoverable — it means a concurrent add
      // for the same pair won the race. Anything else is a real failure.
      if (!isUniqueViolation(error)) {
        throw error
      }

      const raced = await findExisting()

      if (raced.length > 0) {
        return stripDedupeKey(raced[0])
      }

      // The pair re-read (which filters on the RELATIONS) can come back empty
      // even though a row holding this `dedupeKey` exists: the controller takes
      // `creativeWorkId` from the request body without an existence check, so a
      // create with an unresolvable relation can land a row with the key set but
      // no `creativeWork` link. Without this fallback that pair would be
      // permanently un-addable — every later `add` would hit the unique index,
      // miss on the re-read, and 500, with no way to clear it (`remove` filters
      // on the same relation). Fall back to the key itself before giving up.
      //
      // Scoped to the requesting user as well as the key: `dedupeKey` already
      // embeds `userId`, so this is defence in depth rather than a live fix,
      // but it means a malformed key can never hand one user another user's
      // row. It costs nothing — the key is unique, so the filter is redundant
      // exactly when the encoding is sound.
      const byKey = await strapi.documents(WATCHLIST_UID).findMany({
        filters: { dedupeKey, user: { documentId: userId } } as any,
      })

      if (byKey.length > 0) {
        return stripDedupeKey(byKey[0])
      }

      // Defensive: if the winning row was removed between the conflict and this
      // re-read, there is nothing to return. Surfacing `undefined` would be a
      // silent lie about the write having succeeded, so rethrow the original.
      throw error
    }
  },

  /**
   * Remove from watchlist
   */
  async remove(userId: string, creativeWorkId: string) {
    const items = await strapi.documents(WATCHLIST_UID).findMany({
      filters: {
        user: { documentId: userId },
        creativeWork: { documentId: creativeWorkId },
      } as any,
    })

    if (items.length > 0) {
      await strapi.documents(WATCHLIST_UID).delete({
        documentId: items[0].documentId,
      })
      return true
    }

    return false
  },

  /**
   * Get user's watchlist, enriched with each saved creative-work's next/last
   * screening date + venue (Story 5.3).
   *
   * The enrichment is the first sanctioned `user-engagement -> events-manager`
   * cross-plugin edge: it reaches events-manager ONLY through the named
   * `public-api` facade (`strapi.plugin("events-manager").service("public-api")`)
   * — never a foreign-UID Document Service call from here. Wrapped in try/catch
   * so an events-manager fault degrades gracefully: the list still returns
   * (rows with all-null enrichment) instead of a 500.
   *
   * Rows are returned stripped of `dedupeKey` (see `stripDedupeKey`) — same
   * rows, same order, same enrichment fields, minus that one internal column.
   */
  async getUserWatchlist(userId: string) {
    const rows = await strapi.documents(WATCHLIST_UID).findMany({
      filters: { user: { documentId: userId } } as any,
      populate: ["creativeWork"],
      sort: { addedAt: "desc" },
    })

    const ids = rows
      .map((row: any) => row.creativeWork?.documentId)
      .filter(Boolean) as string[]

    let enrichment: Record<string, ScreeningInfo> = {}

    if (ids.length > 0) {
      try {
        enrichment = await strapi
          .plugin("events-manager")
          .service("public-api")
          .findScreeningInfoByMovies(ids, new Date().toISOString())
      } catch (error) {
        strapi.log.error(
          `[user-engagement] watchlist enrichment failed: ${error}`
        )
        enrichment = {}
      }
    }

    return rows.map((row: any) => {
      // DW-168: annotate the fallback so `?? {}` cannot widen `info` to the
      // empty object type (which loses every property and produces TS2339).
      const info: Partial<ScreeningInfo> =
        enrichment[row.creativeWork?.documentId] ?? {}
      return {
        ...stripDedupeKey(row),
        nextScreeningDate: info.nextScreeningDate ?? null,
        lastScreeningDate: info.lastScreeningDate ?? null,
        venueName: info.venueName ?? null,
      }
    })
  },

  /**
   * Check if item is in watchlist
   */
  async isInWatchlist(userId: string, creativeWorkId: string) {
    const items = await strapi.documents(WATCHLIST_UID).findMany({
      filters: {
        user: { documentId: userId },
        creativeWork: { documentId: creativeWorkId },
      } as any,
    })

    return items.length > 0
  },

  /**
   * Toggle watchlist item
   */
  async toggle(userId: string, creativeWorkId: string) {
    const isIn = await this.isInWatchlist(userId, creativeWorkId)

    if (isIn) {
      await this.remove(userId, creativeWorkId)
      return { added: false }
    } else {
      await this.add(userId, creativeWorkId)
      return { added: true }
    }
  },
})

export default watchlistService

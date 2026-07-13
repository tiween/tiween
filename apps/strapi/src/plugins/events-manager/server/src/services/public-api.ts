import type { Core } from "@strapi/strapi"
import type { Knex } from "knex"
import type { TicketTierOut } from "./ticket-tiers"

const PLUGIN_ID = "events-manager"
const EVENT_UID = `plugin::${PLUGIN_ID}.event` as const

/**
 * UID map for ticketed sub-events. Keyed by the `kind` discriminator the
 * ticketing plugin passes when adjusting inventory.
 */
const SUB_EVENT_UIDS = {
  screening: `plugin::${PLUGIN_ID}.screening`,
  performance: `plugin::${PLUGIN_ID}.performance`,
} as const

/**
 * Physical table name for each ticketed sub-event kind. Used by the guarded
 * atomic inventory UPDATE, which runs raw knex against the table directly.
 */
const SUB_EVENT_TABLES = {
  screening: "screenings",
  performance: "performances",
} as const

export type SubEventKind = keyof typeof SUB_EVENT_UIDS

/** Error code thrown when a sale would exceed remaining capacity. */
export const TICKET_SOLD_OUT = "TICKET_SOLD_OUT"

/**
 * Ownership + pricing context for a sub-event, returned to ticketing checkout
 * (Story 6.3). `eventId` is the parent event documentId used for the
 * sub-event↔event ownership guard; `tiers` is the authoritative price/type
 * catalog for server-trusted pricing.
 */
export interface SubEventCheckoutContext {
  subEventId: string
  kind: SubEventKind
  eventId: string | null
  tiers: TicketTierOut[]
}

/** Per-creative-work screening enrichment returned by findScreeningInfoByMovies. */
export interface ScreeningInfo {
  nextScreeningDate: string | null
  lastScreeningDate: string | null
  venueName: string | null
}

/** Minimal shape of an enrichment event read (venue + screenings.movie populated). */
interface EnrichmentEvent {
  startDateTime?: string | null
  venue?: { name?: string | null } | null
  screenings?: Array<{
    movie?: { documentId?: string | null } | null
  } | null> | null
}

/**
 * Public facade for cross-plugin consumers (rules R3/R4 — Facade D8).
 *
 * Ticketing (and only ticketing, on the sanctioned ticketing -> events-manager
 * edge) calls into this service via
 * `strapi.plugin("events-manager").service("public-api")`.
 */
const publicApiService = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Adjust a sub-event's sold-ticket count.
   *
   * `delta > 0` is a sale (capacity-guarded); `delta < 0` is a refund/cancel
   * (guarded so it never drives `ticketsSold` below zero).
   *
   * Concurrency-safe by construction: a single guarded, *relative* atomic
   * increment on the PUBLISHED row —
   *   `UPDATE <table> SET tickets_sold = tickets_sold + :delta
   *    WHERE document_id = :id AND published_at IS NOT NULL
   *      AND (delta > 0 ? tickets_sold + :delta <= tickets_available
   *                     : tickets_sold + :delta >= 0)`.
   * The guard and the write are one statement, so the DB serializes the row:
   * two buyers who each individually fit but together overflow capacity cannot
   * both win — the loser matches 0 rows (→ `TICKET_SOLD_OUT`). There is no
   * read-then-write window. Scoped to `published_at IS NOT NULL` so the
   * draftAndPublish document is never double-counted.
   *
   * Raw knex does NOT auto-enlist in the ambient AsyncLocalStorage transaction
   * the way the Document Service does, so we bind explicitly: the caller's
   * ambient trx when present (`strapi.db.transaction().get()`), else the base
   * connection. Inside `createOrder`'s `strapi.db.transaction(...)` this makes
   * the inventory change roll back together with the order/ticket writes.
   *
   * A PostgreSQL `CHECK (tickets_sold <= tickets_available)` constraint on both
   * ticketed sub-event tables (ensured by the events-manager plugin bootstrap,
   * `ensureInventoryCheckConstraint`) is the final RDBMS enforcer: any other
   * write path that would oversell is rejected by the database and its
   * transaction rolls back.
   */
  async adjustInventory(
    subEventId: string,
    kind: SubEventKind,
    delta: number
  ): Promise<void> {
    const uid = SUB_EVENT_UIDS[kind]
    if (!uid) {
      throw new Error(`Unknown sub-event kind: ${kind}`)
    }
    if (!Number.isInteger(delta) || delta === 0) {
      throw new Error(`adjustInventory delta must be a non-zero integer`)
    }

    const table = SUB_EVENT_TABLES[kind]
    // Raw knex does not auto-enlist in the ambient ALS transaction; bind
    // explicitly. `transaction()` (with no callback) resolves to the ambient
    // trx WITHOUT opening a new one when already nested; `.get()` yields the
    // underlying knex bound to it.
    const knex: Knex = strapi.db.inTransaction()
      ? (await strapi.db.transaction()).get()
      : strapi.db.connection

    const query = knex(table)
      .where("document_id", subEventId)
      .whereNotNull("published_at")

    if (delta > 0) {
      query.andWhereRaw("tickets_sold + ? <= tickets_available", [delta])
    } else {
      query.andWhereRaw("tickets_sold + ? >= 0", [delta])
    }

    const affected = await query.update({
      tickets_sold: knex.raw("tickets_sold + ?", [delta]),
    })

    if (affected === 0) {
      // Disambiguate a missing published row from a guard rejection (sold out /
      // would go negative). Probe existence on the published row only.
      const exists = await knex(table)
        .where("document_id", subEventId)
        .whereNotNull("published_at")
        .first("id")
      if (!exists) {
        throw new Error(`Sub-event ${subEventId} (${kind}) not found`)
      }
      throw Object.assign(
        new Error(
          `Sub-event ${subEventId} sold out / invalid adjustment (requested ${delta})`
        ),
        { code: TICKET_SOLD_OUT }
      )
    }
  },

  /**
   * Resolve a sub-event's checkout context (Story 6.3): the parent event id
   * (for the ownership guard) plus its authoritative ticket tiers (for
   * server-trusted pricing). Reuses the plugin's own `ticket-tiers` read for
   * the catalog and reads the sub-event's `event` relation for ownership — all
   * within events-manager (no foreign UID). Returns `null` when no published
   * sub-event of the given kind matches.
   */
  async getSubEventContext(
    subEventId: string,
    kind: SubEventKind
  ): Promise<SubEventCheckoutContext | null> {
    const tiersResult = await strapi
      .plugin(PLUGIN_ID)
      .service("ticket-tiers")
      .findSubEventTicketTiers(subEventId, kind)

    if (!tiersResult) {
      return null
    }

    const uid = SUB_EVENT_UIDS[kind]
    const subEvent = (await strapi.documents(uid).findOne({
      documentId: subEventId,
      status: "published",
      populate: { event: { fields: ["documentId"] } },
    } as never)) as { event?: { documentId?: string } | null } | null

    return {
      subEventId,
      kind,
      eventId: subEvent?.event?.documentId ?? null,
      tiers: tiersResult.tiers,
    }
  },

  /**
   * Cross-plugin enrichment (Story 5.3): for a set of saved creative-work
   * documentIds, return each one's soonest-upcoming and most-recent-past
   * screening date (+ the venue of the chosen event).
   *
   * Queried from the EVENT side — a nested `screenings.movie.documentId $in`
   * relation filter (mirroring the proven `screenings.movie` filter in
   * `events.ts`) — so the event UID stays owned inside events-manager and
   * user-engagement never issues a foreign-UID Document Service call. The
   * caller (`user-engagement.getUserWatchlist`) reaches this ONLY through
   * `strapi.plugin("events-manager").service("public-api")`.
   *
   * `now` is passed in (not read here) so the upcoming/past bucketing is
   * deterministically unit-testable. Only PUBLISHED events are considered.
   *
   * For each referenced saved id we track the earliest event with
   * `startDateTime >= now` (→ `nextScreeningDate` + that event's venue) and the
   * latest event with `startDateTime < now` (→ `lastScreeningDate`, contributing
   * the venue only when there is no upcoming event). A single event's
   * `screenings` can reference several saved movies, so the event is attributed
   * to every referenced id. An id with no matching published event is absent
   * from the returned record (the service merges it to all-null enrichment).
   */
  async findScreeningInfoByMovies(
    creativeWorkIds: string[],
    now: string
  ): Promise<Record<string, ScreeningInfo>> {
    if (creativeWorkIds.length === 0) {
      return {}
    }

    const events = (await strapi.documents(EVENT_UID).findMany({
      status: "published",
      filters: {
        screenings: { movie: { documentId: { $in: creativeWorkIds } } },
      },
      populate: {
        venue: true,
        screenings: { populate: { movie: true } },
      },
      sort: "startDateTime:asc",
    } as never)) as EnrichmentEvent[]

    // Bucket/order by parsed instant, not by raw string: a `startDateTime` stored
    // with a timezone offset or differing sub-second precision would sort/bucket
    // wrong under a lexicographic compare. `now` is parsed once. A Set makes the
    // membership check O(1) per screening.
    const idSet = new Set(creativeWorkIds)
    const nowTs = Date.parse(now)
    const out: Record<string, ScreeningInfo> = {}

    for (const ev of events) {
      const when = ev.startDateTime
      const whenTs = when ? Date.parse(when) : NaN
      if (Number.isNaN(whenTs)) continue
      const upcoming = whenTs >= nowTs
      const venueName = ev.venue?.name ?? null

      for (const screening of ev.screenings ?? []) {
        const id = screening?.movie?.documentId
        if (!id || !idSet.has(id)) continue

        const cur = (out[id] ??= {
          nextScreeningDate: null,
          lastScreeningDate: null,
          venueName: null,
        })

        if (upcoming) {
          if (
            !cur.nextScreeningDate ||
            whenTs < Date.parse(cur.nextScreeningDate)
          ) {
            cur.nextScreeningDate = when
            cur.venueName = venueName
          }
        } else if (
          !cur.lastScreeningDate ||
          whenTs > Date.parse(cur.lastScreeningDate)
        ) {
          cur.lastScreeningDate = when
          if (!cur.nextScreeningDate) cur.venueName = venueName
        }
      }
    }

    return out
  },
})

export default publicApiService

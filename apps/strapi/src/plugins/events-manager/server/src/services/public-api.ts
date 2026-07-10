import type { Core } from "@strapi/strapi"

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

export type SubEventKind = keyof typeof SUB_EVENT_UIDS

/** Error code thrown when a sale would exceed remaining capacity. */
export const TICKET_SOLD_OUT = "TICKET_SOLD_OUT"

interface SubEventInventory {
  documentId: string
  ticketsSold: number
  ticketsAvailable: number
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
   * (no upper guard, but never drives `ticketsSold` below zero).
   *
   * Goes through the Document Service API only — no raw SQL. `status: "published"`
   * targets the published row of the draftAndPublish document, so the read and
   * write both operate on the live version (no draft/published double-count).
   *
   * Runs inside the caller's `strapi.db.transaction(...)`: Document Service
   * writes auto-enlist in the ambient transaction via AsyncLocalStorage, so the
   * inventory change rolls back together with the order/ticket writes.
   *
   * ── CONCURRENCY NOT HANDLED (deferred to Epic 6) ───────────────────────────
   * This is a plain read-modify-write: two concurrent buyers can both read the
   * same `ticketsSold` and both pass the guard, overselling the last seat. That
   * is acceptable for now — ticketing is not on the path to first production
   * (ships post-GTM). A concurrency-safe reservation (DB CHECK constraint,
   * row lock, or optimistic version field) is an Epic 6 concern. See
   * deferred-work.md.
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

    const subEvent = (await strapi.documents(uid).findOne({
      documentId: subEventId,
      status: "published",
      fields: ["ticketsSold", "ticketsAvailable"],
    })) as SubEventInventory | null

    if (!subEvent) {
      throw new Error(`Sub-event ${subEventId} (${kind}) not found`)
    }

    const nextSold = subEvent.ticketsSold + delta

    if (delta > 0 && nextSold > subEvent.ticketsAvailable) {
      throw Object.assign(
        new Error(`Sub-event ${subEventId} is sold out (requested ${delta})`),
        { code: TICKET_SOLD_OUT }
      )
    }
    if (delta < 0 && nextSold < 0) {
      throw Object.assign(
        new Error(`Cannot reduce sold count for ${subEventId} by ${-delta}`),
        { code: TICKET_SOLD_OUT }
      )
    }

    await strapi.documents(uid).update({
      documentId: subEventId,
      status: "published",
      data: { ticketsSold: nextSold },
    })
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

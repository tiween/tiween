import type { Core } from "@strapi/strapi"

const PLUGIN_ID = "events-manager"

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
})

export default publicApiService

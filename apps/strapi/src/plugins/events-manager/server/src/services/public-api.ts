import type { Core } from "@strapi/strapi"
import type { Knex } from "knex"

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

/**
 * Resolve the physical table + column names for a sub-event content-type from
 * the database metadata (column names are snake_cased by Strapi, e.g.
 * `tickets_sold`). Reading them from metadata avoids hardcoding naming rules.
 */
function resolveColumns(strapi: Core.Strapi, uid: string) {
  const meta = strapi.db.metadata.get(uid)
  const col = (attr: string): string =>
    (meta.attributes[attr] as { columnName?: string })?.columnName ?? attr

  return {
    tableName: meta.tableName,
    documentIdCol: col("documentId"),
    ticketsSoldCol: col("ticketsSold"),
    ticketsAvailableCol: col("ticketsAvailable"),
  }
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
   * Atomically adjust a sub-event's sold-ticket count.
   *
   * `delta > 0` is a sale (capacity-guarded); `delta < 0` is a refund/cancel
   * (no upper guard, but never drives `ticketsSold` below zero).
   *
   * ── SANCTIONED DOCUMENT-SERVICE EXCEPTION ──────────────────────────────
   * This is the ONE place in the codebase that bypasses the Document Service
   * API (architecture amendment, "Validation Issues Addressed"). The oversell
   * race cannot be closed with a read-then-write through the Document Service:
   * two concurrent buyers both read `ticketsSold` then both write, overselling
   * the last seat. The Strapi v5 query builder (`updateMany`) also cannot
   * express this guard — its `data` only takes static values (no
   * column-relative `ticketsSold = ticketsSold + delta`) and its `where`
   * compares a column to a literal (no column-vs-column
   * `ticketsSold + delta <= ticketsAvailable`). We therefore drop to a single
   * raw, atomic, capacity-guarded SQL UPDATE — the DB rejects oversell, not
   * app code. Zero rows affected => the guard failed => sold out.
   *
   * draftAndPublish note: screening/performance are draft+publish, so a
   * `documentId` can map to a draft row and/or a published row. We guard +
   * increment by `document_id` so EVERY version of the document stays in sync
   * and the guard holds on each. A sold-out document has zero rows that pass
   * the guard, so `count === 0` => TICKET_SOLD_OUT regardless of how many
   * versions exist.
   *
   * MUST run inside the caller's transaction — it never opens its own (the
   * order/ticket writes and this inventory write must share one unit of work).
   * Pass the caller's `trx` from `strapi.db.transaction(({ trx }) => ...)`.
   */
  async adjustInventory(
    subEventId: string,
    kind: SubEventKind,
    delta: number,
    trx?: Knex.Transaction
  ): Promise<void> {
    const uid = SUB_EVENT_UIDS[kind]
    if (!uid) {
      throw new Error(`Unknown sub-event kind: ${kind}`)
    }
    if (!Number.isInteger(delta) || delta === 0) {
      throw new Error(`adjustInventory delta must be a non-zero integer`)
    }

    const { tableName, documentIdCol, ticketsSoldCol, ticketsAvailableCol } =
      resolveColumns(strapi, uid)

    const knex = strapi.db.connection
    // Bind to the caller's transaction so this write rolls back with the order.
    const query = trx ? knex(tableName).transacting(trx) : knex(tableName)

    query.where(documentIdCol, subEventId)

    if (delta > 0) {
      // Capacity guard: only rows where the sale still fits get updated.
      query.andWhereRaw("?? + ? <= ??", [
        ticketsSoldCol,
        delta,
        ticketsAvailableCol,
      ])
    } else {
      // Refund/cancel: never drive sold count below zero.
      query.andWhereRaw("?? + ? >= 0", [ticketsSoldCol, delta])
    }

    // Column-relative SET — the DB performs the increment atomically.
    const affectedRows = await query.update({
      [ticketsSoldCol]: knex.raw("?? + ?", [ticketsSoldCol, delta]),
    })

    if (affectedRows === 0) {
      throw Object.assign(
        new Error(
          delta > 0
            ? `Sub-event ${subEventId} is sold out (requested ${delta})`
            : `Cannot reduce sold count for ${subEventId} by ${-delta}`
        ),
        { code: TICKET_SOLD_OUT }
      )
    }
  },
})

export default publicApiService

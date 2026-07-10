/**
 * Co-located ticketing types (Story 6.1).
 *
 * These mirror the public read endpoint
 * `GET /events-manager/showtimes/:documentId/ticket-tiers` (the Strapi v5
 * `{ data, meta }` envelope wraps `TicketTiersResponse` in `data`). Kept local
 * to the feature — there is no `packages/shared-types` package in this repo.
 */

/** The three canonical ticket types; display labels come from frontend i18n. */
export type TicketTierType = "standard" | "reduced" | "vip"

export type SubEventKind = "screening" | "performance"

/** One computed, display-ready ticket tier row. */
export interface TicketTier {
  type: TicketTierType
  /** Unit price in the response `currency`. */
  price: number
  ticketsAvailable: number
  ticketsSold: number
  /** `max(0, ticketsAvailable - ticketsSold)`. */
  remaining: number
  /** `true` when `remaining <= 0` — rendered disabled and non-selectable. */
  soldOut: boolean
  /** e.g. "sur justificatif"; `null` when the tier has no restriction. */
  restrictionNote: string | null
}

/** The `data` payload for a sub-event's ticket tiers. */
export interface TicketTiersResponse {
  subEventId: string
  kind: SubEventKind
  startDateTime: string | null
  /** ISO-ish currency code from backend config (e.g. "TND"). */
  currency: string
  tiers: TicketTier[]
}

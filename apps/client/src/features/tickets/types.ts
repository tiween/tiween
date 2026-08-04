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
  /** Server-computed remaining capacity. */
  remaining: number
  /** `true` when `remaining <= 0` — rendered disabled and non-selectable. */
  soldOut: boolean
  /** e.g. "sur justificatif"; `null` when the tier has no restriction. */
  restrictionNote: string | null
}

/**
 * One sanitized ticket row (Story 6.4), as returned by
 * `GET /ticketing/my-tickets` and `GET /ticketing/order-tickets/:orderNumber`.
 *
 * The backend builds this from an explicit allow-list — no guest email/name,
 * no payment reference, no access token, no QR nonce. `qrCode` is the opaque
 * signed `TWQ1.` token and is `null` until the order is paid.
 */
export interface TicketView {
  ticketNumber: string
  type: TicketTierType
  status: "valid" | "scanned" | "cancelled" | "expired"
  price: number
  qrCode: string | null
  scannedAt: string | null
  orderNumber: string
  eventTitle: string
  startDateTime: string | null
  venueName: string | null
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

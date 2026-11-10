import { env } from "@/env.mjs"

import { routing } from "./navigation"

/**
 * Feature flags (Story 3.12) — the SINGLE seam through which purchase-surface
 * gating is read. Call sites must never read `process.env` directly.
 *
 * v1 is an aggregation-only launch (sprint-change-proposal-2026-08-06): the
 * Epic 6 purchase surfaces (ticket prices, quantity selection, Konnect
 * checkout) stay shipped-but-dormant behind `NEXT_PUBLIC_TICKET_PURCHASE_ENABLED`.
 * The var is validated in `env.mjs` with the `optionalZodBoolean` pattern, so
 * absence, empty string, or a garbage value all coerce to OFF; only "true"
 * (case-insensitive — the schema lowercases first) turns purchases on. Being `NEXT_PUBLIC_*` it is inlined at
 * build time — "per environment" means per-environment build/deploy env.
 */
export function isTicketPurchaseEnabled(): boolean {
  return env.NEXT_PUBLIC_TICKET_PURCHASE_ENABLED === true
}

/**
 * Tickets navigation gate (D-17) — the single seam deciding whether the
 * tickets entry appears in BottomNav and DesktopNav.
 *
 * At launch the public site is a shorts directory: tickets are not available,
 * so the mobile nav shows three tabs and the desktop header has no tickets
 * link. Setting `NEXT_PUBLIC_TICKETING_ENABLED=true` restores the entry.
 * Being `NEXT_PUBLIC_*` it is inlined at build time. Only the navigation is
 * gated: the `/tickets` route and the ticketing components are dormant, never
 * deleted (kernel landmine). This is deliberately NOT the narrower
 * `NEXT_PUBLIC_TICKET_PURCHASE_ENABLED` flag (RESEARCH Pitfall 17).
 */
export function isTicketingEnabled(): boolean {
  return env.NEXT_PUBLIC_TICKETING_ENABLED === true
}

/**
 * Purchase-route matcher used by the Next proxy rewrite-to-404 layer.
 *
 * Matches (with an OPTIONAL locale prefix — `localePrefix: "as-needed"` means
 * the default locale ships unprefixed URLs):
 * - `/tickets/<documentId>/<screeningId>` (+ `/payment`, `/payment/result`)
 * - `/desktop-prototypes/ticketing*` (static mockups showing prices/quantities)
 *
 * Deliberately does NOT match `/tickets` exact — that is "Mes Billets"
 * (viewing, Story 6.4), not a purchase entry point.
 */
const purchasePathnameRegex = RegExp(
  `^(/(${routing.locales.join("|")}))?` +
    `/(tickets/[^/]+/[^/]+(/payment(/result)?)?|desktop-prototypes/ticketing[^/]*)/?$`,
  "i"
)

export function isTicketPurchasePath(pathname: string): boolean {
  return purchasePathnameRegex.test(pathname)
}

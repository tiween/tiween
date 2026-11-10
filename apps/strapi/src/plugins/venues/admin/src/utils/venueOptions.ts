/**
 * The venue `type` and `status` vocabularies, as the UI needs them.
 *
 * RECONCILIATION (Story 2D.2, AC 10): the Claude Design prototype's `data.js`
 * uses `cinema/theatre/musee/centre/salle`. Those values do NOT exist — the
 * SCHEMA WINS, and the schema enum is the list below. The prototype's labels
 * survive as translated LABELS; no new enum member was introduced.
 *
 * Labels are translation KEYS, never literals, so the same option list serves
 * AR/FR/EN (AC 8).
 */
import type { VenueStatus, VenueType } from "../hooks/useVenuesAdmin"

/** The `type` enum, in the order the schema declares it. */
export const VENUE_TYPES: VenueType[] = [
  "cinema",
  "theater",
  "cultural-center",
  "museum",
  "other",
]

/** The `status` enum, in workflow order. */
export const VENUE_STATUSES: VenueStatus[] = [
  "pending",
  "approved",
  "suspended",
]

/** Unprefixed translation key for a type value. */
export const typeLabelKey = (type: string): string => `type.${type}`

/** Unprefixed translation key for a status value. */
export const statusLabelKey = (status: string): string => `status.${status}`

/**
 * Badge colours per status. DS TOKENS only — a hex here is an auto-fail in the
 * DS review (handoff/ds-component-binding.md § 0). Pending takes neutral800
 * text: warning700 on warning100 is 4.0:1, which fails WCAG AA at the 11px badge
 * size (apps/strapi/DESIGN.md, Chips).
 */
export const STATUS_BADGE_COLORS: Record<
  VenueStatus,
  { backgroundColor: string; textColor: string }
> = {
  pending: { backgroundColor: "warning200", textColor: "neutral800" },
  approved: { backgroundColor: "success100", textColor: "success700" },
  suspended: { backgroundColor: "danger100", textColor: "danger700" },
}

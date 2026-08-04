import { extractErrorCode } from "@/features/tickets/utils/extractErrorCode"

/**
 * Ticket-read error codes with a dedicated `ticketing.errors.*` translation
 * (Story 6.4). Anything else collapses to `UNKNOWN_ERROR` so a read failure is
 * always shown as translated copy and never as a raw backend string.
 *
 * Shared by "Mes Billets" and the payment result page: a failed read must mean
 * the same thing on both, because on both the alternative — rendering nothing —
 * reads as "you have no tickets" to someone who has paid.
 */
export const KNOWN_TICKET_ERROR_CODES = [
  "UNAUTHORIZED",
  "FORBIDDEN",
  "UNKNOWN_ERROR",
] as const

export type KnownTicketErrorCode = (typeof KNOWN_TICKET_ERROR_CODES)[number]

/** Map any thrown read error onto a translatable code. */
export function toKnownTicketErrorCode(error: unknown): KnownTicketErrorCode {
  const code = extractErrorCode(error)
  return (KNOWN_TICKET_ERROR_CODES as readonly string[]).includes(code)
    ? (code as KnownTicketErrorCode)
    : "UNKNOWN_ERROR"
}

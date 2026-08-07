import type {
  TicketQRTicket,
  TicketStatus,
} from "@/features/tickets/components/TicketQR"
import type { TicketView } from "@/features/tickets/types"

import { toNumeralSafeLocale } from "@/lib/intl-locale"

/** Bidi/RTL control marks Arabic formatters interleave into numeric output. */
const BIDI_MARKS = /[‎‏؜]/g

/**
 * Locale-formatted date + time for a showtime.
 *
 * Three project invariants are pinned here rather than left to CLDR defaults:
 * Western numerals for every locale (via `toNumeralSafeLocale`), the app-wide
 * `DD/MM/YYYY` order and a 24-hour clock (`en` would otherwise print
 * `08/20/2026` and Arabic `08:30 م`), and the fixed `Africa/Tunis` timezone so
 * the printed hour matches the venue's clock whatever the device is set to.
 *
 * Extracted from `TicketList` (Story 6.6) so the grouped view shares the exact
 * same formatting rather than re-deriving these invariants.
 */
export function formatShowtime(
  iso: string | null,
  locale: string
): { date: string; time: string } {
  if (!iso) return { date: "", time: "" }
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return { date: "", time: "" }

  // Assembled from parts (not `format`) so the DD/MM/YYYY order is the app's,
  // not the locale's.
  const parts = new Intl.DateTimeFormat(toNumeralSafeLocale(locale), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Africa/Tunis",
  }).formatToParts(parsed)
  const part = (type: string) =>
    parts.find((p) => p.type === type)?.value.replace(BIDI_MARKS, "") ?? ""

  return {
    date: `${part("day")}/${part("month")}/${part("year")}`,
    time: new Intl.DateTimeFormat(toNumeralSafeLocale(locale), {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Africa/Tunis",
    })
      .format(parsed)
      .replace(BIDI_MARKS, ""),
  }
}

/** `TicketView.status` -> the three states `TicketQR` renders. */
export function toQRStatus(status: TicketView["status"]): TicketStatus {
  if (status === "scanned") return "scanned"
  if (status === "cancelled" || status === "expired") return "expired"
  return "valid"
}

/**
 * Map a sanitized `TicketView` row onto the shape `TicketQR` renders.
 *
 * The single mapping shared by the flat `TicketList` (Story 6.4) and the
 * grouped view's dialog (Story 6.6) — one place owns the `quantity: 1`,
 * status-collapse and showtime-formatting decisions.
 *
 * Only call this for a ticket whose `qrCode` is present; a pending ticket
 * (paid but no QR issued yet) renders the `qrPending` placeholder instead —
 * both call sites guard on `qrCode` before mapping.
 */
export function toTicketQRTicket(
  ticket: TicketView,
  locale: string
): TicketQRTicket {
  const { date, time } = formatShowtime(ticket.startDateTime, locale)
  return {
    id: ticket.ticketNumber,
    qrData: ticket.qrCode ?? "",
    eventTitle: ticket.eventTitle,
    date,
    time,
    venueName: ticket.venueName ?? "",
    quantity: 1,
    status: toQRStatus(ticket.status),
    scannedAt: ticket.scannedAt ? new Date(ticket.scannedAt) : undefined,
  }
}

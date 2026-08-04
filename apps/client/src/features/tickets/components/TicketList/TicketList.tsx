"use client"

import * as React from "react"
import { Ticket } from "lucide-react"

import type { TicketQRLabels, TicketStatus } from "../TicketQR"
import type { TicketView } from "@/features/tickets/types"

import { toNumeralSafeLocale } from "@/lib/intl-locale"
import { cn } from "@/lib/utils"

import { TicketQR } from "../TicketQR"

export interface TicketListLabels extends TicketQRLabels {
  /** Shown for a paid ticket whose QR has not been issued yet. */
  qrPending: string
  /** Empty-state heading. */
  emptyTitle: string
  /** Empty-state description. */
  emptyDescription: string
}

export interface TicketListProps {
  /** Sanitized ticket rows from the ticket-read endpoints. */
  tickets: TicketView[]
  /** Active locale — drives date/time formatting. */
  locale: string
  labels: TicketListLabels
  /** Size passed through to each `TicketQR`. */
  size?: "small" | "large"
  className?: string
}

/** `TicketView.status` -> the three states `TicketQR` renders. */
function toQRStatus(status: TicketView["status"]): TicketStatus {
  if (status === "scanned") return "scanned"
  if (status === "cancelled" || status === "expired") return "expired"
  return "valid"
}

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
 */
function formatShowtime(
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

/**
 * TicketList — renders sanitized `TicketView` rows as `TicketQR` cards
 * (Story 6.4).
 *
 * Deliberately a FLAT list: grouping by event/date, the QR-preview →
 * full-ticket interaction and the "Historique" section belong to Story 6.6.
 *
 * A ticket whose order is paid but whose `qrCode` has not been issued yet (a
 * transient state while the backend self-heals) renders a pending placeholder
 * rather than a QR encoding an empty string.
 */
export function TicketList({
  tickets,
  locale,
  labels,
  size = "large",
  className,
}: TicketListProps) {
  if (tickets.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <Ticket className="text-muted-foreground h-8 w-8" aria-hidden="true" />
        <h2 className="text-foreground text-lg font-semibold">
          {labels.emptyTitle}
        </h2>
        <p className="text-muted-foreground text-sm">
          {labels.emptyDescription}
        </p>
      </div>
    )
  }

  return (
    <ul
      className={cn("flex flex-col items-center gap-4", className)}
      data-testid="ticket-list"
    >
      {tickets.map((ticket) => {
        const { date, time } = formatShowtime(ticket.startDateTime, locale)

        if (!ticket.qrCode) {
          return (
            <li key={ticket.ticketNumber} className="w-full max-w-[320px]">
              <div className="bg-card text-card-foreground rounded-lg border p-4 text-center">
                <p className="text-foreground font-semibold">
                  {ticket.eventTitle}
                </p>
                <p className="text-muted-foreground mt-1 font-mono text-sm">
                  {ticket.ticketNumber}
                </p>
                <p className="text-muted-foreground mt-2 text-sm">
                  {labels.qrPending}
                </p>
              </div>
            </li>
          )
        }

        return (
          <li key={ticket.ticketNumber}>
            <TicketQR
              size={size}
              showActions={false}
              labels={labels}
              ticket={{
                id: ticket.ticketNumber,
                qrData: ticket.qrCode,
                eventTitle: ticket.eventTitle,
                date,
                time,
                venueName: ticket.venueName ?? "",
                quantity: 1,
                status: toQRStatus(ticket.status),
                scannedAt: ticket.scannedAt
                  ? new Date(ticket.scannedAt)
                  : undefined,
              }}
            />
          </li>
        )
      })}
    </ul>
  )
}

TicketList.displayName = "TicketList"

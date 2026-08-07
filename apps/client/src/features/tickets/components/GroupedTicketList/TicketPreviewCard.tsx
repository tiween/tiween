"use client"

import * as React from "react"
import { QRCodeSVG } from "qrcode.react"

import type { TicketView } from "@/features/tickets/types"

import { cn } from "@/lib/utils"

export interface TicketPreviewCardLabels {
  /** Accessible name for the QR thumbnail image. */
  qrAlt: string
  /** Shown for a paid ticket whose QR has not been issued yet. */
  qrPending: string
  /** Accessible name for the preview button, e.g. "Voir le billet TW-1-1". */
  viewTicket: (ticketNumber: string) => string
}

export interface TicketPreviewCardProps {
  ticket: TicketView
  labels: TicketPreviewCardLabels
  /** Called with the ticket when the preview is activated. */
  onSelect: (ticket: TicketView) => void
  className?: string
}

/** Thumbnail QR edge in px — a preview, not a scannable credential. */
const THUMBNAIL_SIZE = 72

/**
 * TicketPreviewCard — one compact, tappable ticket inside a group
 * (Story 6.6).
 *
 * Deliberately shows only what distinguishes the ticket within its group (QR
 * thumbnail + ticket number): the event title, date/time and venue live in the
 * group header and are not repeated here.
 *
 * A real `<button>` so it is keyboard- and screen-reader-reachable; a pending
 * ticket (paid, `qrCode` still null) renders the same card disabled with the
 * `qrPending` placeholder — there is no full ticket to open yet.
 */
export function TicketPreviewCard({
  ticket,
  labels,
  onSelect,
  className,
}: TicketPreviewCardProps) {
  const isPending = !ticket.qrCode

  return (
    <button
      type="button"
      disabled={isPending}
      aria-label={labels.viewTicket(ticket.ticketNumber)}
      onClick={() => {
        if (!isPending) onSelect(ticket)
      }}
      className={cn(
        "bg-card text-card-foreground flex flex-col items-center gap-2 rounded-lg border p-3",
        "focus-visible:ring-ring transition-colors focus-visible:ring-2 focus-visible:outline-none",
        isPending
          ? "cursor-default opacity-70"
          : "hover:bg-accent hover:text-accent-foreground",
        className
      )}
    >
      {ticket.qrCode ? (
        <span
          className="flex items-center justify-center rounded-md bg-white p-1.5"
          style={{ width: THUMBNAIL_SIZE + 12, height: THUMBNAIL_SIZE + 12 }}
        >
          {/* Inline SVG like the full `TicketQR`: the signed credential never
              leaves the device for a QR-image host. */}
          <QRCodeSVG
            value={ticket.qrCode}
            size={THUMBNAIL_SIZE}
            level="M"
            role="img"
            aria-label={labels.qrAlt}
            className="rounded-sm"
          />
        </span>
      ) : (
        <span
          aria-hidden="true"
          className="bg-muted text-muted-foreground flex items-center justify-center rounded-md text-2xl"
          style={{ width: THUMBNAIL_SIZE + 12, height: THUMBNAIL_SIZE + 12 }}
        >
          …
        </span>
      )}

      <span className="text-muted-foreground font-mono text-xs">
        {ticket.ticketNumber}
      </span>

      {isPending && (
        <span className="text-muted-foreground text-xs">{labels.qrPending}</span>
      )}
    </button>
  )
}

TicketPreviewCard.displayName = "TicketPreviewCard"

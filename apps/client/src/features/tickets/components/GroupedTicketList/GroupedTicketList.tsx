"use client"

import * as React from "react"
import { groupTickets } from "@/features/tickets/utils/groupTickets"
import {
  formatShowtime,
  toTicketQRTicket,
} from "@/features/tickets/utils/ticketDisplay"
import { Calendar, Clock, MapPin, Ticket } from "lucide-react"

import type { TicketGroup } from "@/features/tickets/utils/groupTickets"
import type { TicketListLabels } from "../TicketList"
import type { TicketView } from "@/features/tickets/types"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { TicketQR } from "../TicketQR"
import { TicketPreviewCard } from "./TicketPreviewCard"

export interface GroupedTicketListLabels extends TicketListLabels {
  /** Heading of the upcoming-tickets section. */
  upcomingTitle: string
  /** Heading of the past-tickets section (fr: "Historique"). */
  historyTitle: string
  /** Accessible name for a ticket preview button. */
  viewTicket: (ticketNumber: string) => string
  /** Title of the full-ticket dialog. */
  dialogTitle: string
}

export interface GroupedTicketListProps {
  /** Sanitized ticket rows from the ticket-read endpoints. */
  tickets: TicketView[]
  /** Active locale — drives date/time formatting. */
  locale: string
  labels: GroupedTicketListLabels
  className?: string
}

/**
 * GroupedTicketList — the "Mes Billets" body (Story 6.6).
 *
 * Tickets are grouped by event + showtime with one header per group (title,
 * date, time, venue, count) and compact tappable previews; tapping opens the
 * full `TicketQR` in a dialog. Groups whose showtime's Africa/Tunis date is
 * before today sit in a separate "Historique" section below the upcoming
 * groups. Partition/sort logic lives in the pure `groupTickets` util.
 *
 * When no group is upcoming the section shows the 6.4 empty-state copy —
 * "Historique" (if any) still renders below it.
 */
export function GroupedTicketList({
  tickets,
  locale,
  labels,
  className,
}: GroupedTicketListProps) {
  // "Today" is sampled once per mount: the partition must not flip mid-session
  // while the page sits open, and the pure util takes `now` injected.
  const [now] = React.useState(() => new Date())
  const { upcoming, history } = React.useMemo(
    () => groupTickets(tickets, now),
    [tickets, now]
  )

  const [selected, setSelected] = React.useState<TicketView | null>(null)

  const renderGroup = (group: TicketGroup) => {
    const { date, time } = formatShowtime(group.startDateTime, locale)

    return (
      <li key={group.key} className="flex flex-col gap-3">
        <header className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-foreground text-base font-semibold">
              {group.eventTitle}
            </h3>
            <Badge variant="secondary" className="shrink-0">
              <Ticket className="me-1 h-3 w-3" aria-hidden="true" />
              {labels.tickets(group.tickets.length)}
            </Badge>
          </div>
          {/* Empty for a null/unparseable showtime — never "Invalid Date". */}
          {date && time && (
            <p className="text-muted-foreground flex items-center gap-1 text-sm">
              <Calendar className="h-4 w-4" aria-hidden="true" />
              <span>{date}</span>
              <span className="mx-1" aria-hidden="true">
                •
              </span>
              <Clock className="h-4 w-4" aria-hidden="true" />
              <span>{time}</span>
            </p>
          )}
          {group.venueName && (
            <p className="text-muted-foreground flex items-center gap-1 text-sm">
              <MapPin className="h-4 w-4" aria-hidden="true" />
              <span>{group.venueName}</span>
            </p>
          )}
        </header>

        <ul className="flex flex-wrap gap-2">
          {group.tickets.map((ticket) => (
            <li key={ticket.ticketNumber}>
              <TicketPreviewCard
                ticket={ticket}
                labels={labels}
                onSelect={setSelected}
              />
            </li>
          ))}
        </ul>
      </li>
    )
  }

  return (
    <div className={cn("flex flex-col gap-8", className)}>
      {upcoming.length === 0 ? (
        // The 6.4 empty-state copy — also shown when every ticket is past.
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <Ticket
            className="text-muted-foreground h-8 w-8"
            aria-hidden="true"
          />
          <h2 className="text-foreground text-lg font-semibold">
            {labels.emptyTitle}
          </h2>
          <p className="text-muted-foreground text-sm">
            {labels.emptyDescription}
          </p>
        </div>
      ) : (
        <section className="flex flex-col gap-4">
          <h2 className="text-foreground text-lg font-semibold">
            {labels.upcomingTitle}
          </h2>
          <ul className="flex flex-col gap-6" data-testid="upcoming-groups">
            {upcoming.map(renderGroup)}
          </ul>
        </section>
      )}

      {history.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-foreground text-lg font-semibold">
            {labels.historyTitle}
          </h2>
          <ul className="flex flex-col gap-6" data-testid="history-groups">
            {history.map(renderGroup)}
          </ul>
        </section>
      )}

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
      >
        {/* No DialogDescription: the ticket card itself is the content, and
            `aria-describedby={undefined}` opts out of Radix's pairing warning. */}
        <DialogContent
          aria-describedby={undefined}
          className="w-fit max-w-[calc(100%-2rem)] sm:max-w-fit"
        >
          <DialogHeader>
            <DialogTitle>{labels.dialogTitle}</DialogTitle>
          </DialogHeader>
          {/* Previews for pending tickets are disabled, so `selected` always
              carries a QR — the guard keeps an empty QR impossible anyway. */}
          {selected?.qrCode && (
            <TicketQR
              size="large"
              showActions={false}
              labels={labels}
              ticket={toTicketQRTicket(selected, locale)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

GroupedTicketList.displayName = "GroupedTicketList"

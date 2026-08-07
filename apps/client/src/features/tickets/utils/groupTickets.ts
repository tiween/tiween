import type { TicketView } from "@/features/tickets/types"

/**
 * One event + showtime group in the "Mes Billets" view (Story 6.6).
 *
 * Identity is `eventTitle` + `startDateTime` — `TicketView` deliberately
 * exposes no event/document id (sanitized allow-list, Story 6.4), so the same
 * event on two dates is two groups, which is exactly what "grouped by
 * event/date" asks for.
 */
export interface TicketGroup {
  /** Stable render key: `eventTitle` + raw `startDateTime`. */
  key: string
  eventTitle: string
  /** The raw ISO value shared by the group's tickets (`null` when absent). */
  startDateTime: string | null
  /** First non-null venue among the group's tickets. */
  venueName: string | null
  tickets: TicketView[]
}

export interface GroupedTickets {
  /** Soonest first; groups without a parseable showtime last, insertion order. */
  upcoming: TicketGroup[]
  /** Most recent first — the "Historique" section. */
  history: TicketGroup[]
}

/**
 * `YYYY-MM-DD` calendar date of an instant *in Africa/Tunis*.
 *
 * `en-CA` prints ISO order with Latin digits, so the strings compare
 * lexicographically as dates. The venue timezone is fixed (same precedent as
 * `formatShowtime`): "past" must mean past for the venue's clock, whatever the
 * device is set to.
 */
function tunisDay(instant: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Africa/Tunis",
  }).format(instant)
}

/** Epoch millis of a group's showtime, or `null` when absent/unparseable. */
function parseShowtime(iso: string | null): number | null {
  if (!iso) return null
  const ms = new Date(iso).getTime()
  return Number.isNaN(ms) ? null : ms
}

/**
 * Group tickets by event + showtime and partition into upcoming vs history
 * (Story 6.6). Pure: `now` is injected by the caller — no `Date.now()` here.
 *
 * Partition is by Africa/Tunis *calendar date*, not timestamp: a group is
 * historical only when its showtime's Tunis date is strictly before `now`'s
 * Tunis date, so a 21:00 ticket is still "upcoming" at 23:30 on event night —
 * exactly when it must be at hand. A ticket with a null or unparseable
 * `startDateTime` is never demoted: it may be a live credential, so it stays
 * upcoming (ordered after the dated groups).
 */
export function groupTickets(
  tickets: TicketView[],
  now: Date
): GroupedTickets {
  // Map preserves insertion order — the tie-break for undated groups.
  const groups = new Map<string, TicketGroup>()

  for (const ticket of tickets) {
    // NUL separator: it appears in neither an ISO datetime nor a title, so one
    // title+date pair can never collide with another.
    const key = `${ticket.eventTitle}\u0000${ticket.startDateTime ?? ""}`
    let group = groups.get(key)
    if (!group) {
      group = {
        key,
        eventTitle: ticket.eventTitle,
        startDateTime: ticket.startDateTime,
        venueName: null,
        tickets: [],
      }
      groups.set(key, group)
    }
    group.tickets.push(ticket)
    if (group.venueName === null && ticket.venueName !== null) {
      group.venueName = ticket.venueName
    }
  }

  const today = tunisDay(now)
  const upcoming: Array<{ group: TicketGroup; ms: number | null }> = []
  const history: Array<{ group: TicketGroup; ms: number }> = []

  for (const group of groups.values()) {
    const ms = parseShowtime(group.startDateTime)
    if (ms !== null && tunisDay(new Date(ms)) < today) {
      history.push({ group, ms })
    } else {
      upcoming.push({ group, ms })
    }
  }

  // Soonest first; undated groups sink to the end (stable sort keeps their
  // insertion order among themselves).
  upcoming.sort((a, b) => {
    if (a.ms === null && b.ms === null) return 0
    if (a.ms === null) return 1
    if (b.ms === null) return -1
    return a.ms - b.ms
  })
  // Most recent first.
  history.sort((a, b) => b.ms - a.ms)

  return {
    upcoming: upcoming.map((entry) => entry.group),
    history: history.map((entry) => entry.group),
  }
}

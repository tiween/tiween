import { describe, expect, it } from "vitest"

import type { TicketView } from "@/features/tickets/types"

import { groupTickets } from "./groupTickets"

/**
 * Pure grouping/partition/sort core of Story 6.6. `now` is always injected —
 * every boundary here is expressed against the Africa/Tunis (UTC+1, no DST)
 * calendar date, never the device clock.
 */

function ticket(overrides: Partial<TicketView> = {}): TicketView {
  return {
    ticketNumber: "TW-1-1",
    type: "standard",
    status: "valid",
    price: 10,
    qrCode: "TWQ1.payload.sig",
    scannedAt: null,
    orderNumber: "TW-1",
    eventTitle: "Inception",
    startDateTime: "2026-08-20T19:30:00.000Z",
    venueName: "Cinéma Le Palace",
    ...overrides,
  }
}

// Tunis 2026-08-06 11:00 (UTC+1).
const NOW = new Date("2026-08-06T10:00:00.000Z")

describe("groupTickets", () => {
  it("returns empty sections for no tickets", () => {
    expect(groupTickets([], NOW)).toEqual({ upcoming: [], history: [] })
  })

  it("partitions mixed tickets and sorts upcoming soonest-first, history most-recent-first", () => {
    const result = groupTickets(
      [
        ticket({
          ticketNumber: "T-NEXTWEEK",
          eventTitle: "Next Week",
          startDateTime: "2026-08-13T19:00:00.000Z",
        }),
        ticket({
          ticketNumber: "T-LASTMONTH",
          eventTitle: "Last Month",
          startDateTime: "2026-07-01T19:00:00.000Z",
        }),
        ticket({
          ticketNumber: "T-TODAY",
          eventTitle: "Tonight",
          startDateTime: "2026-08-06T20:00:00.000Z",
        }),
        ticket({
          ticketNumber: "T-LASTWEEK",
          eventTitle: "Last Week",
          startDateTime: "2026-07-30T19:00:00.000Z",
        }),
      ],
      NOW
    )

    expect(result.upcoming.map((g) => g.eventTitle)).toEqual([
      "Tonight",
      "Next Week",
    ])
    expect(result.history.map((g) => g.eventTitle)).toEqual([
      "Last Week",
      "Last Month",
    ])
  })

  it("keeps the same event on two dates as two distinct groups", () => {
    const result = groupTickets(
      [
        ticket({
          ticketNumber: "T-1",
          startDateTime: "2026-08-21T19:30:00.000Z",
        }),
        ticket({
          ticketNumber: "T-2",
          startDateTime: "2026-08-20T19:30:00.000Z",
        }),
      ],
      NOW
    )

    expect(result.upcoming).toHaveLength(2)
    // Soonest first.
    expect(result.upcoming[0].startDateTime).toBe("2026-08-20T19:30:00.000Z")
    expect(result.upcoming[1].startDateTime).toBe("2026-08-21T19:30:00.000Z")
    expect(result.upcoming[0].key).not.toBe(result.upcoming[1].key)
  })

  it("collects same event+showtime tickets into one group with header data", () => {
    const result = groupTickets(
      [
        ticket({ ticketNumber: "T-1", venueName: null }),
        ticket({ ticketNumber: "T-2" }),
        ticket({ ticketNumber: "T-3" }),
      ],
      NOW
    )

    expect(result.upcoming).toHaveLength(1)
    const group = result.upcoming[0]
    expect(group.eventTitle).toBe("Inception")
    expect(group.startDateTime).toBe("2026-08-20T19:30:00.000Z")
    // First non-null venue among the group's tickets.
    expect(group.venueName).toBe("Cinéma Le Palace")
    expect(group.tickets.map((t) => t.ticketNumber)).toEqual([
      "T-1",
      "T-2",
      "T-3",
    ])
  })

  it("keeps an event-night ticket upcoming after the show started (23:30 Tunis)", () => {
    // Show tonight 21:00 Tunis; "now" is 23:30 Tunis the same night.
    const result = groupTickets(
      [ticket({ startDateTime: "2026-08-06T20:00:00.000Z" })],
      new Date("2026-08-06T22:30:00.000Z")
    )

    expect(result.upcoming).toHaveLength(1)
    expect(result.history).toHaveLength(0)
  })

  it("moves the ticket to history once the Tunis date changes (00:01 next day)", () => {
    // Same show; "now" is 00:01 Tunis the next day (23:01 UTC).
    const result = groupTickets(
      [ticket({ startDateTime: "2026-08-06T20:00:00.000Z" })],
      new Date("2026-08-06T23:01:00.000Z")
    )

    expect(result.upcoming).toHaveLength(0)
    expect(result.history).toHaveLength(1)
  })

  it("partitions on the Tunis date, not the UTC date", () => {
    // 2026-08-05T23:30:00Z is already 2026-08-06 00:30 in Tunis — the show is
    // "today", not yesterday, when now is early on the 6th (Tunis).
    const result = groupTickets(
      [ticket({ startDateTime: "2026-08-05T23:30:00.000Z" })],
      new Date("2026-08-06T10:00:00.000Z")
    )

    expect(result.upcoming).toHaveLength(1)
    expect(result.history).toHaveLength(0)
  })

  it("never demotes a null or unparseable showtime — upcoming, after dated groups", () => {
    const result = groupTickets(
      [
        ticket({
          ticketNumber: "T-NULL",
          eventTitle: "No Date",
          startDateTime: null,
        }),
        ticket({
          ticketNumber: "T-GARBAGE",
          eventTitle: "Garbage Date",
          startDateTime: "not-a-date",
        }),
        ticket({
          ticketNumber: "T-DATED",
          eventTitle: "Dated",
          startDateTime: "2026-08-10T19:00:00.000Z",
        }),
      ],
      NOW
    )

    expect(result.history).toHaveLength(0)
    // Dated first; undated keep their insertion order after it.
    expect(result.upcoming.map((g) => g.eventTitle)).toEqual([
      "Dated",
      "No Date",
      "Garbage Date",
    ])
  })

  it("treats null and garbage showtimes of one event as distinct groups", () => {
    const result = groupTickets(
      [
        ticket({ ticketNumber: "T-1", startDateTime: null }),
        ticket({ ticketNumber: "T-2", startDateTime: "not-a-date" }),
      ],
      NOW
    )

    expect(result.upcoming).toHaveLength(2)
  })

  it("puts every group in history when all tickets are past", () => {
    const result = groupTickets(
      [
        ticket({
          ticketNumber: "T-1",
          eventTitle: "A",
          startDateTime: "2026-07-01T19:00:00.000Z",
        }),
        ticket({
          ticketNumber: "T-2",
          eventTitle: "B",
          startDateTime: "2026-07-15T19:00:00.000Z",
        }),
      ],
      NOW
    )

    expect(result.upcoming).toHaveLength(0)
    expect(result.history.map((g) => g.eventTitle)).toEqual(["B", "A"])
  })
})

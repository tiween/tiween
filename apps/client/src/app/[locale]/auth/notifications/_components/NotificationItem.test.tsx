/**
 * Tests for `NotificationItem` (Story 5.6).
 *
 * next-intl echoes keys and surfaces the `{title}`/`{time}` params so the
 * change-type headline wiring is asserted; `lib/dates` helpers are mocked to
 * fixed tokens so the old→new / cancellation rendering is deterministic.
 */
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import type { ScheduleNotification } from "@/features/notifications/hooks/useNotifications"

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) => {
    if (values?.title) return `${key}:${values.title}`
    if (values?.time) return `${key}:${values.time}`
    return key
  },
  useLocale: () => "fr",
}))

vi.mock("@/lib/dates", () => ({
  formatDate: (iso: string) => `DATE(${iso})`,
  formatTime: (iso: string) => `TIME(${iso})`,
  formatRelativeTime: (iso: string) => `AGO(${iso})`,
}))

import { NotificationItem } from "./NotificationItem"

function makeNotification(
  overrides: Partial<ScheduleNotification> = {}
): ScheduleNotification {
  return {
    id: 1,
    documentId: "n1",
    changeType: "showtime_changed",
    oldDateTime: "2026-07-13T18:00:00.000Z",
    newDateTime: "2026-07-13T20:00:00.000Z",
    eventTitle: "Dune",
    eventDocumentId: "evt-1",
    creativeWorkDocumentId: "cw-1",
    read: false,
    createdAt: "2026-07-10T09:00:00.000Z",
    ...overrides,
  }
}

describe("NotificationItem", () => {
  it("renders the showtime_changed headline with the event title", () => {
    render(
      <NotificationItem notification={makeNotification()} />
    )
    expect(
      screen.getByText("changeType.showtime_changed:Dune")
    ).toBeInTheDocument()
  })

  it.each([
    ["cancelled"],
    ["postponed"],
    ["rescheduled"],
  ] as const)("renders the %s change-type headline", (changeType) => {
    render(
      <NotificationItem
        notification={makeNotification({ changeType })}
      />
    )
    expect(
      screen.getByText(`changeType.${changeType}:Dune`)
    ).toBeInTheDocument()
  })

  it("shows the old→new time for a showtime change", () => {
    render(<NotificationItem notification={makeNotification()} />)
    expect(
      screen.getByText(/DATE\(2026-07-13T18:00:00.000Z\)/)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/DATE\(2026-07-13T20:00:00.000Z\)/)
    ).toBeInTheDocument()
  })

  it("shows the original time (not a new time) for a cancellation", () => {
    render(
      <NotificationItem
        notification={makeNotification({
          changeType: "cancelled",
          newDateTime: null,
        })}
      />
    )
    // `wasScheduledFor` with the old time; no new time.
    expect(
      screen.getByText(/wasScheduledFor:.*2026-07-13T18:00:00.000Z/)
    ).toBeInTheDocument()
    expect(
      screen.queryByText(/2026-07-13T20:00:00.000Z/)
    ).not.toBeInTheDocument()
  })

  it("never renders a literal 'Invalid Date' for an unparseable datetime", () => {
    render(
      <NotificationItem
        notification={makeNotification({
          oldDateTime: "not-a-real-date",
          newDateTime: "also-bad",
        })}
      />
    )
    // The mocked lib/dates would echo the token; the component must guard the
    // invalid value out entirely rather than formatting it.
    expect(screen.queryByText(/DATE\(not-a-real-date\)/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Invalid Date/)).not.toBeInTheDocument()
    // Falls back to the "to be confirmed" copy instead of a lone struck time.
    expect(screen.getByText("newTimeToBeConfirmed")).toBeInTheDocument()
  })

  it("shows 'new date to be confirmed' for a postponed item with a null new time", () => {
    render(
      <NotificationItem
        notification={makeNotification({
          changeType: "postponed",
          oldDateTime: "2026-07-13T18:00:00.000Z",
          newDateTime: null,
        })}
      />
    )
    expect(screen.getByText("newTimeToBeConfirmed")).toBeInTheDocument()
    // The old time is shown struck-through, but there is no arrow (no new time).
    expect(
      screen.getByText(/DATE\(2026-07-13T18:00:00.000Z\)/)
    ).toBeInTheDocument()
  })

  it("shows 'new date to be confirmed' when the new time equals the old time", () => {
    render(
      <NotificationItem
        notification={makeNotification({
          changeType: "rescheduled",
          oldDateTime: "2026-07-13T18:00:00.000Z",
          newDateTime: "2026-07-13T18:00:00.000Z",
        })}
      />
    )
    expect(screen.getByText("newTimeToBeConfirmed")).toBeInTheDocument()
  })

  it("renders the relative-time stamp", () => {
    render(<NotificationItem notification={makeNotification()} />)
    expect(
      screen.getByText("AGO(2026-07-10T09:00:00.000Z)")
    ).toBeInTheDocument()
  })

  it("shows the unread dot when the row is unread", () => {
    render(
      <NotificationItem notification={makeNotification({ read: false })} />
    )
    expect(screen.getByLabelText("unread")).toBeInTheDocument()
  })

  it("does not show the unread dot when the row is read", () => {
    render(
      <NotificationItem notification={makeNotification({ read: true })} />
    )
    expect(screen.queryByLabelText("unread")).not.toBeInTheDocument()
  })
})

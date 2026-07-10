/**
 * Tests for the `BottomNav` account-tab unread badge (Story 5.6).
 *
 * The badge reuses the existing ticket-badge markup/behavior (incl. the "99+"
 * cap) on the `account` tab, driven by `accountBadgeCount`.
 */
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { BottomNav } from "./BottomNav"

const labels = {
  home: "Home",
  search: "Search",
  tickets: "Tickets",
  account: "Account",
  navigation: "Nav",
  unscannedTickets: (count: number) => `${count} unscanned`,
  notifications: (count: number) => `${count} unread notifications`,
}

describe("BottomNav account badge", () => {
  it("shows the account badge when accountBadgeCount > 0", () => {
    render(
      <BottomNav
        activeTab="home"
        accountBadgeCount={4}
        onNavigate={vi.fn()}
        labels={labels}
      />
    )
    const badge = screen.getByLabelText("4 unread notifications")
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveTextContent("4")
  })

  it("hides the account badge when accountBadgeCount is 0", () => {
    render(
      <BottomNav
        activeTab="home"
        accountBadgeCount={0}
        onNavigate={vi.fn()}
        labels={labels}
      />
    )
    expect(
      screen.queryByLabelText(/unread notifications/)
    ).not.toBeInTheDocument()
  })

  it("caps the account badge at 99+", () => {
    render(
      <BottomNav
        activeTab="home"
        accountBadgeCount={150}
        onNavigate={vi.fn()}
        labels={labels}
      />
    )
    expect(
      screen.getByLabelText("150 unread notifications")
    ).toHaveTextContent("99+")
  })

  it("still renders the unscanned-ticket badge independently", () => {
    render(
      <BottomNav
        activeTab="home"
        ticketCount={2}
        accountBadgeCount={0}
        onNavigate={vi.fn()}
        labels={labels}
      />
    )
    expect(screen.getByLabelText("2 unscanned")).toHaveTextContent("2")
  })
})

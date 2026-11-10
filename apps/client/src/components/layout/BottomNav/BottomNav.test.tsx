/**
 * Tests for the `BottomNav` account-tab unread badge (Story 5.6).
 *
 * The badge reuses the existing ticket-badge markup/behavior (incl. the "99+"
 * cap) on the `account` tab, driven by `accountBadgeCount`.
 */
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { isTicketingEnabled } from "@/lib/feature-flags"

import { BottomNav } from "./BottomNav"

vi.mock("@/lib/feature-flags", () => ({
  isTicketingEnabled: vi.fn(),
}))

// The count-interpolated badge labels are NOT props (a function cannot cross
// the RSC boundary) — `BottomNav` looks them up itself. Echo the key plus the
// interpolated count so the wiring, not a hardcoded string, is asserted.
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values?.count === undefined ? key : `${key}:${values.count}`,
}))

const labels = {
  home: "Home",
  search: "Search",
  tickets: "Tickets",
  account: "Account",
  navigation: "Nav",
}

beforeEach(() => {
  vi.mocked(isTicketingEnabled).mockReturnValue(true)
})

describe("BottomNav tickets gate (D-17)", () => {
  it("renders three tabs in order home, search, account when ticketing is off", () => {
    vi.mocked(isTicketingEnabled).mockReturnValue(false)
    render(<BottomNav activeTab="home" onNavigate={vi.fn()} labels={labels} />)
    const tabs = screen.getAllByRole("link")
    expect(tabs.map((tab) => tab.getAttribute("aria-label"))).toEqual([
      "Home",
      "Search",
      "Account",
    ])
    expect(
      screen.queryByRole("link", { name: "Tickets" })
    ).not.toBeInTheDocument()
  })

  it("renders four tabs including tickets when ticketing is on", () => {
    vi.mocked(isTicketingEnabled).mockReturnValue(true)
    render(<BottomNav activeTab="home" onNavigate={vi.fn()} labels={labels} />)
    const tabs = screen.getAllByRole("link")
    expect(tabs.map((tab) => tab.getAttribute("aria-label"))).toEqual([
      "Home",
      "Search",
      "Tickets",
      "Account",
    ])
  })

  it("keeps the account badge working with the tickets tab hidden", () => {
    vi.mocked(isTicketingEnabled).mockReturnValue(false)
    render(
      <BottomNav
        activeTab="home"
        ticketCount={3}
        accountBadgeCount={2}
        onNavigate={vi.fn()}
        labels={labels}
      />
    )
    expect(screen.getByLabelText("notifications:2")).toBeInTheDocument()
    expect(
      screen.queryByLabelText(/^unscannedTickets:/)
    ).not.toBeInTheDocument()
  })
})

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
    const badge = screen.getByLabelText("notifications:4")
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
    expect(screen.queryByLabelText(/^notifications:/)).not.toBeInTheDocument()
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
    expect(screen.getByLabelText("notifications:150")).toHaveTextContent("99+")
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
    expect(screen.getByLabelText("unscannedTickets:2")).toHaveTextContent("2")
  })
})

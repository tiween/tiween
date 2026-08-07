/**
 * Purchase-gate tests for EventDetailPage, BOTH directions (Story 3.12).
 *
 * v1 is aggregation-only: with `NEXT_PUBLIC_TICKET_PURCHASE_ENABLED` off (the
 * default) an event detail page must render NO purchase controls — no
 * ShowtimeButton grid, no sticky buy CTA, no "À partir de …" price — while the
 * informational content (dates, TIMES, venue, synopsis) stays intact:
 * screening times render as plain non-interactive text. Flipping the flag ON
 * must restore the 6.1/6.2 surfaces with zero code changes, so the ON
 * direction is asserted here too against the same fixture.
 */
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { StrapiEvent } from "../../types/strapi.types"

import { formatTime } from "@/lib/dates"

import { EventDetailPage } from "./EventDetailPage"

const SHOWTIME_ISO = "2026-09-01T20:00:00.000Z"

const { purchaseFlag, pushSpy } = vi.hoisted(() => ({
  purchaseFlag: { enabled: false },
  pushSpy: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushSpy, back: vi.fn() }),
}))
vi.mock("next-intl", () => ({ useLocale: () => "fr" }))

// The gate under test — mutable so both directions run on one fixture.
vi.mock("@/lib/feature-flags", () => ({
  isTicketPurchaseEnabled: () => purchaseFlag.enabled,
}))

vi.mock("../../hooks/useAddToWatchlist", () => ({
  useAddToWatchlist: () => ({
    isWatchlisted: false,
    add: vi.fn(),
    canWatchlist: false,
    isPending: false,
  }),
}))
vi.mock("../../hooks/useRemoveFromWatchlist", () => ({
  useRemoveFromWatchlist: () => ({ remove: vi.fn(), isPending: false }),
}))

// Pure mappers — a detail WITH purchasable showtimes and a price, so the
// assertion is on the gate, not on missing data.
vi.mock("../../utils", () => ({
  getEventFilm: () => undefined,
  toEventDetail: () => ({
    documentId: "evt-1",
    title: "Le Film",
    synopsis: "Un synopsis court.",
    showtimes: [
      {
        id: "scr-1",
        time: "2026-09-01T20:00:00.000Z",
        price: 15,
        formats: ["VOST"],
        status: "available",
      },
      {
        id: "scr-2",
        time: "2026-09-01T22:00:00.000Z",
        price: 15,
        formats: [],
        status: "sold-out",
      },
    ],
    venue: {
      documentId: "venue-1",
      name: "Le Rio",
      address: "Rue de Marseille",
      city: "Tunis",
      region: "Tunis",
    },
    directors: [],
    cast: [],
    currency: "TND",
    minPrice: 15,
  }),
  toFilmHeroEvent: () => ({
    id: "evt-1",
    title: "Le Film",
    category: "Cinéma",
  }),
  toEventCardEvent: () => ({ id: "evt-1" }),
  buildEventShareUrl: () => "https://tiween.tn/fr/events/evt-1",
  buildDirectionsUrl: () => "#",
  platformFromUserAgent: () => "other",
  shouldFallbackAfterShareError: () => false,
}))

// Heavy children. ShowtimeButton renders a sentinel so both its ABSENCE
// (flag off) and PRESENCE (flag on) are provable.
vi.mock("../Map", () => ({ VenueMap: () => null }))
vi.mock("../ShareDialog", () => ({ ShareDialog: () => null }))
vi.mock("../EventSection", () => ({ EventSection: () => null }))
vi.mock("@/features/tickets/components/ShowtimeButton", () => ({
  ShowtimeButton: () => <div data-testid="showtime-button" />,
}))

const event = { documentId: "evt-1" } as unknown as StrapiEvent

beforeEach(() => {
  purchaseFlag.enabled = false
})

afterEach(() => cleanup())

describe("EventDetailPage with the purchase flag OFF", () => {
  it("renders no ShowtimeButton grid", () => {
    render(<EventDetailPage event={event} />)
    expect(screen.queryByTestId("showtime-button")).not.toBeInTheDocument()
  })

  it("renders no sticky buy CTA and no price line", () => {
    render(<EventDetailPage event={event} />)
    expect(screen.queryByText("Réserver des billets")).not.toBeInTheDocument()
    expect(screen.queryByText(/À partir de/)).not.toBeInTheDocument()
  })

  it("keeps the showtime TIME visible as plain non-interactive text", () => {
    render(<EventDetailPage event={event} />)
    // Same formatter as the component — the screening time is discovery
    // information and must survive the gate…
    const timeText = screen.getByText(formatTime(SHOWTIME_ISO, "fr"))
    expect(timeText).toBeInTheDocument()
    // …but as text, not as a button/interactive purchase control.
    expect(timeText.tagName).toBe("SPAN")
    expect(timeText.closest("button")).toBeNull()
  })

  it("keeps format badges and sold-out state on the plain time chips", () => {
    render(<EventDetailPage event={event} />)
    // Format (VOST/3D/…) is discovery information, not a purchase control.
    expect(screen.getByText("VOST")).toBeInTheDocument()
    // Sold-out state is informational too: struck-through time + badge.
    expect(screen.getByText("Complet")).toBeInTheDocument()
    const soldOutTime = screen.getByText(
      formatTime("2026-09-01T22:00:00.000Z", "fr")
    )
    expect(soldOutTime.className).toContain("line-through")
    expect(soldOutTime.closest("button")).toBeNull()
  })

  it("keeps the informational content (venue, dates, synopsis)", () => {
    render(<EventDetailPage event={event} />)
    expect(screen.getByText("Le Rio")).toBeInTheDocument()
    expect(screen.getByText("Un synopsis court.")).toBeInTheDocument()
    // The showtimes section keeps its heading and DATE line (informational).
    expect(screen.getByText("Séances")).toBeInTheDocument()
  })
})

describe("EventDetailPage with the purchase flag ON", () => {
  beforeEach(() => {
    purchaseFlag.enabled = true
  })

  it("restores the ShowtimeButton grid", () => {
    render(<EventDetailPage event={event} />)
    expect(screen.getAllByTestId("showtime-button")).toHaveLength(2)
  })

  it("restores the sticky buy CTA with the price line", () => {
    render(<EventDetailPage event={event} />)
    expect(screen.getByText("Réserver des billets")).toBeInTheDocument()
    expect(screen.getByText(/À partir de 15 TND/)).toBeInTheDocument()
  })
})

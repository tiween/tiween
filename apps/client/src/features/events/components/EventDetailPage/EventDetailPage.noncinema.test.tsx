/**
 * Render test for a NON-cinema, screening-less event (Story 3.2).
 *
 * The widened `findEvent` now surfaces concerts/exhibitions on the detail
 * route; unlike the sibling watchlist test (which mocks the mappers), this one
 * runs the REAL `toEventDetail`/`getEventFilm`/`toFilmHeroEvent` mappers over a
 * `category: "concert"` event with `screenings: []` and no movie, proving the
 * component's null-safe fallbacks: no crash, `noShowtimes` empty state shown.
 */
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { StrapiEvent } from "../../types/strapi.types"

import { EventDetailPage } from "./EventDetailPage"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}))
vi.mock("next-intl", () => ({
  useLocale: () => "fr",
  // `priceFrom` interpolates `{price}` and so is resolved here rather than
  // passed as a (non-serializable) function label prop.
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values?.price === undefined ? key : `${key}:${values.price}`,
}))

// Purchase flag stubbed ON (Story 3.12) — this suite predates the v1 gate and
// asserts the ungated composition.
vi.mock("@/lib/feature-flags", () => ({
  isTicketPurchaseEnabled: () => true,
}))

// Server-backed watchlist hooks (react-query) — inert here; `canWatchlist` is
// false anyway since a concert has no film id.
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

// Heavy children — irrelevant to the null-safe fallback path under test.
vi.mock("../Map", () => ({ VenueMap: () => null }))
vi.mock("../ShareDialog", () => ({ ShareDialog: () => null }))
vi.mock("../EventSection", () => ({ EventSection: () => null }))
vi.mock("@/features/tickets/components/ShowtimeButton", () => ({
  ShowtimeButton: () => null,
}))

const concertEvent = {
  id: 1,
  documentId: "concert-1",
  title: "Jazz à Carthage",
  slug: "jazz-a-carthage",
  description: "Une soirée jazz exceptionnelle.",
  category: "concert",
  startDateTime: "2026-09-01T20:00:00.000Z",
  endDateTime: "2026-09-01T23:00:00.000Z",
  eventStatus: "scheduled",
  featured: false,
  screenings: [],
  venue: {
    id: 2,
    documentId: "venue-1",
    name: "Théâtre de Carthage",
  },
} as unknown as StrapiEvent

afterEach(() => cleanup())

describe("EventDetailPage — non-cinema, screening-less event (Story 3.2)", () => {
  it("renders without crashing and shows the noShowtimes empty state", () => {
    render(<EventDetailPage event={concertEvent} />)

    // The event title still renders (event-image/title hero fallback)…
    expect(screen.getAllByText("Jazz à Carthage").length).toBeGreaterThan(0)
    // …and zero screenings degrade to the empty-showtimes state (default
    // French label), never a crash.
    expect(screen.getByText("Aucune séance disponible")).toBeTruthy()
  })
})

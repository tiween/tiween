/**
 * Tests for the EventDetailPage watchlist TOGGLE wiring + in-flight guard
 * (Story 5.2) — the composition seam an inverted `isWatchlisted ? remove : add`
 * ternary would otherwise pass silently.
 *
 * `useAddToWatchlist` / `useRemoveFromWatchlist` are mocked to controlled state
 * with spy `add`/`remove`; the real `FilmHero` renders the heart (so its
 * disabled-click guard is exercised for real). The heavy detail children (map,
 * share dialog, related section, showtime button) and the pure mappers are
 * mocked so the test stays focused on the heart wiring.
 */
import { cleanup, fireEvent, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { StrapiEvent } from "../../types/strapi.types"

import { EventDetailPage } from "./EventDetailPage"

const { addSpy, removeSpy, addState, removeState } = vi.hoisted(() => ({
  addSpy: vi.fn(),
  removeSpy: vi.fn(),
  addState: { isWatchlisted: false, isPending: false, canWatchlist: true },
  removeState: { isPending: false },
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}))
vi.mock("next-intl", () => ({ useLocale: () => "fr" }))

vi.mock("../../hooks/useAddToWatchlist", () => ({
  useAddToWatchlist: () => ({
    isWatchlisted: addState.isWatchlisted,
    add: addSpy,
    canWatchlist: addState.canWatchlist,
    isPending: addState.isPending,
  }),
}))
vi.mock("../../hooks/useRemoveFromWatchlist", () => ({
  useRemoveFromWatchlist: () => ({
    remove: removeSpy,
    isPending: removeState.isPending,
  }),
}))

// Pure mappers — controlled so the page renders a minimal, crash-free detail.
vi.mock("../../utils", () => ({
  getEventFilm: () => ({ documentId: "cw-1" }),
  toEventDetail: () => ({
    documentId: "evt-1",
    title: "Le Film",
    synopsis: "",
    showtimes: [],
    venue: undefined,
    directors: [],
    cast: [],
    currency: "TND",
    minPrice: undefined,
  }),
  toFilmHeroEvent: () => ({ id: "evt-1", title: "Le Film", category: "Cinéma" }),
  toEventCardEvent: () => ({ id: "evt-1" }),
  buildEventShareUrl: () => "https://tiween.tn/fr/events/evt-1",
  buildDirectionsUrl: () => "#",
  platformFromUserAgent: () => "other",
  shouldFallbackAfterShareError: () => false,
}))

// Heavy children — irrelevant to the heart seam.
vi.mock("../Map", () => ({ VenueMap: () => null }))
vi.mock("../ShareDialog", () => ({ ShareDialog: () => null }))
vi.mock("../EventSection", () => ({ EventSection: () => null }))
vi.mock("@/features/tickets/components/ShowtimeButton", () => ({
  ShowtimeButton: () => null,
}))

const event = { documentId: "evt-1" } as unknown as StrapiEvent

function renderPage() {
  return render(<EventDetailPage event={event} />)
}

beforeEach(() => {
  vi.clearAllMocks()
  addState.isWatchlisted = false
  addState.isPending = false
  addState.canWatchlist = true
  removeState.isPending = false
})

afterEach(() => cleanup())

describe("EventDetailPage — watchlist toggle wiring", () => {
  it("calls remove (NOT add) when the heart is filled (isWatchlisted=true)", () => {
    addState.isWatchlisted = true
    const { getByLabelText } = renderPage()

    // Filled-heart label = "remove" affordance.
    fireEvent.click(getByLabelText("Retirer de la liste"))

    expect(removeSpy).toHaveBeenCalledTimes(1)
    expect(addSpy).not.toHaveBeenCalled()
  })

  it("calls add (NOT remove) when the heart is empty (isWatchlisted=false)", () => {
    addState.isWatchlisted = false
    const { getByLabelText } = renderPage()

    fireEvent.click(getByLabelText("Ajouter à la liste"))

    expect(addSpy).toHaveBeenCalledTimes(1)
    expect(removeSpy).not.toHaveBeenCalled()
  })
})

describe("EventDetailPage — in-flight guard", () => {
  it("disables the heart and fires no op while the add mutation is pending", () => {
    addState.isWatchlisted = false
    addState.isPending = true
    const { container } = renderPage()

    const disabledBtn = container.querySelector<HTMLButtonElement>(
      "button[disabled]"
    )
    expect(disabledBtn).not.toBeNull()

    fireEvent.click(disabledBtn!)
    expect(addSpy).not.toHaveBeenCalled()
    expect(removeSpy).not.toHaveBeenCalled()
  })

  it("disables the heart and fires no op while the remove mutation is pending", () => {
    addState.isWatchlisted = true
    removeState.isPending = true
    const { container } = renderPage()

    const disabledBtn = container.querySelector<HTMLButtonElement>(
      "button[disabled]"
    )
    expect(disabledBtn).not.toBeNull()

    fireEvent.click(disabledBtn!)
    expect(removeSpy).not.toHaveBeenCalled()
    expect(addSpy).not.toHaveBeenCalled()
  })
})

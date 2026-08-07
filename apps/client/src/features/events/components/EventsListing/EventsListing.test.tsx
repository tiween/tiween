/**
 * Tests for the `/[locale]/events` client island (Story 3.2).
 *
 * Covers the category axis' URL writes end-to-end through the island: a tab
 * click must serialize the WHOLE filter state (sibling axes preserved via
 * `latestFiltersRef`) into `router.push`, and the mount-time sessionStorage
 * restore must go through `router.replace` (no history entry).
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import * as React from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { EventsListingLabels } from "./EventsListing"
import type { EventFilters } from "../../filters/filterParams"

const { pushMock, replaceMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  replaceMock: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
}))

// Purchase flag stubbed ON (Story 3.12). Every case below renders with
// `events={[]}`, so no `EventCard` actually mounts today — but the flag mock is
// kept because it also keeps `env.mjs` (which rejects vitest's NODE_ENV=test)
// out of the import graph, and because a non-empty fixture must not need new
// wiring to work.
vi.mock("@/lib/feature-flags", () => ({
  isTicketPurchaseEnabled: () => true,
}))

// `EventCard` resolves its parameterized `events.priceFrom` label through
// `useTranslations` (it can no longer take a function label prop across the RSC
// boundary), so it needs an intl context the moment a fixture is non-empty.
// Mocked up front rather than on first failure: without it, adding one event to
// any case below fails with "No intl context found", far from its cause.
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values?.price === undefined ? key : `${key}:${values.price}`,
}))

// Anonymous visitor — the common case on this public listing; keeps the
// island from firing the authenticated `/users/me` read.
vi.mock("next-auth/react", () => ({
  useSession: () => ({ status: "unauthenticated", data: null }),
}))

vi.mock("@/hooks/useUser", () => ({
  useCurrentUser: () => ({ data: undefined }),
}))

import { EventsListing } from "./EventsListing"

const labels: EventsListingLabels = {
  title: "Événements",
  empty: "Aucun événement",
  categoryFilter: {
    groupLabel: "Catégories d'événements",
    tabs: {
      all: "Tout",
      cinema: "Cinéma",
      theater: "Théâtre",
      shorts: "Courts-métrages",
      music: "Musique",
      exhibitions: "Expositions",
    },
  },
  dateFilter: {
    today: "Aujourd'hui",
    tomorrow: "Demain",
    weekend: "Ce weekend",
    custom: "Choisir une date",
    clear: "Effacer",
    groupLabel: "Filtrer par date",
  },
  location: {
    groupLabel: "Filtrer par lieu",
    regionPlaceholder: "Région",
    cityPlaceholder: "Ville",
    allRegions: "Toutes les régions",
    allCities: "Toutes les villes",
    clear: "Effacer",
  },
  venue: {
    groupLabel: "Filtrer par salle",
    allVenues: "Toutes les salles",
    searchVenue: "Rechercher une salle",
    noVenueFound: "Aucune salle trouvée",
    truncatedHint: "Toutes les salles ne sont pas affichées.",
    clear: "Effacer",
  },
  card: {
    addToWatchlist: "Ajouter",
    removeFromWatchlist: "Retirer",
  },
}

const CATEGORY_STORAGE_KEY = "tiween.events.category"

function renderListing(activeFilters: EventFilters) {
  return render(
    <EventsListing
      locale="fr"
      events={[]}
      regions={[]}
      venues={[]}
      activeFilters={activeFilters}
      labels={labels}
    />
  )
}

beforeEach(() => {
  window.sessionStorage.clear()
  window.localStorage.clear()
  // CategoryTabs auto-scrolls the active tab into view; jsdom lacks the API.
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("EventsListing (Story 3.2 category axis)", () => {
  it("pushes category=theater while preserving the sibling date + venue axes", () => {
    renderListing({ date: "weekend", venue: "v1" })

    fireEvent.click(screen.getByRole("tab", { name: "Théâtre" }))

    expect(pushMock).toHaveBeenCalledTimes(1)
    const url = pushMock.mock.calls[0][0] as string
    expect(url.startsWith("/fr/events?")).toBe(true)
    const query = new URLSearchParams(url.split("?")[1])
    expect(query.get("category")).toBe("theater")
    expect(query.get("date")).toBe("weekend")
    expect(query.get("venue")).toBe("v1")
    expect(pushMock).toHaveBeenCalledWith(url, { scroll: false })
  })

  it("restores a saved category on mount via router.replace (never push)", () => {
    window.sessionStorage.setItem(CATEGORY_STORAGE_KEY, "music")

    renderListing({})

    expect(replaceMock).toHaveBeenCalledTimes(1)
    const url = replaceMock.mock.calls[0][0] as string
    const query = new URLSearchParams(url.split("?")[1])
    expect(query.get("category")).toBe("music")
    expect(replaceMock).toHaveBeenCalledWith(url, { scroll: false })
    expect(pushMock).not.toHaveBeenCalled()
  })

  it("removes the category param when 'Tout' is selected", () => {
    renderListing({ category: "theater", date: "today" })

    fireEvent.click(screen.getByRole("tab", { name: "Tout" }))

    expect(pushMock).toHaveBeenCalledTimes(1)
    const url = pushMock.mock.calls[0][0] as string
    const query = new URLSearchParams(url.split("?")[1] ?? "")
    expect(query.get("category")).toBeNull()
    expect(query.get("date")).toBe("today")
  })
})

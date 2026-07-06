import { beforeEach, describe, expect, it, vi } from "vitest"

import type { StrapiEvent } from "@/features/events/types/strapi.types"
import type { Mock } from "vitest"

import { isAlgoliaEventsConfigured, searchEventsWithAlgolia } from "@/lib/algolia"

import { fetchEvents } from "./events-extended"
import { getSearchSuggestions, searchEvents } from "./search"

/**
 * Tests for the unified event search (Story 3.6): Algolia-when-configured with a
 * real Strapi `fetchEvents({ q })` fallback. The Algolia layer and the Strapi
 * fetcher are mocked; the canonical `toEventCardEvent` mapper runs for real on
 * the fallback path so the mapped card shape is exercised end-to-end.
 */

vi.mock("@/lib/algolia", () => ({
  isAlgoliaEventsConfigured: vi.fn(() => false),
  searchEventsWithAlgolia: vi.fn(),
}))

vi.mock("./events-extended", () => ({
  fetchEvents: vi.fn(),
  startOfToday: vi.fn(() => "2026-07-06T00:00:00.000Z"),
}))

const isConfigured = isAlgoliaEventsConfigured as unknown as Mock
const algoliaSearch = searchEventsWithAlgolia as unknown as Mock
const fetch = fetchEvents as unknown as Mock

function strapiEvent(overrides: Partial<StrapiEvent> = {}): StrapiEvent {
  return {
    id: 1,
    documentId: "evt-1",
    title: "Inception Screening",
    slug: "inception-screening",
    category: "movie_screening",
    startDateTime: "2026-07-10T20:00:00.000Z",
    featured: false,
    venue: {
      id: 5,
      documentId: "venue-1",
      name: "Pathé Tunis City",
      slug: "pathe",
    },
    screenings: [
      {
        id: 10,
        price: 12,
        movie: {
          id: 100,
          documentId: "cw-1",
          title: "Inception",
          slug: "inception",
          type: "film",
        },
      },
    ],
    startDate: "",
    endDate: "",
    status: "scheduled",
    createdAt: "",
    updatedAt: "",
    publishedAt: "",
    locale: "fr",
    ...overrides,
  } as StrapiEvent
}

beforeEach(() => {
  isConfigured.mockReset().mockReturnValue(false)
  algoliaSearch.mockReset()
  fetch.mockReset()
})

describe("searchEvents", () => {
  it("short-circuits a blank query to an empty result (no backend calls)", async () => {
    await expect(searchEvents("fr", { query: "   " })).resolves.toEqual({
      events: [],
      total: 0,
      query: "",
    })
    expect(algoliaSearch).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })

  it("uses Algolia hits when Algolia is configured and returns matches", async () => {
    isConfigured.mockReturnValue(true)
    algoliaSearch.mockResolvedValue({
      events: [
        {
          id: "evt-9",
          title: "Inception",
          venueName: "Pathé Tunis City",
          category: "Cinéma",
          date: "2026-07-10T20:00:00.000Z",
        },
      ],
      total: 3,
    })

    const result = await searchEvents("fr", { query: "inception", limit: 20 })

    expect(algoliaSearch).toHaveBeenCalledWith(
      "inception",
      expect.objectContaining({ locale: "fr", hitsPerPage: 20, page: 0 })
    )
    expect(result.total).toBe(3)
    expect(result.events[0]!.id).toBe("evt-9")
    // Algolia satisfied the query — the Strapi fallback must not run.
    expect(fetch).not.toHaveBeenCalled()
  })

  it("falls back to Strapi fetchEvents when Algolia is unconfigured", async () => {
    isConfigured.mockReturnValue(false)
    fetch.mockResolvedValue({ events: [strapiEvent()], total: 1 })

    const result = await searchEvents("fr", {
      query: "inception",
      cityDocumentId: "city-1",
      venueDocumentId: "venue-1",
      limit: 20,
      offset: 20,
    })

    expect(algoliaSearch).not.toHaveBeenCalled()
    expect(fetch).toHaveBeenCalledWith(
      expect.objectContaining({
        locale: "fr",
        q: "inception",
        city: "city-1",
        venue: "venue-1",
        page: 2, // offset 20 / pageSize 20 + 1
        pageSize: 20,
      })
    )
    // Mapped via the canonical toEventCardEvent: with no legacy `creativeWork`
    // populated the card title falls back to the event title (the browse
    // endpoint populates screenings shallow), and the venue name is threaded.
    expect(result.events).toEqual([
      expect.objectContaining({
        id: "evt-1",
        title: "Inception Screening",
        venueName: "Pathé Tunis City",
        category: "Cinéma",
      }),
    ])
    expect(result.total).toBe(1)
    expect(result.query).toBe("inception")
  })

  it("falls back to Strapi when Algolia is configured but returns no hits", async () => {
    isConfigured.mockReturnValue(true)
    algoliaSearch.mockResolvedValue({ events: [], total: 0 })
    fetch.mockResolvedValue({ events: [strapiEvent()], total: 1 })

    const result = await searchEvents("fr", { query: "inception" })

    expect(algoliaSearch).toHaveBeenCalled()
    expect(fetch).toHaveBeenCalledWith(
      expect.objectContaining({ q: "inception" })
    )
    expect(result.events).toHaveLength(1)
  })

  it("skips Algolia when a city/venue filter is active (filters must be honored by Strapi)", async () => {
    isConfigured.mockReturnValue(true)
    algoliaSearch.mockResolvedValue({
      events: [{ id: "evt-9", title: "Inception" }],
      total: 3,
    })
    fetch.mockResolvedValue({ events: [strapiEvent()], total: 1 })

    const result = await searchEvents("fr", {
      query: "inception",
      cityDocumentId: "city-1",
    })

    // Algolia cannot honor the location facet yet, so the filtered query must
    // go straight to the filter-aware Strapi path.
    expect(algoliaSearch).not.toHaveBeenCalled()
    expect(fetch).toHaveBeenCalledWith(
      expect.objectContaining({ q: "inception", city: "city-1" })
    )
    expect(result.events).toHaveLength(1)
  })

  it("floors the Strapi fallback to upcoming events (no past screenings)", async () => {
    isConfigured.mockReturnValue(false)
    fetch.mockResolvedValue({ events: [strapiEvent()], total: 1 })

    await searchEvents("fr", { query: "inception" })

    expect(fetch).toHaveBeenCalledWith(
      expect.objectContaining({
        q: "inception",
        startDate: "2026-07-06T00:00:00.000Z",
      })
    )
  })
})

describe("getSearchSuggestions", () => {
  it("returns [] for a query shorter than 2 characters (no fetch)", async () => {
    await expect(getSearchSuggestions("fr", "i")).resolves.toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it("extracts unique film/event titles from the fetchEvents slice", async () => {
    fetch.mockResolvedValue({
      events: [
        strapiEvent(),
        strapiEvent({
          documentId: "evt-2",
          title: "Standalone Event",
          screenings: [],
        }),
      ],
      total: 2,
    })

    const suggestions = await getSearchSuggestions("fr", "in")

    expect(fetch).toHaveBeenCalledWith(
      expect.objectContaining({ locale: "fr", q: "in", pageSize: 5 })
    )
    expect(suggestions).toEqual(["Inception", "Standalone Event"])
  })
})

import { beforeEach, describe, expect, it, vi } from "vitest"

import type { StrapiEvent } from "@/features/events/types/strapi.types"

/**
 * Tests for the read-side Algolia event search (Story 3.6).
 *
 * `searchClient` is initialized from env at module-import time, so we drive the
 * configured / unconfigured branches via `vi.resetModules()` + `vi.stubEnv()` +
 * a dynamic `import()`. The `algoliasearch/lite` module is mocked so no network
 * client is created; the mock exposes a `search` spy the configured tests drive.
 */

const mockSearch = vi.fn()

vi.mock("algoliasearch/lite", () => ({
  liteClient: () => ({ search: mockSearch }),
}))

beforeEach(() => {
  vi.resetModules()
  vi.unstubAllEnvs()
  mockSearch.mockReset()
})

async function loadModule() {
  return import("./events")
}

/** A real-shaped `StrapiEvent` with a populated screening movie + venue. */
function buildEvent(overrides: Partial<StrapiEvent> = {}): StrapiEvent {
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
      slug: "pathe-tunis-city",
    },
    screenings: [
      {
        id: 10,
        price: 12,
        movie: {
          id: 100,
          documentId: "cw-1",
          title: "Inception",
          originalTitle: "Inception",
          slug: "inception",
          type: "film",
          synopsis: "<p>A thief who steals corporate secrets.</p>",
          directors: [{ id: 1, name: "Christopher Nolan", slug: "nolan" }],
          cast: [
            { id: 2, name: "Leonardo DiCaprio", slug: "dicaprio" },
            { id: 3, name: "Ellen Page", slug: "page" },
          ],
        },
      },
    ],
    // Legacy required fields (unused by the mapper).
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

describe("toAlgoliaEventRecord", () => {
  it("embeds work title/synopsis, venue name, cast + director names, poster, start", async () => {
    const { toAlgoliaEventRecord } = await loadModule()
    const record = toAlgoliaEventRecord(buildEvent(), "fr")

    expect(record).toMatchObject({
      objectID: "evt-1",
      documentId: "evt-1",
      title: "Inception Screening",
      workTitle: "Inception",
      workOriginalTitle: "Inception",
      venueName: "Pathé Tunis City",
      category: "Cinéma",
      startDateTime: "2026-07-10T20:00:00.000Z",
      price: 12,
      currency: "TND",
    })
    // HTML stripped from the synopsis.
    expect(record.synopsis).toBe("A thief who steals corporate secrets.")
    expect(record.directorNames).toEqual(["Christopher Nolan"])
    expect(record.castNames).toEqual(["Leonardo DiCaprio", "Ellen Page"])
    expect(record.startTimestamp).toBe(
      new Date("2026-07-10T20:00:00.000Z").getTime()
    )
  })

  it("maps an event with no screenings/venue without throwing", async () => {
    const { toAlgoliaEventRecord } = await loadModule()
    const record = toAlgoliaEventRecord(
      buildEvent({ screenings: [], venue: undefined }),
      "fr"
    )

    expect(record.objectID).toBe("evt-1")
    expect(record.workTitle).toBeUndefined()
    expect(record.venueName).toBeUndefined()
    expect(record.castNames).toEqual([])
    expect(record.directorNames).toEqual([])
    expect(record).not.toHaveProperty("price")
  })
})

describe("searchEventsWithAlgolia — unconfigured (no env keys)", () => {
  it("reports not configured and returns an empty result (never throws)", async () => {
    const { isAlgoliaEventsConfigured, searchEventsWithAlgolia } =
      await loadModule()

    expect(isAlgoliaEventsConfigured()).toBe(false)
    await expect(searchEventsWithAlgolia("inception")).resolves.toEqual({
      events: [],
      total: 0,
    })
    expect(mockSearch).not.toHaveBeenCalled()
  })
})

describe("searchEventsWithAlgolia — configured", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_ALGOLIA_APP_ID", "app-id")
    vi.stubEnv("NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY", "search-key")
  })

  it("maps Algolia hits to EventCardEvent[] with the total", async () => {
    const { isAlgoliaEventsConfigured, searchEventsWithAlgolia } =
      await loadModule()

    expect(isAlgoliaEventsConfigured()).toBe(true)

    mockSearch.mockResolvedValue({
      results: [
        {
          hits: [
            {
              objectID: "evt-1",
              documentId: "evt-1",
              title: "Inception Screening",
              workTitle: "Inception",
              venueName: "Pathé Tunis City",
              category: "Cinéma",
              posterUrl: "https://cdn/poster.jpg",
              startDateTime: "2026-07-10T20:00:00.000Z",
              price: 12,
              currency: "TND",
            },
          ],
          nbHits: 1,
          page: 0,
          nbPages: 1,
        },
      ],
    })

    const result = await searchEventsWithAlgolia("inceptino", {
      locale: "fr",
      page: 0,
      hitsPerPage: 20,
    })

    expect(mockSearch).toHaveBeenCalledTimes(1)
    expect(result.total).toBe(1)
    expect(result.events).toEqual([
      {
        id: "evt-1",
        title: "Inception", // prefers workTitle over the event title
        posterUrl: "https://cdn/poster.jpg",
        category: "Cinéma",
        venueName: "Pathé Tunis City",
        date: "2026-07-10T20:00:00.000Z",
        price: 12,
        currency: "TND",
      },
    ])
  })

  it("returns an empty result (never throws) when the client errors", async () => {
    const { searchEventsWithAlgolia } = await loadModule()
    vi.spyOn(console, "error").mockImplementation(() => {})
    mockSearch.mockRejectedValue(new Error("algolia down"))

    await expect(searchEventsWithAlgolia("inception")).resolves.toEqual({
      events: [],
      total: 0,
    })
  })
})

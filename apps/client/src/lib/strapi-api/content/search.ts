import "server-only"

import type { StrapiEvent } from "@/features/events/types/strapi.types"

import { PublicStrapiClient } from "@/lib/strapi-api"

/**
 * Search result types
 */
export interface SearchResult {
  /** Events matching the search query */
  events: StrapiEvent[]
  /** Total count of matching events */
  total: number
  /** The query that was searched */
  query: string
}

export interface SearchOptions {
  /** Search query string */
  query: string
  /** Filter by category (cinema, theater, music, exhibition) */
  category?: string
  /** Filter by city documentId */
  cityDocumentId?: string
  /** Filter by venue documentId */
  venueDocumentId?: string
  /** Maximum results to return */
  limit?: number
  /** Offset for pagination */
  offset?: number
}

/**
 * Search events using Strapi's built-in filtering
 *
 * Searches across:
 * - Event title
 * - Creative work title
 * - Creative work original title
 * - Creative work synopsis
 * - Venue name
 *
 * Note: This is a basic search implementation using Strapi's $containsi filter.
 * For production, consider integrating Algolia for better performance and typo tolerance.
 *
 * @example
 * ```ts
 * const results = await searchEvents("fr", {
 *   query: "cinema",
 *   category: "cinema",
 *   limit: 20,
 * })
 * ```
 */
export async function searchEvents(
  locale: string,
  options: SearchOptions
): Promise<SearchResult> {
  const {
    query,
    category,
    cityDocumentId,
    venueDocumentId,
    limit = 20,
    offset = 0,
  } = options

  // Normalize query - trim and lowercase for case-insensitive search
  const normalizedQuery = query.trim()

  if (!normalizedQuery) {
    return { events: [], total: 0, query: "" }
  }

  try {
    // Build filters
    const filters: Record<string, unknown> = {
      // Only published events
      publishedAt: { $notNull: true },
      // Only events that haven't ended yet
      endDate: { $gte: new Date().toISOString().split("T")[0] },
    }

    // Category filter
    if (category) {
      filters.creativeWork = {
        ...((filters.creativeWork as Record<string, unknown>) || {}),
        type: { $eq: category },
      }
    }

    // Venue filter (takes precedence over city)
    if (venueDocumentId) {
      filters.venue = {
        documentId: { $eq: venueDocumentId },
      }
    } else if (cityDocumentId) {
      // City filter (via venue's cityRef)
      filters.venue = {
        cityRef: {
          documentId: { $eq: cityDocumentId },
        },
      }
    }

    // Build search conditions using $or
    // This searches across multiple fields
    const searchFilters = {
      $and: [
        filters,
        {
          $or: [
            // Search in event title
            { title: { $containsi: normalizedQuery } },
            // Search in creative work title
            { creativeWork: { title: { $containsi: normalizedQuery } } },
            // Search in creative work original title
            {
              creativeWork: { originalTitle: { $containsi: normalizedQuery } },
            },
            // Search in creative work synopsis
            { creativeWork: { synopsis: { $containsi: normalizedQuery } } },
            // Search in venue name
            { venue: { name: { $containsi: normalizedQuery } } },
          ],
        },
      ],
    }

    // Build query string
    const queryParams = new URLSearchParams({
      locale,
      "pagination[start]": String(offset),
      "pagination[limit]": String(limit),
      "pagination[withCount]": "true",
      sort: "startDate:asc",
    })

    // Add populate for nested data
    const populate = [
      "creativeWork",
      "creativeWork.poster",
      "creativeWork.poster.formats",
      "creativeWork.genres",
      "creativeWork.type",
      "venue",
      "venue.logo",
      "venue.cityRef",
      "showtimes",
    ]

    // Fetch events
    const response = await PublicStrapiClient.fetchAPI(
      "/events",
      {
        locale,
        filters: searchFilters,
        populate,
        pagination: {
          start: offset,
          limit,
          withCount: true,
        },
        sort: ["startDate:asc"],
      },
      {
        next: { revalidate: 60 }, // Cache for 1 minute
      }
    )

    const events = (response.data || []) as StrapiEvent[]
    const total = response.meta?.pagination?.total || events.length

    return {
      events,
      total,
      query: normalizedQuery,
    }
  } catch (error) {
    console.error("[searchEvents] Error searching events:", error)
    return { events: [], total: 0, query: normalizedQuery }
  }
}

/**
 * Get search suggestions based on partial query
 *
 * Returns a list of event titles that match the partial query
 * for autocomplete functionality.
 *
 * @example
 * ```ts
 * const suggestions = await getSearchSuggestions("fr", "incep")
 * // Returns: ["Inception", "Inception 2", ...]
 * ```
 */
export async function getSearchSuggestions(
  locale: string,
  partialQuery: string,
  limit: number = 5
): Promise<string[]> {
  const normalizedQuery = partialQuery.trim()

  if (normalizedQuery.length < 2) {
    return []
  }

  try {
    const response = await PublicStrapiClient.fetchAPI(
      "/events",
      {
        locale,
        filters: {
          publishedAt: { $notNull: true },
          endDate: { $gte: new Date().toISOString().split("T")[0] },
          $or: [
            { title: { $containsi: normalizedQuery } },
            { creativeWork: { title: { $containsi: normalizedQuery } } },
          ],
        },
        fields: ["title"],
        populate: {
          creativeWork: {
            fields: ["title"],
          },
        },
        pagination: {
          limit,
        },
      },
      {
        next: { revalidate: 300 }, // Cache suggestions for 5 minutes
      }
    )

    const events = (response.data || []) as Array<{
      title: string
      creativeWork?: { title: string }
    }>

    // Extract unique titles
    const titles = new Set<string>()
    events.forEach((event) => {
      if (event.creativeWork?.title) {
        titles.add(event.creativeWork.title)
      } else if (event.title) {
        titles.add(event.title)
      }
    })

    return Array.from(titles).slice(0, limit)
  } catch (error) {
    console.error("[getSearchSuggestions] Error:", error)
    return []
  }
}

/**
 * Popular search terms for empty search state
 * These could be dynamically generated from analytics in the future
 */
export const POPULAR_SEARCHES = [
  "Cinéma",
  "Concert",
  "Théâtre",
  "Exposition",
  "Jazz",
  "Festival",
]

import "server-only"

import type { EventCardEvent } from "@/features/events/types"

import { toEventCardEvent } from "@/features/events/utils"
import { isAlgoliaEventsConfigured, searchEventsWithAlgolia } from "@/lib/algolia"

import { fetchEvents, startOfToday } from "./events-extended"

/**
 * Unified public event search (Story 3.6).
 *
 * Two interchangeable backends behind one stable surface:
 * - **Algolia** when configured (`isAlgoliaConfigured()`) — fuzzy / typo-tolerant
 *   search over the `tiween_events` index.
 * - the real Strapi **`fetchEvents({ q })`** browse path otherwise (or when
 *   Algolia yields nothing / errors) — a `$containsi` `$or` across event title,
 *   the linked film title/originalTitle/synopsis, and the venue name (Story
 *   3.1a public endpoint, extended in 3.6).
 *
 * Both paths return ready-mapped `EventCardEvent[]` (the Algolia module maps its
 * own hits; the Strapi path maps via the canonical `toEventCardEvent`), so the
 * `/api/search` route and the `/[locale]/search` page consume presentation
 * objects directly. Fail-soft throughout: a blank query short-circuits to an
 * empty result, and `fetchEvents` already degrades to an empty slice on error.
 */

/**
 * Search result types
 */
export interface SearchResult {
  /** Events matching the search query, mapped for direct card rendering. */
  events: EventCardEvent[]
  /** Total count of matching events */
  total: number
  /** The query that was searched */
  query: string
}

export interface SearchOptions {
  /** Search query string */
  query: string
  /** Filter by category (UI-only; not sent to the backend — Story 3.2 deferred) */
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
 * Search events, Algolia-when-configured with a real Strapi fallback.
 *
 * @example
 * ```ts
 * const results = await searchEvents("fr", { query: "inception", limit: 20 })
 * ```
 */
export async function searchEvents(
  locale: string,
  options: SearchOptions
): Promise<SearchResult> {
  const { query, cityDocumentId, venueDocumentId, limit = 20, offset = 0 } =
    options

  const normalizedQuery = query.trim()

  if (!normalizedQuery) {
    return { events: [], total: 0, query: "" }
  }

  const pageSize = limit > 0 ? limit : 20
  const page = Math.floor(Math.max(offset, 0) / pageSize) + 1
  const hasFilters = Boolean(cityDocumentId || venueDocumentId)

  // Algolia when configured (fuzzy / typo-tolerant). Skipped when a city/venue
  // filter is active: the `tiween_events` record/index does not yet carry
  // facetable location attributes (that arrives with the deferred indexing
  // pipeline), so a filtered query MUST go through the filter-honoring Strapi
  // path to satisfy the "keyword AND filters" contract. Algolia otherwise
  // returns an empty result on error / no match, in which case we also fall
  // through so the feature never dead-ends on an Algolia hiccup.
  if (isAlgoliaEventsConfigured() && !hasFilters) {
    const algolia = await searchEventsWithAlgolia(normalizedQuery, {
      locale,
      page: page - 1, // Algolia pages are zero-based.
      hitsPerPage: pageSize,
    })
    if (algolia.events.length > 0) {
      return {
        events: algolia.events,
        total: algolia.total,
        query: normalizedQuery,
      }
    }
  }

  // Strapi fallback: the real 3.1a browse path with the 3.6 keyword `q` param,
  // floored to upcoming events (`startDateTime >= start of today`) so search
  // never surfaces long-finished screenings ranked oldest-first.
  const slice = await fetchEvents({
    locale,
    q: normalizedQuery,
    startDate: startOfToday(),
    ...(cityDocumentId ? { city: cityDocumentId } : {}),
    ...(venueDocumentId ? { venue: venueDocumentId } : {}),
    page,
    pageSize,
    sort: "startDateTime:asc",
  })

  return {
    events: slice.events.map((event) => toEventCardEvent(event, locale)),
    total: slice.total,
    query: normalizedQuery,
  }
}

/**
 * Get search suggestions based on a partial query.
 *
 * Returns a list of event / film titles matching the partial query for
 * autocomplete. Uses the same real Strapi `fetchEvents({ q })` path as the main
 * search so suggestions match the real schema.
 *
 * @example
 * ```ts
 * const suggestions = await getSearchSuggestions("fr", "incep")
 * // Returns: ["Inception", ...]
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

  const slice = await fetchEvents({
    locale,
    q: normalizedQuery,
    startDate: startOfToday(),
    pageSize: limit,
    sort: "startDateTime:asc",
  })

  const titles = new Set<string>()
  for (const event of slice.events) {
    const filmTitle = event.screenings?.find((s) => s.movie?.title)?.movie?.title
    if (filmTitle) {
      titles.add(filmTitle)
    } else if (event.title) {
      titles.add(event.title)
    }
  }

  return Array.from(titles).slice(0, limit)
}

/**
 * Popular search terms for the empty search state (MVP is cinema-only, so these
 * stay cinema-oriented — non-cinema terms would guarantee empty results against
 * the `movie_screening`-scoped browse endpoint). Could be analytics-driven later.
 */
export const POPULAR_SEARCHES = [
  "Cinéma",
  "Comédie",
  "Action",
  "Drame",
  "Animation",
  "Festival",
]

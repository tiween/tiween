/**
 * Algolia Integration for Event Keyword Search (Story 3.6)
 *
 * Read-side Algolia search for the public event discovery `/[locale]/search`
 * page, mirroring `lib/algolia/shorts.ts`. It requires:
 * - NEXT_PUBLIC_ALGOLIA_APP_ID
 * - NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY
 * - ALGOLIA_ADMIN_API_KEY (for the future indexing job — NOT used here)
 *
 * Index name: tiween_events
 *
 * IMPORTANT: this is the read side only. Populating `tiween_events` (a
 * Strapi -> Algolia indexing pipeline) is a separate ops job requiring admin
 * credentials — exactly as `tiween_shorts` ships with no committed indexer (see
 * deferred-work.md). The `toAlgoliaEventRecord` mapper below defines the record
 * shape that job would emit. When Algolia is unconfigured (this environment) or
 * errors, every export degrades gracefully to an empty result so the caller
 * (`content/search.ts`) falls back to the real Strapi `fetchEvents({ q })` path.
 */

import {
  getEventPosterUrl,
  getEventStartDate,
  getEventVenueName,
  getMinEventPrice,
  mapEventCategoryLabel,
} from "@/features/events/utils"
import { liteClient as algoliasearch } from "algoliasearch/lite"

import type { EventCardEvent } from "@/features/events/types"
import type { StrapiEvent } from "@/features/events/types/strapi.types"

// Algolia client — only initialize if credentials are available.
const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID
const searchKey = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY

const searchClient = appId && searchKey ? algoliasearch(appId, searchKey) : null
const EVENTS_INDEX_NAME = "tiween_events"

const DEFAULT_CURRENCY = "TND"

/**
 * Algolia record type for events.
 *
 * Multi-entity search ("events, creative works, venues, people") is delivered as
 * searchable attributes on this single event record — a fuzzy match on a film
 * title/synopsis, a venue name, or a cast/director name surfaces the owning
 * event (mirrors the `shorts.ts` embedded-`directors` precedent). Distinct
 * per-entity result cards need multi-index Algolia + the not-yet-built detail
 * pages (Stories 3.7/3.8) and are deferred (see deferred-work.md).
 */
export interface AlgoliaEventRecord {
  objectID: string
  documentId: string
  /** Event title. */
  title: string
  /** Linked creative-work (film) title, when a screening's movie is populated. */
  workTitle?: string
  /** Linked creative-work original title. */
  workOriginalTitle?: string
  /** Linked creative-work synopsis (HTML stripped). */
  synopsis?: string
  /** Venue name (searchable + displayed on the card). */
  venueName?: string
  /** Localized category label. */
  category: string
  /** Poster URL for the result card. */
  posterUrl?: string
  /** Event start (ISO datetime) for display + sorting. */
  startDateTime?: string
  /** Lowest screening price, when known. */
  price?: number
  currency: string
  /** Cast member names embedded for fuzzy people matching. */
  castNames: string[]
  /** Director names embedded for fuzzy people matching. */
  directorNames: string[]
  /** Unix ms timestamp of `startDateTime` for numeric sorting. */
  startTimestamp: number
}

/** Collect the populated `movie` (creative-work) relations across screenings. */
function eventMovies(event: StrapiEvent) {
  return (event.screenings ?? [])
    .map((s) => s?.movie)
    .filter((m): m is NonNullable<typeof m> => Boolean(m))
}

function uniqueNames(names: string[]): string[] {
  return Array.from(new Set(names.filter(Boolean)))
}

/**
 * Convert a real `StrapiEvent` into the Algolia `tiween_events` record shape.
 *
 * Pure + dependency-free (reuses the canonical `eventMappers` helpers) so it can
 * be unit-tested and reused by a future indexing job without booting Strapi.
 */
export function toAlgoliaEventRecord(
  event: StrapiEvent,
  locale: string = "fr"
): AlgoliaEventRecord {
  const movies = eventMovies(event)
  const primary = movies[0]
  const startDateTime = getEventStartDate(event) || undefined
  const price = getMinEventPrice(event)

  return {
    objectID: event.documentId,
    documentId: event.documentId,
    title: event.title,
    workTitle: primary?.title,
    workOriginalTitle: primary?.originalTitle,
    synopsis: primary?.synopsis?.replace(/<[^>]*>/g, ""),
    venueName: getEventVenueName(event) || undefined,
    category: mapEventCategoryLabel(event, locale),
    posterUrl: getEventPosterUrl(event),
    startDateTime,
    ...(price !== undefined ? { price } : {}),
    currency: DEFAULT_CURRENCY,
    castNames: uniqueNames(
      movies.flatMap((m) => m.cast?.map((c) => c.person?.name ?? "") ?? [])
    ),
    directorNames: uniqueNames(
      movies.flatMap((m) => m.directors?.map((p) => p.name) ?? [])
    ),
    startTimestamp: startDateTime ? new Date(startDateTime).getTime() : 0,
  }
}

/** Map an Algolia hit to the flat `EventCardEvent` the search UI renders. */
function toCardEvent(record: AlgoliaEventRecord): EventCardEvent {
  return {
    id: record.documentId,
    title: record.workTitle || record.title,
    posterUrl: record.posterUrl,
    category: record.category,
    venueName: record.venueName ?? "",
    date: record.startDateTime ?? "",
    price: record.price,
    currency: record.currency,
  }
}

/** Options for an Algolia event search. */
export interface AlgoliaEventSearchOptions {
  locale?: string
  /** Zero-based page index (Algolia convention). */
  page?: number
  hitsPerPage?: number
}

/**
 * Search events via Algolia (v5 lite client), returning ready-mapped cards.
 *
 * Returns an empty result (never throws) when Algolia is unconfigured or on any
 * error, so the caller falls back to the real Strapi `fetchEvents({ q })` path.
 */
export async function searchEventsWithAlgolia(
  query: string,
  options: AlgoliaEventSearchOptions = {}
): Promise<{ events: EventCardEvent[]; total: number }> {
  if (!searchClient) {
    return { events: [], total: 0 }
  }

  const { page = 0, hitsPerPage = 20 } = options

  try {
    const result = await searchClient.search<AlgoliaEventRecord>({
      requests: [
        {
          indexName: EVENTS_INDEX_NAME,
          query,
          page,
          hitsPerPage,
          attributesToHighlight: [
            "title",
            "workTitle",
            "workOriginalTitle",
            "venueName",
            "castNames",
            "directorNames",
          ],
        },
      ],
    })

    const firstResult = result.results[0]
    if (!firstResult || !("hits" in firstResult)) {
      return { events: [], total: 0 }
    }

    const hits = firstResult.hits as AlgoliaEventRecord[]
    return {
      events: hits.map(toCardEvent),
      total: firstResult.nbHits ?? hits.length,
    }
  } catch (error) {
    console.error("[Algolia] Event search error:", error)
    return { events: [], total: 0 }
  }
}

/** Whether the Algolia event search client is configured. */
export function isAlgoliaEventsConfigured(): boolean {
  return searchClient !== null
}

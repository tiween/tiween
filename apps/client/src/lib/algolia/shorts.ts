/**
 * Algolia Integration for Short Films Search
 *
 * This module provides Algolia-powered search for the shorts directory.
 * It requires the following environment variables:
 * - NEXT_PUBLIC_ALGOLIA_APP_ID
 * - NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY
 * - ALGOLIA_ADMIN_API_KEY (for indexing)
 *
 * Index name: tiween_shorts
 */

import { liteClient as algoliasearch } from "algoliasearch/lite"

import type { ShortFilm, ShortsFilters } from "@/features/shorts/types"

// Algolia client - only initialize if credentials are available
const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID
const searchKey = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY

const searchClient = appId && searchKey ? algoliasearch(appId, searchKey) : null
const SHORTS_INDEX_NAME = "tiween_shorts"

/**
 * Algolia record type for short films
 */
export interface AlgoliaShortFilmRecord {
  objectID: string
  documentId: string
  title: string
  originalTitle?: string
  slug: string
  synopsis?: string
  duration?: number
  releaseYear?: number
  rating?: number
  ageRating?: string
  posterUrl?: string
  backdropUrl?: string
  trailer?: string
  genres: string[]
  genreSlugs: string[]
  directors: string[]
  country?: string
  language?: string
  hasAwards: boolean
  isAvailableOnline: boolean
  platforms: string[]
  createdAt: number // Unix timestamp for sorting
  updatedAt: number
  _tags: string[] // For filtering
}

/**
 * Convert ShortFilm to Algolia record
 */
export function toAlgoliaRecord(film: ShortFilm): AlgoliaShortFilmRecord {
  return {
    objectID: film.documentId,
    documentId: film.documentId,
    title: film.title,
    originalTitle: film.originalTitle,
    slug: film.slug,
    synopsis: film.synopsis?.replace(/<[^>]*>/g, ""),
    duration: film.duration,
    releaseYear: film.releaseYear,
    rating: film.rating,
    ageRating: film.ageRating,
    posterUrl: film.poster?.formats?.medium?.url || film.poster?.url,
    backdropUrl: film.backdrop?.formats?.medium?.url || film.backdrop?.url,
    trailer: film.trailer,
    genres: film.genres?.map((g) => g.name) || [],
    genreSlugs: film.genres?.map((g) => g.slug) || [],
    directors: film.directors?.map((d) => d.name) || [],
    country: film.country,
    language: film.language,
    hasAwards: (film.awards?.length || 0) > 0,
    isAvailableOnline: film.isAvailableOnline || false,
    platforms: film.streamingLinks?.map((l) => l.platform) || [],
    createdAt: film.createdAt ? new Date(film.createdAt).getTime() : Date.now(),
    updatedAt: film.updatedAt ? new Date(film.updatedAt).getTime() : Date.now(),
    _tags: [
      ...(film.genres?.map((g) => `genre:${g.slug}`) || []),
      film.country ? `country:${film.country}` : "",
      film.language ? `language:${film.language}` : "",
      film.isAvailableOnline ? "online" : "offline",
      (film.awards?.length || 0) > 0 ? "awarded" : "",
    ].filter(Boolean),
  }
}

/**
 * Search options for Algolia
 */
export interface AlgoliaSearchOptions {
  filters?: ShortsFilters
  page?: number
  hitsPerPage?: number
  locale?: string
}

/**
 * Build Algolia filter string from ShortsFilters
 */
function buildAlgoliaFilters(filters: ShortsFilters): string {
  const filterParts: string[] = []

  // Genre filter
  if (filters.genres?.length) {
    const genreFilters = filters.genres
      .map((g) => `genreSlugs:${g}`)
      .join(" OR ")
    filterParts.push(`(${genreFilters})`)
  }

  // Duration filter
  if (filters.durationMin !== undefined) {
    filterParts.push(`duration >= ${filters.durationMin}`)
  }
  if (filters.durationMax !== undefined) {
    filterParts.push(`duration <= ${filters.durationMax}`)
  }

  // Year filter
  if (filters.yearMin !== undefined) {
    filterParts.push(`releaseYear >= ${filters.yearMin}`)
  }
  if (filters.yearMax !== undefined) {
    filterParts.push(`releaseYear <= ${filters.yearMax}`)
  }

  // Rating filter
  if (filters.rating !== undefined) {
    filterParts.push(`rating >= ${filters.rating}`)
  }

  // Awards filter
  if (filters.hasAwards) {
    filterParts.push("hasAwards:true")
  }

  // Online availability
  if (filters.availableOnline) {
    filterParts.push("isAvailableOnline:true")
  }

  // Platform filter
  if (filters.platforms?.length) {
    const platformFilters = filters.platforms
      .map((p) => `platforms:${p}`)
      .join(" OR ")
    filterParts.push(`(${platformFilters})`)
  }

  return filterParts.join(" AND ")
}

/**
 * Search short films using Algolia v5 API
 */
export async function searchShortsWithAlgolia(
  query: string,
  options: AlgoliaSearchOptions = {}
): Promise<{
  shorts: AlgoliaShortFilmRecord[]
  total: number
  page: number
  totalPages: number
}> {
  if (!searchClient) {
    console.warn("[Algolia] Search client not initialized. Using fallback.")
    return { shorts: [], total: 0, page: 0, totalPages: 0 }
  }

  const { filters = {}, page = 0, hitsPerPage = 24 } = options

  try {
    const algoliaFilters = buildAlgoliaFilters(filters)

    const result = await searchClient.search<AlgoliaShortFilmRecord>({
      requests: [
        {
          indexName: SHORTS_INDEX_NAME,
          query,
          page,
          hitsPerPage,
          filters: algoliaFilters || undefined,
          attributesToRetrieve: [
            "objectID",
            "documentId",
            "title",
            "originalTitle",
            "slug",
            "duration",
            "releaseYear",
            "rating",
            "posterUrl",
            "genres",
            "directors",
            "isAvailableOnline",
          ],
          attributesToHighlight: ["title", "originalTitle", "synopsis"],
        },
      ],
    })

    // Extract the first result from multi-index search
    const firstResult = result.results[0]
    if (!firstResult || !("hits" in firstResult)) {
      return { shorts: [], total: 0, page: 0, totalPages: 0 }
    }

    return {
      shorts: firstResult.hits as AlgoliaShortFilmRecord[],
      total: firstResult.nbHits ?? 0,
      page: firstResult.page ?? 0,
      totalPages: firstResult.nbPages ?? 0,
    }
  } catch (error) {
    console.error("[Algolia] Search error:", error)
    return { shorts: [], total: 0, page: 0, totalPages: 0 }
  }
}

/**
 * Get facet values for filtering UI
 * Note: Facets must be configured in Algolia dashboard
 */
export async function getShortsFacets(): Promise<{
  genres: Array<{ value: string; count: number }>
  countries: Array<{ value: string; count: number }>
  languages: Array<{ value: string; count: number }>
  platforms: Array<{ value: string; count: number }>
}> {
  if (!searchClient) {
    return { genres: [], countries: [], languages: [], platforms: [] }
  }

  try {
    const result = await searchClient.search({
      requests: [
        {
          indexName: SHORTS_INDEX_NAME,
          query: "",
          hitsPerPage: 0,
          facets: ["genres", "country", "language", "platforms"],
        },
      ],
    })

    const firstResult = result.results[0]
    if (!firstResult || !("facets" in firstResult)) {
      return { genres: [], countries: [], languages: [], platforms: [] }
    }

    const facets = firstResult.facets || {}

    const mapFacet = (facet: Record<string, number> | undefined) =>
      Object.entries(facet || {})
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count)

    return {
      genres: mapFacet(facets.genres),
      countries: mapFacet(facets.country),
      languages: mapFacet(facets.language),
      platforms: mapFacet(facets.platforms),
    }
  } catch (error) {
    console.error("[Algolia] Facets error:", error)
    return { genres: [], countries: [], languages: [], platforms: [] }
  }
}

/**
 * Check if Algolia is available and configured
 */
export function isAlgoliaConfigured(): boolean {
  return searchClient !== null
}

/**
 * Short Film Types for Tiween Shorts Directory
 *
 * These types extend the creative work entity specifically for short films,
 * with additional fields for streaming platform availability and awards.
 */

import type {
  StrapiMedia,
  StrapiPerson,
} from "@/features/events/types/strapi.types"

/**
 * Streaming platform vocabulary of the public short-film API
 * (`STREAMING_PLATFORMS`, creative-works `shared/short-film-rules.ts`).
 */
export const PLATFORM_TYPES = [
  "youtube",
  "vimeo",
  "dailymotion",
  "artify",
  "arte",
  "mubi",
  "netflix",
  "shahid",
  "tv5monde",
  "other",
] as const

/**
 * Platform availability status
 */
export type PlatformType = (typeof PLATFORM_TYPES)[number]

/**
 * How a viewer gets access to a streaming link (`STREAMING_ACCESS_TYPES`).
 */
export const SHORT_FILM_ACCESS_TYPES = [
  "free",
  "included",
  "subscription",
  "rental",
] as const

export type ShortFilmAccessType = (typeof SHORT_FILM_ACCESS_TYPES)[number]

/**
 * Social link with platform type for streaming links
 */
export interface StreamingLink {
  platform: PlatformType
  url: string
  label?: string
  accessType?: ShortFilmAccessType
}

/**
 * Genre as served by the public short-film API.
 */
export interface ShortFilmGenre {
  id?: number
  documentId?: string
  slug: string
  name: string
}

/**
 * Person (director, crew member, cast member) as served by the public
 * short-film API. `photo` is never populated by the API (D-12); it stays
 * optional only so existing fixtures compile, and Plan 05 removes it.
 */
export interface ShortFilmPerson {
  id?: number
  documentId?: string
  slug: string
  name: string
  photo?: StrapiPerson["photo"]
}

/**
 * One credit of a film (any department except the cast).
 */
export interface ShortFilmCrewCredit {
  person: ShortFilmPerson
  /** `creditRole.slug`; the label key for crew role copy (D-09). */
  roleSlug: string
  /** `creditRole.department` (directing, writing, camera, ...). */
  department: string
  /** An editor's free-text role; wins over the localized role label. */
  customRole?: string
  billing?: number
}

/**
 * One cast entry: a person and the character they play.
 */
export interface ShortFilmCastMember {
  person: ShortFilmPerson
  /** Character name. */
  role?: string
  billing?: number
}

/**
 * Award or festival recognition
 */
export interface ShortFilmAward {
  name: string
  year?: number
  category?: string
  won: boolean
}

/**
 * Extended short film type with all display data
 */
export interface ShortFilm {
  id: string | number
  documentId: string
  title: string
  originalTitle?: string
  slug: string
  synopsis?: string
  duration?: number // in minutes
  releaseYear?: number
  /**
   * Legacy and never mapped: ratings are out of v1. Kept so the "renders no
   * rating" regression tests can still build a rated fixture.
   */
  rating?: number
  ageRating?: "TP" | "PG12" | "PG16" | "PG18"
  poster?: StrapiMedia
  backdrop?: StrapiMedia
  trailer?: string
  genres?: ShortFilmGenre[]
  directors?: ShortFilmPerson[]
  cast?: ShortFilmCastMember[]
  /** Every credit of the film (detail only). */
  crew?: ShortFilmCrewCredit[]
  /** The locale actually served by the API (title/synopsis may fall back to French). */
  locale?: string
  // Extended fields for shorts directory
  /** ISO 3166 region codes. */
  country?: string[]
  /** ISO 639 language codes (plus a few project codes such as `aeb`). */
  language?: string[]
  streamingLinks?: StreamingLink[]
  awards?: ShortFilmAward[]
  isFeatured?: boolean
  isAvailableOnline?: boolean
  createdAt?: string
  updatedAt?: string
}

/**
 * Card-optimized short film data
 */
export interface ShortFilmCard {
  id: string | number
  documentId: string
  title: string
  originalTitle?: string
  /** `null` when the record has no poster — the card shows reserved artwork. */
  posterUrl: string | null
  slug: string
  duration?: number
  releaseYear?: number
  genres?: string[]
  director?: string
  isAvailableOnline?: boolean
  isFeatured?: boolean
  /** The locale actually served by the API. */
  locale?: string
}

/**
 * Filter options for shorts directory
 */
export interface ShortsFilters {
  query?: string
  genres?: string[]
  durationMin?: number
  durationMax?: number
  yearMin?: number
  yearMax?: number
  countries?: string[]
  languages?: string[]
  hasAwards?: boolean
  availableOnline?: boolean
  platforms?: PlatformType[]
  /**
   * Legacy: still read by `lib/strapi-api` / `lib/algolia` / mock data. Ratings
   * are out of v1, so no UI, URL or API route sets it.
   */
  rating?: number
  /** `"rating"` is legacy (lib switch case); the UI and route never send it. */
  sortBy?: "latest" | "rating" | "year" | "duration" | "title"
  sortOrder?: "asc" | "desc"
}

/**
 * Search/list response with pagination
 */
export interface ShortsListResponse {
  shorts: ShortFilm[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

/**
 * Short film suggestion/submission form data
 */
export interface ShortFilmSuggestion {
  title: string
  originalTitle?: string
  director?: string
  year?: number
  duration?: number
  synopsis?: string
  genres?: string[]
  country?: string
  language?: string
  trailerUrl?: string
  watchUrl?: string
  platform?: PlatformType
  posterUrl?: string
  submitterName: string
  submitterEmail: string
  additionalNotes?: string
}

/**
 * Labels for ShortFilmCard component
 */
export interface ShortFilmCardLabels {
  watchNow: string
  viewDetails: string
  playTrailer: string
  minutes: string
  notAvailableOnline: string
  featured: string
  /** Availability note shown when the film can be watched online */
  availableOnline: string
}

/**
 * Labels for filters component
 */
export interface ShortsFiltersLabels {
  search: string
  searchPlaceholder: string
  genres: string
  duration: string
  durationRange: string
  year: string
  yearRange: string
  country: string
  language: string
  awards: string
  hasAwards: string
  availability: string
  availableOnline: string
  platforms: string
  sortBy: string
  sortByOptions: {
    latest: string
    year: string
    duration: string
    title: string
  }
  clearFilters: string
  applyFilters: string
  resultsCount: string
  noResults: string
}

/**
 * Labels for suggestion form
 */
export interface SuggestionFormLabels {
  title: string
  formTitle: string
  formDescription: string
  movieTitle: string
  originalTitle: string
  director: string
  year: string
  duration: string
  synopsis: string
  genres: string
  country: string
  language: string
  trailerUrl: string
  watchUrl: string
  platform: string
  posterUrl: string
  yourName: string
  yourEmail: string
  additionalNotes: string
  submit: string
  submitting: string
  successTitle: string
  successMessage: string
  errorTitle: string
  errorMessage: string
  required: string
}

/**
 * Convert ShortFilm to card format
 */
export function toShortFilmCard(film: ShortFilm): ShortFilmCard {
  return {
    id: film.id,
    documentId: film.documentId,
    title: film.title,
    originalTitle: film.originalTitle,
    // No fallback path: `/images/poster-placeholder.jpg` never existed, so a
    // poster-less film rendered a broken image.
    posterUrl: film.poster?.formats?.medium?.url || film.poster?.url || null,
    slug: film.slug,
    duration: film.duration,
    releaseYear: film.releaseYear,
    genres: film.genres?.map((g) => g.name),
    director: film.directors?.[0]?.name,
    isAvailableOnline: film.isAvailableOnline,
    isFeatured: film.isFeatured,
    locale: film.locale,
  }
}

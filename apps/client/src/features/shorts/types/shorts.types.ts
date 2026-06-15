/**
 * Short Film Types for Tiween Shorts Directory
 *
 * These types extend the creative work entity specifically for short films,
 * with additional fields for streaming platform availability and awards.
 */

import type {
  StrapiCreativeWork,
  StrapiGenre,
  StrapiMedia,
  StrapiPerson,
} from "@/features/events/types/strapi.types"

/**
 * Platform availability status
 */
export type PlatformType =
  | "youtube"
  | "vimeo"
  | "dailymotion"
  | "mubi"
  | "netflix"
  | "other"

/**
 * Social link with platform type for streaming links
 */
export interface StreamingLink {
  platform: PlatformType
  url: string
  label?: string
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
  rating?: number
  ageRating?: "TP" | "PG12" | "PG16" | "PG18"
  poster?: StrapiMedia
  backdrop?: StrapiMedia
  trailer?: string
  genres?: StrapiGenre[]
  directors?: StrapiPerson[]
  cast?: Array<{
    person: StrapiPerson
    role?: string
  }>
  // Extended fields for shorts directory
  country?: string
  language?: string
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
  posterUrl: string
  slug: string
  duration?: number
  releaseYear?: number
  rating?: number
  genres?: string[]
  director?: string
  isAvailableOnline?: boolean
  isFeatured?: boolean
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
  rating?: number
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
  rating: string
  ratingMin: string
  sortBy: string
  sortByOptions: {
    latest: string
    rating: string
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
 * Convert Strapi creative work to ShortFilm
 */
export function toShortFilm(work: StrapiCreativeWork): ShortFilm {
  return {
    id: work.id,
    documentId: work.documentId,
    title: work.title,
    originalTitle: work.originalTitle,
    slug: work.slug,
    synopsis: work.synopsis,
    duration: work.duration,
    releaseYear: work.releaseYear,
    rating: work.rating,
    poster: work.poster,
    backdrop: work.backdrop,
    genres: work.genres,
    directors: work.directors,
    country: work.country,
    language: work.language,
  }
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
    posterUrl:
      film.poster?.formats?.medium?.url ||
      film.poster?.url ||
      "/images/poster-placeholder.jpg",
    slug: film.slug,
    duration: film.duration,
    releaseYear: film.releaseYear,
    rating: film.rating,
    genres: film.genres?.map((g) => g.name),
    director: film.directors?.[0]?.name,
    isAvailableOnline: film.isAvailableOnline,
    isFeatured: film.isFeatured,
  }
}

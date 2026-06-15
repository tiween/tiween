import "server-only"

import type { StrapiCreativeWork } from "@/features/events/types/strapi.types"
import type {
  ShortFilm,
  ShortsFilters,
  ShortsListResponse,
} from "@/features/shorts/types"
import type { Locale } from "next-intl"

import { PublicStrapiClient } from "@/lib/strapi-api"

/**
 * Default populate for short films - includes all relations needed for display
 */
const SHORT_FILM_POPULATE = [
  "poster",
  "poster.formats",
  "backdrop",
  "backdrop.formats",
  "genres",
  "directors",
  "directors.photo",
  "cast",
  "cast.person",
  "cast.person.photo",
  "videos",
  "links",
  "facts",
]

/**
 * Convert Strapi creative work to ShortFilm type
 */
function mapToShortFilm(
  work: StrapiCreativeWork & Record<string, unknown>
): ShortFilm {
  const links =
    (work.links as Array<{ platform?: string; url: string; label?: string }>) ||
    []

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
    ageRating: work.ageRating as ShortFilm["ageRating"],
    poster: work.poster,
    backdrop: work.backdrop,
    trailer: work.trailer as string | undefined,
    genres: work.genres,
    directors: work.directors,
    country: work.country,
    language: work.language,
    streamingLinks: links.map((link) => ({
      platform:
        (link.platform as NonNullable<
          ShortFilm["streamingLinks"]
        >[0]["platform"]) || "other",
      url: link.url,
      label: link.label,
    })),
    isAvailableOnline: links.length > 0 || Boolean(work.trailer),
    isFeatured: Boolean(work.featured),
    createdAt: work.createdAt as string,
    updatedAt: work.updatedAt as string,
  }
}

/**
 * Get all short films with optional filters
 */
export async function getShortFilms(
  locale: Locale,
  options: {
    filters?: ShortsFilters
    page?: number
    pageSize?: number
  } = {}
): Promise<ShortsListResponse> {
  const { filters = {}, page = 1, pageSize = 20 } = options

  try {
    // Build filters object
    const strapiFilters: Record<string, unknown> = {
      type: { $eq: "short-film" },
      publishedAt: { $notNull: true },
    }

    // Genre filter
    if (filters.genres?.length) {
      strapiFilters.genres = {
        slug: { $in: filters.genres },
      }
    }

    // Duration filter
    if (
      filters.durationMin !== undefined ||
      filters.durationMax !== undefined
    ) {
      strapiFilters.duration = {}
      if (filters.durationMin !== undefined) {
        ;(strapiFilters.duration as Record<string, unknown>).$gte =
          filters.durationMin
      }
      if (filters.durationMax !== undefined) {
        ;(strapiFilters.duration as Record<string, unknown>).$lte =
          filters.durationMax
      }
    }

    // Year filter
    if (filters.yearMin !== undefined || filters.yearMax !== undefined) {
      strapiFilters.releaseYear = {}
      if (filters.yearMin !== undefined) {
        ;(strapiFilters.releaseYear as Record<string, unknown>).$gte =
          filters.yearMin
      }
      if (filters.yearMax !== undefined) {
        ;(strapiFilters.releaseYear as Record<string, unknown>).$lte =
          filters.yearMax
      }
    }

    // Rating filter
    if (filters.rating !== undefined) {
      strapiFilters.rating = { $gte: filters.rating }
    }

    // Build sort
    let sort: string[] = ["createdAt:desc"]
    if (filters.sortBy) {
      const order = filters.sortOrder || "desc"
      switch (filters.sortBy) {
        case "latest":
          sort = [`createdAt:${order}`]
          break
        case "rating":
          sort = [`rating:${order}`]
          break
        case "year":
          sort = [`releaseYear:${order}`]
          break
        case "duration":
          sort = [`duration:${order}`]
          break
        case "title":
          sort = [`title:${order}`]
          break
      }
    }

    const response = await PublicStrapiClient.fetchAPI(
      "/creative-works",
      {
        locale,
        filters: strapiFilters,
        populate: SHORT_FILM_POPULATE,
        pagination: {
          page,
          pageSize,
          withCount: true,
        },
        sort,
      },
      {
        next: { revalidate: 60 },
      }
    )

    const works = (response.data || []) as (StrapiCreativeWork &
      Record<string, unknown>)[]
    const total = response.meta?.pagination?.total || works.length
    const shorts = works.map(mapToShortFilm)

    return {
      shorts,
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    }
  } catch (error) {
    console.error("[getShortFilms] Error:", error)
    return { shorts: [], total: 0, page, pageSize, hasMore: false }
  }
}

/**
 * Get featured short films for hero carousel
 */
export async function getFeaturedShortFilms(
  locale: Locale,
  limit: number = 5
): Promise<ShortFilm[]> {
  try {
    const response = await PublicStrapiClient.fetchAPI(
      "/creative-works",
      {
        locale,
        filters: {
          type: { $eq: "short-film" },
          publishedAt: { $notNull: true },
          // Featured items have backdrop images
          backdrop: { $notNull: true },
        },
        populate: SHORT_FILM_POPULATE,
        pagination: { limit },
        sort: ["createdAt:desc"],
      },
      {
        next: { revalidate: 300 },
      }
    )

    const works = (response.data || []) as (StrapiCreativeWork &
      Record<string, unknown>)[]
    return works.map(mapToShortFilm)
  } catch (error) {
    console.error("[getFeaturedShortFilms] Error:", error)
    return []
  }
}

/**
 * Get latest added short films
 */
export async function getLatestShortFilms(
  locale: Locale,
  limit: number = 10
): Promise<ShortFilm[]> {
  try {
    const response = await PublicStrapiClient.fetchAPI(
      "/creative-works",
      {
        locale,
        filters: {
          type: { $eq: "short-film" },
          publishedAt: { $notNull: true },
        },
        populate: SHORT_FILM_POPULATE,
        pagination: { limit },
        sort: ["createdAt:desc"],
      },
      {
        next: { revalidate: 60 },
      }
    )

    const works = (response.data || []) as (StrapiCreativeWork &
      Record<string, unknown>)[]
    return works.map(mapToShortFilm)
  } catch (error) {
    console.error("[getLatestShortFilms] Error:", error)
    return []
  }
}

/**
 * Get a single short film by slug
 */
export async function getShortFilmBySlug(
  locale: Locale,
  slug: string
): Promise<ShortFilm | null> {
  try {
    const response = await PublicStrapiClient.fetchAPI(
      "/creative-works",
      {
        locale,
        filters: {
          type: { $eq: "short-film" },
          slug: { $eq: slug },
          publishedAt: { $notNull: true },
        },
        populate: SHORT_FILM_POPULATE,
        pagination: { limit: 1 },
      },
      {
        next: { revalidate: 60 },
      }
    )

    const works = (response.data || []) as (StrapiCreativeWork &
      Record<string, unknown>)[]
    const firstWork = works[0]
    if (!firstWork) return null

    return mapToShortFilm(firstWork)
  } catch (error) {
    console.error("[getShortFilmBySlug] Error:", error)
    return null
  }
}

/**
 * Get all available genres for short films
 */
export async function getShortFilmGenres(
  locale: Locale
): Promise<Array<{ slug: string; name: string }>> {
  try {
    const response = await PublicStrapiClient.fetchAPI(
      "/genres",
      {
        locale,
        pagination: { limit: 100 },
        sort: ["name:asc"],
      },
      {
        next: { revalidate: 3600 }, // Cache for 1 hour
      }
    )

    return (response.data || []).map(
      (genre: { slug: string; name: string }) => ({
        slug: genre.slug,
        name: genre.name,
      })
    )
  } catch (error) {
    console.error("[getShortFilmGenres] Error:", error)
    return []
  }
}

/**
 * Search short films (basic implementation - Algolia integration separate)
 */
export async function searchShortFilms(
  locale: Locale,
  query: string,
  options: {
    filters?: ShortsFilters
    page?: number
    pageSize?: number
  } = {}
): Promise<ShortsListResponse> {
  const { filters = {}, page = 1, pageSize = 20 } = options

  if (!query.trim()) {
    return getShortFilms(locale, { filters, page, pageSize })
  }

  try {
    const strapiFilters: Record<string, unknown> = {
      type: { $eq: "short-film" },
      publishedAt: { $notNull: true },
      $or: [
        { title: { $containsi: query } },
        { originalTitle: { $containsi: query } },
        { synopsis: { $containsi: query } },
        { directors: { name: { $containsi: query } } },
      ],
    }

    // Apply additional filters
    if (filters.genres?.length) {
      strapiFilters.genres = { slug: { $in: filters.genres } }
    }

    const response = await PublicStrapiClient.fetchAPI(
      "/creative-works",
      {
        locale,
        filters: strapiFilters,
        populate: SHORT_FILM_POPULATE,
        pagination: {
          page,
          pageSize,
          withCount: true,
        },
        sort: ["createdAt:desc"],
      },
      {
        next: { revalidate: 60 },
      }
    )

    const works = (response.data || []) as (StrapiCreativeWork &
      Record<string, unknown>)[]
    const total = response.meta?.pagination?.total || works.length
    const shorts = works.map(mapToShortFilm)

    return {
      shorts,
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    }
  } catch (error) {
    console.error("[searchShortFilms] Error:", error)
    return { shorts: [], total: 0, page, pageSize, hasMore: false }
  }
}

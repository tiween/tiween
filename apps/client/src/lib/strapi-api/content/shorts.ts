import "server-only"

import { cache } from "react"
import {
  mapShortFilmDetail,
  mapShortFilmSummary,
} from "@/features/shorts/utils/shortMappers"

import type { ShortFilm, ShortsListResponse } from "@/features/shorts/types"
import type {
  ShortFilmDetailDto,
  ShortFilmSummaryDto,
} from "@/features/shorts/utils/shortMappers"
import type { Locale } from "next-intl"

import { PublicStrapiClient } from "@/lib/strapi-api"

import { ShortFilmApiError, toShortFilmApiError } from "./shorts.errors"

/**
 * Short-film reads against the Phase 1 public API (D-05, D-06, D-07, D-08).
 *
 * The API is `.strict()`: any query key outside its allowlist is a coded 400.
 * So these fetchers send ONLY `locale` (detail, related) or `locale`, `page`,
 * `pageSize` (list), never Strapi-style `filters`, `populate`, `pagination`
 * or `sort[]`.
 *
 * Fetchers raise typed `ShortFilmApiError`s, they never return empty/null: the
 * page decides whether a failure is a 404, a 500 or an omitted shelf (D-07,
 * D-20). Failed upstream responses are not stored in the Data Cache, so a
 * retry after an outage hits Strapi straight away.
 */

/** `plugin::creative-works.creative-work` path + the short-film routes. */
const SHORT_FILMS_PATH = "/creative-works/creative-works/short-films"

/** The API's own slug pattern and length (validation/short-films.ts). */
const SLUG_PATTERN = /^[A-Za-z0-9._~-]+$/
const SLUG_MAX_LENGTH = 200

/** Page size of the directory and of every load-more request. */
export const SHORT_FILM_PAGE_SIZE = 24

/** Cache tag shared by every short-film read (on-demand revalidation later). */
export const SHORT_FILMS_TAG = "short-films"

const REVALIDATE_SECONDS = 60
const REQUEST_TIMEOUT_MS = 8000

export const shortFilmTag = (slug: string) => `short-film:${slug}`

/** A slug that cannot exist is a not-found without a Strapi round trip. */
function assertValidSlug(slug: string): void {
  if (
    typeof slug !== "string" ||
    slug.length === 0 ||
    slug.length > SLUG_MAX_LENGTH ||
    !SLUG_PATTERN.test(slug)
  ) {
    throw new ShortFilmApiError({
      code: "SHORT_FILM_NOT_FOUND",
      kind: "NOT_FOUND",
      status: 404,
    })
  }
}

function requestInit(tags: string[]): RequestInit {
  return {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    next: { revalidate: REVALIDATE_SECONDS, tags },
  }
}

function malformed(): ShortFilmApiError {
  return new ShortFilmApiError({ code: "INTERNAL_ERROR", kind: "UPSTREAM" })
}

/**
 * One short film by slug, in the requested locale (the API falls back to the
 * default locale per field and reports the served locale as `item.locale`).
 * Wrapped in React `cache()` so `generateMetadata`, the layout guard and the
 * page share one request.
 */
export const getShortFilm = cache(
  async (slug: string, locale: Locale): Promise<ShortFilm> => {
    assertValidSlug(slug)

    try {
      const res = await PublicStrapiClient.fetchAPI(
        `${SHORT_FILMS_PATH}/${encodeURIComponent(slug)}`,
        { locale },
        requestInit([SHORT_FILMS_TAG, shortFilmTag(slug)])
      )
      const data = res?.data as ShortFilmDetailDto | null | undefined
      if (!data || typeof data !== "object" || !data.documentId) {
        throw malformed()
      }
      return mapShortFilmDetail(data)
    } catch (error) {
      throw toShortFilmApiError(error)
    }
  }
)

/**
 * One page of the directory, newest first (the API default sort). Only the
 * first page is server-rendered; later pages come through `/api/shorts`.
 */
export async function getShortFilmsPage({
  locale,
  page,
  pageSize = SHORT_FILM_PAGE_SIZE,
}: {
  locale: Locale
  page: number
  pageSize?: number
}): Promise<ShortsListResponse> {
  try {
    const res = await PublicStrapiClient.fetchAPI(
      SHORT_FILMS_PATH,
      { locale, page, pageSize },
      requestInit([SHORT_FILMS_TAG])
    )
    const data = res?.data as ShortFilmSummaryDto[] | undefined
    const pagination = res?.meta?.pagination as
      | { page?: number; pageCount?: number; total?: number }
      | undefined
    if (
      !Array.isArray(data) ||
      typeof pagination?.pageCount !== "number" ||
      typeof pagination?.total !== "number"
    ) {
      throw malformed()
    }

    return {
      shorts: data.map(mapShortFilmSummary),
      total: pagination.total,
      page,
      pageSize,
      hasMore: page < pagination.pageCount,
    }
  } catch (error) {
    throw toShortFilmApiError(error)
  }
}

/** The API returns at most this many related films. */
export const SHORT_FILM_RELATED_MAX = 6

/**
 * Films related to `slug` (same director, then same genre), in the requested
 * locale. Raises typed errors like every other fetcher: omitting a failing
 * shelf is the PAGE's decision (D-20), not the fetcher's (D-08).
 */
export async function getRelatedShortFilms(
  slug: string,
  locale: Locale
): Promise<ShortFilm[]> {
  assertValidSlug(slug)

  try {
    const res = await PublicStrapiClient.fetchAPI(
      `${SHORT_FILMS_PATH}/${encodeURIComponent(slug)}/related`,
      { locale },
      requestInit([
        SHORT_FILMS_TAG,
        shortFilmTag(slug),
        `short-film-related:${slug}`,
      ])
    )
    const data = res?.data as ShortFilmSummaryDto[] | undefined
    if (!Array.isArray(data)) throw malformed()

    return data.map(mapShortFilmSummary)
  } catch (error) {
    throw toShortFilmApiError(error)
  }
}

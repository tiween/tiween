/**
 * Public short-film API helpers and the D-05 / D-08 ordering rules, restated
 * from `src/plugins/creative-works/server/src/services/short-films.ts` so the
 * Postgres stack can be checked against the same rules the SQLite boot suite
 * (`short-films.service.test.ts`) pins with fixed fixtures.
 *
 * The public summary carries no numeric `id`, so the final `id:desc`
 * tie-break cannot be observed. Orders are therefore compared on their sort
 * KEYS (group, rank, publishedAt), which is exact whenever publishedAt values
 * differ and tolerant of the unobservable tie-break when they do not.
 */
import { expect } from "@playwright/test"

import type { APIRequestContext } from "@playwright/test"

import { SHORT_FILMS_API } from "./env"

/** services/short-films.ts FEATURED_LIMIT */
export const FEATURED_LIMIT = 12
/** services/short-films.ts RELATED_LIMIT */
export const RELATED_LIMIT = 6
/** validation/short-films.ts SHORT_FILM_MAX_PAGE_SIZE */
const MAX_PAGE_SIZE = 48

/** Same list as short-films.service.test.ts SUMMARY_KEYS. */
export const SUMMARY_KEYS = [
  "availableOnline",
  "backdrop",
  "country",
  "directors",
  "documentId",
  "duration",
  "featured",
  "featuredRank",
  "genres",
  "hasAwards",
  "language",
  "locale",
  "originalTitle",
  "poster",
  "publishedAt",
  "releaseYear",
  "slug",
  "synopsis",
  "title",
]

/** Same list as short-films.service.test.ts FORBIDDEN_KEYS. */
export const FORBIDDEN_KEYS = [
  "provider_metadata",
  "hash",
  "provider",
  "folderPath",
  "createdBy",
  "updatedBy",
  "createdAt",
  "updatedAt",
  "externalIds",
  "theatreDetails",
  "id",
]

export interface Summary {
  documentId: string
  slug: string
  title: string | null
  locale: string | null
  featured: boolean
  featuredRank: number | null
  publishedAt: string | null
  directors: Array<{ documentId: string; name: string | null }>
  genres: Array<{ documentId: string; slug: string | null }>
  [key: string]: unknown
}

export function collectKeys(value: unknown, found = new Set<string>()) {
  if (Array.isArray(value)) {
    for (const entry of value) collectKeys(entry, found)
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      found.add(key)
      collectKeys(child, found)
    }
  }
  return found
}

export function expectSummaryShape(items: Summary[], body: unknown) {
  for (const item of items) {
    expect(Object.keys(item).sort()).toEqual(SUMMARY_KEYS)
  }
  const keys = collectKeys(body)
  for (const forbidden of FORBIDDEN_KEYS) {
    expect(keys.has(forbidden), `public body exposes "${forbidden}"`).toBe(
      false
    )
  }
}

/** Every published short film, walked through the public list endpoint. */
export async function fetchAllPublished(
  request: APIRequestContext
): Promise<Summary[]> {
  const all: Summary[] = []
  let page = 1
  let pageCount = 1
  do {
    const response = await request.get(SHORT_FILMS_API, {
      params: { page, pageSize: MAX_PAGE_SIZE },
    })
    expect(response.status()).toBe(200)
    const body = await response.json()
    all.push(...body.data)
    pageCount = body.meta.pagination.pageCount
    page += 1
  } while (page <= pageCount)
  return all
}

const ts = (value: string | null) => (value ? Date.parse(value) : 0)

/** D-05: rank ascending (unranked last), then publishedAt descending. */
export function compareFeatured(a: Summary, b: Summary): number {
  if (a.featuredRank !== b.featuredRank) {
    if (a.featuredRank === null) return 1
    if (b.featuredRank === null) return -1
    return a.featuredRank - b.featuredRank
  }
  return ts(b.publishedAt) - ts(a.publishedAt)
}

export function expectedFeatured(published: Summary[]): Summary[] {
  return published
    .filter((film) => film.featured)
    .sort(compareFeatured)
    .slice(0, FEATURED_LIMIT)
}

export const featuredKey = (film: Summary) =>
  `${film.featuredRank ?? "unranked"}|${film.publishedAt}`

export type RelatedGroup = "director" | "genre"

/**
 * D-08: other published shorts sharing a director (directing credit) first,
 * then shorts sharing a genre, each newest first, source excluded, a film in
 * both groups listed once (director group), capped at RELATED_LIMIT.
 */
export function expectedRelated(
  source: Summary,
  published: Summary[]
): Array<{ film: Summary; group: RelatedGroup }> {
  const directorIds = new Set(source.directors.map((d) => d.documentId))
  const genreIds = new Set(source.genres.map((g) => g.documentId))
  const others = published.filter(
    (film) => film.documentId !== source.documentId
  )
  const newestFirst = (a: Summary, b: Summary) =>
    ts(b.publishedAt) - ts(a.publishedAt)

  const byDirector = others
    .filter((film) => film.directors.some((d) => directorIds.has(d.documentId)))
    .sort(newestFirst)
  const directorSet = new Set(byDirector.map((film) => film.documentId))
  const byGenre = others
    .filter(
      (film) =>
        !directorSet.has(film.documentId) &&
        film.genres.some((g) => genreIds.has(g.documentId))
    )
    .sort(newestFirst)

  return [
    ...byDirector.map((film) => ({ film, group: "director" as const })),
    ...byGenre.map((film) => ({ film, group: "genre" as const })),
  ].slice(0, RELATED_LIMIT)
}

export function relatedGroupOf(
  source: Summary,
  film: Summary
): RelatedGroup | null {
  const directorIds = new Set(source.directors.map((d) => d.documentId))
  const genreIds = new Set(source.genres.map((g) => g.documentId))
  if (film.directors.some((d) => directorIds.has(d.documentId)))
    return "director"
  if (film.genres.some((g) => genreIds.has(g.documentId))) return "genre"
  return null
}

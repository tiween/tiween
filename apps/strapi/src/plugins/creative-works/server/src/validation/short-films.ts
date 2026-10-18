/**
 * Strict query/param schemas for the public short-film read routes
 * (SDATA-03, D-06 / D-07 / D-10).
 *
 * The query schemas are `.strict()`: an unknown key (a facet such as `country` or
 * `duration`, a cache-buster, a typo) fails with the coded 400
 * `VALIDATION_FAILED` instead of being silently ignored. Phase 2's client must
 * therefore send only the allowlisted parameters.
 *
 * Parse with `validate()` from the shared kit, which throws a Strapi
 * `ValidationError` carrying `details.code = "VALIDATION_FAILED"`.
 */
import { z } from "zod"

/** The eight allowlisted sorts (D-07). Anything else is a 400. */
export const SHORT_FILM_SORTS = [
  "publishedAt:asc",
  "publishedAt:desc",
  "releaseYear:asc",
  "releaseYear:desc",
  "duration:asc",
  "duration:desc",
  "title:asc",
  "title:desc",
] as const

export type ShortFilmSort = (typeof SHORT_FILM_SORTS)[number]

export const SHORT_FILM_DEFAULT_SORT: ShortFilmSort = "publishedAt:desc"
export const SHORT_FILM_DEFAULT_PAGE_SIZE = 24
export const SHORT_FILM_MAX_PAGE_SIZE = 48
export const SHORT_FILM_MAX_PAGE = 10_000

const localeSchema = z.string().min(2).max(10)

/** `GET /short-films` — exactly locale, genre, sort, page, pageSize. */
export const shortFilmListQuerySchema = z
  .object({
    locale: localeSchema.optional(),
    genre: z.string().trim().min(1).max(100).optional(),
    sort: z.enum(SHORT_FILM_SORTS).default(SHORT_FILM_DEFAULT_SORT),
    page: z.coerce
      .number()
      .int()
      .positive()
      .max(SHORT_FILM_MAX_PAGE)
      .default(1),
    pageSize: z.coerce
      .number()
      .int()
      .positive()
      .max(SHORT_FILM_MAX_PAGE_SIZE)
      .default(SHORT_FILM_DEFAULT_PAGE_SIZE),
  })
  .strict()

/** `GET /short-films/:slug` — only `locale` is accepted. */
export const shortFilmDetailQuerySchema = z
  .object({
    locale: localeSchema.optional(),
  })
  .strict()

/** `GET /short-films/featured` — only `locale` is accepted (D-05). */
export const shortFilmFeaturedQuerySchema = z
  .object({
    locale: localeSchema.optional(),
  })
  .strict()

/** The `:slug` route param: URL-safe unreserved characters only. */
export const shortFilmSlugParamSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[A-Za-z0-9._~-]+$/),
})

export type ShortFilmListQuery = z.infer<typeof shortFilmListQuerySchema>
export type ShortFilmDetailQuery = z.infer<typeof shortFilmDetailQuerySchema>
export type ShortFilmFeaturedQuery = z.infer<
  typeof shortFilmFeaturedQuerySchema
>

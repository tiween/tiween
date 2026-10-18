/**
 * Public short-film read service (SDATA-03, D-06 / D-07).
 *
 * PUBLIC CONTRACT (Phase 2 `/shorts` binds to this; Phase 3 keeps it as the
 * Meilisearch fallback):
 *
 *  - A short film is public iff its DEFAULT-locale row is published. Every read
 *    passes `status: "published"` and `filters.type = "short-film"`, so drafts
 *    and other work types never surface (D-09).
 *  - Filtering, sorting, paging and counting only ever read the default-locale
 *    rows. A translation is overlaid afterwards for the page's documents, so a
 *    partially translated catalog cannot corrupt pagination.
 *  - `locale` on each item is the locale actually served: the requested locale
 *    where a published translation exists, the default locale otherwise.
 *  - Responses are built from an explicit allowlist (fresh objects, explicit
 *    keys). Nothing from the raw Document Service row leaks through: no numeric
 *    `id`, audit fields, upload provider metadata or draft-only relations.
 */
import { errors } from "@strapi/utils"

import type { Core } from "@strapi/strapi"
import type { ShortFilmListQuery } from "../validation/short-films"

import {
  DIRECTING_ROLE_SLUGS,
  hasAwards,
  isAvailableOnline,
} from "../../../../../shared/short-film-rules"

const CREATIVE_WORK_UID = "plugin::creative-works.creative-work"
const SHORT_FILM_TYPE = "short-film"

export const UNSUPPORTED_LOCALE = "UNSUPPORTED_LOCALE"

/** Media columns read from the upload plugin; provider internals are excluded. */
const MEDIA_FIELDS = [
  "url",
  "alternativeText",
  "width",
  "height",
  "mime",
  "formats",
]

const PERSON_FIELDS = ["documentId", "slug", "name"]

/** Populate used by the list (summary) projection. */
const SUMMARY_POPULATE = {
  poster: { fields: MEDIA_FIELDS },
  backdrop: { fields: MEDIA_FIELDS },
  genres: { fields: ["documentId", "slug", "name"] },
  credits: {
    populate: {
      person: { fields: PERSON_FIELDS },
      creditRole: { fields: ["slug", "department"] },
    },
  },
  streamingLinks: true,
  videos: true,
  distinctions: true,
}

/* -------------------------------------------------------------------------- */
/* Response types                                                             */
/* -------------------------------------------------------------------------- */

export interface PublicMediaFormat {
  url: string | null
  width: number | null
  height: number | null
}

export interface PublicMedia {
  url: string | null
  alternativeText: string | null
  width: number | null
  height: number | null
  mime: string | null
  formats: Record<string, PublicMediaFormat> | null
}

export interface PublicGenre {
  documentId: string
  slug: string | null
  name: string | null
}

export interface PublicPerson {
  documentId: string
  slug: string | null
  name: string | null
}

export interface ShortFilmSummary {
  documentId: string
  slug: string | null
  locale: string | null
  title: string | null
  originalTitle: string | null
  synopsis: string | null
  duration: number | null
  releaseYear: number | null
  country: string[]
  language: string[]
  featured: boolean
  featuredRank: number | null
  publishedAt: string | null
  poster: PublicMedia | null
  backdrop: PublicMedia | null
  genres: PublicGenre[]
  directors: PublicPerson[]
  availableOnline: boolean
  hasAwards: boolean
}

export interface ShortFilmListResult {
  data: ShortFilmSummary[]
  meta: {
    pagination: {
      page: number
      pageSize: number
      pageCount: number
      total: number
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Pure projection helpers                                                    */
/* -------------------------------------------------------------------------- */

type Row = Record<string, any>

/**
 * Coerce a possibly-string numeric (the `pg` driver returns decimals and some
 * ints as strings) to a finite number; anything else becomes `null`.
 */
function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null
  const n = typeof value === "string" ? Number(value) : value
  return typeof n === "number" && Number.isFinite(n) ? n : null
}

function toStringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null
}

function toIsoOrNull(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString()
  return typeof value === "string" ? value : null
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : []
}

function asArray(value: unknown): Row[] {
  return Array.isArray(value) ? (value as Row[]) : []
}

/**
 * Public media object. Keeps url, alternativeText, width, height, mime and, per
 * format key, only { url, width, height } — `hash`, `provider`, `folderPath`,
 * `provider_metadata` and audit columns are dropped.
 */
export function toPublicMedia(file: unknown): PublicMedia | null {
  if (file === null || typeof file !== "object") return null
  const f = file as Row

  let formats: PublicMedia["formats"] = null
  if (f.formats && typeof f.formats === "object") {
    formats = {}
    for (const [key, format] of Object.entries(f.formats as Row)) {
      if (format === null || typeof format !== "object") continue
      formats[key] = {
        url: toStringOrNull((format as Row).url),
        width: toNumberOrNull((format as Row).width),
        height: toNumberOrNull((format as Row).height),
      }
    }
  }

  return {
    url: toStringOrNull(f.url),
    alternativeText: toStringOrNull(f.alternativeText),
    width: toNumberOrNull(f.width),
    height: toNumberOrNull(f.height),
    mime: toStringOrNull(f.mime),
    formats,
  }
}

function toPublicGenre(genre: Row): PublicGenre | null {
  if (typeof genre?.documentId !== "string") return null
  return {
    documentId: genre.documentId,
    slug: toStringOrNull(genre.slug),
    name: toStringOrNull(genre.name),
  }
}

export function toPublicPerson(person: unknown): PublicPerson | null {
  if (person === null || typeof person !== "object") return null
  const p = person as Row
  if (typeof p.documentId !== "string") return null
  return {
    documentId: p.documentId,
    slug: toStringOrNull(p.slug),
    name: toStringOrNull(p.name),
  }
}

function byBilling(a: Row, b: Row): number {
  return (toNumberOrNull(a?.billing) ?? 99) - (toNumberOrNull(b?.billing) ?? 99)
}

/** Persons credited with a directing role (matched by role SLUG), de-duplicated. */
function deriveDirectors(credits: Row[]): PublicPerson[] {
  const seen = new Set<string>()
  const directors: PublicPerson[] = []
  const directing = credits
    .filter((credit) =>
      (DIRECTING_ROLE_SLUGS as readonly string[]).includes(
        credit?.creditRole?.slug
      )
    )
    .sort(byBilling)
  for (const credit of directing) {
    const person = toPublicPerson(credit.person)
    if (!person || seen.has(person.documentId)) continue
    seen.add(person.documentId)
    directors.push(person)
  }
  return directors
}

/** Summary projection: a NEW object holding only the allowlisted summary keys. */
export function toShortFilmSummary(row: Row): ShortFilmSummary {
  const credits = asArray(row.credits)
  const streamingLinks = asArray(row.streamingLinks)
  const videos = asArray(row.videos)
  const distinctions = asArray(row.distinctions)

  return {
    documentId: row.documentId,
    slug: toStringOrNull(row.slug),
    locale: toStringOrNull(row.locale),
    title: toStringOrNull(row.title),
    originalTitle: toStringOrNull(row.originalTitle),
    synopsis: toStringOrNull(row.synopsis),
    duration: toNumberOrNull(row.duration),
    releaseYear: toNumberOrNull(row.releaseYear),
    country: toStringArray(row.country),
    language: toStringArray(row.language),
    featured: row.featured === true,
    featuredRank: toNumberOrNull(row.featuredRank),
    publishedAt: toIsoOrNull(row.publishedAt),
    poster: toPublicMedia(row.poster),
    backdrop: toPublicMedia(row.backdrop),
    genres: asArray(row.genres)
      .map(toPublicGenre)
      .filter((genre): genre is PublicGenre => genre !== null),
    directors: deriveDirectors(credits),
    availableOnline: isAvailableOnline({ streamingLinks, videos }),
    hasAwards: hasAwards({ distinctions }),
  }
}

/* -------------------------------------------------------------------------- */
/* Service                                                                    */
/* -------------------------------------------------------------------------- */

function pageCountOf(total: number, pageSize: number): number {
  return pageSize > 0 ? Math.ceil(total / pageSize) : 0
}

const shortFilmsService = ({ strapi }: { strapi: Core.Strapi }) => {
  const localesService = () => strapi.plugin("i18n").service("locales")

  /**
   * Validate the requested locale against the i18n plugin (never a hardcoded
   * list) and return it with the configured default locale.
   *
   * @throws ValidationError with `details.code = "UNSUPPORTED_LOCALE"`.
   */
  async function resolveLocale(
    locale?: string
  ): Promise<{ requested: string; defaultLocale: string }> {
    const defaultLocale = (await localesService().getDefaultLocale()) as string
    if (locale === undefined || locale === defaultLocale) {
      return { requested: defaultLocale, defaultLocale }
    }

    const rows = (await localesService().find()) as
      | Array<{ code?: unknown }>
      | undefined
    const codes = (Array.isArray(rows) ? rows : []).map((row) => row?.code)
    if (!codes.includes(locale)) {
      throw new errors.ValidationError("Unsupported locale", {
        code: UNSUPPORTED_LOCALE,
      })
    }

    return { requested: locale, defaultLocale }
  }

  return {
    resolveLocale,

    /**
     * Published short films, paged. Sorting always ends with `id:desc` so rows
     * with equal sort keys have a deterministic order (and pages never repeat or
     * skip a row).
     */
    async list(query: ShortFilmListQuery): Promise<ShortFilmListResult> {
      const { page, pageSize, sort, genre } = query
      const { defaultLocale } = await resolveLocale(query.locale)

      const filters = {
        type: SHORT_FILM_TYPE,
        ...(genre ? { genres: { slug: { $eq: genre } } } : {}),
      }

      const [rows, total] = await Promise.all([
        strapi.documents(CREATIVE_WORK_UID).findMany({
          status: "published",
          locale: defaultLocale,
          filters,
          sort: [sort, "id:desc"],
          populate: SUMMARY_POPULATE,
          start: (page - 1) * pageSize,
          limit: pageSize,
        } as never),
        strapi.documents(CREATIVE_WORK_UID).count({
          status: "published",
          locale: defaultLocale,
          filters,
        } as never),
      ])

      const data = (rows as unknown as Row[]).map(toShortFilmSummary)

      return {
        data,
        meta: {
          pagination: {
            page,
            pageSize,
            pageCount: pageCountOf(total, pageSize),
            total,
          },
        },
      }
    },
  }
}

export default shortFilmsService

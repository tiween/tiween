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
  isHttpsUrl,
} from "../../../../../shared/short-film-rules"

const CREATIVE_WORK_UID = "plugin::creative-works.creative-work"
const GENRE_UID = "plugin::creative-works.genre"
const SHORT_FILM_TYPE = "short-film"

export const UNSUPPORTED_LOCALE = "UNSUPPORTED_LOCALE"

/** Featured rail size (D-05). */
export const FEATURED_LIMIT = 12
/** Related rail size (D-08). */
export const RELATED_LIMIT = 6
/** Safety cap on rows fetched before the JavaScript featured ordering. */
const FEATURED_FETCH_CAP = 100

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

/** Populate used by the detail projection: the summary graph plus photos and cast. */
const DETAIL_POPULATE = {
  ...SUMMARY_POPULATE,
  photos: { fields: MEDIA_FIELDS },
  cast: {
    populate: {
      person: { fields: PERSON_FIELDS },
      character: { fields: ["documentId", "name"] },
    },
  },
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

export interface PublicCredit {
  person: PublicPerson
  creditRole: { slug: string | null; department: string | null }
  customRole: string | null
  billing: number | null
}

export interface PublicCastMember {
  person: PublicPerson
  character: { documentId: string; name: string | null } | null
  billing: number | null
}

export interface PublicDistinction {
  name: string | null
  edition: string | null
  year: number | null
  section: string | null
  category: string | null
  result: string | null
  awardName: string | null
}

export interface PublicVideo {
  url: string | null
  videoType: string | null
}

export interface PublicStreamingLink {
  platform: string | null
  url: string | null
  accessType: string | null
  label: string | null
}

export interface ShortFilmDetail extends ShortFilmSummary {
  rating: number | null
  ageRating: string | null
  photos: PublicMedia[]
  credits: PublicCredit[]
  cast: PublicCastMember[]
  distinctions: PublicDistinction[]
  videos: PublicVideo[]
  streamingLinks: PublicStreamingLink[]
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

/**
 * Streaming links safe to render as public links. The write guard already
 * refuses non-https URLs; rows stored before it existed are dropped here so a
 * `javascript:` or `http:` URL never reaches the client.
 */
function safeStreamingLinks(row: Row): Row[] {
  return asArray(row.streamingLinks).filter((link) => isHttpsUrl(link.url))
}

/** Summary projection: a NEW object holding only the allowlisted summary keys. */
export function toShortFilmSummary(row: Row): ShortFilmSummary {
  const credits = asArray(row.credits)
  const streamingLinks = safeStreamingLinks(row)
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

function toPublicCredit(credit: Row): PublicCredit | null {
  // A credit whose person is not published populates as null: drop it.
  const person = toPublicPerson(credit?.person)
  if (!person) return null
  return {
    person,
    creditRole: {
      slug: toStringOrNull(credit?.creditRole?.slug),
      department: toStringOrNull(credit?.creditRole?.department),
    },
    customRole: toStringOrNull(credit?.customRole),
    billing: toNumberOrNull(credit?.billing),
  }
}

function toPublicCastMember(member: Row): PublicCastMember | null {
  const person = toPublicPerson(member?.person)
  if (!person) return null
  const character = member?.character
  return {
    person,
    character:
      character && typeof character.documentId === "string"
        ? {
            documentId: character.documentId,
            name: toStringOrNull(character.name),
          }
        : null,
    billing: toNumberOrNull(member?.billing),
  }
}

function isPresent<T>(value: T | null): value is T {
  return value !== null
}

/** Detail projection: the summary keys plus the detail-only allowlisted keys. */
export function toShortFilmDetail(row: Row): ShortFilmDetail {
  return {
    ...toShortFilmSummary(row),
    rating: toNumberOrNull(row.rating),
    ageRating: toStringOrNull(row.ageRating),
    photos: asArray(row.photos).map(toPublicMedia).filter(isPresent),
    credits: asArray(row.credits)
      .slice()
      .sort(byBilling)
      .map(toPublicCredit)
      .filter(isPresent),
    cast: asArray(row.cast)
      .slice()
      .sort(byBilling)
      .map(toPublicCastMember)
      .filter(isPresent),
    distinctions: asArray(row.distinctions).map((d) => ({
      name: toStringOrNull(d.name),
      edition: toStringOrNull(d.edition),
      year: toNumberOrNull(d.year),
      section: toStringOrNull(d.section),
      category: toStringOrNull(d.category),
      result: toStringOrNull(d.result),
      awardName: toStringOrNull(d.awardName),
    })),
    videos: asArray(row.videos).map((v) => ({
      url: toStringOrNull(v.url),
      videoType: toStringOrNull(v.videoType),
    })),
    streamingLinks: safeStreamingLinks(row).map((l) => ({
      platform: toStringOrNull(l.platform),
      url: toStringOrNull(l.url),
      accessType: toStringOrNull(l.accessType),
      label: toStringOrNull(l.label),
    })),
  }
}

/* -------------------------------------------------------------------------- */
/* Service                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Overlay the localized fields of the requested locale onto already-projected
 * items (French-fallback, research Pattern 3).
 *
 * A localized row counts as a translation only when it has a non-empty title:
 * then `title`, `synopsis` (when it has one) and `poster` (when it has one)
 * replace the base values and `locale` becomes `requested`. Otherwise the base
 * item is kept as is, with its own (default) locale. Relations (genres,
 * credits, directors), the slug and every derived field ALWAYS stay from the
 * base row. Returns new objects; inputs are never mutated.
 *
 * `localizedRows` are raw Document Service rows of the requested locale
 * ({ documentId, title, synopsis, poster }); the poster is run through
 * `toPublicMedia` here, so no internal media column can leak.
 */
export function overlayLocalizedFields<T extends ShortFilmSummary>(
  baseItems: T[],
  localizedRows: Row[],
  requested: string
): T[] {
  const byDocument = new Map<string, Row>()
  for (const row of localizedRows) {
    if (typeof row?.documentId === "string") byDocument.set(row.documentId, row)
  }

  return baseItems.map((item) => {
    const localized = byDocument.get(item.documentId)
    const title = toStringOrNull(localized?.title)
    if (!localized || title === null || title.trim() === "") return { ...item }

    const synopsis = toStringOrNull(localized.synopsis)
    return {
      ...item,
      title,
      synopsis:
        synopsis !== null && synopsis.trim() !== "" ? synopsis : item.synopsis,
      poster: toPublicMedia(localized.poster) ?? item.poster,
      locale: requested,
    }
  })
}

/**
 * Replace genre names with their translation in the requested locale; a genre
 * with no (or an empty) translation keeps its base name. Returns new objects.
 */
export function overlayGenreNames<T extends ShortFilmSummary>(
  items: T[],
  genreRows: Row[]
): T[] {
  const names = new Map<string, string>()
  for (const row of genreRows) {
    const name = toStringOrNull(row?.name)
    if (typeof row?.documentId === "string" && name && name.trim() !== "") {
      names.set(row.documentId, name)
    }
  }

  return items.map((item) => ({
    ...item,
    genres: item.genres.map((genre) => ({
      ...genre,
      name: names.get(genre.documentId) ?? genre.name,
    })),
  }))
}

function toTimestamp(value: unknown): number {
  if (value instanceof Date) return value.getTime()
  if (typeof value === "string") {
    const t = Date.parse(value)
    return Number.isNaN(t) ? 0 : t
  }
  return 0
}

/**
 * Featured order (D-05): `featuredRank` ascending with unranked films last,
 * then `publishedAt` descending, then numeric `id` descending. Computed in
 * JavaScript on purpose: SQLite sorts NULLs first and Postgres last in an
 * ascending sort, so a database `featuredRank:asc` would differ per engine
 * (research Pattern 5). Returns a new array; the input is never mutated.
 */
export function sortFeatured<T extends Row>(rows: T[]): T[] {
  return rows.slice().sort((a, b) => {
    const rankA = toNumberOrNull(a?.featuredRank)
    const rankB = toNumberOrNull(b?.featuredRank)
    if (rankA !== rankB) {
      if (rankA === null) return 1
      if (rankB === null) return -1
      return rankA - rankB
    }
    const published = toTimestamp(b?.publishedAt) - toTimestamp(a?.publishedAt)
    if (published !== 0) return published
    return (toNumberOrNull(b?.id) ?? 0) - (toNumberOrNull(a?.id) ?? 0)
  })
}

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

  /**
   * Overlay the requested locale onto default-locale items. A no-op for the
   * default locale. Paging, sorting and counting never read the requested
   * locale: this only runs on the already-selected page.
   */
  async function localize<T extends ShortFilmSummary>(
    items: T[],
    requested: string,
    defaultLocale: string
  ): Promise<T[]> {
    if (requested === defaultLocale || items.length === 0) return items

    const documentIds = items.map((item) => item.documentId)
    const genreIds = [
      ...new Set(items.flatMap((item) => item.genres.map((g) => g.documentId))),
    ]

    const [localizedRows, genreRows] = await Promise.all([
      strapi.documents(CREATIVE_WORK_UID).findMany({
        locale: requested,
        status: "published",
        filters: { documentId: { $in: documentIds } },
        fields: ["documentId", "title", "synopsis"],
        populate: { poster: { fields: MEDIA_FIELDS } },
        limit: documentIds.length,
      } as never),
      genreIds.length > 0
        ? strapi.documents(GENRE_UID).findMany({
            locale: requested,
            filters: { documentId: { $in: genreIds } },
            fields: ["documentId", "name"],
            limit: genreIds.length,
          } as never)
        : Promise.resolve([]),
    ])

    return overlayGenreNames(
      overlayLocalizedFields(
        items,
        localizedRows as unknown as Row[],
        requested
      ),
      genreRows as unknown as Row[]
    )
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
      const { requested, defaultLocale } = await resolveLocale(query.locale)

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

      const data = await localize(
        (rows as unknown as Row[]).map(toShortFilmSummary),
        requested,
        defaultLocale
      )

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

    /**
     * Published, featured short films in the D-05 order, capped at
     * FEATURED_LIMIT. A featured draft never appears: the default-locale row
     * must be published. At most FEATURED_FETCH_CAP (newest first) rows are
     * fetched, then ordered in JavaScript by `sortFeatured`.
     */
    async featured(locale?: string): Promise<ShortFilmSummary[]> {
      const { requested, defaultLocale } = await resolveLocale(locale)

      const rows = await strapi.documents(CREATIVE_WORK_UID).findMany({
        status: "published",
        locale: defaultLocale,
        filters: { type: SHORT_FILM_TYPE, featured: true },
        sort: ["publishedAt:desc", "id:desc"],
        populate: SUMMARY_POPULATE,
        limit: FEATURED_FETCH_CAP,
      } as never)

      return localize(
        sortFeatured(rows as unknown as Row[])
          .slice(0, FEATURED_LIMIT)
          .map(toShortFilmSummary),
        requested,
        defaultLocale
      )
    },

    /**
     * One published short film by exact slug, or null (unknown slug, draft-only
     * short, or a non-short work). The slug lives on the default-locale row only
     * (a uid is not copied to a translation row), so the lookup is always made in
     * the default locale.
     */
    async findBySlug(
      slug: string,
      locale?: string
    ): Promise<ShortFilmDetail | null> {
      const { requested, defaultLocale } = await resolveLocale(locale)

      const row = await strapi.documents(CREATIVE_WORK_UID).findFirst({
        status: "published",
        locale: defaultLocale,
        filters: { type: SHORT_FILM_TYPE, slug: { $eq: slug } },
        populate: DETAIL_POPULATE,
      } as never)

      if (!row) return null

      const [detail] = await localize(
        [toShortFilmDetail(row as unknown as Row)],
        requested,
        defaultLocale
      )
      return detail
    },
  }
}

export default shortFilmsService

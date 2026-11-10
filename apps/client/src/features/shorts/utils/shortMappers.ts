/**
 * Pure mappers from the public short-film API (creative-works plugin,
 * `/short-films`) to the client `ShortFilm` shape (SPAGE-02).
 *
 * The API is flat Strapi v5 JSON with an allowlist projection, so every field
 * is nullable and nothing is nested under `attributes`. These mappers keep the
 * API nullability at the boundary and normalise it to `undefined` in the
 * client type. They are pure (no `server-only`, no `next` imports) so a client
 * component can import them by path.
 *
 * Deliberately NOT re-exported from `./index.ts`: that file owns
 * `toSafeExternalUrl`, which this one imports, and a re-export would make a
 * cycle.
 *
 * Never copied: `rating` (ratings are out of v1).
 */

import type { StrapiMedia } from "@/features/events/types/strapi.types"
import type {
  PlatformType,
  ShortFilm,
  ShortFilmAccessType,
  ShortFilmAward,
  ShortFilmCastMember,
  ShortFilmCrewCredit,
  ShortFilmGenre,
  ShortFilmPerson,
  StreamingLink,
} from "../types/shorts.types"

import { PLATFORM_TYPES, SHORT_FILM_ACCESS_TYPES } from "../types/shorts.types"
import { toSafeExternalUrl } from "./index"

/* -------------------------------------------------------------------------- */
/* API DTO types (mirror creative-works/server/src/services/short-films.ts)   */
/* -------------------------------------------------------------------------- */

export interface ShortFilmMediaFormatDto {
  url: string | null
  width: number | null
  height: number | null
}

export interface ShortFilmMediaDto {
  url: string | null
  alternativeText: string | null
  width: number | null
  height: number | null
  mime: string | null
  formats: Record<string, ShortFilmMediaFormatDto> | null
}

export interface ShortFilmGenreDto {
  documentId: string
  slug: string | null
  name: string | null
}

export interface ShortFilmPersonDto {
  documentId: string
  slug: string | null
  name: string | null
}

export interface ShortFilmSummaryDto {
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
  poster: ShortFilmMediaDto | null
  backdrop: ShortFilmMediaDto | null
  genres: ShortFilmGenreDto[]
  directors: ShortFilmPersonDto[]
  availableOnline: boolean
  hasAwards: boolean
}

export interface ShortFilmCreditDto {
  person: ShortFilmPersonDto | null
  creditRole: { slug: string | null; department: string | null } | null
  customRole: string | null
  billing: number | null
}

export interface ShortFilmCastDto {
  person: ShortFilmPersonDto | null
  character: { documentId: string; name: string | null } | null
  billing: number | null
}

export interface ShortFilmDistinctionDto {
  name: string | null
  edition: string | null
  year: number | null
  section: string | null
  category: string | null
  result: string | null
  awardName: string | null
}

export interface ShortFilmVideoDto {
  url: string | null
  videoType: string | null
}

export interface ShortFilmStreamingLinkDto {
  platform: string | null
  url: string | null
  accessType: string | null
  label: string | null
}

export interface ShortFilmDetailDto extends ShortFilmSummaryDto {
  rating: number | null
  ageRating: string | null
  photos: ShortFilmMediaDto[]
  credits: ShortFilmCreditDto[]
  cast: ShortFilmCastDto[]
  distinctions: ShortFilmDistinctionDto[]
  videos: ShortFilmVideoDto[]
  streamingLinks: ShortFilmStreamingLinkDto[]
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/** Distinction results that count as winning (`AWARD_RESULTS`). */
const WON_RESULTS: ReadonlySet<string> = new Set([
  "winner",
  "grand-prize",
  "special-mention",
  "honorable-mention",
])

const DIRECTING_ROLE_SLUGS: ReadonlySet<string> = new Set(["director"])

const AGE_RATINGS = ["TP", "PG12", "PG16", "PG18"] as const

const MEDIA_FORMATS = ["thumbnail", "small", "medium", "large"] as const

function nonBlank(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function positive(value: number | null | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : undefined
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string" && v.length > 0)
    : []
}

function asArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : []
}

/** An https URL that is also safe to navigate to; anything else is dropped. */
function toSafeHttpsUrl(url: string | null | undefined): string | undefined {
  const safe = toSafeExternalUrl(url)
  if (!safe) return undefined
  try {
    return new URL(safe).protocol === "https:" ? safe : undefined
  } catch {
    return undefined
  }
}

/**
 * Stable ascending sort by `billing`: lower first, `null` last, API order
 * breaks ties.
 */
function byBilling<T extends { billing?: number | null }>(items: T[]): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const left = a.item.billing ?? Number.POSITIVE_INFINITY
      const right = b.item.billing ?? Number.POSITIVE_INFINITY
      if (left !== right) return left < right ? -1 : 1
      return a.index - b.index
    })
    .map(({ item }) => item)
}

function mapMedia(
  media: ShortFilmMediaDto | null | undefined
): StrapiMedia | undefined {
  const url = nonBlank(media?.url)
  if (!media || !url) return undefined

  const formats: NonNullable<StrapiMedia["formats"]> = {}
  for (const key of MEDIA_FORMATS) {
    const formatUrl = nonBlank(media.formats?.[key]?.url)
    if (formatUrl) formats[key] = { url: formatUrl }
  }

  return {
    url,
    alternativeText: nonBlank(media.alternativeText),
    ...(Object.keys(formats).length > 0 ? { formats } : {}),
  }
}

function mapPerson(
  person: ShortFilmPersonDto | null | undefined
): ShortFilmPerson | null {
  const name = nonBlank(person?.name)
  if (!person || !name) return null
  return {
    documentId: person.documentId,
    slug: nonBlank(person.slug) ?? person.documentId,
    name,
  }
}

function mapGenre(
  genre: ShortFilmGenreDto | null | undefined
): ShortFilmGenre | null {
  const name = nonBlank(genre?.name)
  if (!genre || !name) return null
  return {
    documentId: genre.documentId,
    slug: nonBlank(genre.slug) ?? genre.documentId,
    name,
  }
}

function compact<T>(items: Array<T | null>): T[] {
  return items.filter((item): item is T => item !== null)
}

function isDirectingCredit(credit: ShortFilmCreditDto): boolean {
  const role = credit.creditRole
  return (
    role?.department === "directing" ||
    DIRECTING_ROLE_SLUGS.has(role?.slug ?? "")
  )
}

function mapStreamingLink(
  link: ShortFilmStreamingLinkDto
): StreamingLink | null {
  const url = toSafeExternalUrl(link.url)
  if (!url) return null

  const platform: PlatformType = (PLATFORM_TYPES as readonly string[]).includes(
    link.platform ?? ""
  )
    ? (link.platform as PlatformType)
    : "other"
  const accessType: ShortFilmAccessType | undefined = (
    SHORT_FILM_ACCESS_TYPES as readonly string[]
  ).includes(link.accessType ?? "")
    ? (link.accessType as ShortFilmAccessType)
    : undefined

  return {
    platform,
    url,
    ...(link.label ? { label: link.label } : {}),
    ...(accessType ? { accessType } : {}),
  }
}

function mapDistinction(
  distinction: ShortFilmDistinctionDto
): ShortFilmAward | null {
  const festival = nonBlank(distinction.name)
  const name = festival ?? nonBlank(distinction.awardName)
  if (!name) return null

  // When the festival name leads, the prize (`awardName`) is the more specific
  // label; otherwise the award itself already led and the category follows.
  const category =
    (festival ? nonBlank(distinction.awardName) : undefined) ??
    nonBlank(distinction.category)

  return {
    name,
    ...(category ? { category } : {}),
    ...(positive(distinction.year) ? { year: distinction.year as number } : {}),
    won: WON_RESULTS.has(distinction.result ?? ""),
  }
}

/* -------------------------------------------------------------------------- */
/* Mappers                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Map one summary item. Summaries carry no trailer, crew or cast. The
 * `documentId` slug fallback exists for the detail mapper (the film was fetched
 * BY slug); list and related pages must use `mapShortFilmSummaries`, which
 * drops slug-less films instead of linking to a documentId.
 */
export function mapShortFilmSummary(dto: ShortFilmSummaryDto): ShortFilm {
  const slug = nonBlank(dto.slug) ?? dto.documentId

  return {
    id: dto.documentId,
    documentId: dto.documentId,
    // A blank title must never reach the page: fall back to the slug.
    title: nonBlank(dto.title) ?? slug,
    originalTitle: nonBlank(dto.originalTitle),
    slug,
    synopsis: nonBlank(dto.synopsis),
    duration: positive(dto.duration),
    releaseYear: positive(dto.releaseYear),
    poster: mapMedia(dto.poster),
    backdrop: mapMedia(dto.backdrop),
    genres: compact(asArray(dto.genres).map(mapGenre)),
    directors: compact(asArray(dto.directors).map(mapPerson)),
    country: stringArray(dto.country),
    language: stringArray(dto.language),
    isFeatured: Boolean(dto.featured),
    isAvailableOnline: Boolean(dto.availableOnline),
    locale: nonBlank(dto.locale),
  }
}

/** DocumentIds already warned about, so a slug-less film logs once per process. */
const reportedSlugless = new Set<string>()

/**
 * Map a list/related page of summaries, leaving out films the API returned
 * without a slug. The detail route resolves by slug only, so a film with no
 * slug has no page: listing it would produce a card, a share URL and a related
 * link that all end in "introuvable". Omitting is the least surprising option;
 * the skipped `documentId`s are logged so the data gap is visible server-side.
 */
export function mapShortFilmSummaries(
  dtos: readonly ShortFilmSummaryDto[]
): ShortFilm[] {
  const linkable: ShortFilmSummaryDto[] = []
  const unreported: string[] = []
  for (const dto of dtos) {
    if (nonBlank(dto.slug) !== undefined) {
      linkable.push(dto)
    } else if (!reportedSlugless.has(dto.documentId)) {
      reportedSlugless.add(dto.documentId)
      unreported.push(dto.documentId)
    }
  }
  if (unreported.length > 0) {
    console.warn(
      `[shorts] omitted ${unreported.length} short film(s) with no slug (no detail page can resolve them):`,
      unreported.join(", ")
    )
  }
  return linkable.map((dto) => mapShortFilmSummary(dto))
}

/**
 * Map a detail response. Directors come from the directing credits (DW-148),
 * the trailer from the `trailer` video; the page never asks Strapi for
 * `directors`, `facts`, `trailer` or `cast.person`.
 */
export function mapShortFilmDetail(dto: ShortFilmDetailDto): ShortFilm {
  const base = mapShortFilmSummary(dto)
  const credits = asArray(dto.credits)

  // Directors: directing credits by billing, de-duplicated by person.
  const seen = new Set<string>()
  const directors = compact(
    byBilling(
      credits
        .filter(isDirectingCredit)
        .map((credit) => ({ credit, billing: credit.billing }))
    ).map(({ credit }) => mapPerson(credit.person))
  ).filter((person) => {
    const key = person.documentId ?? person.slug
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const crew: ShortFilmCrewCredit[] = []
  for (const credit of credits) {
    const person = mapPerson(credit.person)
    if (!person) continue
    crew.push({
      person,
      roleSlug: nonBlank(credit.creditRole?.slug) ?? "",
      department: nonBlank(credit.creditRole?.department) ?? "other",
      ...(nonBlank(credit.customRole)
        ? { customRole: nonBlank(credit.customRole) }
        : {}),
      ...(typeof credit.billing === "number"
        ? { billing: credit.billing }
        : {}),
    })
  }

  const cast: ShortFilmCastMember[] = compact(
    byBilling(asArray(dto.cast)).map((entry) => {
      const person = mapPerson(entry.person)
      if (!person) return null
      const role = nonBlank(entry.character?.name)
      return {
        person,
        ...(role ? { role } : {}),
        ...(typeof entry.billing === "number"
          ? { billing: entry.billing }
          : {}),
      }
    })
  )

  const trailer = asArray(dto.videos)
    .filter((video) => video.videoType === "trailer")
    .map((video) => toSafeHttpsUrl(video.url))
    .find((url): url is string => Boolean(url))

  return {
    ...base,
    directors: directors.length > 0 ? directors : base.directors,
    crew,
    cast,
    trailer,
    ageRating: (AGE_RATINGS as readonly string[]).includes(dto.ageRating ?? "")
      ? (dto.ageRating as ShortFilm["ageRating"])
      : undefined,
    streamingLinks: compact(asArray(dto.streamingLinks).map(mapStreamingLink)),
    awards: compact(asArray(dto.distinctions).map(mapDistinction)),
  }
}

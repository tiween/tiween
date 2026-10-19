/**
 * Short-film launch-catalog import: data-file contract and payload builders
 * (plan 01-10, SDATA-04, FR57).
 *
 * Everything here is PURE (no Strapi, no I/O) so the data-file schema and the
 * exact payloads the importer writes can be unit-tested against the real schema
 * JSON, the way `creative-work-relations.ts` does for the DW-13 seed. The
 * importer (`../shorts/import-short-films.ts`) and the CLI (`../shorts.ts`) only
 * orchestrate these helpers against a booted Strapi.
 *
 * The data file (`scripts/seeds/data/short-films.json`, written in plan 01-11)
 * is curated and owner-approved; the schema still treats it as untrusted input:
 * strict objects, https-only URLs, slugs and vocabularies checked against the
 * repository's own reference data.
 */
import { z } from "zod"

import videoComponent from "../../../src/components/common/video.json"
import distinctionComponent from "../../../src/components/creative-works/distinction.json"
import {
  countryCodesSchema,
  isHttpsUrl,
  languageCodesSchema,
  RESERVED_SHORT_FILM_SLUGS,
  STREAMING_ACCESS_TYPES,
  STREAMING_PLATFORMS,
} from "../../../src/shared/short-film-rules"
import creditRolesData from "../data/credit-roles.json"
import genresData from "../data/genres.json"

/* -------------------------------------------------------------------------- */
/* Vocabularies                                                               */
/* -------------------------------------------------------------------------- */

const GENRE_SLUGS: ReadonlySet<string> = new Set(
  (genresData as Array<{ slug: string }>).map((genre) => genre.slug)
)

const CREDIT_ROLE_SLUGS: ReadonlySet<string> = new Set(
  (creditRolesData as Array<{ slug: string }>).map((role) => role.slug)
)

/** Credit-role slug that marks a directing credit (matched by slug, never by name). */
export const DIRECTOR_ROLE_SLUG = "director"

const DISTINCTION_RESULTS = distinctionComponent.attributes.result
  .enum as unknown as [string, ...string[]]

const VIDEO_TYPES = videoComponent.attributes.videoType.enum as unknown as [
  string,
  ...string[],
]

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** A bare lowercase hostname: no scheme, port, path or userinfo. */
const HOSTNAME_PATTERN =
  /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/

/* -------------------------------------------------------------------------- */
/* Schema                                                                     */
/* -------------------------------------------------------------------------- */

/** Messages are CODES, never prose (project rule: APIs and tools return codes). */
const httpsUrl = z.string().refine(isHttpsUrl, { message: "INVALID_HTTPS_URL" })

const slugSchema = z
  .string()
  .max(120, { message: "SLUG_TOO_LONG" })
  .regex(SLUG_PATTERN, { message: "INVALID_SLUG" })

const personRef = z
  .object({
    slug: slugSchema,
    name: z.string().trim().min(1, { message: "NAME_REQUIRED" }),
  })
  .strict()

const localizedTitle = z
  .object({
    fr: z.string().trim().min(1, { message: "TITLE_REQUIRED" }),
    ar: z.string().trim().min(1).optional(),
    en: z.string().trim().min(1).optional(),
  })
  .strict()

const localizedSynopsis = z
  .object({
    fr: z.string().trim().min(1).optional(),
    ar: z.string().trim().min(1).optional(),
    en: z.string().trim().min(1).optional(),
  })
  .strict()

const nonEmptyCodes = (schema: typeof countryCodesSchema, code: string) =>
  schema.refine((value) => Array.isArray(value) && value.length > 0, {
    message: code,
  })

export const shortFilmSeedEntrySchema = z
  .object({
    slug: slugSchema.refine(
      (slug) =>
        !(RESERVED_SHORT_FILM_SLUGS as readonly string[]).includes(slug),
      { message: "SLUG_RESERVED" }
    ),
    approved: z.boolean(),
    title: localizedTitle,
    synopsis: localizedSynopsis,
    translationProvenance: z
      .object({
        ar: z.enum(["ai-drafted", "owner", "original-title"]),
        en: z.enum(["ai-drafted", "owner"]),
      })
      .strict(),
    originalTitle: z.string().trim().min(1).optional(),
    duration: z.number().int().min(1).max(600).optional(),
    releaseYear: z.number().int().min(1890).max(2100).optional(),
    country: nonEmptyCodes(countryCodesSchema, "COUNTRY_REQUIRED"),
    language: nonEmptyCodes(languageCodesSchema, "LANGUAGE_REQUIRED"),
    genres: z
      .array(
        z
          .string()
          .refine((slug) => GENRE_SLUGS.has(slug), { message: "UNKNOWN_GENRE" })
      )
      .min(1, { message: "GENRE_REQUIRED" }),
    directors: z.array(personRef).min(1, { message: "DIRECTOR_REQUIRED" }),
    crew: z
      .array(
        personRef.extend({
          roleSlug: z.string().refine((slug) => CREDIT_ROLE_SLUGS.has(slug), {
            message: "UNKNOWN_CREDIT_ROLE",
          }),
        })
      )
      .optional(),
    cast: z.array(personRef).optional(),
    distinctions: z.array(
      z
        .object({
          name: z.string().trim().min(1),
          year: z.number().int().min(1890).max(2100),
          result: z.enum(DISTINCTION_RESULTS),
          edition: z.string().trim().min(1).optional(),
          section: z.string().trim().min(1).optional(),
          category: z.string().trim().min(1).optional(),
          awardName: z.string().trim().min(1).optional(),
          sourceUrl: httpsUrl,
        })
        .strict()
    ),
    streamingLinks: z.array(
      z
        .object({
          platform: z.enum(STREAMING_PLATFORMS),
          url: httpsUrl,
          accessType: z.enum(STREAMING_ACCESS_TYPES),
          label: z.string().trim().min(1).optional(),
        })
        .strict()
    ),
    videos: z.array(
      z
        .object({
          url: httpsUrl,
          videoType: z.enum(VIDEO_TYPES),
        })
        .strict()
    ),
    backdrop: z
      .object({
        sourceUrl: httpsUrl,
        alt: z.string().trim().min(1).optional(),
      })
      .strict()
      .optional(),
    poster: z
      .object({
        sourceUrl: httpsUrl,
        creditUrl: httpsUrl,
        alt: z.string().trim().min(1).optional(),
      })
      .strict()
      .optional(),
    featured: z.boolean().optional(),
    featuredRank: z.number().int().min(1).optional(),
    sources: z.array(httpsUrl).min(1, { message: "SOURCE_REQUIRED" }),
    eligibility: z
      .object({
        tunisianLink: z.enum(["production", "co-production", "director"]),
        under40Minutes: z.boolean(),
        availability: z.enum(["official-online", "festival-trailer-only"]),
      })
      .strict(),
  })
  .strict()
  .superRefine((entry, ctx) => {
    // D-19 watch source: a streaming link or a trailer video.
    const hasWatchSource =
      entry.streamingLinks.length > 0 ||
      entry.videos.some((video) => video.videoType === "trailer")
    if (!hasWatchSource) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["streamingLinks"],
        message: "WATCH_SOURCE_REQUIRED",
      })
    }

    // Kernel rule: Arabic text uses Western digits, never Arabic-Indic ones.
    const arabicFields: Array<[Array<string>, string | undefined]> = [
      [["title", "ar"], entry.title.ar],
      [["synopsis", "ar"], entry.synopsis.ar],
      [
        ["originalTitle"],
        entry.originalTitle && isArabicScript(entry.originalTitle)
          ? entry.originalTitle
          : undefined,
      ],
    ]
    for (const [path, text] of arabicFields) {
      if (text !== undefined && hasArabicIndicDigits(text)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path,
          message: "ARABIC_INDIC_DIGITS",
        })
      }
    }
  })

export type ShortFilmSeedEntry = z.infer<typeof shortFilmSeedEntrySchema>

export const shortFilmSeedFileSchema = z
  .object({
    retiredSlugs: z.array(slugSchema),
    mediaHosts: z.array(
      z.string().regex(HOSTNAME_PATTERN, { message: "INVALID_MEDIA_HOST" })
    ),
    films: z.array(shortFilmSeedEntrySchema),
  })
  .strict()
  .superRefine((file, ctx) => {
    const issue = (path: Array<string | number>, message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path, message })

    const slugs = new Set<string>()
    const personNames = new Map<string, string>()
    file.films.forEach((film, index) => {
      if (slugs.has(film.slug))
        issue(["films", index, "slug"], "DUPLICATE_SLUG")
      slugs.add(film.slug)

      // One person slug maps to one person row, so it must keep one name.
      const groups = [
        ["directors", film.directors],
        ["crew", film.crew ?? []],
        ["cast", film.cast ?? []],
      ] as const
      for (const [group, people] of groups) {
        people.forEach((person, personIndex) => {
          const known = personNames.get(person.slug)
          if (known !== undefined && known !== person.name) {
            issue(
              ["films", index, group, personIndex, "name"],
              "PERSON_NAME_CONFLICT"
            )
          }
          personNames.set(person.slug, known ?? person.name)
        })
      }
    })

    const approved = new Set(
      file.films.filter((film) => film.approved).map((film) => film.slug)
    )
    file.retiredSlugs.forEach((slug, index) => {
      if (approved.has(slug))
        issue(["retiredSlugs", index], "RETIRED_SLUG_IN_FILMS")
    })
  })

export type ShortFilmSeedFile = z.infer<typeof shortFilmSeedFileSchema>

/* -------------------------------------------------------------------------- */
/* Payload builders                                                           */
/* -------------------------------------------------------------------------- */

/** documentIds (and upload ids) the payload builders need, resolved by the importer. */
export interface ShortFilmWriteIds {
  /** genre slug -> documentId */
  genres: Record<string, string>
  /** person slug -> documentId */
  persons: Record<string, string>
  /** credit-role slug -> documentId */
  creditRoles: Record<string, string>
  /** `plugin::upload.file` row ids */
  posterId?: number
  backdropId?: number
}

function requireId(map: Record<string, string>, slug: string, label: string) {
  const id = map[slug]
  if (!id) throw new Error(`UNRESOLVED_${label}: ${slug}`)
  return id
}

/**
 * The default-locale (French) Document Service payload for one film.
 *
 * Every key exists on `creative-work/schema.json` and every component entry key
 * on its component JSON (a unit test asserts it), so Strapi can never drop a
 * field silently the way the pre-DW-13 seed did. `sourceUrl` of a distinction is
 * deliberately NOT written: it is curation evidence, not a schema field.
 *
 * `poster` and `backdrop` are only present when an id was resolved, so an image
 * an editor attached by hand is never cleared by a re-import.
 */
export function buildShortFilmData(
  entry: ShortFilmSeedEntry,
  ids: ShortFilmWriteIds
) {
  const directorRoleId = requireId(
    ids.creditRoles,
    DIRECTOR_ROLE_SLUG,
    "CREDIT_ROLE"
  )

  const credits = [
    ...entry.directors.map((director) => ({
      person: requireId(ids.persons, director.slug, "PERSON"),
      creditRole: directorRoleId,
    })),
    ...(entry.crew ?? []).map((member) => ({
      person: requireId(ids.persons, member.slug, "PERSON"),
      creditRole: requireId(ids.creditRoles, member.roleSlug, "CREDIT_ROLE"),
    })),
  ].map((credit, index) => ({ ...credit, billing: index + 1 }))

  return {
    title: entry.title.fr,
    originalTitle: entry.originalTitle ?? null,
    slug: entry.slug,
    type: "short-film" as const,
    synopsis: strippedOrNull(entry.synopsis.fr),
    duration: entry.duration ?? null,
    releaseYear: entry.releaseYear ?? null,
    country: [...entry.country],
    language: [...entry.language],
    genres: entry.genres.map((slug) => requireId(ids.genres, slug, "GENRE")),
    credits,
    cast: (entry.cast ?? []).map((member, index) => ({
      person: requireId(ids.persons, member.slug, "PERSON"),
      billing: index + 1,
    })),
    distinctions: entry.distinctions.map((distinction) => ({
      name: distinction.name,
      year: distinction.year,
      result: distinction.result,
      edition: distinction.edition ?? null,
      section: distinction.section ?? null,
      category: distinction.category ?? null,
      awardName: distinction.awardName ?? null,
    })),
    videos: entry.videos.map((video) => ({
      url: video.url,
      videoType: video.videoType,
    })),
    streamingLinks: entry.streamingLinks.map((link) => ({
      platform: link.platform,
      url: link.url,
      accessType: link.accessType,
      label: link.label ?? null,
    })),
    featured: entry.featured ?? false,
    featuredRank: entry.featuredRank ?? null,
    ...(ids.posterId !== undefined ? { poster: ids.posterId } : {}),
    ...(ids.backdropId !== undefined ? { backdrop: ids.backdropId } : {}),
  }
}

/* -------------------------------------------------------------------------- */
/* Text helpers                                                               */
/* -------------------------------------------------------------------------- */

/** Arabic-Indic (U+0660-0669) and extended Arabic-Indic (U+06F0-06F9) digits. */
export function hasArabicIndicDigits(text: string): boolean {
  return /[\u0660-\u0669\u06F0-\u06F9]/.test(text)
}

/** Arabic letters and no Latin letters: a title that is written in Arabic. */
function isArabicScript(text: string): boolean {
  return /[\u0600-\u06FF\u0750-\u077F]/.test(text) && !/[A-Za-z]/.test(text)
}

/**
 * Plain text from a synopsis (T-01-32): the AI-drafted and curated text is
 * stored as richtext and rendered by the client as untrusted markdown, so no
 * markup is ever stored. Block-level tags become paragraph breaks, `script` and
 * `style` content is dropped, an unclosed tag is removed to its end, and a bare
 * comparison sign (`5 < 6`) is kept.
 */
export function stripHtml(text: string): string {
  const stripped = text
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|blockquote)\s*>/gi, "\n\n")
    .replace(/<\/?[a-zA-Z!][^>]*>?/g, "")

  return stripped
    .split("\n")
    .map((line) => line.replace(/[ \t\u00A0]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function strippedOrNull(text: string | undefined): string | null {
  if (text === undefined) return null
  const stripped = stripHtml(text)
  return stripped === "" ? null : stripped
}

/* -------------------------------------------------------------------------- */
/* Localized rows (D-13)                                                      */
/* -------------------------------------------------------------------------- */

/**
 * The Arabic title: the Arabic-script `originalTitle` when there is one,
 * otherwise `title.ar`. Undefined when the film has neither.
 */
export function resolveArabicTitle(
  entry: ShortFilmSeedEntry
): string | undefined {
  if (entry.originalTitle && isArabicScript(entry.originalTitle)) {
    return entry.originalTitle
  }
  return entry.title.ar
}

/**
 * The localized fields of one translation row: exactly `title`, `synopsis` and
 * `poster` (the poster is localized, so its id is replicated into every row).
 * A missing translation stays `undefined`, which the Document Service leaves
 * untouched, so a re-import never blanks text an editor reviewed by hand.
 */
export function buildLocalizedData(
  entry: ShortFilmSeedEntry,
  locale: string,
  posterId: number | undefined
) {
  const title =
    locale === "ar"
      ? resolveArabicTitle(entry)
      : (entry.title as Record<string, string | undefined>)[locale]
  const synopsis = (entry.synopsis as Record<string, string | undefined>)[
    locale
  ]

  return {
    title,
    synopsis: synopsis === undefined ? undefined : stripHtml(synopsis),
    poster: posterId,
  }
}

/**
 * Every AR/EN field that is not owner-reviewed (D-13), so the report can hand
 * the owner a review list. `original-title` vouches for the Arabic TITLE only:
 * any other Arabic field that is present is still listed.
 */
export function collectAiDraftedFields(
  entry: ShortFilmSeedEntry
): Array<{ slug: string; locale: string; fields: string[] }> {
  const result: Array<{ slug: string; locale: string; fields: string[] }> = []

  for (const locale of ["ar", "en"] as const) {
    const provenance = entry.translationProvenance[locale]
    if (provenance === "owner") continue

    const fields: string[] = []
    const title = (entry.title as Record<string, string | undefined>)[locale]
    const titleIsDrafted =
      provenance === "ai-drafted" &&
      title !== undefined &&
      (locale !== "ar" || resolveArabicTitle(entry) === title)
    if (titleIsDrafted) fields.push("title")
    if (
      (entry.synopsis as Record<string, string | undefined>)[locale] !==
      undefined
    ) {
      fields.push("synopsis")
    }
    if (fields.length > 0) result.push({ slug: entry.slug, locale, fields })
  }

  return result
}

/* -------------------------------------------------------------------------- */
/* Country names                                                              */
/* -------------------------------------------------------------------------- */

/** Lowercase, accent-free French and English names for the mock's countries. */
const COUNTRY_NAMES: Record<string, string> = {
  tunisie: "TN",
  tunisia: "TN",
  france: "FR",
  canada: "CA",
  qatar: "QA",
  belgique: "BE",
  belgium: "BE",
  suisse: "CH",
  switzerland: "CH",
  maroc: "MA",
  morocco: "MA",
  algerie: "DZ",
  algeria: "DZ",
  liban: "LB",
  lebanon: "LB",
  egypte: "EG",
  egypt: "EG",
  italie: "IT",
  italy: "IT",
  allemagne: "DE",
  germany: "DE",
  espagne: "ES",
  spain: "ES",
  "etats-unis": "US",
  "etats unis": "US",
  "united states": "US",
  usa: "US",
  "royaume-uni": "GB",
  "royaume uni": "GB",
  "united kingdom": "GB",
  uk: "GB",
}

function foldName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * ISO 3166-1 alpha-2 codes for a free-text country list such as
 * "Tunisie / France" (the mock catalog's format). Throws
 * `UNKNOWN_COUNTRY_NAME: <name>` for a name outside the table rather than
 * guessing: a wrong country would reach the Phase 3 index and the filters.
 */
export function mapCountryNames(text: string): string[] {
  const codes: string[] = []
  for (const part of text.split(/\s*[/,;&+]\s*|\s+(?:et|and)\s+/i)) {
    const name = part.trim()
    if (name === "") continue
    const code = COUNTRY_NAMES[foldName(name)]
    if (!code) throw new Error(`UNKNOWN_COUNTRY_NAME: ${name}`)
    if (!codes.includes(code)) codes.push(code)
  }
  return codes
}

/* -------------------------------------------------------------------------- */
/* Change detection                                                           */
/* -------------------------------------------------------------------------- */

const MEDIA_KEYS: ReadonlySet<string> = new Set(["poster", "backdrop"])

type Plain = Record<string, unknown>

function isPlain(value: unknown): value is Plain {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Date)
  )
}

/** A leaf of the payload we are about to write, in comparable form. */
function leafOf(value: unknown): unknown {
  if (value === undefined || value === null) return null
  if (value instanceof Date) return value.toISOString()
  return value
}

/** Canonical form of the next payload: no nulls or undefined, sorted keys. */
function canonicalNext(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalNext)
  if (isPlain(value)) {
    const out: Plain = {}
    for (const key of Object.keys(value).sort()) {
      const next = canonicalNext(value[key])
      if (next !== null) out[key] = next
    }
    return out
  }
  return leafOf(value)
}

/**
 * The part of an existing (populated) row that `next` is about, in the same
 * canonical form: only the keys `next` names are looked at, a populated relation
 * becomes its documentId, a populated upload becomes its numeric id, and keys
 * Strapi adds (ids, timestamps, component defaults) are ignored.
 */
function canonicalExisting(
  existing: unknown,
  next: unknown,
  key?: string
): unknown {
  if (Array.isArray(next)) {
    const items = Array.isArray(existing) ? existing : []
    return items.map((item, index) => canonicalExisting(item, next[index], key))
  }
  if (isPlain(next)) {
    const source = isPlain(existing) ? existing : {}
    const out: Plain = {}
    for (const nextKey of Object.keys(next).sort()) {
      if (next[nextKey] === undefined) continue
      const value = canonicalExisting(source[nextKey], next[nextKey], nextKey)
      if (value !== null) out[nextKey] = value
    }
    return out
  }

  if (isPlain(existing)) {
    if (key !== undefined && MEDIA_KEYS.has(key)) return leafOf(existing.id)
    if (typeof existing.documentId === "string") return existing.documentId
    return existing
  }
  // A driver may hand an integer back as a numeric string.
  if (
    typeof existing === "string" &&
    typeof next === "number" &&
    Number(existing) === next
  ) {
    return next
  }
  return leafOf(existing)
}

/**
 * True when writing `next` over `existing` would change something (D-11
 * idempotency, research Pitfall 8: a republish rewrites `publishedAt`, so an
 * unchanged film must be skipped entirely).
 *
 * Comparison is next-driven: keys `next` leaves out (an image an editor attached
 * by hand) are never compared, null and missing are equal, key order is
 * irrelevant, and component order is significant.
 */
export function payloadDiffers(existing: unknown, next: unknown): boolean {
  return (
    JSON.stringify(canonicalExisting(existing, next)) !==
    JSON.stringify(canonicalNext(next))
  )
}

/* -------------------------------------------------------------------------- */
/* Issue reporting                                                            */
/* -------------------------------------------------------------------------- */

export interface SeedFileIssue {
  /** Slug of the offending film, when the issue sits under `films.<n>`. */
  slug?: string
  /** Dotted path, e.g. `films.1.country`. */
  path: string
  /** A CODE, never prose. */
  code: string
}

const CODE_PATTERN = /^[A-Z][A-Z0-9_]+$/

/** Every Zod issue as a (path, code) pair; library prose is mapped to a code. */
export function toSeedIssues(
  error: z.ZodError
): Array<{ path: string; code: string }> {
  return error.issues.flatMap(
    (issue): Array<{ path: string; code: string }> => {
      if (issue.code === z.ZodIssueCode.unrecognized_keys) {
        return issue.keys.map((key) => ({
          path: [...issue.path, key].join("."),
          code: "UNKNOWN_KEY",
        }))
      }
      const path = issue.path.join(".")
      if (CODE_PATTERN.test(issue.message))
        return [{ path, code: issue.message }]
      switch (issue.code) {
        case z.ZodIssueCode.invalid_type:
          return [
            {
              path,
              code:
                issue.received === "undefined" ? "REQUIRED" : "INVALID_TYPE",
            },
          ]
        case z.ZodIssueCode.invalid_enum_value:
          return [{ path, code: "INVALID_VALUE" }]
        case z.ZodIssueCode.too_small:
          return [{ path, code: "TOO_SMALL" }]
        case z.ZodIssueCode.too_big:
          return [{ path, code: "TOO_BIG" }]
        default:
          return [{ path, code: "INVALID" }]
      }
    }
  )
}

/**
 * Validate a raw data file and return coded issues, each naming the film it
 * belongs to. Empty for a valid file. Used by `--dry-run` (no Strapi boot).
 */
export function listSeedFileIssues(raw: unknown): SeedFileIssue[] {
  const result = shortFilmSeedFileSchema.safeParse(raw)
  if (result.success) return []

  const films = (raw as { films?: unknown } | null)?.films
  return result.error.issues.flatMap((issue) => {
    const [head, index] = issue.path
    const film =
      head === "films" && typeof index === "number" && Array.isArray(films)
        ? (films[index] as { slug?: unknown } | undefined)
        : undefined
    const slug = typeof film?.slug === "string" ? film.slug : undefined

    // Re-run the single-issue mapping so the code logic lives in one place.
    const mapped = toSeedIssues(new z.ZodError([issue]))
    return mapped.map((item) => (slug ? { slug, ...item } : item))
  })
}

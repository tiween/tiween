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
    synopsis: entry.synopsis.fr ?? null,
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

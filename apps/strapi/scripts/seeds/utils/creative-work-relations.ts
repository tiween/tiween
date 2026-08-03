/**
 * Creative-work seed payload helpers
 *
 * The seed source data (`data/creative-works.json`) describes a work with flat
 * `directors[]` / `cast[]` slug arrays and an optional `trailer` URL. None of
 * those keys exist on `plugin::creative-works.creative-work` — the schema
 * carries the `credits[]`, `cast[]` and `videos[]` components instead. Writing
 * them straight through is exactly the DW-13 bug: Strapi drops unknown keys
 * silently, so the seed reported success while writing nothing.
 *
 * These helpers are pure so both the mapping AND the assembled write payload
 * can be unit-tested against the real schema JSON without booting Strapi
 * (see `creative-work-relations.unit.test.ts`).
 */

import type { IdMap } from "./types"

/** Entry of the repeatable `creative-works.credit` component. */
export interface CreditEntry {
  person: string
  creditRole: string
  billing: number
}

/** Entry of the repeatable `creative-works.cast` component. */
export interface CastEntry {
  person: string
  billing: number
}

/** Entry of the repeatable `common.video` component. */
export interface VideoEntry {
  url: string
  videoType: "trailer"
}

/**
 * Shape of a `data/creative-works.json` entry.
 *
 * `directors`, `cast` and `trailer` are source-only fields: they are mapped
 * onto the real `credits[]` / `cast[]` / `videos[]` components before write.
 * `title_ar` / `synopsis_ar` are present in the source data but not consumed
 * by the seeder (no locale pass is run) — declared so the interface describes
 * the file honestly rather than looking exhaustive when it is not.
 */
export interface CreativeWorkSeed {
  title: string
  title_ar?: string
  originalTitle?: string
  slug: string
  type: string
  synopsis?: string
  synopsis_ar?: string
  duration?: number
  releaseYear?: number
  ageRating?: string
  rating?: number
  genres: string[]
  directors?: string[]
  cast?: string[]
  trailer?: string
}

/** The `data` object handed to `documents("…creative-work").create()`. */
export interface CreativeWorkData {
  title: string
  originalTitle?: string
  slug: string
  type: string
  synopsis?: string
  duration?: number
  releaseYear?: number
  ageRating?: string
  rating?: number
  genres: string[]
  credits: CreditEntry[]
  cast: CastEntry[]
  videos: VideoEntry[]
}

/** Lookup tables + vocabulary ids the mapping needs. */
export interface CreativeWorkContext {
  genres: IdMap
  persons: IdMap
  directorRoleId: string | undefined
}

/** Optional sink for degradation notices; defaults to a no-op. */
export type WarnFn = (message: string) => void

const noop: WarnFn = () => undefined

/**
 * Resolve slugs to document IDs, reporting the ones that do not resolve.
 *
 * Matches the existing `.filter(Boolean)` seed convention — a missing slug is
 * skipped rather than aborting the work — but it is no longer silent: silent
 * data loss is the exact failure mode DW-13 was about.
 */
function resolveSlugs(
  slugs: string[] | undefined | null,
  map: IdMap,
  label: string,
  warn: WarnFn
): string[] {
  const resolved: string[] = []

  for (const slug of slugs ?? []) {
    const documentId = map[slug]
    if (!documentId) {
      warn(`${label}: unresolved slug "${slug}" — entry skipped`)
      continue
    }
    resolved.push(documentId)
  }

  return resolved
}

/**
 * Build `credits[]` from the source `directors[]` slugs.
 *
 * The `credit` component requires both `person` and `creditRole`, so an unknown
 * director credit-role yields an empty array rather than invalid entries.
 * `billing` is the 1-based position among the RESOLVED entries, so an
 * unresolvable slug renumbers the entries after it.
 */
export function buildCredits(
  directorSlugs: string[] | undefined | null,
  persons: IdMap,
  directorRoleId: string | undefined,
  warn: WarnFn = noop
): CreditEntry[] {
  const slugs = directorSlugs ?? []
  if (slugs.length === 0) return []

  if (!directorRoleId) {
    warn(
      `credits: no "director" credit-role in the id map — ${slugs.length} director credit(s) skipped`
    )
    return []
  }

  return resolveSlugs(slugs, persons, "credits", warn).map((person, index) => ({
    person,
    creditRole: directorRoleId,
    billing: index + 1,
  }))
}

/**
 * Build `cast[]` from the source `cast[]` slugs.
 *
 * No `character` relation is emitted — the seed data has no character records.
 * `billing` follows the same resolved-position rule as `buildCredits`.
 */
export function buildCast(
  castSlugs: string[] | undefined | null,
  persons: IdMap,
  warn: WarnFn = noop
): CastEntry[] {
  return resolveSlugs(castSlugs, persons, "cast", warn).map(
    (person, index) => ({
      person,
      billing: index + 1,
    })
  )
}

/**
 * Build `videos[]` from the source `trailer` URL.
 *
 * A missing, null or blank trailer yields an empty array (the `video`
 * component requires `url`). The legacy `type` enum is deliberately not set —
 * `common/video.json` documents it as historic-rows-only, and `videoType` is
 * what every consumer reads.
 */
export function buildVideos(
  trailerUrl: string | undefined | null
): VideoEntry[] {
  const url = typeof trailerUrl === "string" ? trailerUrl.trim() : ""
  if (!url) return []

  return [{ url, videoType: "trailer" }]
}

/**
 * Assemble the full `create()` payload for one seeded creative work.
 *
 * Every key here must exist on `creative-work/schema.json`; the unit test
 * asserts that against the schema on disk so a re-introduced phantom field
 * fails the gate instead of being silently dropped by Strapi.
 */
export function buildCreativeWorkData(
  work: CreativeWorkSeed,
  context: CreativeWorkContext,
  warn: WarnFn = noop
): CreativeWorkData {
  return {
    title: work.title,
    originalTitle: work.originalTitle,
    slug: work.slug,
    type: work.type,
    synopsis: work.synopsis,
    duration: work.duration,
    releaseYear: work.releaseYear,
    ageRating: work.ageRating,
    rating: work.rating,
    genres: resolveSlugs(work.genres, context.genres, "genres", warn),
    credits: buildCredits(
      work.directors,
      context.persons,
      context.directorRoleId,
      warn
    ),
    cast: buildCast(work.cast, context.persons, warn),
    videos: buildVideos(work.trailer),
  }
}

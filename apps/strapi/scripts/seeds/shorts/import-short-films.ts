/**
 * Idempotent short-film launch import (plan 01-10, D-11, SDATA-04, FR57).
 *
 * `importShortFilms(strapi, file, deps)` is a pure function of a BOOTED Strapi:
 * the CLI (`../shorts.ts`) boots one and calls it, and Phase 6 can run the same
 * function against production from an operator machine. It never imports the
 * full seeder (`../index.ts` runs a whole seed on import) nor the clear script
 * (`../clear.ts` deletes every creative work).
 */
import type { Core } from "@strapi/strapi"
import type { ImageDownloader } from "../utils/media-upload"
import type {
  ShortFilmSeedEntry,
  ShortFilmWriteIds,
} from "../utils/short-film-import"

import { ensureI18nLocales } from "../../../src/bootstrap/i18n-locales"
import creditRolesData from "../data/credit-roles.json"
import genresData from "../data/genres.json"
import { findOrUploadImage } from "../utils/media-upload"
import {
  buildShortFilmData,
  DIRECTOR_ROLE_SLUG,
  shortFilmSeedFileSchema,
} from "../utils/short-film-import"

const CREATIVE_WORK_UID = "plugin::creative-works.creative-work"
const GENRE_UID = "plugin::creative-works.genre"
const PERSON_UID = "plugin::creative-works.person"
const CREDIT_ROLE_UID = "plugin::creative-works.credit-role"

export interface ImportReport {
  created: string[]
  updated: string[]
  unchanged: string[]
  skippedUnapproved: string[]
  retired: string[]
  orphans: string[]
  posterBypassed: string[]
  failed: Array<{ slug: string; error: string }>
  aiDraftedFields: Array<{ slug: string; locale: string; fields: string[] }>
  warnings: string[]
}

export interface ImportDeps {
  /** Fetches one image URL (the CLI binds the SSRF-safe downloader). */
  download: ImageDownloader
  /** Dev/staging only: accept the local upload provider. */
  allowLocalUploads?: boolean
  log?: (message: string) => void
}

/** Thrown for a data file that does not match `shortFilmSeedFileSchema`. */
export class InvalidSeedFileError extends Error {
  readonly issues: Array<{ path: string; code: string }>

  constructor(issues: Array<{ path: string; code: string }>) {
    super("INVALID_SEED_FILE")
    this.name = "InvalidSeedFileError"
    this.issues = issues
  }
}

type Documents = any

function documents(strapi: Core.Strapi, uid: string): Documents {
  return strapi.documents(uid as never) as unknown as Documents
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function emptyReport(): ImportReport {
  return {
    created: [],
    updated: [],
    unchanged: [],
    skippedUnapproved: [],
    retired: [],
    orphans: [],
    posterBypassed: [],
    failed: [],
    aiDraftedFields: [],
    warnings: [],
  }
}

/** A published genre by slug in the default locale (genres have no draft state). */
async function ensureGenre(
  strapi: Core.Strapi,
  slug: string,
  locale: string
): Promise<string> {
  const reference = (genresData as Array<{ name: string; slug: string }>).find(
    (genre) => genre.slug === slug
  )
  if (!reference) throw new Error(`UNKNOWN_GENRE: ${slug}`)

  const existing = await documents(strapi, GENRE_UID).findFirst({
    filters: { slug: { $eq: slug } },
    locale,
  })
  if (existing) return existing.documentId

  const created = await documents(strapi, GENRE_UID).create({
    data: { name: reference.name, slug },
    locale,
  })
  return created.documentId
}

/** A published draft-and-publish document found or created by slug. */
async function ensurePublished(
  strapi: Core.Strapi,
  uid: string,
  slug: string,
  data: Record<string, unknown>,
  locale: string
): Promise<string> {
  const docs = documents(strapi, uid)
  const filters = { slug: { $eq: slug } }

  const draft = await docs.findFirst({ filters, locale, status: "draft" })
  if (!draft) {
    const created = await docs.create({
      data: { ...data, slug },
      locale,
      status: "published",
    })
    return created.documentId
  }

  const published = await docs.findFirst({
    filters,
    locale,
    status: "published",
  })
  if (!published) await docs.publish({ documentId: draft.documentId, locale })
  return draft.documentId
}

async function ensureCreditRole(
  strapi: Core.Strapi,
  slug: string,
  locale: string
): Promise<string> {
  const reference = (
    creditRolesData as Array<{ name: string; slug: string; department: string }>
  ).find((role) => role.slug === slug)
  if (!reference) throw new Error(`UNKNOWN_CREDIT_ROLE: ${slug}`)

  return ensurePublished(
    strapi,
    CREDIT_ROLE_UID,
    slug,
    { name: reference.name, department: reference.department },
    locale
  )
}

async function resolveIds(
  strapi: Core.Strapi,
  entry: ShortFilmSeedEntry,
  locale: string
): Promise<Omit<ShortFilmWriteIds, "posterId" | "backdropId">> {
  const genres: Record<string, string> = {}
  for (const slug of entry.genres) {
    genres[slug] = await ensureGenre(strapi, slug, locale)
  }

  const creditRoles: Record<string, string> = {
    [DIRECTOR_ROLE_SLUG]: await ensureCreditRole(
      strapi,
      DIRECTOR_ROLE_SLUG,
      locale
    ),
  }
  for (const member of entry.crew ?? []) {
    creditRoles[member.roleSlug] ??= await ensureCreditRole(
      strapi,
      member.roleSlug,
      locale
    )
  }

  const persons: Record<string, string> = {}
  const people = [
    ...entry.directors,
    ...(entry.crew ?? []),
    ...(entry.cast ?? []),
  ]
  for (const person of people) {
    persons[person.slug] ??= await ensurePublished(
      strapi,
      PERSON_UID,
      person.slug,
      { name: person.name },
      locale
    )
  }

  return { genres, persons, creditRoles }
}

async function uploadEntryImages(
  strapi: Core.Strapi,
  entry: ShortFilmSeedEntry,
  deps: ImportDeps
): Promise<Pick<ShortFilmWriteIds, "posterId" | "backdropId">> {
  const ids: Pick<ShortFilmWriteIds, "posterId" | "backdropId"> = {}

  if (entry.backdrop) {
    ids.backdropId = await findOrUploadImage(
      strapi,
      {
        name: `${entry.slug}-backdrop`,
        url: entry.backdrop.sourceUrl,
        alt: entry.backdrop.alt ?? entry.title.fr,
      },
      deps
    )
  }
  if (entry.poster) {
    ids.posterId = await findOrUploadImage(
      strapi,
      {
        name: `${entry.slug}-poster`,
        url: entry.poster.sourceUrl,
        alt: entry.poster.alt ?? entry.title.fr,
      },
      deps
    )
  }
  return ids
}

async function importFilm(
  strapi: Core.Strapi,
  entry: ShortFilmSeedEntry,
  defaultLocale: string,
  deps: ImportDeps,
  report: ImportReport
): Promise<void> {
  const works = documents(strapi, CREATIVE_WORK_UID)

  const existing = await works.findFirst({
    filters: { slug: { $eq: entry.slug } },
    locale: defaultLocale,
    status: "draft",
  })
  if (existing) {
    throw new Error("UPDATE_NOT_IMPLEMENTED")
  }

  const ids = {
    ...(await resolveIds(strapi, entry, defaultLocale)),
    ...(await uploadEntryImages(strapi, entry, deps)),
  }

  const created = await works.create({
    data: buildShortFilmData(entry, ids),
    locale: defaultLocale,
  })
  await works.publish({ documentId: created.documentId, locale: "*" })
  report.created.push(entry.slug)
}

export async function importShortFilms(
  strapi: Core.Strapi,
  file: unknown,
  deps: ImportDeps
): Promise<ImportReport> {
  const parsed = shortFilmSeedFileSchema.safeParse(file)
  if (!parsed.success) {
    throw new InvalidSeedFileError(
      parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        code: issue.message,
      }))
    )
  }
  const seed = parsed.data
  const report = emptyReport()

  await ensureI18nLocales({ strapi })
  const defaultLocale = (await strapi
    .plugin("i18n")
    .service("locales")
    .getDefaultLocale()) as string

  for (const entry of seed.films) {
    if (!entry.approved) {
      report.skippedUnapproved.push(entry.slug)
      continue
    }
    try {
      await importFilm(strapi, entry, defaultLocale, deps, report)
    } catch (error) {
      report.failed.push({ slug: entry.slug, error: errorMessage(error) })
    }
  }

  return report
}

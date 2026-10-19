/**
 * Idempotent short-film launch import (plan 01-10, D-11, SDATA-04, FR57).
 *
 * `importShortFilms(strapi, file, deps)` is a pure function of a BOOTED Strapi:
 * the CLI (`../shorts.ts`) boots one and calls it, and Phase 6 can run the same
 * function against production from an operator machine. It never imports the
 * full seeder (`../index.ts` runs a whole seed on import) nor the clear script
 * (`../clear.ts` deletes every creative work).
 *
 * Contract:
 *  - upsert by slug through the Document Service, French as the source (D-13);
 *  - a film that did not change is skipped entirely: no write, no republish, so
 *    `publishedAt` (the default sort) is stable across runs (Pitfall 8, spike
 *    A2);
 *  - an update re-sends every component array, so credits, cast, distinctions,
 *    videos and streaming links an editor did not touch are never lost
 *    (Pitfall 9);
 *  - a film in `retiredSlugs` is deleted (short films only, every locale); a
 *    published short film in neither list is only REPORTED as an orphan (D-15);
 *  - one failing film never aborts the rest.
 */
import type { Core } from "@strapi/strapi"
import type { ImageDownloader } from "../utils/media-upload"
import type {
  ShortFilmSeedEntry,
  ShortFilmWriteIds,
} from "../utils/short-film-import"

import { ensureI18nLocales } from "../../../src/bootstrap/i18n-locales"
import { runWithShortFilmPublishBypass } from "../../../src/shared/short-film-publish-bypass"
import creditRolesData from "../data/credit-roles.json"
import genresData from "../data/genres.json"
import {
  assertUploadProvider,
  findOrUploadImage,
  youtubeThumbnailCandidates,
} from "../utils/media-upload"
import {
  buildLocalizedData,
  buildShortFilmData,
  collectAiDraftedFields,
  DIRECTOR_ROLE_SLUG,
  payloadDiffers,
  shortFilmSeedFileSchema,
  toSeedIssues,
} from "../utils/short-film-import"

const CREATIVE_WORK_UID = "plugin::creative-works.creative-work"
const GENRE_UID = "plugin::creative-works.genre"
const PERSON_UID = "plugin::creative-works.person"
const CREDIT_ROLE_UID = "plugin::creative-works.credit-role"

const SHORT_FILM_TYPE = "short-film"
const PAGE_SIZE = 100

/** Logged with every poster bypass by the publish guard (D-20). */
const BYPASS_REASON = "seed:shorts launch import"

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

function errorCode(error: unknown): string {
  if (error && typeof error === "object") {
    const { code, message } = error as { code?: unknown; message?: unknown }
    if (typeof code === "string") return code
    if (typeof message === "string") return message
  }
  return String(error)
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

/** Reference rows resolved once per run and shared by every film. */
interface RunContext {
  strapi: Core.Strapi
  deps: ImportDeps
  report: ImportReport
  defaultLocale: string
  /** Every configured locale except the default one. */
  otherLocales: string[]
  genres: Map<string, string>
  persons: Map<string, string>
  creditRoles: Map<string, string>
  /** `<uid>:<documentId>:<locale>` rows already ensured in this run. */
  localeRows: Set<string>
}

/* -------------------------------------------------------------------------- */
/* Reference data                                                             */
/* -------------------------------------------------------------------------- */

/** A genre by slug in the default locale (genres have no draft state). */
async function ensureGenre(ctx: RunContext, slug: string): Promise<string> {
  const known = ctx.genres.get(slug)
  if (known) return known

  const reference = (genresData as Array<{ name: string; slug: string }>).find(
    (genre) => genre.slug === slug
  )
  if (!reference) throw new Error(`UNKNOWN_GENRE: ${slug}`)

  const docs = documents(ctx.strapi, GENRE_UID)
  const existing = await docs.findFirst({
    filters: { slug: { $eq: slug } },
    locale: ctx.defaultLocale,
  })
  const documentId: string =
    existing?.documentId ??
    (
      await docs.create({
        data: { name: reference.name, slug },
        locale: ctx.defaultLocale,
      })
    ).documentId
  ctx.genres.set(slug, documentId)
  return documentId
}

/** A draft-and-publish document found or created by slug, and published. */
async function ensurePublished(
  ctx: RunContext,
  uid: string,
  slug: string,
  data: Record<string, unknown>
): Promise<string> {
  const docs = documents(ctx.strapi, uid)
  const filters = { slug: { $eq: slug } }
  const locale = ctx.defaultLocale

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
  ctx: RunContext,
  slug: string
): Promise<string> {
  const known = ctx.creditRoles.get(slug)
  if (known) return known

  const reference = (
    creditRolesData as Array<{ name: string; slug: string; department: string }>
  ).find((role) => role.slug === slug)
  if (!reference) throw new Error(`UNKNOWN_CREDIT_ROLE: ${slug}`)

  const documentId = await ensurePublished(ctx, CREDIT_ROLE_UID, slug, {
    name: reference.name,
    department: reference.department,
  })
  ctx.creditRoles.set(slug, documentId)
  return documentId
}

async function ensurePerson(
  ctx: RunContext,
  person: { slug: string; name: string }
): Promise<string> {
  const known = ctx.persons.get(person.slug)
  if (known) return known

  const documentId = await ensurePublished(ctx, PERSON_UID, person.slug, {
    name: person.name,
  })
  ctx.persons.set(person.slug, documentId)
  return documentId
}

async function resolveReferences(
  ctx: RunContext,
  entry: ShortFilmSeedEntry
): Promise<Omit<ShortFilmWriteIds, "posterId" | "backdropId">> {
  const genres: Record<string, string> = {}
  for (const slug of entry.genres) genres[slug] = await ensureGenre(ctx, slug)

  const creditRoles: Record<string, string> = {}
  const roleSlugs = new Set([
    DIRECTOR_ROLE_SLUG,
    ...(entry.crew ?? []).map((member) => member.roleSlug),
  ])
  for (const slug of roleSlugs) {
    creditRoles[slug] = await ensureCreditRole(ctx, slug)
  }

  const persons: Record<string, string> = {}
  for (const person of [
    ...entry.directors,
    ...(entry.crew ?? []),
    ...(entry.cast ?? []),
  ]) {
    persons[person.slug] = await ensurePerson(ctx, person)
  }

  return { genres, persons, creditRoles }
}

/**
 * A translation row of the work copies the non-localized `credits` and `cast`
 * components, whose targets are localized: each credited person and credit-role
 * must already have a row in that locale or the write fails with "locale not
 * found" (01-03 finding, re-proved by 01-09). Creates (and publishes) the
 * missing rows; roles start as copies of their default-language name, and the
 * role `slug` is passed because uid fields are not copied.
 */
async function ensureCreditTargetsInLocale(
  ctx: RunContext,
  refs: Pick<ShortFilmWriteIds, "persons" | "creditRoles">,
  locale: string
): Promise<void> {
  const targets: Array<{
    uid: string
    documentId: string
    data: Record<string, unknown>
  }> = [
    ...Object.values(refs.persons).map((documentId) => ({
      uid: PERSON_UID,
      documentId,
      data: {},
    })),
    ...Object.entries(refs.creditRoles).map(([slug, documentId]) => ({
      uid: CREDIT_ROLE_UID,
      documentId,
      data: {
        slug,
        name: (creditRolesData as Array<{ name: string; slug: string }>).find(
          (role) => role.slug === slug
        )?.name,
      },
    })),
  ]

  for (const { uid, documentId, data } of targets) {
    const key = `${uid}:${documentId}:${locale}`
    if (ctx.localeRows.has(key)) continue

    const docs = documents(ctx.strapi, uid)
    const draft = await docs.findOne({ documentId, locale, status: "draft" })
    if (!draft) await docs.update({ documentId, locale, data })
    const published = await docs.findOne({
      documentId,
      locale,
      status: "published",
    })
    if (!published) await docs.publish({ documentId, locale })
    ctx.localeRows.add(key)
  }
}

/* -------------------------------------------------------------------------- */
/* Media                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * The backdrop: the file's explicit `backdrop.sourceUrl`, else the thumbnail of
 * the first YouTube video or streaming link (D-12). A failed download is a
 * per-film warning, not a failure (the film is imported without that image and
 * the dev run records it for follow-up).
 */
async function resolveBackdrop(
  ctx: RunContext,
  entry: ShortFilmSeedEntry
): Promise<number | undefined> {
  const candidates = entry.backdrop
    ? [entry.backdrop.sourceUrl]
    : [
        ...new Set(
          [
            ...entry.videos.map((video) => video.url),
            ...entry.streamingLinks.map((link) => link.url),
          ].flatMap(youtubeThumbnailCandidates)
        ),
      ]

  if (candidates.length === 0) {
    ctx.report.warnings.push(`${entry.slug}: BACKDROP_UNAVAILABLE (NO_SOURCE)`)
    return undefined
  }

  let reason = "UNKNOWN"
  for (const url of candidates) {
    try {
      return await findOrUploadImage(
        ctx.strapi,
        {
          name: `${entry.slug}-backdrop`,
          url,
          alt: entry.backdrop?.alt ?? entry.title.fr,
        },
        ctx.deps
      )
    } catch (error) {
      reason = errorCode(error)
    }
  }
  ctx.report.warnings.push(`${entry.slug}: BACKDROP_UNAVAILABLE (${reason})`)
  return undefined
}

/** The poster, only when the entry names a source (D-12); failure is a warning. */
async function resolvePoster(
  ctx: RunContext,
  entry: ShortFilmSeedEntry
): Promise<number | undefined> {
  if (!entry.poster) return undefined
  try {
    return await findOrUploadImage(
      ctx.strapi,
      {
        name: `${entry.slug}-poster`,
        url: entry.poster.sourceUrl,
        alt: entry.poster.alt ?? entry.title.fr,
      },
      ctx.deps
    )
  } catch (error) {
    ctx.report.warnings.push(
      `${entry.slug}: POSTER_UNAVAILABLE (${errorCode(error)})`
    )
    return undefined
  }
}

/* -------------------------------------------------------------------------- */
/* One film                                                                   */
/* -------------------------------------------------------------------------- */

/** What the change check reads from the stored default-locale draft. */
const COMPARE_POPULATE = {
  genres: true,
  credits: { populate: { person: true, creditRole: true } },
  cast: { populate: { person: true } },
  distinctions: true,
  videos: true,
  streamingLinks: true,
  poster: true,
  backdrop: true,
}

type LocaleWrite = {
  locale: string
  data: ReturnType<typeof buildLocalizedData>
}

async function importFilm(
  ctx: RunContext,
  entry: ShortFilmSeedEntry
): Promise<void> {
  const { strapi, report, defaultLocale } = ctx
  const works = documents(strapi, CREATIVE_WORK_UID)

  const existing = await works.findFirst({
    filters: { slug: { $eq: entry.slug } },
    locale: defaultLocale,
    status: "draft",
    populate: COMPARE_POPULATE,
  })
  if (existing && existing.type !== SHORT_FILM_TYPE) {
    throw new Error("SLUG_BELONGS_TO_OTHER_WORK_TYPE")
  }

  const refs = await resolveReferences(ctx, entry)
  const backdropId = await resolveBackdrop(ctx, entry)
  const posterId = await resolvePoster(ctx, entry)

  const data = buildShortFilmData(entry, { ...refs, posterId, backdropId })

  // The poster is localized: replicate the default row's poster id into every
  // translation row, keeping a hand-attached poster when the file names none.
  const replicatedPoster: number | undefined = posterId ?? existing?.poster?.id
  const translations: LocaleWrite[] = ctx.otherLocales
    .map((locale) => ({
      locale,
      data: buildLocalizedData(entry, locale, replicatedPoster),
    }))
    .filter(({ data: localized }) => localized.title !== undefined)

  /* ---- decide what has to be written ---------------------------------- */
  let writeDefault = !existing
  let documentId: string = existing?.documentId
  const writeLocales: LocaleWrite[] = []
  let needsPublish = !existing

  if (existing) {
    writeDefault = payloadDiffers(existing, data)
    for (const translation of translations) {
      const row = await works.findOne({
        documentId,
        locale: translation.locale,
        status: "draft",
        populate: { poster: true },
      })
      if (!row || payloadDiffers(row, translation.data)) {
        writeLocales.push(translation)
      }
    }
    const published = await works.findOne({
      documentId,
      locale: defaultLocale,
      status: "published",
      fields: ["documentId"],
    })
    needsPublish = !published

    if (!writeDefault && writeLocales.length === 0 && !needsPublish) {
      report.unchanged.push(entry.slug)
      ctx.deps.log?.(`  ${entry.slug}: unchanged`)
      return
    }
  } else {
    writeLocales.push(...translations)
  }

  /* ---- write ----------------------------------------------------------- */
  if (!existing) {
    const created = await works.create({ data, locale: defaultLocale })
    documentId = created.documentId
  } else if (writeDefault) {
    // Full arrays: Strapi replaces repeatable components wholesale (Pitfall 9).
    await works.update({ documentId, locale: defaultLocale, data })
  }

  for (const { locale, data: localized } of writeLocales) {
    await ensureCreditTargetsInLocale(ctx, refs, locale)
    await works.update({ documentId, locale, data: localized })
  }

  /* ---- publish only what changed --------------------------------------- */
  // The default row is republished only when it changed (or was never
  // published): republishing re-stamps `publishedAt`, the default sort key, so a
  // translation-only edit must leave it alone (spike A2, Pitfall 8).
  const toPublish = [
    ...(writeDefault || needsPublish ? [defaultLocale] : []),
    ...writeLocales.map(({ locale }) => locale),
  ]
  const publishAll = async () => {
    for (const locale of toPublish) {
      await works.publish({ documentId, locale })
    }
  }

  const hasPoster = (posterId ?? existing?.poster?.id) !== undefined
  if (hasPoster) {
    await publishAll()
  } else {
    // D-20: a posterless film is published under an explicit, logged bypass
    // that can skip the poster rule and nothing else.
    await runWithShortFilmPublishBypass(
      { reason: BYPASS_REASON, skip: ["POSTER_REQUIRED"] },
      publishAll
    )
    report.posterBypassed.push(entry.slug)
  }

  if (existing) report.updated.push(entry.slug)
  else report.created.push(entry.slug)
  ctx.deps.log?.(`  ${entry.slug}: ${existing ? "updated" : "created"}`)
}

/* -------------------------------------------------------------------------- */
/* Retire and orphans                                                         */
/* -------------------------------------------------------------------------- */

/** Delete a retired short film in every locale (D-15). Never another work type. */
async function retireFilm(ctx: RunContext, slug: string): Promise<void> {
  const works = documents(ctx.strapi, CREATIVE_WORK_UID)
  const row = await works.findFirst({
    filters: { slug: { $eq: slug } },
    locale: ctx.defaultLocale,
    status: "draft",
    fields: ["documentId", "type"],
  })
  if (!row) return // already gone: retiring twice is a no-op

  if (row.type !== SHORT_FILM_TYPE) {
    ctx.report.warnings.push(`${slug}: RETIRED_SLUG_NOT_SHORT_FILM`)
    return
  }
  await works.delete({ documentId: row.documentId, locale: "*" })
  ctx.report.retired.push(slug)
}

async function listPublishedShortSlugs(ctx: RunContext): Promise<string[]> {
  const works = documents(ctx.strapi, CREATIVE_WORK_UID)
  const slugs: string[] = []
  for (let start = 0; ; start += PAGE_SIZE) {
    const rows: Array<{ slug?: string | null }> = await works.findMany({
      filters: { type: SHORT_FILM_TYPE },
      locale: ctx.defaultLocale,
      status: "published",
      fields: ["slug"],
      sort: ["id:asc"],
      start,
      limit: PAGE_SIZE,
    })
    for (const row of rows) if (row.slug) slugs.push(row.slug)
    if (rows.length < PAGE_SIZE) break
  }
  return slugs
}

/* -------------------------------------------------------------------------- */
/* Entry point                                                                */
/* -------------------------------------------------------------------------- */

export async function importShortFilms(
  strapi: Core.Strapi,
  file: unknown,
  deps: ImportDeps
): Promise<ImportReport> {
  const parsed = shortFilmSeedFileSchema.safeParse(file)
  if (!parsed.success) {
    throw new InvalidSeedFileError(toSeedIssues(parsed.error))
  }
  const seed = parsed.data

  // Fail closed before anything is written: a local-disk upload in a real
  // environment would publish films whose images live on a container disk.
  assertUploadProvider(strapi, { allowLocal: deps.allowLocalUploads ?? false })

  // Research A8: a standalone boot may skip the app bootstrap.
  await ensureI18nLocales({ strapi })
  const localesService = strapi.plugin("i18n").service("locales")
  const defaultLocale = (await localesService.getDefaultLocale()) as string
  const otherLocales = (
    (await localesService.find()) as Array<{ code: string }>
  )
    .map((locale) => locale.code)
    .filter((code) => code !== defaultLocale)

  const report = emptyReport()
  const ctx: RunContext = {
    strapi,
    deps,
    report,
    defaultLocale,
    otherLocales,
    genres: new Map(),
    persons: new Map(),
    creditRoles: new Map(),
    localeRows: new Set(),
  }

  for (const slug of seed.retiredSlugs) {
    try {
      await retireFilm(ctx, slug)
    } catch (error) {
      report.failed.push({ slug, error: errorCode(error) })
    }
  }

  for (const entry of seed.films) {
    if (!entry.approved) {
      report.skippedUnapproved.push(entry.slug)
      continue
    }
    report.aiDraftedFields.push(...collectAiDraftedFields(entry))

    try {
      await importFilm(ctx, entry)
    } catch (error) {
      report.failed.push({ slug: entry.slug, error: errorCode(error) })
      deps.log?.(`  ${entry.slug}: FAILED ${errorCode(error)}`)
    }
  }

  const listed = new Set([
    ...seed.films.map((film) => film.slug),
    ...seed.retiredSlugs,
  ])
  report.orphans = (await listPublishedShortSlugs(ctx))
    .filter((slug) => !listed.has(slug))
    .sort()

  return report
}

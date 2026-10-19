/**
 * seed:shorts, the short-film launch-catalog import (plan 01-10, D-11,
 * SDATA-04, FR57).
 *
 * Usage (from the repository root):
 *   yarn workspace @tiween/admin build:test-dist      # FIRST: plugins load from dist/
 *   yarn workspace @tiween/admin seed:shorts --dry-run
 *   yarn workspace @tiween/admin seed:shorts --allow-local-uploads --verify
 *
 * Flags:
 *   --file <path>           data file (default scripts/seeds/data/short-films.json,
 *                           resolved from the current directory)
 *   --dry-run               validate the data file only: no Strapi boot, no writes
 *   --allow-local-uploads   dev/staging only: accept the local upload provider
 *                           (refused when NODE_ENV is production)
 *   --verify                read every imported film back through the public
 *                           creative-works facade and print its publishedAt
 *   --help                  print this text
 *
 * Rules of the road:
 *  - Plugins always load from the compiled dist/, so run `build:test-dist`
 *    (above) after any source change, before this script.
 *  - Never combine with seed:fresh or seed:clear: those delete every creative
 *    work. This command only upserts the films the file lists.
 *  - Without ImageKit credentials Strapi falls back to local-disk uploads; this
 *    command refuses to run then unless --allow-local-uploads is passed.
 *  - The production run is a Phase 6 operator step, not part of Phase 1.
 *
 * Exit code: 0 on success; 1 for an invalid file, a refused provider, any failed
 * film or a film the verification could not read back; 2 for a usage error.
 */
import fs from "node:fs"
import path from "node:path"

import { createStrapi } from "@strapi/strapi"

import type { ImportReport } from "./shorts/import-short-films"

import { importShortFilms } from "./shorts/import-short-films"
import {
  assertUploadProvider,
  DEFAULT_MEDIA_HOSTS,
  downloadImage,
} from "./utils/media-upload"
import { listSeedFileIssues } from "./utils/short-film-import"

const DEFAULT_FILE = "scripts/seeds/data/short-films.json"
const CREATIVE_WORK_UID = "plugin::creative-works.creative-work"

const HELP = `seed:shorts - idempotent short-film launch import

Usage:
  yarn workspace @tiween/admin build:test-dist     (first: plugins load from dist/)
  yarn workspace @tiween/admin seed:shorts [flags]

Flags:
  --file <path>           data file (default ${DEFAULT_FILE})
  --dry-run               validate the data file only: no Strapi boot, no writes
  --allow-local-uploads   dev/staging only: accept the local upload provider
                          (refused when NODE_ENV is production)
  --verify                read every imported film back through the public facade
  --help                  show this text

Notes:
  - Run "yarn workspace @tiween/admin build:test-dist" after any source change.
  - Never combine with seed:fresh or seed:clear (they delete every creative work).
  - Without ImageKit credentials the import refuses to run unless
    --allow-local-uploads is given. The production run is a Phase 6 operator step.
`

interface Flags {
  file: string
  dryRun: boolean
  allowLocalUploads: boolean
  verify: boolean
  help: boolean
}

function parseArgs(argv: string[]): Flags | { error: string } {
  const flags: Flags = {
    file: DEFAULT_FILE,
    dryRun: false,
    allowLocalUploads: false,
    verify: false,
    help: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === "--dry-run") flags.dryRun = true
    else if (arg === "--allow-local-uploads") flags.allowLocalUploads = true
    else if (arg === "--verify") flags.verify = true
    else if (arg === "--help" || arg === "-h") flags.help = true
    else if (arg === "--file") {
      const value = argv[index + 1]
      if (!value || value.startsWith("--")) {
        return { error: "--file needs a path" }
      }
      flags.file = value
      index += 1
    } else if (arg.startsWith("--file=")) {
      flags.file = arg.slice("--file=".length)
    } else {
      return { error: `unknown argument ${arg}` }
    }
  }
  return flags
}

function readDataFile(file: string): { raw: unknown } | { error: string } {
  const resolved = path.resolve(process.cwd(), file)
  let text: string
  try {
    text = fs.readFileSync(resolved, "utf8")
  } catch {
    return { error: `FILE_UNREADABLE ${resolved}` }
  }
  try {
    return { raw: JSON.parse(text) }
  } catch {
    return { error: `INVALID_JSON ${resolved}` }
  }
}

/** Print coded issues, one per line, each naming its film. */
function printIssues(raw: unknown): boolean {
  const issues = listSeedFileIssues(raw)
  for (const issue of issues) {
    console.error(
      `ISSUE ${issue.slug ?? "-"} ${issue.path || "(file)"} ${issue.code}`
    )
  }
  return issues.length > 0
}

function summarize(report: ImportReport): string {
  return [
    `created ${report.created.length}`,
    `updated ${report.updated.length}`,
    `unchanged ${report.unchanged.length}`,
    `retired ${report.retired.length}`,
    `skipped-unapproved ${report.skippedUnapproved.length}`,
    `orphans ${report.orphans.length}`,
    `poster-bypassed ${report.posterBypassed.length}`,
    `ai-drafted ${report.aiDraftedFields.length}`,
    `warnings ${report.warnings.length}`,
    `failed ${report.failed.length}`,
  ].join(", ")
}

/** Read each imported film back the way the public site will. Returns the misses. */
async function verifyReadBack(
  strapi: any,
  slugs: string[],
  defaultLocale: string
): Promise<string[]> {
  const api = strapi.plugin("creative-works").service("public-api")
  const missing: string[] = []

  console.log("\nVerification (public facade):")
  for (const slug of slugs) {
    const fr = await api.findShortFilm(slug)
    const ar = await api.findShortFilm(slug, "ar")
    const stamp = await strapi.db.query(CREATIVE_WORK_UID).findOne({
      where: {
        slug,
        locale: defaultLocale,
        publishedAt: { $notNull: true },
      },
      select: ["publishedAt"],
    })
    if (!fr) {
      missing.push(slug)
      console.log(`  MISSING ${slug}`)
      continue
    }
    const arStatus = ar?.locale === "ar" ? "translated" : "fallback"
    console.log(
      `  OK ${slug}  fr=${fr.locale} ar=${arStatus} poster=${fr.poster ? "yes" : "no"} ` +
        `backdrop=${fr.backdrop ? "yes" : "no"} publishedAt=${stamp?.publishedAt ?? "?"}`
    )
  }

  const list = await api.findShortFilms({
    page: 1,
    pageSize: 48,
    sort: "publishedAt:desc",
  })
  console.log(
    `  list total: ${list.meta.pagination.total} published short films`
  )
  return missing
}

async function main(): Promise<number> {
  const flags = parseArgs(process.argv.slice(2))
  if ("error" in flags) {
    console.error(`seed:shorts: ${flags.error}\n\n${HELP}`)
    return 2
  }
  if (flags.help) {
    console.log(HELP)
    return 0
  }

  const loaded = readDataFile(flags.file)
  if ("error" in loaded) {
    console.error(`seed:shorts: ${loaded.error}`)
    return 1
  }

  // Validation never needs Strapi: do it for a dry run and before any boot.
  if (printIssues(loaded.raw)) return 1
  const file = loaded.raw as {
    mediaHosts: string[]
    films: Array<{ slug: string; approved: boolean }>
  }
  const approved = file.films.filter((film) => film.approved)

  if (flags.dryRun) {
    console.log(
      `OK ${file.films.length} films parsed (${approved.length} approved, ` +
        `${file.films.length - approved.length} unapproved)`
    )
    return 0
  }

  if (flags.allowLocalUploads && process.env.NODE_ENV === "production") {
    console.error(
      "seed:shorts: ALLOW_LOCAL_UPLOADS_REFUSED_IN_PRODUCTION (NODE_ENV is production)"
    )
    return 1
  }

  let strapi: any
  try {
    console.log("Initializing Strapi...")
    strapi = await createStrapi({
      appDir: process.cwd(),
      distDir: process.cwd() + "/dist",
    }).load()

    assertUploadProvider(strapi, { allowLocal: flags.allowLocalUploads })

    const allowedHosts = [...DEFAULT_MEDIA_HOSTS, ...file.mediaHosts]
    const report = await importShortFilms(strapi, loaded.raw, {
      download: (url) => downloadImage(url, { allowedHosts }),
      allowLocalUploads: flags.allowLocalUploads,
      log: (message) => console.log(message),
    })

    console.log(JSON.stringify(report, null, 2))
    console.log(`\nSummary: ${summarize(report)}`)

    let exitCode = report.failed.length > 0 ? 1 : 0

    if (flags.verify) {
      const failedSlugs = new Set(report.failed.map((item) => item.slug))
      const defaultLocale = (await strapi
        .plugin("i18n")
        .service("locales")
        .getDefaultLocale()) as string
      const missing = await verifyReadBack(
        strapi,
        approved
          .map((film) => film.slug)
          .filter((slug) => !failedSlugs.has(slug)),
        defaultLocale
      )
      if (missing.length > 0) exitCode = 1
    }
    return exitCode
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`seed:shorts: ${message}`)
    return 1
  } finally {
    if (strapi) await strapi.destroy()
  }
}

main()
  .then((code) => {
    process.exitCode = code
    // Safety net: never hang on a handle Strapi left open (unref'd, so it does
    // not itself keep the process alive).
    setTimeout(() => process.exit(code), 1000).unref()
  })
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })

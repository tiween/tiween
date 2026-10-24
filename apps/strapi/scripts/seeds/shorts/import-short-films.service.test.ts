/**
 * Boot suite for the short-film launch import (plan 01-10, D-11 / D-13 / D-15 /
 * D-20, research Pitfalls 7-9).
 *
 * Runs `importShortFilms` against a real Strapi on SQLite with an injected
 * downloader, so no network is touched. Uploads go through the real upload
 * service on the local provider (files land in gitignored `public/uploads`) and
 * are removed again in `afterAll`. The suite refuses to run on any other
 * provider: it must never push test images to ImageKit.
 *
 * The describe blocks below are ONE ordered story on one database: run 1 imports
 * the sample, run 2 repeats it (idempotency), run 3 and 4 change one film
 * (lossless update), run 5 to 7 cover per-film failures and warnings (7: an
 * image the upload provider refuses fails the film). They
 * share state on purpose, so do not reorder them.
 *
 * Named `*.service.test.ts`: opt-in integration project (`yarn test:integration`).
 */
import type { Core } from "@strapi/strapi"
import type { ImageDownloader } from "../utils/media-upload"
import type { ImportReport } from "./import-short-films"

import { publishableShortParts } from "../../../tests/fixtures/publishable-short"
import { cleanupStrapi, setupStrapi } from "../../../tests/helpers/strapi"
import sampleFile from "./__fixtures__/short-films.sample.json"
import { importShortFilms } from "./import-short-films"

jest.setTimeout(240000)

const CW = "plugin::creative-works.creative-work"
const PERSON = "plugin::creative-works.person"
const GENRE = "plugin::creative-works.genre"
const ROLE = "plugin::creative-works.credit-role"
const UPLOAD_FILE = "plugin::upload.file"

/** A valid 1x1 PNG. */
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64"
)

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Every URL the importer asked for, in order. */
let downloaded: string[] = []

/**
 * Serves a PNG for every URL except the maxres thumbnail of sample-two, which
 * 404s the way YouTube does for videos without one: the importer must fall back
 * to hqdefault.
 */
const recordingDownload: ImageDownloader = async (url) => {
  downloaded.push(url)
  if (url.includes("bbbbbbbbbbb/maxresdefault")) {
    throw Object.assign(new Error("HTTP_ERROR"), { code: "HTTP_ERROR" })
  }
  return { buffer: PNG_1X1, mime: "image/png", ext: ".png" }
}

let strapi: Core.Strapi

const publicApi = () => strapi.plugin("creative-works").service("public-api")
const deps = () => ({ download: recordingDownload, allowLocalUploads: true })

async function counts() {
  const count = (uid: string) =>
    (strapi.db.query(uid as never) as any).count({}) as Promise<number>
  return {
    works: await count(CW),
    persons: await count(PERSON),
    genres: await count(GENRE),
    creditRoles: await count(ROLE),
    uploadFiles: await count(UPLOAD_FILE),
  }
}

const UPLOAD_FOLDER = "plugin::upload.folder"

/** Root Media Library folders named like the importer's top folder. */
async function shortFilmsRootFolders() {
  return (await (strapi.db.query(UPLOAD_FOLDER as never) as any).findMany({
    where: { name: "Short films", parent: null },
  })) as Array<{ id: number }>
}

const folderCount = () =>
  (strapi.db.query(UPLOAD_FOLDER as never) as any).count({}) as Promise<number>

/** The files the importer uploaded, each with its folder and that folder's parent. */
async function importedFiles() {
  const rows = (await (strapi.db.query(UPLOAD_FILE as never) as any).findMany({
    where: { name: { $startsWith: "sample-" } },
    populate: { folder: { populate: { parent: true } } },
  })) as Array<{
    name: string
    folderPath: string
    folder: {
      name: string
      path: string
      parent: { name: string; parent?: unknown } | null
    } | null
  }>
  return rows.filter((row) =>
    /^sample-(one|two)-(poster|backdrop)\./.test(row.name)
  )
}

/** id and publishedAt of every default-locale published row of the given slugs. */
async function publishedStamps(slugs: string[]) {
  const rows = (await (strapi.db.query(CW as never) as any).findMany({
    where: {
      slug: { $in: slugs },
      locale: "fr",
      publishedAt: { $notNull: true },
    },
    select: ["id", "slug", "publishedAt"],
  })) as Array<{ id: number; slug: string; publishedAt: string }>
  return Object.fromEntries(
    rows.map((row) => [row.slug, { id: row.id, publishedAt: row.publishedAt }])
  )
}

async function createPublishedShort(slug: string, locales: string[] = []) {
  const parts = await publishableShortParts(strapi, slug, { locales })
  const work: any = await (strapi.documents(CW as never) as any).create({
    data: {
      title: `Title ${slug}`,
      slug,
      type: "short-film",
      poster: parts.poster,
      credits: parts.credits,
      streamingLinks: parts.streamingLinks,
    },
    locale: "fr",
  })
  for (const locale of locales) {
    await (strapi.documents(CW as never) as any).update({
      documentId: work.documentId,
      locale,
      data: { title: `Titre ${locale} ${slug}` },
    })
  }
  await (strapi.documents(CW as never) as any).publish({
    documentId: work.documentId,
    locale: "*",
  })
  return work.documentId as string
}

/** The cumulative data file: runs 1 to 4 each build on the previous one. */
const current: any = { ...clone(sampleFile), retiredSlugs: ["retire-me"] }

const reports: Record<string, ImportReport> = {}
let retireMeDocumentId: string
let afterRun1: Awaited<ReturnType<typeof counts>>
let foldersAfterRun1: number
let stampsAfterRun1: Awaited<ReturnType<typeof publishedStamps>>
let stampsAfterRun2: Awaited<ReturnType<typeof publishedStamps>>
let downloadsRun1: string[]

beforeAll(async () => {
  process.env.DATABASE_FILENAME = ".tmp/short-film-import.db"
  strapi = await setupStrapi()

  const provider = (strapi.config.get("plugin::upload") as any)?.provider
  if (provider !== "local") {
    throw new Error(
      `This suite uploads test images and must run on the local upload provider (got ${provider})`
    )
  }
})

afterAll(async () => {
  // Remove what the uploads wrote to public/uploads (the local provider).
  const files = (await (strapi.db.query(UPLOAD_FILE as never) as any).findMany({
    where: { name: { $startsWith: "sample-" } },
  })) as Array<{ id: number }>
  for (const file of files) {
    await strapi.plugin("upload").service("upload").remove(file)
  }
  // The importer created the Media Library folders; remove them too.
  const roots = await shortFilmsRootFolders()
  if (roots.length > 0) {
    await strapi
      .plugin("upload")
      .service("folder")
      .deleteByIds(roots.map((root) => root.id))
  }
  await cleanupStrapi()
})

describe("importShortFilms: guards", () => {
  it("refuses the local upload provider unless it is explicitly allowed", async () => {
    const before = await counts()

    await expect(
      importShortFilms(strapi, current, { download: recordingDownload })
    ).rejects.toThrow("UPLOAD_PROVIDER_NOT_IMAGEKIT")

    expect(await counts()).toEqual(before)
    expect(downloaded).toEqual([])
  })

  it("rejects an invalid data file with coded issues and writes nothing", async () => {
    const bad: any = clone(current)
    bad.films[0].country = ["tn"]
    const before = await counts()

    await expect(importShortFilms(strapi, bad, deps())).rejects.toMatchObject({
      name: "InvalidSeedFileError",
      issues: expect.arrayContaining([
        { path: "films.0.country", code: "INVALID_COUNTRY_CODES" },
      ]),
    })
    expect(await counts()).toEqual(before)
  })
})

describe("importShortFilms: run 1 (first import)", () => {
  beforeAll(async () => {
    retireMeDocumentId = await createPublishedShort("retire-me", ["ar"])
    await createPublishedShort("orphan-film")

    downloaded = []
    reports.run1 = await importShortFilms(strapi, current, deps())
    downloadsRun1 = [...downloaded]
    afterRun1 = await counts()
    foldersAfterRun1 = await folderCount()
    stampsAfterRun1 = await publishedStamps(["sample-one", "sample-two"])
  })

  it("creates every approved film and reports the rest", () => {
    const report = reports.run1
    expect(report.failed).toEqual([])
    expect(report.created).toEqual(["sample-one", "sample-two"])
    expect(report.updated).toEqual([])
    expect(report.unchanged).toEqual([])
    expect(report.skippedUnapproved).toEqual(["sample-unapproved"])
    expect(report.warnings).toEqual([])
  })

  it("never imports an unapproved film", async () => {
    expect(await publicApi().findShortFilm("sample-unapproved")).toBeNull()
    const draft = await (strapi.documents(CW as never) as any).findFirst({
      filters: { slug: "sample-unapproved" },
      locale: "fr",
      status: "draft",
    })
    expect(draft).toBeNull()
  })

  it("publishes the film with its media, credits and links, readable through the facade", async () => {
    const film = await publicApi().findShortFilm("sample-one")
    expect(film).not.toBeNull()
    expect(film.title).toBe("Premier exemple")
    expect(film.locale).toBe("fr")
    expect(film.backdrop?.url).toBeTruthy()
    expect(film.poster?.url).toBeTruthy()
    expect(film.directors.map((d: { slug: string }) => d.slug)).toEqual([
      "sample-director-one",
    ])
    expect(film.credits.map((c: any) => c.creditRole.slug)).toEqual([
      "director",
      "screenwriter",
    ])
    expect(film.cast).toHaveLength(1)
    expect(film.distinctions).toHaveLength(1)
    expect(film.distinctions[0]).not.toHaveProperty("sourceUrl")
    expect(film.videos).toHaveLength(1)
    expect(film.streamingLinks).toHaveLength(1)
    expect(film.country).toEqual(["TN", "FR"])
    expect(film.language).toEqual(["aeb", "fr"])
    expect(film.genres.map((g: { slug: string }) => g.slug)).toEqual(["drame"])
    expect(film.availableOnline).toBe(true)
    expect(film.featured).toBe(true)
    expect(film.featuredRank).toBe(1)

    const featured = await publicApi().findFeaturedShortFilms()
    expect(featured.map((f: { slug: string }) => f.slug)).toContain(
      "sample-one"
    )
  })

  it("serves the Arabic originalTitle as the ar title and replicates the poster id", async () => {
    const ar = await publicApi().findShortFilm("sample-one", "ar")
    expect(ar.title).toBe("مثال أول")
    expect(ar.locale).toBe("ar")

    const en = await publicApi().findShortFilm("sample-one", "en")
    expect(en.title).toBe("First sample")
    expect(en.synopsis).toBe("A sample short film used to test the import.")
    expect(en.locale).toBe("en")

    const read = (locale: string) =>
      (strapi.documents(CW as never) as any).findOne({
        documentId: ar.documentId,
        locale,
        status: "published",
        populate: { poster: true },
      })
    const [fr, arRow] = await Promise.all([read("fr"), read("ar")])
    expect(fr.poster.id).toEqual(expect.any(Number))
    expect(arRow.poster.id).toBe(fr.poster.id)
  })

  it("publishes a posterless film under the D-20 bypass and lists it", async () => {
    expect(reports.run1.posterBypassed).toEqual(["sample-two"])

    const film = await publicApi().findShortFilm("sample-two")
    expect(film).not.toBeNull()
    expect(film.poster).toBeNull()
    // The synopsis is stripped of HTML before it is stored (T-01-32).
    expect(film.synopsis).toBe("Un exemple sans affiche.")
    expect(film.genres.map((g: { slug: string }) => g.slug).sort()).toEqual([
      "comedie",
      "drame",
    ])

    const ar = await publicApi().findShortFilm("sample-two", "ar")
    expect(ar.title).toBe("مثال ثان")
    expect(ar.synopsis).toBe("فيلم قصير تجريبي بدون ملصق.")
    const en = await publicApi().findShortFilm("sample-two", "en")
    expect(en.title).toBe("Second sample")
  })

  it("uses the YouTube thumbnail as the backdrop, falling back from maxres to hq", async () => {
    const film = await publicApi().findShortFilm("sample-two")
    expect(film.backdrop?.url).toBeTruthy()

    const sampleTwoRequests = downloadsRun1.filter((url) =>
      url.includes("bbbbbbbbbbb")
    )
    expect(sampleTwoRequests).toEqual([
      "https://i.ytimg.com/vi/bbbbbbbbbbb/maxresdefault.jpg",
      "https://i.ytimg.com/vi/bbbbbbbbbbb/hqdefault.jpg",
    ])
  })

  it("downloads each image once, from the sources the file names", () => {
    expect(downloadsRun1).toEqual([
      "https://i.ytimg.com/vi/aaaaaaaaaaa/maxresdefault.jpg",
      "https://artify.tn/media/sample-one-poster.jpg",
      "https://i.ytimg.com/vi/bbbbbbbbbbb/maxresdefault.jpg",
      "https://i.ytimg.com/vi/bbbbbbbbbbb/hqdefault.jpg",
    ])
  })

  it("S1: files posters under Short films > Posters and backdrops under Short films > Backdrops", async () => {
    const files = await importedFiles()
    expect(files.map((file) => file.name).sort()).toEqual([
      "sample-one-backdrop.png",
      "sample-one-poster.png",
      "sample-two-backdrop.png",
    ])
    for (const file of files) {
      const leaf = file.name.includes("-poster.") ? "Posters" : "Backdrops"
      expect(file.folder?.name).toBe(leaf)
      expect(file.folder?.parent?.name).toBe("Short films")
      expect(file.folderPath).toBe(file.folder?.path)
    }
  })

  it("lists every ai-drafted translation field for owner review (D-13)", () => {
    expect(reports.run1.aiDraftedFields).toEqual([
      { slug: "sample-two", locale: "ar", fields: ["title", "synopsis"] },
      { slug: "sample-two", locale: "en", fields: ["title", "synopsis"] },
    ])
  })

  it("deletes a retired short film in every locale", async () => {
    expect(reports.run1.retired).toEqual(["retire-me"])
    expect(await publicApi().findShortFilm("retire-me")).toBeNull()
    const remaining = await (strapi.db.query(CW as never) as any).count({
      where: { documentId: retireMeDocumentId },
    })
    expect(remaining).toBe(0)
  })

  it("reports a published short film in neither list as an orphan and leaves it alone", async () => {
    expect(reports.run1.orphans).toEqual(["orphan-film"])
    const orphan = await publicApi().findShortFilm("orphan-film")
    expect(orphan).not.toBeNull()
    expect(orphan.title).toBe("Title orphan-film")
  })
})

describe("importShortFilms: run 2 (same file, idempotent)", () => {
  beforeAll(async () => {
    // Longer than the clock resolution of the store, so a republish would show.
    await sleep(1100)
    downloaded = []
    reports.run2 = await importShortFilms(strapi, current, deps())
    stampsAfterRun2 = await publishedStamps(["sample-one", "sample-two"])
  })

  it("creates and updates nothing", () => {
    const report = reports.run2
    expect(report.failed).toEqual([])
    expect(report.created).toEqual([])
    expect(report.updated).toEqual([])
    expect(report.unchanged).toEqual(["sample-one", "sample-two"])
    expect(report.retired).toEqual([])
    expect(report.posterBypassed).toEqual([])
    expect(report.orphans).toEqual(["orphan-film"])
  })

  it("leaves every record count unchanged", async () => {
    expect(await counts()).toEqual(afterRun1)
  })

  it("S2: reuses the Media Library folders instead of creating them again", async () => {
    expect(await shortFilmsRootFolders()).toHaveLength(1)
    expect(await folderCount()).toBe(foldersAfterRun1)
  })

  it("downloads and uploads nothing", () => {
    expect(downloaded).toEqual([])
  })

  it("keeps each published row and its publishedAt (no default-sort churn)", () => {
    expect(Object.keys(stampsAfterRun1).sort()).toEqual([
      "sample-one",
      "sample-two",
    ])
    expect(stampsAfterRun2).toEqual(stampsAfterRun1)
  })
})

describe("importShortFilms: run 3 (one field changed, lossless update)", () => {
  beforeAll(async () => {
    current.films[0].duration = 13
    reports.run3 = await importShortFilms(strapi, current, deps())
  })

  it("updates only the changed film", async () => {
    expect(reports.run3.failed).toEqual([])
    expect(reports.run3.updated).toEqual(["sample-one"])
    expect(reports.run3.unchanged).toEqual(["sample-two"])
    expect(reports.run3.created).toEqual([])

    const film = await publicApi().findShortFilm("sample-one")
    expect(film.duration).toBe(13)
  })

  it("re-sends the full component arrays so nothing is lost", async () => {
    const film = await publicApi().findShortFilm("sample-one")
    expect(film.credits).toHaveLength(2)
    expect(film.cast).toHaveLength(1)
    expect(film.distinctions).toHaveLength(1)
    expect(film.videos).toHaveLength(1)
    expect(film.streamingLinks).toHaveLength(1)
    expect(film.backdrop?.url).toBeTruthy()
    expect(film.poster?.url).toBeTruthy()
  })

  it("does not touch the film that did not change", async () => {
    const stamps = await publishedStamps(["sample-two"])
    expect(stamps["sample-two"]).toEqual(stampsAfterRun2["sample-two"])
  })
})

describe("importShortFilms: run 4 (a translation changed)", () => {
  it("updates the film when only a translated title changed", async () => {
    current.films[0].title.en = "First sample (edited)"
    reports.run4 = await importShortFilms(strapi, current, deps())

    expect(reports.run4.failed).toEqual([])
    expect(reports.run4.updated).toEqual(["sample-one"])
    expect(reports.run4.unchanged).toEqual(["sample-two"])

    const en = await publicApi().findShortFilm("sample-one", "en")
    expect(en.title).toBe("First sample (edited)")
    const ar = await publicApi().findShortFilm("sample-one", "ar")
    expect(ar.title).toBe("مثال أول")
  })
})

describe("importShortFilms: per-film failures and warnings", () => {
  it("records one failed film and still imports the rest", async () => {
    await (strapi.documents(CW as never) as any).create({
      data: { title: "A film", slug: "sample-conflict", type: "film" },
      locale: "fr",
    })

    const conflict: any = clone(current.films[1])
    conflict.slug = "sample-conflict"
    const file = { ...clone(current), films: [conflict, current.films[0]] }

    const report = await importShortFilms(strapi, file, deps())

    expect(report.failed).toEqual([
      { slug: "sample-conflict", error: "SLUG_BELONGS_TO_OTHER_WORK_TYPE" },
    ])
    expect(report.unchanged).toEqual(["sample-one"])
    expect(report.created).toEqual([])

    const work = await (strapi.documents(CW as never) as any).findFirst({
      filters: { slug: "sample-conflict" },
      locale: "fr",
      status: "draft",
    })
    expect(work.type).toBe("film")
  })

  it("imports a film whose images cannot be fetched and warns per image", async () => {
    const failing: ImageDownloader = async (url) => {
      downloaded.push(url)
      throw Object.assign(new Error("HOST_NOT_ALLOWED"), {
        code: "HOST_NOT_ALLOWED",
      })
    }
    const warn: any = clone(current.films[0])
    warn.slug = "sample-warn"
    const file = { ...clone(current), retiredSlugs: [], films: [warn] }

    const report = await importShortFilms(strapi, file, {
      download: failing,
      allowLocalUploads: true,
    })

    expect(report.failed).toEqual([])
    expect(report.created).toEqual(["sample-warn"])
    expect(report.posterBypassed).toEqual(["sample-warn"])
    expect(report.warnings).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /sample-warn.*BACKDROP_UNAVAILABLE.*HOST_NOT_ALLOWED/
        ),
        expect.stringMatching(
          /sample-warn.*POSTER_UNAVAILABLE.*HOST_NOT_ALLOWED/
        ),
      ])
    )

    const film = await publicApi().findShortFilm("sample-warn")
    expect(film).not.toBeNull()
    expect(film.backdrop).toBeNull()
    expect(film.poster).toBeNull()
  })

  it("fails a film whose image the upload provider refuses, writes no film for it and imports the rest", async () => {
    // The provider answers like ImageKit with bad credentials: a plain object
    // without a message, the HTTP status on a hidden `$ResponseMetadata`. The
    // answer comes after 150 ms, slower than Strapi needs to prepare the image,
    // because the Jest sandbox cannot see a real unhandled rejection; the fast
    // answer is covered by the real-process run recorded in the debug session.
    const refusedFiles = ["sample-refuse-a-backdrop", "sample-refuse-b-poster"]
    const provider = strapi.plugin("upload").provider as any
    const original = {
      upload: provider.upload,
      uploadStream: provider.uploadStream,
    }
    const refusing =
      (method: "upload" | "uploadStream") =>
      async (file: { name?: string }, ...rest: unknown[]) => {
        if (!refusedFiles.some((name) => String(file.name).includes(name))) {
          return original[method].call(provider, file, ...rest)
        }
        await sleep(150)
        throw Object.defineProperty({}, "$ResponseMetadata", {
          value: { statusCode: 403 },
          enumerable: false,
        })
      }
    provider.upload = refusing("upload")
    provider.uploadStream = refusing("uploadStream")

    // a: the backdrop is refused. b: the backdrop is stored, the poster refused.
    const filmA: any = clone(current.films[0])
    filmA.slug = "sample-refuse-a"
    const filmB: any = clone(current.films[0])
    filmB.slug = "sample-refuse-b"
    const fine: any = clone(current.films[0])
    fine.slug = "sample-after-refused"
    const file = {
      ...clone(current),
      retiredSlugs: [],
      films: [filmA, filmB, fine],
    }

    const listenersBefore = process.listenerCount("unhandledRejection")
    const onSpy = jest.spyOn(process, "on")
    let report: ImportReport
    try {
      report = await importShortFilms(strapi, file, deps())
    } finally {
      provider.upload = original.upload
      provider.uploadStream = original.uploadStream
    }

    // Rejections nobody awaits are caught while films import, then released.
    expect(
      onSpy.mock.calls.filter(([event]) => event === "unhandledRejection")
    ).toHaveLength(1)
    onSpy.mockRestore()
    expect(process.listenerCount("unhandledRejection")).toBe(listenersBefore)

    const hint = "check the upload provider credentials and account status"
    expect(report.failed).toEqual([
      {
        slug: "sample-refuse-a",
        error: `UPLOAD_FAILED: sample-refuse-a-backdrop (HTTP 403, ${hint})`,
      },
      {
        slug: "sample-refuse-b",
        error: `UPLOAD_FAILED: sample-refuse-b-poster (HTTP 403, ${hint})`,
      },
    ])
    expect(report.created).toEqual(["sample-after-refused"])
    expect(report.warnings).toEqual([])

    // No film was written for either failed slug, and the refused file has no row.
    for (const slug of ["sample-refuse-a", "sample-refuse-b"]) {
      const work = await (strapi.documents(CW as never) as any).findFirst({
        filters: { slug },
        locale: "fr",
        status: "draft",
      })
      expect(work).toBeNull()
    }
    for (const name of refusedFiles) {
      const rows = await (strapi.db.query(UPLOAD_FILE as never) as any).count({
        where: { name: { $startsWith: name } },
      })
      expect(rows).toBe(0)
    }

    expect(
      await publicApi().findShortFilm("sample-after-refused")
    ).not.toBeNull()
  })
})

/**
 * Boot suite for the short-film launch import (plan 01-10, D-11).
 *
 * Runs `importShortFilms` against a real Strapi on SQLite with an injected
 * downloader, so no network is touched. Uploads go through the real upload
 * service on the local provider (files land in gitignored `public/uploads`) and
 * are removed again in `afterAll`.
 *
 * Named `*.service.test.ts`: opt-in integration project (`yarn test:integration`).
 */
import type { Core } from "@strapi/strapi"
import type { ImageDownloader } from "../utils/media-upload"

import { cleanupStrapi, setupStrapi } from "../../../tests/helpers/strapi"
import sampleFile from "./__fixtures__/short-films.sample.json"
import { importShortFilms } from "./import-short-films"

jest.setTimeout(180000)

/** A valid 1x1 PNG. */
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64"
)

const stubDownload: ImageDownloader = async () => ({
  buffer: PNG_1X1,
  mime: "image/png",
  ext: ".png",
})

let strapi: Core.Strapi

const publicApi = () => strapi.plugin("creative-works").service("public-api")

beforeAll(async () => {
  process.env.DATABASE_FILENAME = ".tmp/short-film-import.db"
  strapi = await setupStrapi()
})

afterAll(async () => {
  // Remove what the uploads wrote to public/uploads (the local provider).
  const files = (await strapi.db.query("plugin::upload.file").findMany({
    where: { name: { $startsWith: "sample-" } },
  })) as Array<{ id: number }>
  for (const file of files) {
    await strapi.plugin("upload").service("upload").remove(file)
  }
  await cleanupStrapi()
})

describe("importShortFilms: one approved film end to end", () => {
  it("turns an approved entry into a published short film readable through the facade", async () => {
    const file = {
      ...sampleFile,
      films: sampleFile.films.filter((film) => film.slug === "sample-one"),
    }

    const report = await importShortFilms(strapi, file, {
      download: stubDownload,
      allowLocalUploads: true,
    })

    expect(report.failed).toEqual([])
    expect(report.created).toEqual(["sample-one"])

    const film = await publicApi().findShortFilm("sample-one")
    expect(film).not.toBeNull()
    expect(film.slug).toBe("sample-one")
    expect(film.title).toBe("Premier exemple")
    expect(typeof film.backdrop?.url).toBe("string")
    expect(film.poster?.url).toBeTruthy()
    expect(film.directors.map((d: { slug: string }) => d.slug)).toEqual([
      "sample-director-one",
    ])
    expect(film.streamingLinks).toEqual([
      {
        platform: "youtube",
        url: "https://www.youtube.com/watch?v=aaaaaaaaaaa",
        accessType: "free",
        label: null,
      },
    ])
    expect(film.availableOnline).toBe(true)
  })
})

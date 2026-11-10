/**
 * Booted proof of the `GET /watchlist` payload for a saved short film
 * (plan 02-07, FR21; RESEARCH assumption A1, threat T-02-16).
 *
 * Proves, on a real Strapi over SQLite, that `getUserWatchlist` returns for a
 * saved short film exactly the creative-work fields the watchlist card needs
 * (`documentId`, `title`, `slug`, `type`, `duration`, `releaseYear`) and no other
 * creative-work field, so a future schema addition (synopsis, rating, ...) can
 * never leak through the watchlist endpoint.
 *
 * D-18: the relation is populated from the non-localized watchlist parent, so
 * the title served is the default-locale (French) one even when the film also
 * has an `en` row. The client shows that French title on /ar and /en for now.
 *
 * Named `*.service.test.ts`: opt-in integration project only
 * (`yarn workspace @tiween/admin test:integration`), run serially. CI skips it.
 */
import type { Core } from "@strapi/strapi"

import { publishableShortParts } from "../../../../../../tests/fixtures/publishable-short"
import { seedUserAndJwt } from "../../../../../../tests/helpers/auth"
import {
  cleanupStrapi,
  setupStrapi,
} from "../../../../../../tests/helpers/strapi"

// Suite-specific SQLite file so a leaked `.tmp/test.db` is never reused.
process.env.DATABASE_FILENAME = ".tmp/watchlist-payload.db"

jest.setTimeout(120000)

const CW = "plugin::creative-works.creative-work" as any

/** The only creative-work keys the watchlist payload may carry. */
const ALLOWED_CREATIVE_WORK_KEYS = [
  "documentId",
  "duration",
  "id",
  "releaseYear",
  "slug",
  "title",
  "type",
]

let strapi: Core.Strapi

const uniq = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

beforeAll(async () => {
  strapi = await setupStrapi()
})

afterAll(async () => {
  await cleanupStrapi()
})

describe("watchlist payload for a saved short film (integration)", () => {
  it("carries slug, type, title, duration and releaseYear and nothing else of the creative work", async () => {
    const slug = uniq("watchlist-payload")
    const parts = await publishableShortParts(strapi, "watchlist-payload", {
      locales: ["en"],
    })

    const created: any = await strapi.documents(CW).create({
      data: {
        title: "Le court de la liste",
        slug,
        type: "short-film",
        duration: 14,
        releaseYear: 2023,
        synopsis: "Un synopsis qui ne doit pas fuiter.",
        country: ["TN"],
        language: ["fr"],
        featured: true,
        featuredRank: 2,
        poster: parts.poster,
        credits: parts.credits,
        streamingLinks: parts.streamingLinks,
      } as any,
      locale: "fr",
    } as any)

    await strapi.documents(CW).update({
      documentId: created.documentId,
      locale: "en",
      data: { title: "The list short" } as any,
    } as any)

    await strapi.documents(CW).publish({
      documentId: created.documentId,
      locale: "*",
    } as any)

    const user = await seedUserAndJwt(strapi, { email: `${uniq("wl")}@x.test` })
    const service = strapi.plugin("user-engagement").service("watchlist")

    await service.add(user.documentId, created.documentId)
    const rows: any[] = await service.getUserWatchlist(user.documentId)

    expect(rows).toHaveLength(1)
    const [row] = rows

    // Existing contract: the internal dedupe column never reaches the client.
    expect(row).not.toHaveProperty("dedupeKey")

    // A1: the relation carries what the card links and labels with.
    expect(row.creativeWork).toMatchObject({
      documentId: created.documentId,
      slug,
      type: "short-film",
      title: "Le court de la liste",
      duration: 14,
      releaseYear: 2023,
    })

    // Screening enrichment is present and nullable (a short has no screening).
    expect(row.nextScreeningDate).toBeNull()
    expect(row.lastScreeningDate).toBeNull()
    expect(row.venueName).toBeNull()

    // T-02-16: nothing beyond the allowlist, whatever the schema grows into.
    for (const leaked of [
      "synopsis",
      "country",
      "language",
      "featured",
      "featuredRank",
      "rating",
      "ageRating",
      "originalTitle",
    ]) {
      expect(row.creativeWork).not.toHaveProperty(leaked)
    }
    expect(Object.keys(row.creativeWork).sort()).toEqual(
      ALLOWED_CREATIVE_WORK_KEYS
    )
  })
})

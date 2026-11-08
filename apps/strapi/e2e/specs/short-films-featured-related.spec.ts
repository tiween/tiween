/**
 * UAT 01 test 3: featured and related short films on the Postgres stack.
 *
 * The SQLite boot suite (`src/plugins/creative-works/server/src/__tests__/
 * short-films.service.test.ts`) pins the D-05 featured order and the D-08
 * related order against fixed fixtures. This suite checks the same rules over
 * HTTP against the Postgres E2E stack, where NULL ordering and nested
 * component filters behave differently from SQLite.
 *
 * The seeded 13-film launch catalog has no featured film and one director per
 * film, so the suite adds a few `e2e-` fixtures through the admin API (purged
 * first, deleted after) to exercise: rank order, a rank tie broken by recency,
 * unranked-last, a featured draft, a published film whose featured flag only
 * exists on its draft, a shared director, a film matching on director AND
 * genre, and a person credited on a NON-directing role (the Postgres
 * same-credit join check). The expected orders are then computed from the live
 * public list with the service rules, so nothing depends on seeded slugs.
 */
import { expect, test } from "@playwright/test"

import type { APIRequestContext } from "@playwright/test"
import type { Summary } from "../helpers/short-films"

import { AdminApi, CREDIT_ROLE_UID, WORK_UID } from "../helpers/admin-api"
import {
  BASE_URL,
  FIXTURES_DIR,
  SHORT_FILMS_API,
  STORAGE_STATE,
} from "../helpers/env"
import {
  expectedFeatured,
  expectedRelated,
  expectSummaryShape,
  FEATURED_LIMIT,
  featuredKey,
  fetchAllPublished,
  RELATED_LIMIT,
  relatedGroupOf,
} from "../helpers/short-films"

test.describe.configure({ mode: "serial" })

const RUN = Date.now().toString(36)
const slugFor = (name: string) => `e2e-${RUN}-${name}`

const FIXTURE = {
  rank1: slugFor("rank-1"),
  rank2Older: slugFor("rank-2-older"),
  rank2Newer: slugFor("rank-2-newer"),
  unranked: slugFor("unranked"),
  featuredDraft: slugFor("featured-draft"),
  draftOnlyFeatured: slugFor("draft-only-featured"),
  writerOnly: slugFor("writer-only"),
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

let admin: AdminApi
let adminRequest: APIRequestContext
/** No cookies, no headers: the public API must answer anonymous callers. */
let anon: APIRequestContext
let uploadId: number | null = null
const createdIds: string[] = []

/** Seeded film whose director the fixtures share. */
let anchor: Summary
let otherDirectorId: string

async function getJson(path: string, params?: Record<string, string>) {
  const response = await anon.get(path, { params })
  return { status: response.status(), body: await response.json() }
}

test.beforeAll(async ({ playwright }) => {
  adminRequest = await playwright.request.newContext({
    baseURL: BASE_URL,
    storageState: STORAGE_STATE,
  })
  anon = await playwright.request.newContext({
    baseURL: BASE_URL,
    storageState: { cookies: [], origins: [] },
  })
  admin = await AdminApi.login(adminRequest)
  await admin.purgeE2eWorks()

  const seeded = await fetchAllPublished(anon)
  expect(
    seeded.length,
    "the E2E stack must serve the seeded short catalog"
  ).toBeGreaterThanOrEqual(2)

  // Anchor: the oldest seeded film that has a director and a genre.
  const candidates = seeded.filter(
    (film) => film.directors.length > 0 && film.genres.length > 0
  )
  anchor = candidates[candidates.length - 1]
  expect(anchor, "a seeded film with a director and a genre").toBeTruthy()
  const other = candidates.find(
    (film) =>
      film.documentId !== anchor.documentId &&
      !film.directors.some(
        (d) => d.documentId === anchor.directors[0].documentId
      )
  )
  expect(other, "a second seeded film with another director").toBeTruthy()
  otherDirectorId = other!.directors[0].documentId

  const roles = await admin.list<{ documentId: string; slug: string }>(
    CREDIT_ROLE_UID
  )
  const director = roles.find((role) => role.slug === "director")
  const nonDirecting = roles.find(
    (role) => role.slug && role.slug !== "director"
  )
  expect(director, "credit-role 'director' is seeded").toBeTruthy()
  expect(nonDirecting, "a non-directing credit role is seeded").toBeTruthy()

  uploadId = (
    await admin.upload(`${FIXTURES_DIR}/poster.png`, `e2e-${RUN}-poster.png`)
  ).id

  const anchorDirector = anchor.directors[0].documentId
  const genre = anchor.genres[0].documentId
  const directing = (person: string) => ({
    person,
    creditRole: director!.documentId,
    customRole: null,
    billing: 1,
  })

  const make = async (
    slug: string,
    extra: Record<string, unknown>,
    publish: boolean
  ) => {
    const created = await admin.create<{ documentId: string }>(WORK_UID, {
      title: `E2E ${slug}`,
      slug,
      type: "short-film",
      poster: uploadId,
      credits: [directing(anchorDirector)],
      genres: [],
      streamingLinks: [
        {
          platform: "youtube",
          url: "https://www.youtube.com/watch?v=e2e",
          accessType: "free",
          label: null,
        },
      ],
      featured: false,
      featuredRank: null,
      ...extra,
    })
    createdIds.push(created.documentId)
    if (publish) {
      await admin.publish(WORK_UID, created.documentId)
      // publishedAt must differ between fixtures: it is the recency key.
      await sleep(60)
    }
    return created.documentId
  }

  // Publish order = recency order (oldest first).
  await make(FIXTURE.rank2Older, { featured: true, featuredRank: 2 }, true)
  await make(FIXTURE.rank2Newer, { featured: true, featuredRank: 2 }, true)
  // Rank 1 is published AFTER the rank-2 films: rank must beat recency. It
  // also shares the anchor's genre, so it matches related on both counts.
  await make(
    FIXTURE.rank1,
    { featured: true, featuredRank: 1, genres: [genre] },
    true
  )
  // Newest of all, but unranked: still listed after every ranked film.
  await make(FIXTURE.unranked, { featured: true, featuredRank: null }, true)
  // Never published: must never be served.
  await make(
    FIXTURE.featuredDraft,
    { featured: true, featuredRank: 1, genres: [genre] },
    false
  )
  // Published unfeatured, then featured on the DRAFT only.
  const draftOnly = await make(FIXTURE.draftOnlyFeatured, {}, true)
  await admin.update(WORK_UID, draftOnly, { featured: true, featuredRank: 1 })
  // The anchor's director on a NON-directing role, another person directing.
  await make(
    FIXTURE.writerOnly,
    {
      credits: [
        {
          person: anchorDirector,
          creditRole: nonDirecting!.documentId,
          customRole: null,
          billing: 1,
        },
        directing(otherDirectorId),
      ],
    },
    true
  )
})

test.afterAll(async () => {
  if (admin) {
    for (const id of createdIds) {
      await admin.deleteAllLocales(WORK_UID, id).catch(() => undefined)
    }
    if (uploadId !== null)
      await admin.deleteUpload(uploadId).catch(() => undefined)
  }
  await adminRequest?.dispose()
  await anon?.dispose()
})

test.describe("GET short-films/featured on Postgres", () => {
  const FEATURED = `${SHORT_FILMS_API}/featured`

  test("answers anonymous callers with the summary shape", async () => {
    const { status, body } = await getJson(FEATURED)

    expect(status).toBe(200)
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.error).toBeUndefined()
    expectSummaryShape(body.data, body)
  })

  test("orders by rank ascending, then newest, with unranked films last", async () => {
    const { body } = await getJson(FEATURED)
    const served: Summary[] = body.data
    const slugs = served.map((film) => film.slug)

    // The fixtures alone, in their D-05 order.
    const fixtureOrder = [
      FIXTURE.rank1,
      FIXTURE.rank2Newer,
      FIXTURE.rank2Older,
      FIXTURE.unranked,
    ]
    expect(slugs.filter((slug) => fixtureOrder.includes(slug))).toEqual(
      fixtureOrder
    )

    // The whole response against the rule applied to the live catalog.
    const expected = expectedFeatured(await fetchAllPublished(anon))
    expect(served.map(featuredKey)).toEqual(expected.map(featuredKey))
    expect(new Set(slugs)).toEqual(new Set(expected.map((film) => film.slug)))
    expect(served.length).toBeLessThanOrEqual(FEATURED_LIMIT)
    for (const film of served) expect(film.featured).toBe(true)
  })

  test("never serves a draft, a draft-only featured flag or an unfeatured film", async () => {
    const { body } = await getJson(FEATURED)
    const slugs: string[] = body.data.map((film: Summary) => film.slug)

    expect(slugs).not.toContain(FIXTURE.featuredDraft)
    expect(slugs).not.toContain(FIXTURE.draftOnlyFeatured)
    expect(slugs).not.toContain(FIXTURE.writerOnly)
    expect(slugs).not.toContain(anchor.slug)
  })

  test("rejects an unknown query key with 400 VALIDATION_FAILED", async () => {
    const { status, body } = await getJson(FEATURED, { foo: "1" })

    expect(status).toBe(400)
    expect(body.error.details.code).toBe("VALIDATION_FAILED")
  })
})

test.describe("GET short-films/:slug/related on Postgres", () => {
  const related = (slug: string) => `${SHORT_FILMS_API}/${slug}/related`

  test("serves director matches first, then genre matches, newest first, for every published short", async () => {
    const published = await fetchAllPublished(anon)
    expect(published.length).toBeGreaterThan(RELATED_LIMIT)

    for (const source of published) {
      const { status, body } = await getJson(related(source.slug))
      expect(status, `related(${source.slug})`).toBe(200)
      expectSummaryShape(body.data, body)

      const served: Summary[] = body.data
      const expected = expectedRelated(source, published)
      const servedKeys = served.map(
        (film) => `${relatedGroupOf(source, film)}|${film.publishedAt}`
      )
      const expectedKeys = expected.map(
        ({ film, group }) => `${group}|${film.publishedAt}`
      )

      expect(servedKeys, `related(${source.slug}) order`).toEqual(expectedKeys)
      const slugs = served.map((film) => film.slug)
      expect(new Set(slugs).size, "no film listed twice").toBe(slugs.length)
      expect(slugs).not.toContain(source.slug)
      expect(slugs.length).toBeLessThanOrEqual(RELATED_LIMIT)
    }
  })

  test("puts the shared-director fixtures first for the anchor film, newest first, each once", async () => {
    const { body } = await getJson(related(anchor.slug))
    const slugs: string[] = body.data.map((film: Summary) => film.slug)

    // Published fixtures directed by the anchor's director, newest first.
    // rank1 also shares the genre: it appears once, in the director group.
    // (draft-only-featured is published unfeatured: it still counts here.)
    expect(slugs.slice(0, 5)).toEqual([
      FIXTURE.draftOnlyFeatured,
      FIXTURE.unranked,
      FIXTURE.rank1,
      FIXTURE.rank2Newer,
      FIXTURE.rank2Older,
    ])
    expect(slugs.filter((slug) => slug === FIXTURE.rank1)).toHaveLength(1)
  })

  test("matches the director on the SAME credit (a non-directing credit does not count)", async () => {
    const { body } = await getJson(related(anchor.slug))
    const slugs: string[] = body.data.map((film: Summary) => film.slug)

    // writer-only credits the anchor's director as a non-director and has no
    // genre: on a join that mixes credits it would leak into the director group.
    expect(slugs).not.toContain(FIXTURE.writerOnly)
  })

  test("never contains a draft, and 404s for a draft-only or unknown slug", async () => {
    const published = await fetchAllPublished(anon)
    for (const source of published) {
      const { body } = await getJson(related(source.slug))
      const slugs: string[] = body.data.map((film: Summary) => film.slug)
      expect(slugs).not.toContain(FIXTURE.featuredDraft)
    }

    for (const slug of [FIXTURE.featuredDraft, `e2e-${RUN}-no-such-short`]) {
      const relatedRes = await getJson(related(slug))
      expect(relatedRes.status).toBe(404)
      expect(relatedRes.body.error.details.code).toBe("SHORT_FILM_NOT_FOUND")

      const detailRes = await getJson(`${SHORT_FILMS_API}/${slug}`)
      expect(detailRes.status).toBe(404)
      expect(detailRes.body.error.details.code).toBe("SHORT_FILM_NOT_FOUND")
    }
  })

  test("rejects a paging key with 400 VALIDATION_FAILED", async () => {
    const { status, body } = await getJson(related(anchor.slug), { page: "1" })

    expect(status).toBe(400)
    expect(body.error.details.code).toBe("VALIDATION_FAILED")
  })
})

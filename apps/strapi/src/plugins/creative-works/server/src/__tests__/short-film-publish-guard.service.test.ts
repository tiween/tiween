/**
 * Booted suite for the short-film publish guard (plan 01-06, SDATA-02).
 *
 * The guard is a Document Service middleware registered from the plugin
 * `register()`. This suite deliberately registers NOTHING of its own: if a
 * content-manager publish of an incomplete short film is refused, the plugin
 * registered the guard at register time (01-01 A1 only proved a middleware
 * added after boot).
 *
 * Named `*.service.test.ts`: opt-in integration project only
 * (`yarn workspace @tiween/admin test:integration`), run serially.
 */
import request from "supertest"

import type { Core } from "@strapi/strapi"

import { createAdminSession } from "../../../../../../tests/helpers/admin"
import {
  cleanupStrapi,
  setupStrapi,
} from "../../../../../../tests/helpers/strapi"

// Suite-specific SQLite file so a leaked `.tmp/test.db` is never reused.
process.env.DATABASE_FILENAME = ".tmp/short-film-publish-guard.db"

jest.setTimeout(120000)

const CW = "plugin::creative-works.creative-work" as any
const PERSON = "plugin::creative-works.person" as any
const ROLE = "plugin::creative-works.credit-role" as any
const UPLOAD_FILE = "plugin::upload.file" as any

let strapi: Core.Strapi
let adminToken: string
let destroyAdmin: () => Promise<void>
let directorRoleId: string
let publishedPersonId: string

const api = () => request((strapi as any).server.httpServer)

const admin = <T extends { set: (k: string, v: string) => T }>(req: T) =>
  req.set("Authorization", `Bearer ${adminToken}`)

const uniq = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const cmPublish = (documentId: string, locale = "fr") =>
  admin(
    api().post(
      `/content-manager/collection-types/${CW}/${documentId}/actions/publish?locale=${locale}`
    )
  ).send({})

async function createPoster(tag: string): Promise<number> {
  const file: any = await strapi.db.query(UPLOAD_FILE).create({
    data: {
      name: `${tag}.jpg`,
      hash: uniq(tag).replace(/-/g, "_"),
      ext: ".jpg",
      mime: "image/jpeg",
      size: 10,
      width: 800,
      height: 1200,
      url: `/uploads/${tag}.jpg`,
      provider: "local",
    },
  })
  return file.id
}

/** A short-film draft that satisfies every D-19 rule except the poster. */
function completeShortData(tag: string, extra: Record<string, unknown> = {}) {
  const slug = uniq(tag)
  return {
    title: `${tag} ${slug}`,
    slug,
    type: "short-film",
    duration: 12,
    credits: [
      { person: publishedPersonId, creditRole: directorRoleId, billing: 1 },
    ],
    streamingLinks: [
      {
        platform: "youtube",
        url: `https://www.youtube.com/watch?v=${slug}`,
        accessType: "free",
      },
    ],
    ...extra,
  }
}

async function createDraft(data: Record<string, unknown>) {
  const doc: any = await strapi.documents(CW).create({
    data: data as any,
    locale: "fr",
  } as any)
  return doc.documentId as string
}

const publishedRows = async (documentId: string) =>
  strapi.db.query(CW).findMany({
    where: { documentId, publishedAt: { $notNull: true } },
  })

const draftRows = async (documentId: string) =>
  strapi.db.query(CW).findMany({
    where: { documentId, publishedAt: { $null: true } },
  })

beforeAll(async () => {
  strapi = await setupStrapi()
  const session = await createAdminSession(strapi)
  adminToken = session.token
  destroyAdmin = session.destroy

  const person: any = await strapi.documents(PERSON).create({
    data: { name: "Guard Director", slug: uniq("guard-director") } as any,
    locale: "fr",
    status: "published",
  } as any)
  publishedPersonId = person.documentId

  const existingRole: any = await strapi.documents(ROLE).findFirst({
    locale: "fr",
    status: "published",
    filters: { slug: { $eq: "director" } },
  } as any)
  const role: any =
    existingRole ??
    (await strapi.documents(ROLE).create({
      data: { name: "Realisateur", slug: "director", department: "directing" },
      locale: "fr",
      status: "published",
    } as any))
  directorRoleId = role.documentId
})

afterAll(async () => {
  await destroyAdmin?.()
  await cleanupStrapi()
})

describe("short-film publish guard registered at plugin register time", () => {
  it("refuses a content-manager publish of a posterless short film with coded issues and keeps the draft", async () => {
    const documentId = await createDraft(completeShortData("noposter"))

    const res = await cmPublish(documentId)

    expect(res.status).toBe(400)
    expect(res.body.error.details.code).toBe("SHORT_FILM_PUBLISH_BLOCKED")
    expect(res.body.error.details.issues).toEqual([
      { code: "POSTER_REQUIRED", path: "poster" },
    ])
    expect(await draftRows(documentId)).toHaveLength(1)
    expect(await publishedRows(documentId)).toHaveLength(0)
  })

  it("publishes the same short film once a poster is attached", async () => {
    const documentId = await createDraft(completeShortData("withposter"))
    const blocked = await cmPublish(documentId)
    expect(blocked.status).toBe(400)

    await strapi.documents(CW).update({
      documentId,
      locale: "fr",
      data: { poster: await createPoster("withposter") },
    } as any)

    const res = await cmPublish(documentId)

    expect(res.status).toBe(200)
    expect(await publishedRows(documentId)).toHaveLength(1)
  })

  it("never blocks a posterless film", async () => {
    const documentId = await createDraft({
      title: uniq("film"),
      slug: uniq("film"),
      type: "film",
    })

    const res = await cmPublish(documentId)

    expect(res.status).toBe(200)
    expect(await publishedRows(documentId)).toHaveLength(1)
  })
})

const cmPut = (
  documentId: string,
  body: Record<string, unknown>,
  locale = "fr"
) =>
  admin(
    api().put(
      `/content-manager/collection-types/${CW}/${documentId}?locale=${locale}`
    )
  ).send(body)

const issueCodes = (res: { body: any }) =>
  (res.body.error.details.issues as Array<{ code: string }>).map((i) => i.code)

/** A short-film draft that is complete, poster included. */
async function createPublishableDraft(
  tag: string,
  extra: Record<string, unknown> = {}
) {
  return createDraft(
    completeShortData(tag, { poster: await createPoster(tag), ...extra })
  )
}

describe("every D-19 issue is reported over the content-manager", () => {
  it("SLUG_REQUIRED for a short film without a slug", async () => {
    const data: Record<string, unknown> = completeShortData("noslug", {
      poster: await createPoster("noslug"),
    })
    delete data.slug
    const documentId = await createDraft(data)

    const res = await cmPublish(documentId)

    expect(res.status).toBe(400)
    expect(issueCodes(res)).toEqual(["SLUG_REQUIRED"])
  })

  it("SLUG_REQUIRED for an empty slug", async () => {
    const documentId = await createPublishableDraft("emptyslug", { slug: "" })

    const res = await cmPublish(documentId)

    expect(res.status).toBe(400)
    expect(issueCodes(res)).toEqual(["SLUG_REQUIRED"])
  })

  it("SLUG_RESERVED for the reserved slug `featured`", async () => {
    const documentId = await createPublishableDraft("reserved", {
      slug: "featured",
    })

    const res = await cmPublish(documentId)

    expect(res.status).toBe(400)
    expect(issueCodes(res)).toEqual(["SLUG_RESERVED"])
  })

  it("DIRECTOR_REQUIRED for a short film without a credit", async () => {
    const documentId = await createPublishableDraft("nodirector", {
      credits: [],
    })

    const res = await cmPublish(documentId)

    expect(res.status).toBe(400)
    expect(issueCodes(res)).toEqual(["DIRECTOR_REQUIRED"])
  })

  it("DIRECTOR_UNPUBLISHED for a director credited through a draft-only person", async () => {
    const draftPerson: any = await strapi.documents(PERSON).create({
      data: { name: "Draft Director", slug: uniq("draft-director") } as any,
      locale: "fr",
      status: "draft",
    } as any)
    const documentId = await createPublishableDraft("draftdirector", {
      credits: [
        {
          person: draftPerson.documentId,
          creditRole: directorRoleId,
          billing: 1,
        },
      ],
    })

    const res = await cmPublish(documentId)

    expect(res.status).toBe(400)
    expect(issueCodes(res)).toEqual(["DIRECTOR_UNPUBLISHED"])
    expect(await publishedRows(documentId)).toHaveLength(0)
  })

  it("WATCH_SOURCE_REQUIRED when only a full-length video exists, but a trailer video passes", async () => {
    const fullLength = await createPublishableDraft("fulllength", {
      streamingLinks: [],
      videos: [{ url: "https://example.org/full", videoType: "full-length" }],
    })
    const trailer = await createPublishableDraft("trailer", {
      streamingLinks: [],
      videos: [{ url: "https://example.org/trailer", videoType: "trailer" }],
    })

    const blocked = await cmPublish(fullLength)
    const allowed = await cmPublish(trailer)

    expect(blocked.status).toBe(400)
    expect(issueCodes(blocked)).toEqual(["WATCH_SOURCE_REQUIRED"])
    expect(allowed.status).toBe(200)
  })

  it("reports every issue at once, in rule order", async () => {
    const documentId = await createDraft({
      title: uniq("bare"),
      type: "short-film",
    })

    const res = await cmPublish(documentId)

    expect(res.status).toBe(400)
    expect(issueCodes(res)).toEqual([
      "SLUG_REQUIRED",
      "POSTER_REQUIRED",
      "DIRECTOR_REQUIRED",
      "WATCH_SOURCE_REQUIRED",
    ])
  })

  it("publishes a 45-minute complete short film (duration is a warning only)", async () => {
    const documentId = await createPublishableDraft("long", { duration: 45 })

    const res = await cmPublish(documentId)

    expect(res.status).toBe(200)
    expect(await publishedRows(documentId)).toHaveLength(1)
  })
})

describe("draft saves and idempotency", () => {
  it("lets a content-manager PUT save an incomplete short film as a draft", async () => {
    const documentId = await createDraft({
      title: uniq("incomplete"),
      type: "short-film",
    })

    const res = await cmPut(documentId, { title: "still incomplete" })

    expect(res.status).toBe(200)
    expect(await publishedRows(documentId)).toHaveLength(0)
  })

  it("publishing an already-published complete short film again succeeds with one published row per locale", async () => {
    const documentId = await createPublishableDraft("republish")

    const first = await cmPublish(documentId)
    const second = await cmPublish(documentId)

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    const rows = (await publishedRows(documentId)) as Array<{ locale: string }>
    expect(rows.map((r) => r.locale)).toEqual(["fr"])
    const documentRows = await strapi.db
      .query(CW)
      .findMany({ where: { documentId } })
    expect(
      documentRows.filter((r: any) => r.publishedAt === null)
    ).toHaveLength(1)
  })
})

describe("publish paths other than a single content-manager publish", () => {
  it("rejects create({ status: 'published' }) of a posterless short film and keeps a draft", async () => {
    const data = completeShortData("createpublished")

    await expect(
      strapi.documents(CW).create({
        data: data as any,
        locale: "fr",
        status: "published",
      } as any)
    ).rejects.toMatchObject({
      name: "ValidationError",
      details: {
        code: "SHORT_FILM_PUBLISH_BLOCKED",
        issues: [{ code: "POSTER_REQUIRED", path: "poster" }],
      },
    })

    const rows = await strapi.db
      .query(CW)
      .findMany({ where: { slug: data.slug } })
    expect(rows).toHaveLength(1)
    expect((rows[0] as any).publishedAt).toBeNull()
  })

  it("create({ status: 'published' }) of a complete short film publishes and returns the published row", async () => {
    const data = completeShortData("createok", {
      poster: await createPoster("createok"),
    })

    const created: any = await strapi.documents(CW).create({
      data: data as any,
      locale: "fr",
      status: "published",
    } as any)

    expect(created.documentId).toEqual(expect.any(String))
    expect(created.publishedAt).toBeTruthy()
    expect(await publishedRows(created.documentId)).toHaveLength(1)
  })

  it("rejects update({ status: 'published' }) of an incomplete short film", async () => {
    const documentId = await createDraft({
      title: uniq("updatepublished"),
      type: "short-film",
    })

    await expect(
      strapi.documents(CW).update({
        documentId,
        locale: "fr",
        data: { title: "renamed" } as any,
        status: "published",
      } as any)
    ).rejects.toMatchObject({
      details: { code: "SHORT_FILM_PUBLISH_BLOCKED" },
    })
    expect(await publishedRows(documentId)).toHaveLength(0)
  })

  it("keeps a blocked short film unpublished on content-manager bulk publish", async () => {
    const blocked = await createDraft(completeShortData("bulkblocked"))
    const complete = await createPublishableDraft("bulkcomplete")

    const res = await admin(
      api().post(`/content-manager/collection-types/${CW}/actions/bulkPublish`)
    ).send({ documentIds: [blocked, complete] })

    // Observed: see BULK_PUBLISH_STATUS below.
    expect(res.status).toBe(BULK_PUBLISH_STATUS)
    expect(await publishedRows(blocked)).toHaveLength(0)
    // The complete sibling is deliberately not asserted: how its publish
    // interleaves with the aborted bulk transaction is not a guarantee of this
    // guard (on Strapi 5.51.2 / SQLite it ended up published).
  })
})

/**
 * HTTP status of a bulk publish that contains a blocked short film, as observed
 * on Strapi 5.51.2: the ValidationError thrown for the blocked document
 * surfaces as a 400 for the whole request (`publishMany` runs every publish in
 * one `strapi.db.transaction`), and the blocked document stays unpublished.
 */
const BULK_PUBLISH_STATUS = 400

/** Loaded lazily so the rest of the suite still runs while the module is absent. */
const withBypass = (
  scope: { reason: string; skip: ["POSTER_REQUIRED"] },
  fn: () => Promise<unknown>
) =>
  require("../../../../../shared/__tests__/bypass-test-helper").withPosterBypassForTest(
    scope,
    fn
  ) as Promise<unknown>

describe("D-20 bypass reaches the dist-loaded guard through the process-global scope", () => {
  const publishViaService = (documentId: string) =>
    strapi.documents(CW).publish({ documentId, locale: "fr" } as any)

  it("blocks a posterless complete short film outside the scope", async () => {
    const documentId = await createDraft(completeShortData("outside"))

    await expect(publishViaService(documentId)).rejects.toMatchObject({
      details: {
        code: "SHORT_FILM_PUBLISH_BLOCKED",
        issues: [{ code: "POSTER_REQUIRED", path: "poster" }],
      },
    })
  })

  it("publishes it inside the scope and logs the documentId and reason", async () => {
    const documentId = await createDraft(completeShortData("inside"))
    const warn = jest.spyOn(strapi.log, "warn")

    await withBypass(
      { reason: "launch import", skip: ["POSTER_REQUIRED"] },
      () => publishViaService(documentId)
    )

    expect(await publishedRows(documentId)).toHaveLength(1)
    expect(warn).toHaveBeenCalledWith(
      expect.stringMatching(/POSTER_REQUIRED.*launch import/)
    )
    expect(warn).toHaveBeenCalledWith(expect.stringContaining(documentId))
    warn.mockRestore()
  })

  it("never skips another rule: a posterless short with no director is blocked without POSTER_REQUIRED", async () => {
    const documentId = await createDraft(
      completeShortData("insidenodirector", { credits: [] })
    )

    await expect(
      withBypass({ reason: "launch import", skip: ["POSTER_REQUIRED"] }, () =>
        publishViaService(documentId)
      )
    ).rejects.toMatchObject({
      details: {
        code: "SHORT_FILM_PUBLISH_BLOCKED",
        issues: [{ code: "DIRECTOR_REQUIRED", path: "credits" }],
      },
    })
  })

  it("keeps the bypass out of reach of HTTP requests", async () => {
    const documentId = await createDraft(completeShortData("httpnobypass"))

    const res = await admin(
      api().post(
        `/content-manager/collection-types/${CW}/${documentId}/actions/publish?locale=fr`
      )
    )
      .set("x-short-film-publish-bypass", "POSTER_REQUIRED")
      .send({ bypass: true, skip: ["POSTER_REQUIRED"], reason: "nope" })

    expect(res.status).toBe(400)
    expect(issueCodes(res)).toEqual(["POSTER_REQUIRED"])
  })
})

describe("country and language codes are validated on every write", () => {
  it("answers 400 INVALID_COUNTRY_CODES for a content-manager PUT with country ['tn']", async () => {
    const documentId = await createDraft({
      title: uniq("country"),
      type: "short-film",
    })

    const res = await cmPut(documentId, { country: ["tn"] })

    expect(res.status).toBe(400)
    expect(res.body.error.details.code).toBe("INVALID_COUNTRY_CODES")
  })

  it("answers 400 INVALID_LANGUAGE_CODES for a film with language ['xx']", async () => {
    const documentId = await createDraft({
      title: uniq("language"),
      type: "film",
    })

    const res = await cmPut(documentId, { language: ["xx"] })

    expect(res.status).toBe(400)
    expect(res.body.error.details.code).toBe("INVALID_LANGUAGE_CODES")
  })

  it("rejects invalid codes on a Document Service create for any work type", async () => {
    await expect(
      strapi.documents(CW).create({
        data: { title: uniq("bad"), type: "play", country: ["ZZ"] } as any,
        locale: "fr",
      } as any)
    ).rejects.toMatchObject({
      details: { code: "INVALID_COUNTRY_CODES" },
    })
  })

  it("accepts valid codes", async () => {
    const documentId = await createDraft({
      title: uniq("valid"),
      type: "short-film",
      country: ["TN", "FR"],
      language: ["aeb", "fr"],
    })

    const res = await cmPut(documentId, { country: ["TN"], language: ["ar"] })

    expect(res.status).toBe(200)
  })
})

describe("existing flows stay intact", () => {
  it("public-api createWork still returns a published film", async () => {
    const work: any = await strapi
      .plugin("creative-works")
      .service("public-api")
      .createWork({ title: uniq("film-via-api"), type: "film" })

    expect(work.type).toBe("film")
    expect(await publishedRows(work.documentId)).not.toHaveLength(0)
  })
})

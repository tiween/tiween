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

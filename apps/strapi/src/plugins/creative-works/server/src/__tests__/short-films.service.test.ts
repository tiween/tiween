/**
 * Public short-film read routes over HTTP, against a real booted Strapi
 * (SDATA-03 / SDATA-05).
 *
 * Anonymous requests only: the routes are `auth: false`. The suite pins the
 * contract Phase 2 and Phase 3 bind to — published-only, flat Strapi v5 shape,
 * strictly allowlisted query, coded errors, never a 500.
 *
 * Named `*.service.test.ts`: opt-in integration project only
 * (`yarn workspace @tiween/admin test:integration`), run serially from a
 * rebuilt dist/ (`yarn build:test-dist`).
 */
import request from "supertest"

import type { Core } from "@strapi/strapi"

import {
  cleanupStrapi,
  setupStrapi,
} from "../../../../../../tests/helpers/strapi"

// Suite-specific SQLite file so a leaked `.tmp/test.db` is never reused.
// `setupStrapi()` reads it when called, not when the helper is imported.
process.env.DATABASE_FILENAME = ".tmp/short-films.db"

jest.setTimeout(120000)

const CW = "plugin::creative-works.creative-work" as any
const PERSON = "plugin::creative-works.person" as any
const CREDIT_ROLE = "plugin::creative-works.credit-role" as any
const UPLOAD_FILE = "plugin::upload.file" as any

const LIST = "/api/creative-works/creative-works/short-films"

let strapi: Core.Strapi

const api = () => request((strapi as any).server.httpServer)

const SLUG = {
  published: "t1-published-short",
  draft: "t1-draft-short",
  film: "t1-published-film",
}

async function seedLocal() {
  const role: any = await strapi.documents(CREDIT_ROLE).create({
    data: { name: "Realisateur", slug: "director", department: "directing" },
    locale: "fr",
    status: "published",
  } as any)
  const person: any = await strapi.documents(PERSON).create({
    data: { name: "Personne Un", slug: "t1-person-one" },
    locale: "fr",
    status: "published",
  } as any)
  const file: any = await strapi.db.query(UPLOAD_FILE).create({
    data: {
      name: "t1-poster.jpg",
      hash: "t1_poster",
      ext: ".jpg",
      mime: "image/jpeg",
      size: 12.5,
      width: 400,
      height: 600,
      url: "/uploads/t1_poster.jpg",
      provider: "local",
    },
  })

  const base = {
    type: "short-film",
    duration: 12,
    releaseYear: 2020,
    credits: [
      { person: person.documentId, creditRole: role.documentId, billing: 1 },
    ],
  }

  await strapi.documents(CW).create({
    data: {
      ...base,
      title: "alpha",
      slug: SLUG.published,
      poster: file.id,
      streamingLinks: [
        { platform: "youtube", url: "https://youtu.be/t1", accessType: "free" },
      ],
    },
    locale: "fr",
    status: "published",
  } as any)

  await strapi.documents(CW).create({
    data: { ...base, title: "draft", slug: SLUG.draft },
    locale: "fr",
    status: "draft",
  } as any)

  await strapi.documents(CW).create({
    data: { title: "film", slug: SLUG.film, type: "film" },
    locale: "fr",
    status: "published",
  } as any)
}

beforeAll(async () => {
  strapi = await setupStrapi()
  await seedLocal()
})

afterAll(async () => {
  await cleanupStrapi()
})

describe("GET short-films (tracer, integration)", () => {
  it("serves exactly the published short film to an anonymous caller", async () => {
    const res = await api().get(LIST)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].slug).toBe(SLUG.published)
  })

  it("answers the flat Strapi v5 shape with documentId and no attributes wrapper", async () => {
    const res = await api().get(LIST)

    const item = res.body.data[0]
    expect(typeof item.documentId).toBe("string")
    expect(item.title).toBe("alpha")
    expect(item).not.toHaveProperty("attributes")
    expect(item).not.toHaveProperty("id")
  })

  it("answers meta.pagination for a single page", async () => {
    const res = await api().get(LIST)

    expect(res.body.meta.pagination).toEqual({
      page: 1,
      pageSize: 24,
      pageCount: 1,
      total: 1,
    })
  })

  it("rejects a facet parameter with the coded 400 VALIDATION_FAILED", async () => {
    const res = await api().get(LIST).query({ country: "TN" })

    expect(res.status).toBe(400)
    expect(res.body.error.details.code).toBe("VALIDATION_FAILED")
  })

  it("rejects an unsupported locale with the coded 400 UNSUPPORTED_LOCALE", async () => {
    const res = await api().get(LIST).query({ locale: "de" })

    expect(res.status).toBe(400)
    expect(res.body.error.details.code).toBe("UNSUPPORTED_LOCALE")
  })
})

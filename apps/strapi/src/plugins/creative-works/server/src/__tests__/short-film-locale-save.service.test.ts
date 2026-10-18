/**
 * Booted suite for the requests the Works form sends to translate and publish
 * a work (plan 01-09, D-22, 01-03 finding).
 *
 * Facts about the content-manager API that the admin form depends on and that
 * no jsdom test can prove:
 *
 * 1. The collection-types routes read the request body FLAT (the entity itself,
 *    not `{ data }`). The Works hooks used to wrap the body in `{ data }`; the
 *    server stripped the unknown `data` key and saved an empty document.
 * 2. `PUT ?locale=<code>` creates a missing locale row (01-01 A3), but for a
 *    work with `credits` or `cast` it answers `400 ... locale "<code>" not
 *    found` until every credited person, credit-role and character has a row in
 *    that locale (01-03 finding). The admin therefore creates those rows first,
 *    in exactly the order asserted below
 *    (`useCreativeWorks.ensureTranslationTargets`).
 * 3. Once the rows exist, the translation saves, publishes and unpublishes
 *    without touching the default-locale row, and the D-19 guard still
 *    evaluates the default-locale draft.
 *
 * Named `*.service.test.ts`: opt-in integration project only
 * (`yarn workspace @tiween/admin test:integration`), run serially.
 */
import request from "supertest"

import type { Core } from "@strapi/strapi"

import { publishableShortParts } from "../../../../../../tests/fixtures/publishable-short"
import { createAdminSession } from "../../../../../../tests/helpers/admin"
import {
  cleanupStrapi,
  setupStrapi,
} from "../../../../../../tests/helpers/strapi"

// Suite-specific SQLite file so a leaked `.tmp/test.db` is never reused.
process.env.DATABASE_FILENAME = ".tmp/short-film-locale-save.db"

jest.setTimeout(120000)

const CW = "plugin::creative-works.creative-work" as any
const PERSON = "plugin::creative-works.person"
const ROLE = "plugin::creative-works.credit-role"
const CHARACTER = "plugin::creative-works.character"

let strapi: Core.Strapi
let adminToken: string
let destroyAdmin: () => Promise<void>

const api = () => request((strapi as any).server.httpServer)

const admin = <T extends { set: (k: string, v: string) => T }>(req: T) =>
  req.set("Authorization", `Bearer ${adminToken}`)

const uniq = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const cmUrl = (uid: string, documentId?: string) =>
  `/content-manager/collection-types/${uid}${documentId ? `/${documentId}` : ""}`

/** Flat body, exactly what the admin hooks send. */
const cmPut = (
  uid: string,
  documentId: string,
  body: Record<string, unknown>,
  locale: string
) => admin(api().put(`${cmUrl(uid, documentId)}?locale=${locale}`)).send(body)

const cmAction = (
  documentId: string,
  action: "publish" | "unpublish",
  locale: string
) =>
  admin(
    api().post(`${cmUrl(CW, documentId)}/actions/${action}?locale=${locale}`)
  ).send({})

const rows = (documentId: string) =>
  strapi.db.query(CW).findMany({
    where: { documentId },
    populate: { credits: { populate: ["person", "creditRole"] } },
  }) as Promise<any[]>

async function createCreditedShort(
  tag: string,
  options: { withPoster?: boolean } = {}
) {
  const parts = await publishableShortParts(strapi, tag)
  const character: any = await strapi.documents(CHARACTER as any).create({
    data: { name: `Role ${tag}`, slug: uniq(`char-${tag}`) } as any,
    locale: "fr",
    status: "published",
  } as any)
  const doc: any = await strapi.documents(CW).create({
    data: {
      title: uniq(tag),
      slug: uniq(tag),
      type: "short-film",
      duration: 12,
      ...(options.withPoster === false ? {} : { poster: parts.poster }),
      credits: parts.credits,
      streamingLinks: parts.streamingLinks,
      cast: [
        {
          person: parts.personId,
          character: character.documentId,
          billing: 1,
        },
      ],
    } as any,
    locale: "fr",
  } as any)
  return { parts, characterId: character.documentId as string, doc }
}

/** Which of `ids` already have a row in `locale` (the admin's lookup request). */
async function existingIn(uid: string, ids: string[], locale: string) {
  const res = await admin(
    api()
      .get(cmUrl(uid))
      .query({
        locale,
        page: 1,
        pageSize: 50,
        filters: { documentId: { $in: ids } },
      })
  )
  expect(res.status).toBe(200)
  return (res.body.results as Array<{ documentId: string }>).map(
    (row) => row.documentId
  )
}

/**
 * The ensure sequence the admin sends before the first save of a locale
 * (`useWorkMutations.ensureTranslationTargets`): look up which targets already
 * have the locale, then create the missing rows with flat bodies. Returns the
 * statuses of the creations.
 */
async function ensureTargets(
  parts: { personId: string; directorRoleId: string },
  characterId: string,
  locale: string
) {
  const statuses: number[] = []
  if (!(await existingIn(PERSON, [parts.personId], locale)).length) {
    statuses.push((await cmPut(PERSON, parts.personId, {}, locale)).status)
  }
  if (!(await existingIn(ROLE, [parts.directorRoleId], locale)).length) {
    statuses.push(
      (
        await cmPut(
          ROLE,
          parts.directorRoleId,
          { name: "role", slug: "director" },
          locale
        )
      ).status
    )
  }
  if (!(await existingIn(CHARACTER, [characterId], locale)).length) {
    statuses.push(
      (await cmPut(CHARACTER, characterId, { name: "character" }, locale))
        .status
    )
  }
  return statuses
}

beforeAll(async () => {
  strapi = await setupStrapi()
  const session = await createAdminSession(strapi)
  adminToken = session.token
  destroyAdmin = session.destroy
})

afterAll(async () => {
  await destroyAdmin?.()
  await cleanupStrapi()
})

describe("content-manager request shape used by the Works form", () => {
  it("reads the body flat: a { data } wrapper is stripped and nothing is saved", async () => {
    const created = await admin(api().post(`${cmUrl(CW)}?locale=fr`)).send({
      title: uniq("flat"),
      type: "film",
    })
    expect(created.status).toBe(201)
    const documentId = created.body.data.documentId as string

    const wrapped = await cmPut(
      CW,
      documentId,
      { data: { title: "wrapped-title" } },
      "fr"
    )
    expect(wrapped.status).toBe(200)
    expect(wrapped.body.data.title).not.toBe("wrapped-title")

    const flat = await cmPut(CW, documentId, { title: "flat-title" }, "fr")
    expect(flat.status).toBe(200)
    expect(flat.body.data.title).toBe("flat-title")
  })

  it("generates a slug from a title through uid/generate", async () => {
    const res = await admin(api().post("/content-manager/uid/generate")).send({
      contentTypeUID: CW,
      field: "slug",
      data: { title: "Le Silence des Dunes" },
    })

    expect(res.status).toBe(200)
    expect(res.body.data).toBe("le-silence-des-dunes")
  })

  it("lists the configured locales with the default flagged", async () => {
    const res = await admin(api().get("/i18n/locales"))

    expect(res.status).toBe(200)
    const byCode = Object.fromEntries(
      (res.body as Array<{ code: string; isDefault: boolean }>).map((l) => [
        l.code,
        l.isDefault,
      ])
    )
    expect(byCode).toMatchObject({ fr: true, ar: false, en: false })
  })

  it("answers a missing locale with an empty data object and the existing rows in meta", async () => {
    const { doc } = await createCreditedShort(uniq("metaprobe"))

    const res = await admin(api().get(`${cmUrl(CW, doc.documentId)}?locale=ar`))

    expect(res.status).toBe(200)
    expect(res.body.data).toEqual({})
    expect(
      res.body.meta.availableLocales.map((row: any) => row.locale)
    ).toEqual(["fr"])
  })
})

describe("translating a credited work through PUT ?locale=", () => {
  it("is refused with 'locale not found' until the credited targets have a row in that locale", async () => {
    const { parts, doc } = await createCreditedShort(uniq("blocked"))

    const res = await cmPut(
      CW,
      doc.documentId,
      { title: "عنوان", synopsis: "ملخص", poster: parts.poster },
      "ar"
    )

    // A code-less 400: the admin maps this message, never shows it raw.
    expect(res.status).toBe(400)
    expect(res.body.error.message).toMatch(/locale "ar" not found/)
    expect(
      await strapi.db.query(CW).count({
        where: { documentId: doc.documentId, locale: "ar" },
      })
    ).toBe(0)
  })

  it("saves, publishes and unpublishes the translation once persons, roles and characters have the locale row", async () => {
    const { parts, characterId, doc } = await createCreditedShort(
      uniq("translated")
    )
    const documentId = doc.documentId as string

    expect(await ensureTargets(parts, characterId, "ar")).toEqual([
      200, 200, 200,
    ])
    // The lookup now finds the draft rows, so a second pass creates nothing.
    expect(await existingIn(PERSON, [parts.personId], "ar")).toEqual([
      parts.personId,
    ])
    expect(await ensureTargets(parts, characterId, "ar")).toEqual([])

    const saved = await cmPut(
      CW,
      documentId,
      { title: "عنوان", synopsis: "ملخص", poster: parts.poster },
      "ar"
    )
    expect(saved.status).toBe(200)
    expect(saved.body.data).toMatchObject({
      locale: "ar",
      title: "عنوان",
      synopsis: "ملخص",
    })
    expect(saved.body.data.poster.id).toBe(parts.poster)

    // A second save of the existing row needs no ensure step.
    const again = await cmPut(CW, documentId, { title: "عنوان 2" }, "ar")
    expect(again.status).toBe(200)
    expect(again.body.data.title).toBe("عنوان 2")

    const readStatus = async (locale: string) =>
      (await admin(api().get(`${cmUrl(CW, documentId)}?locale=${locale}`))).body
        .data.status

    expect(await readStatus("ar")).toBe("draft")
    const published = await cmAction(documentId, "publish", "ar")
    expect(published.status).toBe(200)
    expect(
      (await rows(documentId)).filter((r) => r.locale === "ar" && r.publishedAt)
    ).toHaveLength(1)
    expect(await readStatus("ar")).toBe("published")

    await cmPut(CW, documentId, { title: "عنوان 3" }, "ar")
    expect(await readStatus("ar")).toBe("modified")
    expect(await readStatus("fr")).toBe("draft")
    // meta.availableLocales on the default read lists the ar row's status.
    const defaultRead = await admin(
      api().get(`${cmUrl(CW, documentId)}?locale=fr`)
    )
    expect(
      defaultRead.body.meta.availableLocales.map(
        (row: any) => `${row.locale}:${row.status}`
      )
    ).toEqual(["ar:modified"])

    const unpublished = await cmAction(documentId, "unpublish", "ar")
    expect(unpublished.status).toBe(200)
    const afterUnpublish = await rows(documentId)
    expect(
      afterUnpublish.filter((r) => r.locale === "ar" && r.publishedAt)
    ).toHaveLength(0)

    // The default-locale draft is untouched: title, slug and credits intact.
    const fr = afterUnpublish.find(
      (r) => r.locale === "fr" && r.publishedAt === null
    )
    expect(fr.title).toBe(doc.title)
    expect(fr.slug).toBe(doc.slug)
    expect(fr.credits).toHaveLength(1)
    expect(fr.credits[0].person.documentId).toBe(parts.personId)
  })

  it("still evaluates the default-locale draft when a translation is published", async () => {
    // The fr draft has no poster; the en translation does. The guard reads the
    // fr draft, so the en publish is refused.
    const { parts, characterId, doc } = await createCreditedShort(
      uniq("ruleful"),
      { withPoster: false }
    )
    expect(await ensureTargets(parts, characterId, "en")).toEqual([
      200, 200, 200,
    ])
    const saved = await cmPut(
      CW,
      doc.documentId,
      { title: "English title", poster: parts.poster },
      "en"
    )
    expect(saved.status).toBe(200)

    const blocked = await cmAction(doc.documentId, "publish", "en")

    expect(blocked.status).toBe(400)
    expect(blocked.body.error.details.code).toBe("SHORT_FILM_PUBLISH_BLOCKED")
    expect(blocked.body.error.details.issues).toEqual([
      { code: "POSTER_REQUIRED", path: "poster" },
    ])
  })
})

describe("the public read follows what the admin publishes", () => {
  it("serves the published translation, drops out when the default language is unpublished and returns when it is republished", async () => {
    const { parts, characterId, doc } = await createCreditedShort(
      uniq("public")
    )
    const documentId = doc.documentId as string
    const publicUrl = `/api/creative-works/creative-works/short-films/${doc.slug}?locale=ar`

    // The `director` role is shared with earlier tests, so only the missing
    // targets are created; every creation succeeds.
    const created = await ensureTargets(parts, characterId, "ar")
    expect(created.every((status) => status === 200)).toBe(true)
    await cmPut(
      CW,
      documentId,
      { title: "عنوان عام", poster: parts.poster },
      "ar"
    )
    expect((await cmAction(documentId, "publish", "fr")).status).toBe(200)
    expect((await cmAction(documentId, "publish", "ar")).status).toBe(200)

    const served = await api().get(publicUrl)
    expect(served.status).toBe(200)
    expect(served.body.data.title).toBe("عنوان عام")
    expect(served.body.data.locale).toBe("ar")

    expect((await cmAction(documentId, "unpublish", "fr")).status).toBe(200)
    expect((await api().get(publicUrl)).status).toBe(404)

    expect((await cmAction(documentId, "publish", "fr")).status).toBe(200)
    const back = await api().get(publicUrl)
    expect(back.status).toBe(200)
    expect(back.body.data.title).toBe("عنوان عام")
  })
})

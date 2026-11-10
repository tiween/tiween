/**
 * Booted suite for the Works edit page's read route (plan 01-15, gap G-01-1).
 *
 * The content-manager single-document GET builds its populate with
 * `populateDeep(Infinity).countRelations()` and ignores the `populate` query
 * parameter, so every relation the Works form round-trips (genres, credit
 * persons and roles, cast persons and characters, the premiere venue) comes
 * back as `{ count: n }`. The form then crashed on `.map`, and the downstream
 * consumers (publish pre-check, translation targets) saw no director and no
 * credited persons. `GET /creative-works/admin/works/:documentId` is the
 * plugin-owned replacement: draft row, relations resolved, the content-manager's
 * own `{ data, meta }` envelope, RBAC-gated and coded.
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
import { evaluateShortFilmPublishRules } from "../../../../../shared/short-film-rules"
import { workToRuleInput } from "../../../../events-manager/admin/src/components/WorkForm/publishRules"
import {
  DEFAULT_WORK_VALUES,
  workToApiPayload,
  workToFormValues,
} from "../../../../events-manager/admin/src/components/WorkForm/schema"
import { collectTranslationTargets } from "../../../../events-manager/admin/src/hooks/translationTargets"
import { WORK_POPULATE } from "../../../../events-manager/admin/src/hooks/workPopulate"

// Suite-specific SQLite file so a leaked `.tmp/test.db` is never reused.
process.env.DATABASE_FILENAME = ".tmp/work-editor.db"

jest.setTimeout(120000)

const CW = "plugin::creative-works.creative-work" as any
const PERSON = "plugin::creative-works.person" as any
const GENRE = "plugin::creative-works.genre" as any
const CHARACTER = "plugin::creative-works.character" as any

let strapi: Core.Strapi
let adminToken: string
let destroyAdmin: () => Promise<void>
let scopedToken: string
let destroyScoped: () => Promise<void>

const api = () => request((strapi as any).server.httpServer)

const admin = <T extends { set: (k: string, v: string) => T }>(req: T) =>
  req.set("Authorization", `Bearer ${adminToken}`)

const uniq = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const cmUrl = (documentId: string) =>
  `/content-manager/collection-types/${CW}/${documentId}`

const editorUrl = (documentId: string) =>
  `/creative-works/admin/works/${documentId}`

const editorGet = (documentId: string, locale = "fr") =>
  admin(api().get(editorUrl(documentId)).query({ locale }))

const cmGet = (documentId: string, locale = "fr") =>
  admin(api().get(cmUrl(documentId)).query({ locale }))

const localePairs = (body: any) =>
  ((body?.meta?.availableLocales ?? []) as Array<any>)
    .map((entry) => `${entry.locale}:${entry.status}`)
    .sort()

interface SeededWork {
  documentId: string
  personId: string
  directorRoleId: string
  castPersonId: string
  characterId: string
  genreId: string
}

/** A short film with every relation the editor read has to resolve. */
async function seedFullWork(tag: string): Promise<SeededWork> {
  const parts = await publishableShortParts(strapi, tag)
  const genre: any = await strapi.documents(GENRE).create({
    data: { name: `Genre ${tag}`, slug: uniq(`genre-${tag}`) } as any,
    locale: "fr",
  } as any)
  const castPerson: any = await strapi.documents(PERSON).create({
    data: { name: `Actor ${tag}`, slug: uniq(`actor-${tag}`) } as any,
    locale: "fr",
    status: "published",
  } as any)
  const character: any = await strapi.documents(CHARACTER).create({
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
      poster: parts.poster,
      credits: parts.credits,
      streamingLinks: parts.streamingLinks,
      genres: [genre.documentId],
      cast: [
        {
          person: castPerson.documentId,
          character: character.documentId,
          billing: 1,
        },
      ],
    } as any,
    locale: "fr",
  } as any)
  return {
    documentId: doc.documentId,
    personId: parts.personId,
    directorRoleId: parts.directorRoleId,
    castPersonId: castPerson.documentId,
    characterId: character.documentId,
    genreId: genre.documentId,
  }
}

/** Every value found at a dotted path, walking arrays element by element. */
function valuesAt(root: any, path: string): unknown[] {
  let current: unknown[] = [root]
  for (const segment of path.split(".")) {
    current = current.flatMap((node) => {
      if (node === null || node === undefined) return []
      const next = (node as any)[segment]
      if (next === null || next === undefined) return []
      return Array.isArray(next) ? next : [next]
    })
  }
  return current
}

const isCountShape = (value: unknown) =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  typeof (value as any).count === "number"

let seeded: SeededWork
let emptyWorkId: string
let savedWork: SeededWork

beforeAll(async () => {
  strapi = await setupStrapi()
  const session = await createAdminSession(strapi)
  adminToken = session.token
  destroyAdmin = session.destroy
  const scoped = await createAdminSession(strapi, {
    permissions: ["plugin::venues.read"],
  })
  scopedToken = scoped.token
  destroyScoped = scoped.destroy

  seeded = await seedFullWork("we-main")
  savedWork = await seedFullWork("we-save")
  const empty: any = await strapi.documents(CW).create({
    data: {
      title: uniq("we-empty"),
      slug: uniq("we-empty"),
      type: "short-film",
    },
    locale: "fr",
  } as any)
  emptyWorkId = empty.documentId
})

afterAll(async () => {
  await destroyAdmin?.()
  await destroyScoped?.()
  await cleanupStrapi()
})

describe("why the editor route exists", () => {
  it("content-manager single-document GET counts relations (why the editor route exists)", async () => {
    const res = await cmGet(seeded.documentId)

    expect(res.status).toBe(200)
    expect(typeof res.body.data.genres.count).toBe("number")
    expect(typeof res.body.data.credits[0].person.count).toBe("number")

    // The damage downstream: no director slug, no credited persons.
    const issues = evaluateShortFilmPublishRules(
      workToRuleInput(res.body.data)
    ).issues
    expect(issues.map((issue: any) => issue.code)).toContain(
      "DIRECTOR_REQUIRED"
    )
    expect(collectTranslationTargets(res.body.data).persons).toEqual([])
  })
})

describe("GET /creative-works/admin/works/:documentId", () => {
  it("resolves every relation the form round-trips", async () => {
    const res = await editorGet(seeded.documentId)

    expect(res.status).toBe(200)
    const data = res.body.data

    for (const path of WORK_POPULATE) {
      for (const value of valuesAt(data, path)) {
        expect({ path, countShaped: isCountShape(value) }).toEqual({
          path,
          countShaped: false,
        })
      }
    }

    expect(typeof data.genres[0].documentId).toBe("string")
    expect(data.genres[0].documentId).toBe(seeded.genreId)
    expect(typeof data.genres[0].name).toBe("string")
    expect(data.credits[0].person.name).toBeTruthy()
    expect(data.credits[0].person.documentId).toBe(seeded.personId)
    expect(data.credits[0].creditRole.slug).toBe("director")
    expect(data.cast[0].person.name).toBeTruthy()
    expect(data.cast[0].character.name).toBeTruthy()
    expect(data.streamingLinks[0].url).toBeTruthy()
    expect(data.poster.url).toBeTruthy()

    for (const person of [data.credits[0].person, data.cast[0].person]) {
      expect(person).not.toHaveProperty("bio")
      expect(person).not.toHaveProperty("birthDate")
      expect(person).not.toHaveProperty("nationality")
    }
  })

  it("reports the same status and available locales as the content-manager through draft, published and modified", async () => {
    const work = await seedFullWork("we-parity")
    const id = work.documentId

    const compare = async (expected: string) => {
      const mine = await editorGet(id)
      const theirs = await cmGet(id)
      expect(mine.status).toBe(200)
      expect(theirs.status).toBe(200)
      expect(mine.body.data.status).toBe(expected)
      expect(mine.body.data.status).toBe(theirs.body.data.status)
      expect(localePairs(mine.body)).toEqual(localePairs(theirs.body))
    }

    await compare("draft")

    await strapi.documents(CW).publish({ documentId: id, locale: "fr" } as any)
    await compare("published")

    await strapi.documents(CW).update({
      documentId: id,
      locale: "fr",
      data: { title: uniq("we-parity-edited") },
    } as any)
    await compare("modified")
  })

  it("answers 200 with data {} for a locale with no row, and lists the other locales", async () => {
    const res = await editorGet(seeded.documentId, "ar")

    expect(res.status).toBe(200)
    expect(res.body.data).toEqual({})
    expect(
      (res.body.meta.availableLocales as Array<any>).map((l) => l.locale)
    ).toContain("fr")
  })

  it("answers coded errors: 404 WORK_NOT_FOUND, 400 UNSUPPORTED_LOCALE, 400 VALIDATION_FAILED", async () => {
    const missing = await editorGet("doesnotexist1234567890")
    expect(missing.status).toBe(404)
    expect(missing.body.error.details.code).toBe("WORK_NOT_FOUND")

    const badLocale = await editorGet(seeded.documentId, "xx")
    expect(badLocale.status).toBe(400)
    expect(badLocale.body.error.details.code).toBe("UNSUPPORTED_LOCALE")

    const extraParam = await admin(
      api().get(editorUrl(seeded.documentId)).query({ populate: "*" })
    )
    expect(extraParam.status).toBe(400)
    expect(extraParam.body.error.details.code).toBe("VALIDATION_FAILED")
  })

  it("requires an admin session (401) holding the content-manager read permission (403)", async () => {
    const anonymous = await api()
      .get(editorUrl(seeded.documentId))
      .query({ locale: "fr" })
    expect(anonymous.status).toBe(401)

    const unauthorized = await api()
      .get(editorUrl(seeded.documentId))
      .query({ locale: "fr" })
      .set("Authorization", `Bearer ${scopedToken}`)
    expect(unauthorized.status).toBe(403)
  })

  it("an empty work exposes every round-tripped key", async () => {
    const ROUND_TRIP_KEYS = Object.keys(
      workToApiPayload({ ...DEFAULT_WORK_VALUES, type: "short-film" })
    )
    const res = await editorGet(emptyWorkId)

    expect(res.status).toBe(200)
    const data = res.body.data

    for (const key of ROUND_TRIP_KEYS) {
      expect(Object.prototype.hasOwnProperty.call(data, key)).toBe(true)
      expect(data[key]).not.toBeUndefined()
    }

    expect(data.title).toBeTruthy()
    expect(data.slug).toBeTruthy()
    expect(data.type).toBe("short-film")
    expect(data.featured).toBe(false)

    const mustBeUnset = ROUND_TRIP_KEYS.filter(
      (key) => !["title", "slug", "type", "featured"].includes(key)
    )
    for (const key of mustBeUnset) {
      const value = data[key]
      const unset =
        value === null || (Array.isArray(value) && value.length === 0)
      expect({ key, unset }).toEqual({ key, unset: true })
    }
  })

  it("the editor read feeds the publish pre-check and the translation targets", async () => {
    const res = await editorGet(seeded.documentId)
    expect(res.status).toBe(200)
    const data = res.body.data

    const ruleInput = workToRuleInput(data)
    const director = ruleInput.credits.find(
      (credit: any) => credit.creditRole?.slug === "director"
    )
    expect(director?.person?.documentId).toBe(seeded.personId)
    expect(
      evaluateShortFilmPublishRules(ruleInput).issues.map(
        (issue: any) => issue.code
      )
    ).not.toContain("DIRECTOR_REQUIRED")

    const targets = collectTranslationTargets(data)
    expect(targets.persons).toEqual(
      expect.arrayContaining([seeded.personId, seeded.castPersonId])
    )
    expect(targets.roles.map((role) => role.documentId)).toContain(
      seeded.directorRoleId
    )
    expect(targets.characters.map((c) => c.documentId)).toContain(
      seeded.characterId
    )
  })

  it("a load-then-save writes no credit or cast row with a null person", async () => {
    const id = savedWork.documentId
    const before = await editorGet(id)
    expect(before.status).toBe(200)

    const payload = workToApiPayload(workToFormValues(before.body.data)) as any
    for (const row of [...payload.credits, ...payload.cast]) {
      expect(typeof row.person).toBe("string")
      expect(row.person.length).toBeGreaterThan(0)
    }
    expect(payload.credits[0].person).toBe(savedWork.personId)
    expect(payload.cast[0].person).toBe(savedWork.castPersonId)
    expect(payload.cast[0].character).toBe(savedWork.characterId)

    const saved = await admin(api().put(`${cmUrl(id)}?locale=fr`)).send(payload)
    expect(saved.status).toBe(200)

    const after = await editorGet(id)
    expect(after.status).toBe(200)
    const was = before.body.data
    const now = after.body.data
    expect(now.credits[0].person.documentId).toBe(
      was.credits[0].person.documentId
    )
    expect(now.credits[0].creditRole.slug).toBe(was.credits[0].creditRole.slug)
    expect(now.cast[0].person.documentId).toBe(was.cast[0].person.documentId)
    expect(now.cast[0].character.documentId).toBe(
      was.cast[0].character.documentId
    )
    expect(now.genres[0].documentId).toBe(was.genres[0].documentId)
    expect(now.streamingLinks.length).toBe(was.streamingLinks.length)
    for (const row of [...now.credits, ...now.cast]) {
      expect(row.person).not.toBeNull()
    }
  })

  it("a save that omits short-film-only keys keeps them", async () => {
    // 01-16: the Works form omits streamingLinks / featured / featuredRank for
    // a film or play instead of sending [] / null, because an update that omits
    // a key must leave the stored value alone (the 01-08 rule: stored
    // components are never stripped on a type switch).
    const stored = {
      platform: "youtube",
      url: "https://youtu.be/keep-me",
      accessType: "free",
    }
    const doc: any = await strapi.documents(CW).create({
      data: {
        title: uniq("keeps-short-only"),
        slug: uniq("keeps-short-only"),
        type: "short-film",
        streamingLinks: [stored],
        featured: true,
        featuredRank: 2,
      } as any,
      locale: "fr",
    } as any)

    const saved = await admin(
      api().put(`${cmUrl(doc.documentId)}?locale=fr`)
    ).send({ title: uniq("renamed"), type: "film" })
    expect(saved.status).toBe(200)

    const after = await editorGet(doc.documentId)
    expect(after.status).toBe(200)
    expect(after.body.data.type).toBe("film")
    expect(after.body.data.streamingLinks).toHaveLength(1)
    expect(after.body.data.streamingLinks[0].url).toBe(stored.url)
    expect(after.body.data.featured).toBe(true)
    expect(after.body.data.featuredRank).toBe(2)
  })

  it("a save that omits theatreDetails keeps the stored component", async () => {
    // WR-05 (owner decision 2026-11-10): the Works form omits theatreDetails
    // for every non-play type instead of sending null, so switching a play to
    // a film and saving must not wipe the theatre record.
    const doc: any = await strapi.documents(CW).create({
      data: {
        title: uniq("keeps-theatre"),
        slug: uniq("keeps-theatre"),
        type: "play",
        theatreDetails: {
          playType: "revival",
          format: "one-act",
          actCount: 1,
          hasIntermission: true,
          basedOn: "Keep me",
        },
      } as any,
      locale: "fr",
    } as any)

    const saved = await admin(
      api().put(`${cmUrl(doc.documentId)}?locale=fr`)
    ).send({ title: uniq("renamed-play"), type: "film" })
    expect(saved.status).toBe(200)

    const after = await editorGet(doc.documentId)
    expect(after.status).toBe(200)
    expect(after.body.data.type).toBe("film")
    expect(after.body.data.theatreDetails).toMatchObject({
      playType: "revival",
      format: "one-act",
      actCount: 1,
      hasIntermission: true,
      basedOn: "Keep me",
    })
  })
})

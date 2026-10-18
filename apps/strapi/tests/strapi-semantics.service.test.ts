import request from "supertest"

import type { Core } from "@strapi/strapi"

import { createAdminSession } from "./helpers/admin"
import { cleanupStrapi, setupStrapi } from "./helpers/strapi"

/**
 * Characterization suite: the Strapi semantics Phase 1 (short-film catalog
 * backend) relies on, pinned against a real booted Strapi on SQLite.
 *
 * KEPT, not throwaway. Each `describe` block records what the installed Strapi
 * version ACTUALLY does for one assumption (A1..A13 in 01-RESEARCH.md) and
 * asserts it, so a Strapi upgrade that changes the behaviour fails here, loudly,
 * instead of silently breaking the publish guard, the importer or the locale
 * overlay built on top of it.
 *
 * Named `*.service.test.ts` so it only runs under the opt-in integration
 * project (`yarn workspace @tiween/admin test:integration`) and never in the
 * default `yarn test` gate. Boot suites must run serially (`--runInBand`).
 */

// Suite-specific SQLite file so a leaked `.tmp/test.db` from another suite is
// never reused. `setupStrapi()` reads it when it is CALLED (not when the helper
// module is imported), so setting it after the imports is early enough.
process.env.DATABASE_FILENAME = ".tmp/strapi-semantics.db"

jest.setTimeout(120000)

let strapi: Core.Strapi
let adminToken: string
let destroyAdmin: () => Promise<void>

const api = () => request((strapi as any).server.httpServer)

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

describe("smoke: harness boots with the expected i18n and creative-works plugin", () => {
  it("resolves the default locale to fr", async () => {
    const defaultLocale = await strapi
      .plugin("i18n")
      .service("locales")
      .getDefaultLocale()
    expect(defaultLocale).toBe("fr")
  })

  it("answers the persons search route without a server error", async () => {
    const res = await api().get("/api/creative-works/persons/search?q=a")
    expect(res.status).toBeLessThan(500)
  })

  it("has fr, ar and en locales available at boot", async () => {
    const rows = (await strapi
      .plugin("i18n")
      .service("locales")
      .find()) as Array<{
      code: string
    }>
    expect(rows.map((r) => r.code).sort()).toEqual(["ar", "en", "fr"])
  })

  it("holds an admin session token", () => {
    expect(typeof adminToken).toBe("string")
    expect(adminToken.length).toBeGreaterThan(0)
  })
})

/* ------------------------------------------------------------------ helpers */

const CW = "plugin::creative-works.creative-work" as any
const GENRE = "plugin::creative-works.genre" as any
const PERSON = "plugin::creative-works.person" as any
const ROLE = "plugin::creative-works.credit-role" as any

/** Unique lowercase-ASCII slug so probes never collide across runs. */
const uniq = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const admin = <T extends { set: (k: string, v: string) => T }>(req: T) =>
  req.set("Authorization", `Bearer ${adminToken}`)

const cmPublish = (documentId: string, locale: string) =>
  admin(
    api().post(
      `/content-manager/collection-types/${CW}/${documentId}/actions/publish?locale=${locale}`
    )
  ).send({})

async function createDraftShort(
  tag: string,
  extra: Record<string, unknown> = {}
): Promise<{ documentId: string; slug: string }> {
  const slug = uniq(tag)
  const doc: any = await strapi.documents(CW).create({
    data: {
      title: `${tag} ${slug}`,
      slug,
      type: "short-film",
      ...extra,
    } as any,
    locale: "fr",
  } as any)
  return { documentId: doc.documentId, slug }
}

/** Find a published credit role by slug, creating it when the boot DB has none. */
async function ensureRole(slug: string, name: string, department: string) {
  const [existing]: any[] = await strapi.documents(ROLE).findMany({
    filters: { slug },
    status: "published",
  } as any)
  if (existing) return existing
  return strapi.documents(ROLE).create({
    data: { name, slug, department } as any,
    locale: "fr",
    status: "published",
  } as any) as any
}

/**
 * One document middleware for the whole file. `strapi.documents.use` has no
 * unregister, so the probes drive it through this shared, resettable state
 * instead of each registering their own.
 */
const probe = {
  recording: false,
  blockPublish: false,
  seen: [] as Array<{ action: string; locale?: string; status?: string }>,
}

beforeAll(() => {
  const { errors } = require("@strapi/utils")
  strapi.documents.use(async (ctx: any, next: any) => {
    if (ctx.uid === CW) {
      if (probe.recording) {
        probe.seen.push({
          action: ctx.action,
          locale: ctx.params?.locale,
          status: ctx.params?.status,
        })
      }
      if (probe.blockPublish && ctx.action === "publish") {
        throw new errors.ValidationError("Short film cannot be published", {
          code: "SHORT_FILM_PUBLISH_BLOCKED",
          issues: [{ path: ["poster"], code: "POSTER_REQUIRED" }],
        })
      }
    }
    return next()
  })
})

afterEach(() => {
  probe.recording = false
  probe.blockPublish = false
  probe.seen = []
})

/* ------------------------------------------------------------------- probes */

describe("A1: document middleware sees content-manager publish (steers 01-06 guard mechanism)", () => {
  it("fires a `publish` action for a content-manager publish, registered after boot", async () => {
    const { documentId } = await createDraftShort("a1-cm")

    probe.recording = true
    const res = await cmPublish(documentId, "fr")
    probe.recording = false

    expect(res.status).toBe(200)
    expect(probe.seen).toContainEqual({ action: "publish", locale: "fr" })
  })

  it("sees only `create` (no nested `publish`) for create({ status: 'published' })", async () => {
    const slug = uniq("a1-create")

    probe.recording = true
    await strapi.documents(CW).create({
      data: { title: `a1 create ${slug}`, slug, type: "short-film" } as any,
      locale: "fr",
      status: "published",
    } as any)
    probe.recording = false

    expect(probe.seen).toEqual([
      { action: "create", locale: "fr", status: "published" },
    ])
  })

  it("surfaces a ValidationError thrown from the middleware as an intact HTTP 400 and publishes nothing", async () => {
    const { documentId } = await createDraftShort("a1-block")

    probe.blockPublish = true
    const res = await cmPublish(documentId, "fr")
    probe.blockPublish = false

    expect(res.status).toBe(400)
    expect(res.body.error).toMatchObject({
      status: 400,
      name: "ValidationError",
      message: "Short film cannot be published",
      details: {
        code: "SHORT_FILM_PUBLISH_BLOCKED",
        issues: [{ path: ["poster"], code: "POSTER_REQUIRED" }],
      },
    })

    const published = await strapi.documents(CW).findOne({
      documentId,
      locale: "fr",
      status: "published",
    } as any)
    expect(published).toBeNull()
  })
})

describe("A2: republish resets publishedAt (steers 01-10 skip-if-unchanged)", () => {
  it("publishing an already-published document with no change re-stamps publishedAt on a new row", async () => {
    const { documentId } = await createDraftShort("a2")
    const read = () =>
      strapi.documents(CW).findOne({
        documentId,
        locale: "fr",
        status: "published",
      } as any) as Promise<any>

    await strapi.documents(CW).publish({ documentId, locale: "fr" } as any)
    const first = await read()
    await sleep(1100)
    await strapi.documents(CW).publish({ documentId, locale: "fr" } as any)
    const second = await read()

    expect(first.publishedAt).toBeTruthy()
    expect(second.publishedAt).not.toEqual(first.publishedAt)
    expect(new Date(second.publishedAt).getTime()).toBeGreaterThan(
      new Date(first.publishedAt).getTime()
    )
    // The published row is deleted and recreated, not updated in place.
    expect(second.id).not.toEqual(first.id)
  })
})

describe("A3: content-manager PUT ?locale= creates a missing locale row (steers 01-09 locale tabs vs D-22 fallback)", () => {
  it("creates the ar draft row from localized fields only and returns 200", async () => {
    const { documentId, slug } = await createDraftShort("a3", {
      synopsis: "synopsis fr",
    })

    const before = await strapi.documents(CW).findOne({
      documentId,
      locale: "ar",
      status: "draft",
    } as any)
    expect(before).toBeNull()

    const res = await admin(
      api().put(
        `/content-manager/collection-types/${CW}/${documentId}?locale=ar`
      )
    ).send({ title: `a3 ar ${slug}`, synopsis: "synopsis ar" })

    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({
      documentId,
      locale: "ar",
      title: `a3 ar ${slug}`,
    })

    const ar: any = await strapi.documents(CW).findOne({
      documentId,
      locale: "ar",
      status: "draft",
    } as any)
    expect(ar).toMatchObject({
      locale: "ar",
      title: `a3 ar ${slug}`,
      synopsis: "synopsis ar",
      type: "short-film",
    })
  })

  it("copies non-localized scalars to the new locale row but NOT the uid `slug` (it stays null)", async () => {
    const { documentId, slug } = await createDraftShort("a3-slug", {
      duration: 12,
    })

    await admin(
      api().put(
        `/content-manager/collection-types/${CW}/${documentId}?locale=ar`
      )
    ).send({ title: `a3 slug ar ${slug}` })

    const ar: any = await strapi.documents(CW).findOne({
      documentId,
      locale: "ar",
      status: "draft",
    } as any)
    const fr: any = await strapi.documents(CW).findOne({
      documentId,
      locale: "fr",
      status: "draft",
    } as any)

    expect(ar.duration).toBe(12)
    expect(ar.type).toBe("short-film")
    expect(fr.slug).toBe(slug)
    // Consequence for the public API: resolve and expose the slug from the
    // default-locale row; a non-default row cannot be looked up by slug.
    expect(ar.slug).toBeNull()
  })
})

describe("A4: relations populated from a non-default locale row (steers 01-03 overlay keeps relations from the default-locale row)", () => {
  it("drops genres on the ar published row while the fr row keeps them", async () => {
    const genreSlug = uniq("a4-genre")
    const genre: any = await strapi.documents(GENRE).create({
      data: { name: `Genre ${genreSlug}`, slug: genreSlug } as any,
      locale: "fr",
    } as any)
    const work = await createDraftShort("a4", { genres: [genre.documentId] })

    await strapi.documents(CW).update({
      documentId: work.documentId,
      locale: "ar",
      data: { title: `a4 ar ${work.slug}` },
    } as any)
    await strapi.documents(CW).publish({
      documentId: work.documentId,
      locale: "*",
    } as any)

    const find = (locale: string) =>
      strapi.documents(CW).findOne({
        documentId: work.documentId,
        locale,
        status: "published",
        populate: { genres: true },
      } as any) as Promise<any>
    const ar = await find("ar")
    const fr = await find("fr")

    expect(ar).toMatchObject({ locale: "ar", title: `a4 ar ${work.slug}` })
    expect(fr.genres).toHaveLength(1)
    // The genre is localized and has no ar row, so the ar row's relation to it
    // is empty: the read-time overlay must take relations from the fr row.
    expect(ar.genres).toHaveLength(0)
  })
})

describe("A5: nested credits.person + creditRole.slug filter (steers 01-04 related query, no in-memory fallback needed)", () => {
  it("returns only the short credited to that person in the director role", async () => {
    const personSlug = uniq("a5-person")
    const person: any = await strapi.documents(PERSON).create({
      data: { name: `Person ${personSlug}`, slug: personSlug } as any,
      locale: "fr",
      status: "published",
    } as any)
    const otherSlug = uniq("a5-other")
    const other: any = await strapi.documents(PERSON).create({
      data: { name: `Person ${otherSlug}`, slug: otherSlug } as any,
      locale: "fr",
      status: "published",
    } as any)
    const director = await ensureRole("director", "Realisateur", "directing")
    const writer = await ensureRole("screenwriter", "Scenariste", "writing")

    const publishShort = async (tag: string, credits: unknown[]) => {
      const slug = uniq(tag)
      return (await strapi.documents(CW).create({
        data: {
          title: `${tag} ${slug}`,
          slug,
          type: "short-film",
          credits,
        } as any,
        locale: "fr",
        status: "published",
      } as any)) as any
    }
    const directed = await publishShort("a5-directed", [
      {
        person: person.documentId,
        creditRole: director.documentId,
        billing: 1,
      },
    ])
    const wrote = await publishShort("a5-wrote", [
      { person: person.documentId, creditRole: writer.documentId, billing: 1 },
    ])
    const otherDirected = await publishShort("a5-other-directed", [
      { person: other.documentId, creditRole: director.documentId, billing: 1 },
    ])

    const found: any[] = await strapi.documents(CW).findMany({
      status: "published",
      filters: {
        type: "short-film",
        credits: {
          person: { documentId: { $in: [person.documentId] } },
          creditRole: { slug: "director" },
        },
      },
    } as any)
    const ids = found.map((f) => f.documentId)

    expect(ids).toContain(directed.documentId)
    expect(ids).not.toContain(wrote.documentId)
    expect(ids).not.toContain(otherDirected.documentId)
  })
})

describe("A13: upload plugin enabled and provider resolution (steers 01-10 provider fail-closed check)", () => {
  it("keeps the upload plugin loaded although config/plugins.ts declares enabled:false", () => {
    expect(strapi.plugin("upload")).toBeDefined()
    const cfg: any = strapi.config.get("plugin::upload")
    expect(cfg.enabled).toBe(true)
  })

  it("resolves the `local` provider, or the ImageKit provider when credentials are configured (provider name and option key names only, never values)", () => {
    const cfg: any = strapi.config.get("plugin::upload")

    expect(["local", "strapi-provider-upload-imagekit"]).toContain(cfg.provider)
    if (cfg.provider !== "local") {
      expect(Object.keys(cfg.providerOptions ?? {})).toEqual(
        expect.arrayContaining(["publicKey", "privateKey", "urlEndpoint"])
      )
    }
  })
})

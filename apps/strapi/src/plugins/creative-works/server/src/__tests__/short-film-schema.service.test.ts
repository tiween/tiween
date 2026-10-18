/**
 * Booted round trip for the short-film schema delta (plan 01-02, SDATA-01).
 *
 * Proves, on a real Strapi over SQLite, that the new `country`, `language`,
 * `streamingLinks`, `featured` and `featuredRank` attributes of `creative-work`
 * boot, persist, and stay in sync between the default-locale row and the `en`
 * row (they are explicitly non-localized), and that the `en` locale exists.
 *
 * Named `*.service.test.ts`: opt-in integration project only
 * (`yarn workspace @tiween/admin test:integration`), run serially.
 */
import type { Core } from "@strapi/strapi"

import { publishableShortParts } from "../../../../../../tests/fixtures/publishable-short"
import {
  cleanupStrapi,
  setupStrapi,
} from "../../../../../../tests/helpers/strapi"

// Suite-specific SQLite file so a leaked `.tmp/test.db` is never reused.
// `setupStrapi()` reads it when called, not when the helper is imported.
process.env.DATABASE_FILENAME = ".tmp/short-film-schema.db"

jest.setTimeout(120000)

const CW = "plugin::creative-works.creative-work" as any

let strapi: Core.Strapi

const uniq = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

beforeAll(async () => {
  strapi = await setupStrapi()
})

afterAll(async () => {
  await cleanupStrapi()
})

describe("short-film schema delta (integration)", () => {
  it("has the en locale after boot alongside fr (default) and ar", async () => {
    const locales = strapi.plugin("i18n").service("locales")
    expect(await locales.findByCode("en")).toBeTruthy()
    expect(await locales.findByCode("ar")).toBeTruthy()
    expect(await locales.getDefaultLocale()).toBe("fr")
  })

  it("round-trips the new fields identically in the default and en rows", async () => {
    const slug = uniq("schema-roundtrip")
    const link = {
      platform: "youtube",
      url: "https://www.youtube.com/watch?v=abc",
      accessType: "free",
      label: null,
    }

    // The short is published below, so it must satisfy the D-19 publish guard
    // (poster, directing credit, watch source). Its `en` row copies the credits,
    // so the director's person and credit-role need `en` rows first.
    const parts = await publishableShortParts(strapi, "schema-roundtrip", {
      locales: ["en"],
    })

    const created: any = await strapi.documents(CW).create({
      data: {
        title: "Aller-retour",
        slug,
        type: "short-film",
        country: ["TN", "FR"],
        language: ["aeb", "fr"],
        streamingLinks: [link],
        featured: true,
        featuredRank: 1,
        poster: parts.poster,
        credits: parts.credits,
      } as any,
      locale: "fr",
    } as any)

    await strapi.documents(CW).update({
      documentId: created.documentId,
      locale: "en",
      data: { title: "Round trip" } as any,
    } as any)

    await strapi.documents(CW).publish({
      documentId: created.documentId,
      locale: "*",
    } as any)

    const read = (locale: string) =>
      strapi.documents(CW).findOne({
        documentId: created.documentId,
        locale,
        status: "published",
        populate: { streamingLinks: true },
      } as any) as Promise<any>

    const fr = await read("fr")
    const en = await read("en")

    for (const row of [fr, en]) {
      expect(row.country).toEqual(["TN", "FR"])
      expect(row.language).toEqual(["aeb", "fr"])
      expect(row.featured).toBe(true)
      expect(row.featuredRank).toBe(1)
      expect(row.streamingLinks).toHaveLength(1)
      expect(row.streamingLinks[0]).toMatchObject(link)
    }
    expect(fr.title).toBe("Aller-retour")
    expect(en.title).toBe("Round trip")
  })

  it("reads omitted country/language back as null and [] back as []", async () => {
    const omitted: any = await strapi.documents(CW).create({
      data: {
        title: "Sans pays",
        slug: uniq("schema-omitted"),
        type: "short-film",
      } as any,
      locale: "fr",
    } as any)
    const empty: any = await strapi.documents(CW).create({
      data: {
        title: "Pays vide",
        slug: uniq("schema-empty"),
        type: "short-film",
        country: [],
        language: [],
      } as any,
      locale: "fr",
    } as any)

    const readDraft = (documentId: string) =>
      strapi.documents(CW).findOne({ documentId, locale: "fr" } as any) as any

    const a = await readDraft(omitted.documentId)
    const b = await readDraft(empty.documentId)

    expect(a.country).toBeNull()
    expect(a.language).toBeNull()
    expect(a.featured).toBe(false)
    expect(a.featuredRank).toBeNull()
    expect(b.country).toEqual([])
    expect(b.language).toEqual([])
  })

  it("still round-trips a pre-existing field (duration) unchanged", async () => {
    const created: any = await strapi.documents(CW).create({
      data: {
        title: "Durée",
        slug: uniq("schema-duration"),
        type: "short-film",
        duration: 17,
      } as any,
      locale: "fr",
    } as any)

    const row: any = await strapi
      .documents(CW)
      .findOne({ documentId: created.documentId, locale: "fr" } as any)
    expect(row.duration).toBe(17)
  })
})

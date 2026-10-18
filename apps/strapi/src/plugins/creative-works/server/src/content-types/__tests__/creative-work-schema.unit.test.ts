/**
 * Schema contract test for `creative-work` (plan 01-02, threat T-01-03).
 *
 * `main` auto-deploys and Strapi syncs the schema at boot against live data, so
 * the short-film delta must be strictly additive. This pins: every pre-existing
 * attribute key, `collectionName`, and `poster` localization stay unchanged; the
 * five new attributes are explicitly non-localized; and the streaming-link
 * component enums are the same lists the shared rules module validates against
 * (single source of truth).
 */
import streamingLink from "../../../../../../components/creative-works/streaming-link.json"
import {
  STREAMING_ACCESS_TYPES,
  STREAMING_PLATFORMS,
} from "../../../../../../shared/short-film-rules"
import schema from "../creative-work/schema.json"

const PRE_EXISTING_KEYS = [
  "title",
  "originalTitle",
  "slug",
  "type",
  "synopsis",
  "duration",
  "releaseYear",
  "genres",
  "cast",
  "credits",
  "poster",
  "backdrop",
  "photos",
  "videos",
  "rating",
  "ageRating",
  "distinctions",
  "theatreDetails",
  "externalIds",
  "links",
]

const NEW_KEYS = [
  "country",
  "language",
  "streamingLinks",
  "featured",
  "featuredRank",
]

describe("creative-work schema contract", () => {
  const attributes = schema.attributes as Record<string, any>

  it("keeps collectionName creative_works", () => {
    expect(schema.collectionName).toBe("creative_works")
  })

  it("keeps all 20 pre-existing attribute keys", () => {
    expect(PRE_EXISTING_KEYS).toHaveLength(20)
    for (const key of PRE_EXISTING_KEYS) {
      expect(attributes[key]).toBeDefined()
    }
  })

  it("keeps the type enum unchanged", () => {
    expect(attributes.type.enum).toEqual(["film", "play", "short-film"])
  })

  it("keeps poster localized", () => {
    expect(attributes.poster.pluginOptions.i18n.localized).toBe(true)
  })

  it.each(NEW_KEYS)("declares %s as explicitly non-localized", (key) => {
    expect(attributes[key]).toBeDefined()
    expect(attributes[key].pluginOptions.i18n.localized).toBe(false)
    expect(attributes[key].required).toBeUndefined()
  })

  it("wires streamingLinks to the streaming-link component", () => {
    expect(attributes.streamingLinks).toMatchObject({
      type: "component",
      repeatable: true,
      component: "creative-works.streaming-link",
    })
  })

  it("defaults featured to false and bounds featuredRank at 1", () => {
    expect(attributes.featured.default).toBe(false)
    expect(attributes.featuredRank.min).toBe(1)
  })
})

describe("creative-works.streaming-link component contract", () => {
  const attributes = streamingLink.attributes as Record<string, any>

  it("uses the expected collectionName", () => {
    expect(streamingLink.collectionName).toBe(
      "components_creative_works_streaming_links"
    )
  })

  it("keeps the platform enum equal to STREAMING_PLATFORMS (order included)", () => {
    expect(attributes.platform.enum).toEqual([...STREAMING_PLATFORMS])
    expect(attributes.platform.required).toBe(true)
  })

  it("keeps the accessType enum equal to STREAMING_ACCESS_TYPES (order included)", () => {
    expect(attributes.accessType.enum).toEqual([...STREAMING_ACCESS_TYPES])
    expect(attributes.accessType.required).toBe(true)
    expect(attributes.accessType.default).toBe("free")
  })

  it("requires url", () => {
    expect(attributes.url.required).toBe(true)
  })
})

/**
 * Unit tests for the creative-work seed payload helpers.
 *
 * Covers every row of the DW-13 I/O & edge-case matrix (directors -> credits,
 * cast -> cast, trailer -> videos, plus the unresolvable-person and
 * missing-credit-role degradations) AND the thing the original bug actually
 * needed: an assertion that every key written to Strapi exists on the real
 * schema JSON. The pre-fix code wrote `directors`/`trailer` — keys that do not
 * exist on `creative-work` — and Strapi dropped them silently.
 */
import type { CreativeWorkSeed } from "./creative-work-relations"
import type { IdMap } from "./types"

import videoComponent from "../../../src/components/common/video.json"
import castComponent from "../../../src/components/creative-works/cast.json"
import creditComponent from "../../../src/components/creative-works/credit.json"
import creativeWorkSchema from "../../../src/plugins/creative-works/server/src/content-types/creative-work/schema.json"
import creditRoleSchema from "../../../src/plugins/creative-works/server/src/content-types/credit-role/schema.json"
import creativeWorksData from "../data/creative-works.json"
import creditRolesData from "../data/credit-roles.json"
import genresData from "../data/genres.json"
import personsData from "../data/persons.json"
import {
  buildCast,
  buildCreativeWorkData,
  buildCredits,
  buildVideos,
} from "./creative-work-relations"

const persons: IdMap = {
  "kaouther-ben-hania": "doc-kaouther",
  "yahya-mahayni": "doc-yahya",
  "dea-liane": "doc-dea",
}

const genres: IdMap = { drame: "doc-drame" }

const DIRECTOR_ROLE_ID = "doc-director-role"

const WORK: CreativeWorkSeed = {
  title: "L'Homme qui a vendu sa peau",
  originalTitle: "The Man Who Sold His Skin",
  slug: "homme-vendu-sa-peau",
  type: "film",
  synopsis: "…",
  duration: 104,
  releaseYear: 2020,
  ageRating: "TP",
  rating: 7.2,
  genres: ["drame"],
  directors: ["kaouther-ben-hania"],
  cast: ["yahya-mahayni", "dea-liane"],
  trailer: "https://youtu.be/x",
}

describe("buildCredits", () => {
  it("maps a resolvable director to a credit with the director credit-role", () => {
    expect(
      buildCredits(["kaouther-ben-hania"], persons, DIRECTOR_ROLE_ID)
    ).toEqual([
      { person: "doc-kaouther", creditRole: DIRECTOR_ROLE_ID, billing: 1 },
    ])
  })

  it("numbers billing from 1 in source order", () => {
    expect(
      buildCredits(
        ["kaouther-ben-hania", "yahya-mahayni"],
        persons,
        DIRECTOR_ROLE_ID
      ).map((credit) => credit.billing)
    ).toEqual([1, 2])
  })

  it("drops unresolvable person slugs, warns, and keeps the rest", () => {
    const warn = jest.fn()

    expect(
      buildCredits(
        ["ghost-person", "kaouther-ben-hania"],
        persons,
        DIRECTOR_ROLE_ID,
        warn
      )
    ).toEqual([
      { person: "doc-kaouther", creditRole: DIRECTOR_ROLE_ID, billing: 1 },
    ])
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("ghost-person"))
  })

  it("returns an empty array and warns when the director credit-role is unknown", () => {
    const warn = jest.fn()

    expect(
      buildCredits(["kaouther-ben-hania"], persons, undefined, warn)
    ).toEqual([])
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("director"))
  })

  it("returns an empty array without warning when there are no directors", () => {
    const warn = jest.fn()

    expect(buildCredits(undefined, persons, undefined, warn)).toEqual([])
    expect(buildCredits([], persons, DIRECTOR_ROLE_ID, warn)).toEqual([])
    expect(warn).not.toHaveBeenCalled()
  })
})

describe("buildCast", () => {
  it("maps cast slugs to person entries with 1-based billing and no character", () => {
    expect(buildCast(["yahya-mahayni", "dea-liane"], persons)).toEqual([
      { person: "doc-yahya", billing: 1 },
      { person: "doc-dea", billing: 2 },
    ])
  })

  it("never emits a character key", () => {
    const entries = buildCast(["yahya-mahayni"], persons)
    expect(Object.keys(entries[0]).sort()).toEqual(["billing", "person"])
  })

  it("drops unresolvable person slugs and keeps the rest", () => {
    expect(buildCast(["ghost-person", "dea-liane"], persons)).toEqual([
      { person: "doc-dea", billing: 1 },
    ])
  })

  it("returns an empty array when there is no cast", () => {
    expect(buildCast(undefined, persons)).toEqual([])
    expect(buildCast([], persons)).toEqual([])
  })
})

describe("buildVideos", () => {
  it("maps a trailer URL to a single trailer video", () => {
    expect(buildVideos("https://youtu.be/x")).toEqual([
      { url: "https://youtu.be/x", videoType: "trailer" },
    ])
  })

  it("returns an empty array when the trailer is absent, null or blank", () => {
    expect(buildVideos(undefined)).toEqual([])
    expect(buildVideos(null)).toEqual([])
    expect(buildVideos("")).toEqual([])
    expect(buildVideos("   ")).toEqual([])
  })
})

describe("buildCreativeWorkData — write-contract guard (DW-13)", () => {
  const context = { genres, persons, directorRoleId: DIRECTOR_ROLE_ID }

  it("writes only keys that exist on creative-work/schema.json", () => {
    const data = buildCreativeWorkData(WORK, context)
    const schemaKeys = Object.keys(creativeWorkSchema.attributes)
    const unknownKeys = Object.keys(data).filter(
      (key) => !schemaKeys.includes(key)
    )

    expect(unknownKeys).toEqual([])
  })

  it("never re-introduces the phantom directors/trailer keys", () => {
    const data = buildCreativeWorkData(WORK, context)

    expect(data).not.toHaveProperty("directors")
    expect(data).not.toHaveProperty("trailer")
    expect(data.credits).toHaveLength(1)
    expect(data.videos).toEqual([
      { url: "https://youtu.be/x", videoType: "trailer" },
    ])
  })

  it("writes component entries whose keys exist on the component schemas", () => {
    const data = buildCreativeWorkData(WORK, context)

    const creditKeys = Object.keys(creditComponent.attributes)
    const castKeys = Object.keys(castComponent.attributes)
    const videoKeys = Object.keys(videoComponent.attributes)

    // Preconditions: the loops below assert nothing on empty arrays, so a
    // fixture that lost its director/cast/trailer would report green.
    expect(data.credits.length).toBeGreaterThan(0)
    expect(data.cast.length).toBeGreaterThan(0)
    expect(data.videos.length).toBeGreaterThan(0)

    for (const credit of data.credits) {
      expect(creditKeys).toEqual(expect.arrayContaining(Object.keys(credit)))
    }
    for (const entry of data.cast) {
      expect(castKeys).toEqual(expect.arrayContaining(Object.keys(entry)))
    }
    for (const video of data.videos) {
      expect(videoKeys).toEqual(expect.arrayContaining(Object.keys(video)))
    }
  })

  /**
   * Cross-file guard: every genre/person slug referenced by
   * `data/creative-works.json` must exist in `data/genres.json` /
   * `data/persons.json`. The id maps are built from those files — NOT from the
   * works themselves, which would make the assertion tautological — because a
   * slug that does not resolve is dropped with a warning at seed time, which is
   * the same silent-empty-relations failure DW-13 was opened for.
   */
  it("resolves every genre and person slug in the real seed data", () => {
    const genreMap: IdMap = {}
    for (const genre of genresData) genreMap[genre.slug] = `doc-${genre.slug}`

    const personMap: IdMap = {}
    for (const person of personsData) {
      personMap[person.slug] = `doc-${person.slug}`
    }

    const warn = jest.fn()
    for (const work of creativeWorksData as CreativeWorkSeed[]) {
      buildCreativeWorkData(
        work,
        {
          genres: genreMap,
          persons: personMap,
          directorRoleId: DIRECTOR_ROLE_ID,
        },
        warn
      )
    }

    expect(warn.mock.calls).toEqual([])
  })

  /**
   * The write-contract guard checks key NAMES against the schema. Enumeration
   * attributes also constrain their VALUES, and a bad one is only rejected by a
   * live Strapi — which the unit gate never boots.
   */
  it("writes enumeration values the creative-work schema accepts", () => {
    const types = new Set(creativeWorkSchema.attributes.type.enum)
    const ageRatings = new Set(creativeWorkSchema.attributes.ageRating.enum)
    const videoTypes = new Set(videoComponent.attributes.videoType.enum)

    for (const work of creativeWorksData as CreativeWorkSeed[]) {
      const data = buildCreativeWorkData(work, {
        genres: {},
        persons: {},
        directorRoleId: DIRECTOR_ROLE_ID,
      })

      expect(types.has(data.type)).toBe(true)
      if (data.ageRating !== undefined) {
        expect(ageRatings.has(data.ageRating)).toBe(true)
      }
      for (const video of data.videos) {
        expect(videoTypes.has(video.videoType)).toBe(true)
      }
    }
  })
})

describe("credit-roles.json vocabulary", () => {
  const slugs = creditRolesData.map((role) => role.slug)

  it("has unique slugs and departments inside the schema enum", () => {
    expect(new Set(slugs).size).toBe(slugs.length)

    const departments = new Set(creditRoleSchema.attributes.department.enum)
    for (const role of creditRolesData) {
      expect(departments.has(role.department)).toBe(true)
    }
  })

  /**
   * `seedCreditRoles` spreads this file straight into `create()`, so a key that
   * does not exist on `credit-role/schema.json` is dropped silently — the same
   * phantom-field class DW-13 was about, in the seeder this change introduced.
   */
  it("carries only keys that exist on credit-role/schema.json", () => {
    const schemaKeys = Object.keys(creditRoleSchema.attributes)

    for (const role of creditRolesData) {
      expect(schemaKeys).toEqual(expect.arrayContaining(Object.keys(role)))
    }
  })

  it("carries every non-empty field the tightened credit-role schema requires", () => {
    for (const role of creditRolesData) {
      expect(role.name.length).toBeGreaterThan(0)
      expect(role.slug.length).toBeGreaterThan(0)
      expect(role.department.length).toBeGreaterThan(0)
    }
  })

  /**
   * The play-contribution wizard resolves crew credits by slug against these
   * records (`apps/client/src/app/api/contribute/play/route.ts` →
   * `resolveCreditRoleId`), and `credit.creditRole` is a REQUIRED relation, so
   * a missing slug means the whole submission is rejected. Slug list mirrors
   * `roleInfo` in `features/contribute/components/steps/CreditsStep.tsx`
   * (minus `cast`, which becomes a cast entry, not a crew credit).
   */
  const WIZARD_CREW_SLUGS = [
    "playwright",
    "director",
    "adaptor",
    "translator",
    "composer",
    "musical-director",
    "choreographer",
    "set-designer",
    "costume-designer",
    "lighting-designer",
    "sound-designer",
    "projection-designer",
    "stage-manager",
    "producer",
    "other",
  ]

  it.each(WIZARD_CREW_SLUGS)("covers the wizard crew slug %s", (slug) => {
    expect(slugs).toContain(slug)
  })

  it("seeds the director role the creative-work seeder keys on", () => {
    expect(slugs).toContain("director")
  })
})

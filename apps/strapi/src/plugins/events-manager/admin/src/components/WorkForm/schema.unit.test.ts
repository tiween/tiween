/**
 * WorkForm schema unit tests
 *
 * Covers the I/O matrix of DW-10: the credit shape after story 2C.3
 * (`creditRole` relation, no `role`/`character`), the new `cast[]` field, and
 * the video legacy-`type` passthrough alongside the authoritative `videoType`.
 */

import type { CreativeWork } from "../../hooks/useCreativeWorks"
import type { WorkFormValues } from "./schema"

// Read straight from the component schema — this is the authority both the
// admin dropdown and the client wizard have to agree with.
import videoComponent from "../../../../../../components/common/video.json"
import streamingLinkComponent from "../../../../../../components/creative-works/streaming-link.json"
import {
  STREAMING_ACCESS_TYPES,
  STREAMING_PLATFORMS,
} from "../../../../../../shared/short-film-rules"
import creativeWorkSchema from "../../../../../creative-works/server/src/content-types/creative-work/schema.json"
import { WORK_POPULATE } from "../../hooks/workPopulate"
import { VIDEO_TYPES } from "../Catalog/options"
import {
  castFormSchema,
  clampBilling,
  creditFormSchema,
  DEFAULT_THEATRE_DETAILS,
  DEFAULT_WORK_VALUES,
  EMPTY_STREAMING_LINK,
  EMPTY_VIDEO,
  findUnresolvedRelations,
  SHORT_FILM_ONLY_KEYS,
  streamingLinkFormSchema,
  videoFormSchema,
  workFormSchema,
  workToApiPayload,
  workToFormValues,
} from "./schema"

const PERSON = { id: 1, documentId: "person-doc-1", name: "Fatma" }
const ROLE = {
  id: 2,
  documentId: "role-doc-1",
  name: "Director",
  slug: "director",
}
const OTHER_ROLE = {
  id: 3,
  documentId: "role-doc-other",
  name: "Other",
  slug: "other",
}
const CHARACTER = { id: 4, documentId: "char-doc-1", name: "Hamlet" }

function values(overrides: Partial<WorkFormValues> = {}): WorkFormValues {
  return { ...DEFAULT_WORK_VALUES, title: "A work", ...overrides }
}

interface CreditPayload {
  person: string | null
  creditRole: string | null
  customRole: string | null
  billing: number
}

interface CastPayload {
  person: string | null
  character: string | null
  billing: number
}

interface VideoPayload {
  url: string
  type: string | null
  videoType: string | null
}

describe("workToApiPayload — credits", () => {
  it("sends person + creditRole documentIds and no role/character keys", () => {
    const payload = workToApiPayload(
      values({
        credits: [
          {
            person: PERSON,
            creditRole: ROLE,
            customRole: "",
            billing: 1,
          },
        ],
      })
    )

    const credits = payload.credits as CreditPayload[]
    expect(credits[0]).toEqual({
      person: "person-doc-1",
      creditRole: "role-doc-1",
      customRole: null,
      billing: 1,
    })
    expect(Object.keys(credits[0])).not.toContain("role")
    expect(Object.keys(credits[0])).not.toContain("character")
    expect(JSON.stringify(payload.credits)).not.toContain('"character"')
  })

  it("sends a filled customRole verbatim and a blank one as null", () => {
    const payload = workToApiPayload(
      values({
        credits: [
          {
            person: PERSON,
            creditRole: OTHER_ROLE,
            customRole: "Dramaturg",
            billing: 99,
          },
          {
            person: PERSON,
            creditRole: ROLE,
            customRole: "   ",
            billing: 99,
          },
        ],
      })
    )

    const credits = payload.credits as CreditPayload[]
    expect(credits[0].customRole).toBe("Dramaturg")
    expect(credits[1].customRole).toBeNull()
  })

  // The pre-2C.3 code nulled customRole outside `role === "other"`. Without
  // this, a row can persist "Director" + customRole "Producer" — two role
  // names on one credit, with no way for a consumer to know which wins.
  it("drops customRole when the picked role is not the generic one", () => {
    const payload = workToApiPayload(
      values({
        credits: [
          {
            person: PERSON,
            creditRole: ROLE,
            customRole: "Producer",
            billing: 1,
          },
        ],
      })
    )

    const credits = payload.credits as CreditPayload[]
    expect(credits[0].creditRole).toBe("role-doc-1")
    expect(credits[0].customRole).toBeNull()
  })

  // Strapi derives the slug from the localized name and this project's
  // defaultLocale is `fr`, so the catch-all record is as likely to be `autre`
  // as `other`. Keying on a single slug silently disables the rule.
  it("treats the French catch-all slug as generic too", () => {
    const autre = {
      id: 9,
      documentId: "role-doc-autre",
      name: "Autre",
      slug: "autre",
    }

    expect(
      creditFormSchema.safeParse({
        person: PERSON,
        creditRole: autre,
        customRole: "",
        billing: 1,
      }).success
    ).toBe(false)

    const payload = workToApiPayload(
      values({
        credits: [
          {
            person: PERSON,
            creditRole: autre,
            customRole: "Dramaturg",
            billing: 1,
          },
        ],
      })
    )
    expect((payload.credits as CreditPayload[])[0].customRole).toBe("Dramaturg")
  })
})

describe("clampBilling", () => {
  it.each([
    [0, 1],
    [-5, 1],
    [1000, 999],
    [12.4, 12],
    [50, 50],
  ])("clamps %p to %p", (input, expected) => {
    expect(clampBilling(input)).toBe(expected)
  })

  // A cleared input is not a value to clamp: snapping it to a bound rewrites
  // what the editor is mid-way through typing. Callers keep the old value.
  it("returns undefined for an empty input rather than a bound", () => {
    expect(clampBilling(undefined)).toBeUndefined()
    expect(clampBilling(Number.NaN)).toBeUndefined()
  })
})

describe("workToApiPayload — cast", () => {
  it("sends a cast row with no character as character: null", () => {
    const payload = workToApiPayload(
      values({
        cast: [{ person: PERSON, character: null, billing: 3 }],
      })
    )

    const cast = payload.cast as CastPayload[]
    expect(cast[0]).toEqual({
      person: "person-doc-1",
      character: null,
      billing: 3,
    })
  })

  it("sends the character documentId when one is picked", () => {
    const payload = workToApiPayload(
      values({
        cast: [{ person: PERSON, character: CHARACTER, billing: 1 }],
      })
    )

    const cast = payload.cast as CastPayload[]
    expect(cast[0].character).toBe("char-doc-1")
  })
})

describe("workToApiPayload — videos", () => {
  it("preserves the legacy type through a load → edit → save round trip", () => {
    const work = {
      title: "A work",
      type: "film",
      videos: [
        { url: "https://youtu.be/abc", type: "TEASER", videoType: null },
      ],
    } as unknown as CreativeWork

    const formValues = workToFormValues(work)
    expect(formValues.videos[0]).toEqual({
      url: "https://youtu.be/abc",
      legacyType: "TEASER",
      videoType: "teaser",
    })

    const payload = workToApiPayload(formValues)
    const videos = payload.videos as VideoPayload[]
    expect(videos[0]).toEqual({
      url: "https://youtu.be/abc",
      type: "TEASER",
      videoType: "teaser",
    })
  })

  it.each([
    ["FULL_LENGTH", "full-length"],
    ["TEASER", "teaser"],
    ["CLIP", "clip"],
  ])(
    "seeds videoType from the legacy %s rather than promoting it to trailer",
    (legacy, expected) => {
      const work = {
        title: "A work",
        type: "film",
        videos: [{ url: "https://youtu.be/x", type: legacy, videoType: null }],
      } as unknown as CreativeWork

      expect(workToFormValues(work).videos[0].videoType).toBe(expected)
    }
  )

  it("keeps an explicit videoType over the legacy type", () => {
    const work = {
      title: "A work",
      type: "film",
      videos: [
        { url: "https://youtu.be/x", type: "CLIP", videoType: "interview" },
      ],
    } as unknown as CreativeWork

    expect(workToFormValues(work).videos[0].videoType).toBe("interview")
  })

  it("sends type: null for a brand-new video", () => {
    const payload = workToApiPayload(
      values({ videos: [{ ...EMPTY_VIDEO, url: "https://youtu.be/new" }] })
    )

    const videos = payload.videos as VideoPayload[]
    expect(videos[0]).toEqual({
      url: "https://youtu.be/new",
      type: null,
      videoType: "trailer",
    })
  })

  it("never exposes the legacy type to the editor vocabulary", () => {
    expect(EMPTY_VIDEO.legacyType).toBeNull()
    // The editor's dropdown must never offer the legacy enum values.
    for (const legacy of ["FULL_LENGTH", "TEASER", "CLIP"]) {
      expect(VIDEO_TYPES as readonly string[]).not.toContain(legacy)
    }
  })

  // The seven-value vocabulary is hand-maintained in three places (this
  // options list, the client wizard's schema, and the component schema below).
  // Strapi rejects anything outside the schema enum, so drift here means every
  // save carrying the drifted value fails — silently, without this assertion.
  it("matches the videoType enum declared by common.video", () => {
    expect([...VIDEO_TYPES]).toEqual(videoComponent.attributes.videoType.enum)
  })

  it("leaves the legacy type enum in place beside it (DW-11: keep both)", () => {
    expect(videoComponent.attributes.type.enum).toEqual([
      "FULL_LENGTH",
      "TEASER",
      "CLIP",
    ])
    // The legacy enum keeps its pre-existing default; `videoType` must NOT
    // gain one, or every video Strapi touches would claim to be a trailer.
    expect(videoComponent.attributes.type.default).toBe("TEASER")
    expect(videoComponent.attributes.videoType).not.toHaveProperty("default")
  })
})

describe("workToFormValues", () => {
  it("maps credits and cast relations into form refs", () => {
    const work = {
      title: "A work",
      type: "play",
      credits: [
        { person: PERSON, creditRole: ROLE, customRole: null, billing: 2 },
      ],
      cast: [{ person: PERSON, character: CHARACTER, billing: 1 }],
    } as unknown as CreativeWork

    const formValues = workToFormValues(work)

    expect(formValues.credits[0]).toEqual({
      person: PERSON,
      // `slug` rides along so the generic-role rule can key on the record
      creditRole: { ...ROLE, slug: "director" },
      customRole: "",
      billing: 2,
    })
    expect(formValues.cast[0]).toEqual({
      person: PERSON,
      character: CHARACTER,
      billing: 1,
    })
  })

  it("loads a legacy credit with no creditRole as null", () => {
    const work = {
      title: "A work",
      type: "play",
      credits: [{ person: PERSON, billing: 99 }],
    } as unknown as CreativeWork

    const formValues = workToFormValues(work)
    expect(formValues.credits[0].creditRole).toBeNull()

    // …and the form refuses to submit until one is picked
    const result = workFormSchema.safeParse(formValues)
    expect(result.success).toBe(false)
  })

  it("defaults cast to an empty array when the work has none", () => {
    const work = { title: "A work", type: "film" } as unknown as CreativeWork
    expect(workToFormValues(work).cast).toEqual([])
  })
})

// The content-manager single-document GET counts relations ({ count: n }) and
// ignores `populate`; the form used to crash on `.map` (G-01-1). The editor
// route resolves them, and the mapping must still never throw on a count.
describe("workToFormValues — unresolved { count } relations", () => {
  const COUNT = { count: 1 }

  it("maps a { count } genres to no genre ids without throwing", () => {
    const work = {
      title: "A work",
      type: "short-film",
      genres: { count: 2 },
    } as unknown as CreativeWork

    expect(workToFormValues(work).genreIds).toEqual([])
  })

  it("maps a { count } credit and cast target to null", () => {
    const work = {
      title: "A work",
      type: "short-film",
      credits: [
        { person: COUNT, creditRole: COUNT, customRole: null, billing: 1 },
      ],
      cast: [{ person: COUNT, character: COUNT, billing: 1 }],
    } as unknown as CreativeWork

    const formValues = workToFormValues(work)

    expect(formValues.credits[0].person).toBeNull()
    expect(formValues.credits[0].creditRole).toBeNull()
    expect(formValues.cast[0].person).toBeNull()
    expect(formValues.cast[0].character).toBeNull()
  })

  it("maps a { count } premiere venue to a null venue id", () => {
    const work = {
      title: "A play",
      type: "play",
      theatreDetails: { premiereVenue: COUNT },
    } as unknown as CreativeWork

    expect(workToFormValues(work).theatreDetails.premiereVenueId).toBeNull()
  })
})

describe("findUnresolvedRelations", () => {
  it("lists every relation that arrived as a count", () => {
    const work = {
      title: "A work",
      type: "short-film",
      genres: { count: 2 },
      credits: [{ person: { count: 1 }, creditRole: ROLE, billing: 1 }],
    } as unknown as CreativeWork

    expect(findUnresolvedRelations(work)).toEqual([
      "genres",
      "credits.0.person",
    ])
  })

  it("names the cast, role, character and venue paths", () => {
    const work = {
      title: "A work",
      type: "play",
      credits: [{ person: PERSON, creditRole: { count: 1 }, billing: 1 }],
      cast: [
        { person: PERSON, character: { count: 1 }, billing: 1 },
        { person: { count: 1 }, character: null, billing: 2 },
      ],
      theatreDetails: { premiereVenue: { count: 1 } },
    } as unknown as CreativeWork

    expect(findUnresolvedRelations(work)).toEqual([
      "credits.0.creditRole",
      "cast.0.character",
      "cast.1.person",
      "theatreDetails.premiereVenue",
    ])
  })

  it("reports nothing for resolved relations", () => {
    const work = {
      title: "A work",
      type: "short-film",
      genres: [{ id: 1, documentId: "g1", name: "Drama" }],
      credits: [{ person: PERSON, creditRole: ROLE, billing: 1 }],
      cast: [{ person: PERSON, character: CHARACTER, billing: 1 }],
    } as unknown as CreativeWork

    expect(findUnresolvedRelations(work)).toEqual([])
  })

  it("reports nothing for a work with no relations, null relations or missing keys", () => {
    expect(
      findUnresolvedRelations({
        title: "A work",
        type: "film",
      } as unknown as CreativeWork)
    ).toEqual([])

    expect(
      findUnresolvedRelations({
        title: "A work",
        type: "film",
        genres: [],
        credits: [{ person: null, creditRole: null, billing: 1 }],
        cast: [{ person: null, character: null, billing: 1 }],
        theatreDetails: { premiereVenue: null },
      } as unknown as CreativeWork)
    ).toEqual([])
  })
})

describe("zod schemas", () => {
  it("rejects a credit without a creditRole, flagging the creditRole path", () => {
    const result = creditFormSchema.safeParse({
      person: PERSON,
      creditRole: null,
      customRole: "",
      billing: 99,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path)).toContainEqual([
        "creditRole",
      ])
    }
  })

  it("rejects a credit without a person", () => {
    const result = creditFormSchema.safeParse({
      person: null,
      creditRole: ROLE,
      customRole: "",
      billing: 99,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path)).toContainEqual([
        "person",
      ])
    }
  })

  it("accepts a complete credit", () => {
    expect(
      creditFormSchema.safeParse({
        person: PERSON,
        creditRole: ROLE,
        customRole: "",
        billing: 99,
      }).success
    ).toBe(true)
  })

  it("accepts a cast row without a character but rejects one without a person", () => {
    expect(
      castFormSchema.safeParse({
        person: PERSON,
        character: null,
        billing: 99,
      }).success
    ).toBe(true)

    expect(
      castFormSchema.safeParse({
        person: null,
        character: CHARACTER,
        billing: 99,
      }).success
    ).toBe(false)
  })

  it("requires a videoType and tolerates a null legacy type", () => {
    expect(
      videoFormSchema.safeParse({
        url: "https://youtu.be/abc",
        legacyType: null,
        videoType: "trailer",
      }).success
    ).toBe(true)

    expect(
      videoFormSchema.safeParse({
        url: "https://youtu.be/abc",
        legacyType: "TEASER",
        videoType: "",
      }).success
    ).toBe(false)
  })

  it("exposes cast on the work schema defaults", () => {
    expect(DEFAULT_WORK_VALUES.cast).toEqual([])
    expect(workFormSchema.safeParse(values()).success).toBe(true)
  })

  it("requires a customRole when the picked role is the generic one", () => {
    const result = creditFormSchema.safeParse({
      person: PERSON,
      creditRole: OTHER_ROLE,
      customRole: "   ",
      billing: 1,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path)).toContainEqual([
        "customRole",
      ])
    }
  })

  it("clamps billing into the range both row schemas accept", () => {
    expect(clampBilling(0)).toBe(1)
    expect(clampBilling(-5)).toBe(1)
    expect(clampBilling(1000)).toBe(999)
    expect(clampBilling(12.4)).toBe(12)
    expect(clampBilling(42)).toBe(42)
  })

  it("does not require a customRole for a named role", () => {
    expect(
      creditFormSchema.safeParse({
        person: PERSON,
        creditRole: ROLE,
        customRole: "",
        billing: 1,
      }).success
    ).toBe(true)
  })
})

describe("WORK_POPULATE", () => {
  /**
   * `workToApiPayload` re-sends `credits` and `cast` in full and Strapi
   * replaces component arrays on write, so an unpopulated relation is written
   * back as null. `cast` fails silently (no required relation guards it), which
   * is why the coupling is pinned here rather than left to the form.
   */
  it("resolves every relation the credit and cast editors round-trip", () => {
    expect(WORK_POPULATE).toEqual(
      expect.arrayContaining([
        "credits",
        "credits.person",
        "credits.creditRole",
        "cast",
        "cast.person",
        "cast.character",
      ])
    )
  })
})

describe("WORK_POPULATE — streamingLinks", () => {
  // Components are re-sent wholesale and Strapi replaces them on write, so a
  // path missing here silently deletes every link on the next save (Pitfall 9).
  it("resolves streamingLinks so a load-then-save keeps the links", () => {
    expect(WORK_POPULATE).toContain("streamingLinks")
  })
})

describe("streaming links — form mapping", () => {
  const STORED_LINKS = [
    {
      id: 11,
      platform: "youtube",
      url: "https://youtu.be/abc",
      accessType: "free",
      label: "Official channel",
    },
    {
      id: 12,
      platform: "arte",
      url: "https://www.arte.tv/x",
      accessType: "included",
      label: null,
    },
  ]

  interface StreamingLinkPayload {
    platform: string
    url: string
    accessType: string
    label: string | null
  }

  it("round-trips stored links work -> form -> payload without loss", () => {
    const work = {
      title: "A short",
      type: "short-film",
      streamingLinks: STORED_LINKS,
    } as unknown as CreativeWork

    const payload = workToApiPayload(workToFormValues(work))

    expect(payload.streamingLinks).toEqual([
      {
        platform: "youtube",
        url: "https://youtu.be/abc",
        accessType: "free",
        label: "Official channel",
      },
      {
        platform: "arte",
        url: "https://www.arte.tv/x",
        accessType: "included",
        label: null,
      },
    ])
  })

  it("loads a work without links as an empty list", () => {
    const work = { title: "A short", type: "short-film" } as CreativeWork
    expect(workToFormValues(work).streamingLinks).toEqual([])
  })

  it("sends a blank label as null and trims the url", () => {
    const payload = workToApiPayload(
      values({
        type: "short-film",
        streamingLinks: [
          {
            ...EMPTY_STREAMING_LINK,
            url: "  https://vimeo.com/1  ",
            label: "   ",
          },
        ],
      })
    )

    expect((payload.streamingLinks as StreamingLinkPayload[])[0]).toEqual({
      platform: "youtube",
      url: "https://vimeo.com/1",
      accessType: "free",
      label: null,
    })
  })

  it("rejects http:, javascript: and non-URL streaming urls", () => {
    for (const url of [
      "http://youtu.be/abc",
      "javascript:void(0)",
      "data:text/html,x",
      "youtu.be/abc",
      "",
    ]) {
      expect(
        streamingLinkFormSchema.safeParse({ ...EMPTY_STREAMING_LINK, url })
          .success
      ).toBe(false)
    }
    expect(
      streamingLinkFormSchema.safeParse({
        ...EMPTY_STREAMING_LINK,
        url: "https://youtu.be/abc",
      }).success
    ).toBe(true)
  })

  it("rejects an unknown platform or access type", () => {
    const link = { ...EMPTY_STREAMING_LINK, url: "https://youtu.be/abc" }
    expect(
      streamingLinkFormSchema.safeParse({ ...link, platform: "tiktok" }).success
    ).toBe(false)
    expect(
      streamingLinkFormSchema.safeParse({ ...link, accessType: "gift" }).success
    ).toBe(false)
  })

  it("fails the whole form when one link is invalid", () => {
    expect(
      workFormSchema.safeParse(
        values({
          type: "short-film",
          streamingLinks: [{ ...EMPTY_STREAMING_LINK, url: "http://x.tv" }],
        })
      ).success
    ).toBe(false)
  })
})

describe("short-film fields — key sets against the real schemas (DW-13)", () => {
  const SCHEMA_KEYS = Object.keys(creativeWorkSchema.attributes)

  it("every top-level payload key exists on the creative-work schema", () => {
    const payload = workToApiPayload(
      values({
        type: "short-film",
        streamingLinks: [{ ...EMPTY_STREAMING_LINK, url: "https://y.tv/1" }],
      })
    )

    for (const key of Object.keys(payload)) {
      expect(SCHEMA_KEYS).toContain(key)
    }
  })

  it("every streaming-link payload key exists on the component", () => {
    const payload = workToApiPayload(
      values({
        type: "short-film",
        streamingLinks: [{ ...EMPTY_STREAMING_LINK, url: "https://y.tv/1" }],
      })
    )
    const componentKeys = Object.keys(streamingLinkComponent.attributes)

    for (const link of payload.streamingLinks as Record<string, unknown>[]) {
      for (const key of Object.keys(link)) {
        expect(componentKeys).toContain(key)
      }
    }
  })

  it("form platform and access vocab equal the component enums", () => {
    expect([...STREAMING_PLATFORMS]).toEqual(
      streamingLinkComponent.attributes.platform.enum
    )
    expect([...STREAMING_ACCESS_TYPES]).toEqual(
      streamingLinkComponent.attributes.accessType.enum
    )
  })
})

describe("country, language and placement — form mapping (Task 2)", () => {
  it("defaults to no countries, no languages, not featured", () => {
    expect(DEFAULT_WORK_VALUES.country).toEqual([])
    expect(DEFAULT_WORK_VALUES.language).toEqual([])
    expect(DEFAULT_WORK_VALUES.featured).toBe(false)
    expect(DEFAULT_WORK_VALUES.featuredRank).toBeNull()
  })

  it("round-trips country, language, featured and rank work -> form -> payload", () => {
    const work = {
      title: "A short",
      type: "short-film",
      country: ["TN", "FR"],
      language: ["aeb", "fr"],
      featured: true,
      featuredRank: 2,
    } as unknown as CreativeWork

    const payload = workToApiPayload(workToFormValues(work))

    expect(payload.country).toEqual(["TN", "FR"])
    expect(payload.language).toEqual(["aeb", "fr"])
    expect(payload.featured).toBe(true)
    expect(payload.featuredRank).toBe(2)
  })

  it("loads null country, language and placement as empty values", () => {
    const work = {
      title: "A short",
      type: "short-film",
      country: null,
      language: null,
      featured: null,
      featuredRank: null,
    } as unknown as CreativeWork

    const form = workToFormValues(work)

    expect(form.country).toEqual([])
    expect(form.language).toEqual([])
    expect(form.featured).toBe(false)
    expect(form.featuredRank).toBeNull()
  })

  it("sends a null featuredRank whenever the work is not featured", () => {
    const payload = workToApiPayload(
      values({ type: "short-film", featured: false, featuredRank: 3 })
    )

    expect(payload.featured).toBe(false)
    expect(payload.featuredRank).toBeNull()
  })

  it("rejects an unknown country code with INVALID_COUNTRY_CODES", () => {
    const result = workFormSchema.safeParse(values({ country: ["TN", "XX"] }))

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message)).toContain(
        "INVALID_COUNTRY_CODES"
      )
      expect(result.error.issues.map((issue) => issue.path)).toContainEqual([
        "country",
      ])
    }
  })

  it("rejects a lower-case country code (codes are never normalized)", () => {
    expect(workFormSchema.safeParse(values({ country: ["tn"] })).success).toBe(
      false
    )
  })

  it("rejects an unknown language and none combined with another code", () => {
    for (const language of [["klingon"], ["none", "fr"], ["fr", "none"]]) {
      const result = workFormSchema.safeParse(values({ language }))

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.map((issue) => issue.message)).toContain(
          "INVALID_LANGUAGE_CODES"
        )
      }
    }
    expect(
      workFormSchema.safeParse(values({ language: ["none"] })).success
    ).toBe(true)
  })

  it("accepts pinned and ordinary codes", () => {
    expect(
      workFormSchema.safeParse(
        values({ country: ["TN", "FR"], language: ["aeb", "ar", "ber"] })
      ).success
    ).toBe(true)
  })

  it("rejects a featuredRank below 1 and a non-integer rank", () => {
    for (const featuredRank of [0, -1, 1.5]) {
      expect(
        workFormSchema.safeParse(
          values({ type: "short-film", featured: true, featuredRank })
        ).success
      ).toBe(false)
    }
    expect(
      workFormSchema.safeParse(
        values({ type: "short-film", featured: true, featuredRank: 1 })
      ).success
    ).toBe(true)
  })

  it("keeps every country/language/placement payload key on the real schema", () => {
    const payload = workToApiPayload(
      values({
        type: "short-film",
        country: ["TN"],
        language: ["aeb"],
        featured: true,
        featuredRank: 1,
      })
    )

    for (const key of ["country", "language", "featured", "featuredRank"]) {
      expect(Object.keys(creativeWorkSchema.attributes)).toContain(key)
      expect(Object.keys(payload)).toContain(key)
    }
  })
})

describe("hidden fields are neither validated nor sent (G-01-2, WR-03)", () => {
  const BLANK_LINK = { ...EMPTY_STREAMING_LINK, url: "" }

  it("(i) lets a film with a blank link, featured and rank 0 pass the form schema", () => {
    for (const type of ["film", "play"] as const) {
      expect(
        workFormSchema.safeParse(
          values({
            type,
            streamingLinks: [BLANK_LINK],
            featured: true,
            featuredRank: 0,
          })
        ).success
      ).toBe(true)
    }
  })

  it("(ii) omits the short-film-only keys from a film and a play payload", () => {
    expect([...SHORT_FILM_ONLY_KEYS]).toEqual([
      "streamingLinks",
      "featured",
      "featuredRank",
    ])

    for (const type of ["film", "play"] as const) {
      const payload = workToApiPayload(
        values({
          type,
          streamingLinks: [BLANK_LINK],
          featured: true,
          featuredRank: 2,
          country: ["TN"],
          language: ["aeb"],
        })
      )

      for (const key of SHORT_FILM_ONLY_KEYS) {
        expect(Object.keys(payload)).not.toContain(key)
      }
      expect(payload.country).toEqual(["TN"])
      expect(payload.language).toEqual(["aeb"])
    }
  })

  it("keeps every short-film-only key in a short film payload", () => {
    const payload = workToApiPayload(values({ type: "short-film" }))

    for (const key of SHORT_FILM_ONLY_KEYS) {
      expect(Object.keys(payload)).toContain(key)
    }
  })

  it("(iii) fails a short film with a blank link at streamingLinks.0.url", () => {
    const result = workFormSchema.safeParse(
      values({ type: "short-film", streamingLinks: [BLANK_LINK] })
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find(
        (candidate) => candidate.path.join(".") === "streamingLinks.0.url"
      )
      expect(issue?.message).toBe("INVALID_HTTPS_URL")
    }
  })

  it("(iv) fails a featured short film with rank 0 or 1.5 at featuredRank", () => {
    for (const featuredRank of [0, 1.5]) {
      const result = workFormSchema.safeParse(
        values({ type: "short-film", featured: true, featuredRank })
      )

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.map((issue) => issue.path)).toContainEqual([
          "featuredRank",
        ])
      }
    }
  })

  it("(iv) lets an unfeatured short film with rank 0 pass, and sends a null rank", () => {
    const form = values({
      type: "short-film",
      featured: false,
      featuredRank: 0,
    })

    expect(workFormSchema.safeParse(form).success).toBe(true)
    expect(workToApiPayload(form).featuredRank).toBeNull()
  })

  it("(v) never validates a hidden act count on a film or short film", () => {
    for (const type of ["film", "short-film"] as const) {
      for (const actCount of [0, 1.5]) {
        const form = values({
          type,
          theatreDetails: { ...DEFAULT_THEATRE_DETAILS, actCount },
        })

        expect(workFormSchema.safeParse(form).success).toBe(true)
        expect(workToApiPayload(form).theatreDetails).toBeNull()
      }
    }
  })

  it("(v) still validates the act count of a play at theatreDetails.actCount", () => {
    for (const actCount of [0, 1.5]) {
      const result = workFormSchema.safeParse(
        values({
          type: "play",
          theatreDetails: { ...DEFAULT_THEATRE_DETAILS, actCount },
        })
      )

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.map((issue) => issue.path)).toContainEqual([
          "theatreDetails",
          "actCount",
        ])
      }
    }
  })

  it("(v) accepts an empty or valid act count on a play", () => {
    for (const actCount of [null, 3]) {
      expect(
        workFormSchema.safeParse(
          values({
            type: "play",
            theatreDetails: { ...DEFAULT_THEATRE_DETAILS, actCount },
          })
        ).success
      ).toBe(true)
    }
  })
})

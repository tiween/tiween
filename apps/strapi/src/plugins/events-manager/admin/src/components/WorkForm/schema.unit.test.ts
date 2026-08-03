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
import { WORK_POPULATE } from "../../hooks/workPopulate"
import { VIDEO_TYPES } from "../Catalog/options"
import {
  castFormSchema,
  clampBilling,
  creditFormSchema,
  DEFAULT_WORK_VALUES,
  EMPTY_VIDEO,
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

/**
 * Venue form rules (Story 2D.2).
 *
 * These run on the NODE gate (`*.unit.test.ts`), which is why the rules live in
 * `validate.ts` rather than in the component: the DOM suite cannot drive the
 * Radix-based DS selects reliably under the React 19 pin, so the field contract
 * is pinned here instead.
 *
 * What matters: every value returned is an error CODE from the same vocabulary
 * the server answers with — a French sentence here would give one failure two
 * different wordings depending on which side caught it.
 */
import { generateSlug, validateVenueForm } from "./validate"

const VALID = {
  name: "Le Rio",
  slug: "le-rio",
  type: "cinema",
  email: "",
  website: "",
  capacity: "",
}

describe("generateSlug (unit)", () => {
  it("lowercases, strips diacritics and collapses separators", () => {
    expect(generateSlug("Cinéma Le Colisée")).toBe("cinema-le-colisee")
    expect(generateSlug("  Théâtre   Municipal!  ")).toBe("theatre-municipal")
  })

  it("returns an empty slug for a name with no Latin characters", () => {
    // Deliberate: the empty slug is dropped from the payload and Strapi derives
    // the `uid` from `name`. Inventing a transliteration would mint URLs nobody
    // can predict.
    expect(generateSlug("مسرح قرطاج")).toBe("")
  })
})

describe("validateVenueForm (unit)", () => {
  it("accepts a minimal valid form", () => {
    expect(validateVenueForm(VALID)).toEqual({})
  })

  it("requires name and type, as CODES", () => {
    expect(validateVenueForm({ ...VALID, name: "   ", type: "" })).toEqual({
      name: "VENUE_NAME_REQUIRED",
      type: "VENUE_TYPE_REQUIRED",
    })
  })

  it("accepts an empty slug but rejects a malformed one", () => {
    expect(validateVenueForm({ ...VALID, slug: "" }).slug).toBeUndefined()
    expect(validateVenueForm({ ...VALID, slug: "Le Rio!" }).slug).toBe(
      "VENUE_SLUG_INVALID"
    )
  })

  it("only checks email when one is given", () => {
    expect(validateVenueForm({ ...VALID, email: "" }).email).toBeUndefined()
    expect(validateVenueForm({ ...VALID, email: "nope" }).email).toBe(
      "VENUE_EMAIL_INVALID"
    )
  })

  it("applies the canonical website rule, not Zod's looser .url()", () => {
    // The venues DB lifecycle rejects these; catching them here turns an opaque
    // write failure into inline feedback.
    for (const website of [
      "javascript:alert(1)",
      "ftp://a.tn",
      "http://a_b.tn",
    ]) {
      expect(validateVenueForm({ ...VALID, website }).website).toBe(
        "VENUE_WEBSITE_INVALID"
      )
    }
    expect(
      validateVenueForm({ ...VALID, website: "https://www.lieu.tn" }).website
    ).toBeUndefined()
    expect(
      validateVenueForm({ ...VALID, website: "  " }).website
    ).toBeUndefined()
  })

  it("rejects a non-positive, fractional or absurd capacity", () => {
    for (const capacity of ["0", "-5", "12.5", "2000000"]) {
      expect(validateVenueForm({ ...VALID, capacity }).capacity).toBe(
        "VENUE_CAPACITY_INVALID"
      )
    }
    expect(
      validateVenueForm({ ...VALID, capacity: "250" }).capacity
    ).toBeUndefined()
  })
})

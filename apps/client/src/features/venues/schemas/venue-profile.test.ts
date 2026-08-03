/**
 * Tests for the venue-profile schemas (Story 7.2).
 *
 * Three things are pinned here:
 *  - the WIRE schema mirrors the backend's accepted input, CODE for CODE,
 *    including the clear-on-blank and website rules (Zod's `.url()` is laxer
 *    than the database, which is how a fixable 400 became an opaque 500 in
 *    7.1);
 *  - `toVenueProfileUpdatePayload` emits ONLY what changed — a full-object PUT
 *    would rewrite (and, on an approved venue, republish) untouched columns,
 *    and an unchanged form must not silently pass the endpoint's
 *    `NO_FIELDS_TO_UPDATE` guard; and
 *  - `extractVenueProfileErrorCode` recovers the backend CODE from the string
 *    `BaseStrapiClient` throws, and collapses anything unrecognized to
 *    `INTERNAL_ERROR` rather than letting raw text reach a toast.
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import type { ManagerVenue, VenueProfileFormValues } from "./venue-profile"

import {
  extractVenueProfileErrorCode,
  normalizeGeoPoint,
  normalizeLongitude,
  propertyControlType,
  propertyEnumOptions,
  toVenueProfileFormValues,
  toVenueProfileUpdatePayload,
  VENUE_PROFILE_ERROR_CODES,
  venueProfileFormSchema,
  venueProfileUpdateSchema,
} from "./venue-profile"

const currentVenue: ManagerVenue = {
  documentId: "venue-1",
  name: "Le Rio",
  slug: "le-rio",
  description: "Une salle historique",
  address: "12 rue de Rome",
  type: "cinema",
  status: "approved",
  phone: "+21671000000",
  email: "contact@rio.test",
  website: "https://rio.test",
  capacity: 300,
  geo: { latitude: 36.8, longitude: 10.18 },
  logo: null,
  images: [],
  city: null,
  properties: [],
}

const baseForm: VenueProfileFormValues = toVenueProfileFormValues(currentVenue)

describe("venueProfileUpdateSchema (wire shape)", () => {
  it("accepts a partial payload", () => {
    const result = venueProfileUpdateSchema.safeParse({ name: "Le Rio 2" })
    expect(result.success).toBe(true)
  })

  it("accepts an EMPTY object — emptiness is the backend's NO_FIELDS_TO_UPDATE, not a field error", () => {
    // Deliberate: everything `validate()` rejects comes back as
    // VALIDATION_FAILED, so a refine here would produce the wrong envelope.
    expect(venueProfileUpdateSchema.safeParse({}).success).toBe(true)
  })

  it("strips documentId / slug / manager / status / events", () => {
    const parsed = venueProfileUpdateSchema.parse({
      name: "Le Rio",
      documentId: "venue-999",
      slug: "hijacked",
      manager: 42,
      status: "approved",
      events: ["evt-1"],
    })

    expect(parsed).toEqual({ name: "Le Rio" })
  })

  it("coerces blank description / phone / website to null (clearing the field)", () => {
    const parsed = venueProfileUpdateSchema.parse({
      description: "   ",
      phone: "",
      website: "  ",
    })

    expect(parsed.description).toBeNull()
    expect(parsed.phone).toBeNull()
    expect(parsed.website).toBeNull()
  })

  it.each([
    ["ftp://rio.test"],
    ["javascript:alert(1)"],
    ["http://sub_domain.tn"],
  ])("rejects %s with VENUE_WEBSITE_INVALID", (website) => {
    const result = venueProfileUpdateSchema.safeParse({ website })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe("VENUE_WEBSITE_INVALID")
  })

  it("rejects a non-positive capacity with VENUE_CAPACITY_INVALID", () => {
    const result = venueProfileUpdateSchema.safeParse({ capacity: 0 })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe("VENUE_CAPACITY_INVALID")
  })

  it("accepts capacity: null (clearing it)", () => {
    expect(venueProfileUpdateSchema.safeParse({ capacity: null }).success).toBe(
      true
    )
  })

  it("rejects out-of-range coordinates with VENUE_GEO_INVALID", () => {
    const result = venueProfileUpdateSchema.safeParse({
      geo: { latitude: 200, longitude: 10 },
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe("VENUE_GEO_INVALID")
  })

  it("rejects a name over 200 characters with VENUE_NAME_TOO_LONG", () => {
    const result = venueProfileUpdateSchema.safeParse({
      name: "x".repeat(201),
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe("VENUE_NAME_TOO_LONG")
  })

  it("rejects more than 10 photo ids with VENUE_IMAGES_TOO_MANY", () => {
    const result = venueProfileUpdateSchema.safeParse({
      images: Array.from({ length: 11 }, (_, i) => i + 1),
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe("VENUE_IMAGES_TOO_MANY")
  })

  it("accepts an amenity entry referencing a definition documentId", () => {
    const parsed = venueProfileUpdateSchema.parse({
      properties: [{ definition: "def-1", booleanValue: true }],
    })
    expect(parsed.properties).toEqual([
      { definition: "def-1", booleanValue: true },
    ])
  })
})

describe("venueProfileFormSchema (form shape)", () => {
  it("requires a name and an address", () => {
    const result = venueProfileFormSchema.safeParse({
      ...baseForm,
      name: "",
      address: "",
    })
    expect(result.success).toBe(false)
    const codes = result.error?.issues.map((i) => i.message)
    expect(codes).toContain("VENUE_NAME_REQUIRED")
    expect(codes).toContain("VENUE_ADDRESS_REQUIRED")
  })

  it("allows every optional field to be blank — blanking is a clear, not an error", () => {
    const result = venueProfileFormSchema.safeParse({
      ...baseForm,
      description: "",
      phone: "",
      website: "",
      capacity: "",
      geo: null,
    })
    expect(result.success).toBe(true)
  })

  // The wire has no `null` for these four, so a blanked one is DROPPED from the
  // diff payload — the manager would get a success toast over an unchanged
  // public page. A rendered field error is the only honest outcome.
  it.each([
    ["name", "VENUE_NAME_REQUIRED"],
    ["address", "VENUE_ADDRESS_REQUIRED"],
    ["email", "VENUE_EMAIL_REQUIRED"],
    ["type", "VENUE_TYPE_INVALID"],
  ])("rejects a BLANKED required field %s with %s", (field, code) => {
    const result = venueProfileFormSchema.safeParse({
      ...baseForm,
      [field]: "",
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues.map((i) => i.message)).toContain(code)
  })

  it("accepts the unset venue type as a VALUE (never a cast) and rejects it", () => {
    // `toVenueProfileFormValues` used to launder `""` through
    // `"" as unknown as VenueType`; the field's type now admits it honestly and
    // validation is what refuses it.
    const values = toVenueProfileFormValues({
      ...currentVenue,
      type: undefined,
    })
    expect(values.type).toBe("")

    const result = venueProfileFormSchema.safeParse(values)
    expect(result.success).toBe(false)
    expect(result.error?.issues.map((i) => i.message)).toContain(
      "VENUE_TYPE_INVALID"
    )
  })

  it("rejects a malformed email with VENUE_EMAIL_INVALID", () => {
    const result = venueProfileFormSchema.safeParse({
      ...baseForm,
      email: "not-an-email",
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe("VENUE_EMAIL_INVALID")
  })

  it("rejects a non-numeric capacity with VENUE_CAPACITY_INVALID", () => {
    const result = venueProfileFormSchema.safeParse({
      ...baseForm,
      capacity: "many",
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe("VENUE_CAPACITY_INVALID")
  })

  it("seeds from the API shape, mapping absent keys to empty strings", () => {
    const values = toVenueProfileFormValues({
      ...currentVenue,
      description: undefined,
      capacity: undefined,
      geo: null,
    })

    expect(values.description).toBe("")
    expect(values.capacity).toBe("")
    expect(values.geo).toBeNull()
    expect(values.name).toBe("Le Rio")
  })
})

describe("toVenueProfileUpdatePayload", () => {
  it("emits NOTHING when nothing changed", () => {
    expect(toVenueProfileUpdatePayload(baseForm, currentVenue)).toEqual({})
  })

  it("emits only the changed fields", () => {
    const payload = toVenueProfileUpdatePayload(
      { ...baseForm, name: "Le Rio Palace" },
      currentVenue
    )
    expect(payload).toEqual({ name: "Le Rio Palace" })
  })

  it("sends null for a cleared optional text field", () => {
    const payload = toVenueProfileUpdatePayload(
      { ...baseForm, description: "", phone: "", website: "" },
      currentVenue
    )
    expect(payload).toEqual({ description: null, phone: null, website: null })
  })

  it("omits an already-unset optional field left blank", () => {
    const venue: ManagerVenue = { ...currentVenue, phone: undefined }
    const payload = toVenueProfileUpdatePayload(
      { ...toVenueProfileFormValues(venue) },
      venue
    )
    expect(payload).not.toHaveProperty("phone")
  })

  it("never sends a blank email (the wire has no null for it)", () => {
    const payload = toVenueProfileUpdatePayload(
      { ...baseForm, email: "" },
      currentVenue
    )
    expect(payload).not.toHaveProperty("email")
  })

  it("converts the capacity string to a number, and blank to null", () => {
    expect(
      toVenueProfileUpdatePayload(
        { ...baseForm, capacity: "450" },
        currentVenue
      )
    ).toEqual({ capacity: 450 })
    expect(
      toVenueProfileUpdatePayload({ ...baseForm, capacity: "" }, currentVenue)
    ).toEqual({ capacity: null })
  })

  it("sends geo only when the coordinates actually moved", () => {
    expect(
      toVenueProfileUpdatePayload(
        { ...baseForm, geo: { latitude: 36.8, longitude: 10.18 } },
        currentVenue
      )
    ).toEqual({})

    expect(
      toVenueProfileUpdatePayload(
        { ...baseForm, geo: { latitude: 35.5, longitude: 11 } },
        currentVenue
      )
    ).toEqual({ geo: { latitude: 35.5, longitude: 11 } })

    expect(
      toVenueProfileUpdatePayload({ ...baseForm, geo: null }, currentVenue)
    ).toEqual({ geo: null })
  })

  it("folds media and amenity extras in alongside the text diff", () => {
    const payload = toVenueProfileUpdatePayload(baseForm, currentVenue, {
      logo: 5,
      images: [7, 8],
      properties: [{ definition: "def-1", booleanValue: true }],
    })

    expect(payload).toEqual({
      logo: 5,
      images: [7, 8],
      properties: [{ definition: "def-1", booleanValue: true }],
    })
  })

  it("never emits documentId / slug / status, whatever the form holds", () => {
    const payload = toVenueProfileUpdatePayload(
      { ...baseForm, name: "changed" },
      currentVenue
    )
    expect(payload).not.toHaveProperty("documentId")
    expect(payload).not.toHaveProperty("slug")
    expect(payload).not.toHaveProperty("status")
    expect(payload).not.toHaveProperty("manager")
  })
})

describe("extractVenueProfileErrorCode", () => {
  /** What `BaseStrapiClient` throws on a non-2xx Strapi response. */
  function strapiError(code: string): Error {
    return new Error(
      JSON.stringify({
        name: "VenueProfileError",
        message: "Venue not found",
        details: { code },
        status: 404,
      })
    )
  }

  it("recovers the backend code from details.code", () => {
    expect(extractVenueProfileErrorCode(strapiError("VENUE_NOT_FOUND"))).toBe(
      "VENUE_NOT_FOUND"
    )
    expect(extractVenueProfileErrorCode(strapiError("NOT_VENUE_MANAGER"))).toBe(
      "NOT_VENUE_MANAGER"
    )
  })

  it("collapses an UNKNOWN code to INTERNAL_ERROR", () => {
    expect(extractVenueProfileErrorCode(strapiError("WAT"))).toBe(
      "INTERNAL_ERROR"
    )
  })

  it("recovers a bare code thrown as the message (the upload path)", () => {
    expect(extractVenueProfileErrorCode(new Error("UPLOAD_FAILED"))).toBe(
      "UPLOAD_FAILED"
    )
  })

  it("never leaks raw exception text", () => {
    expect(
      extractVenueProfileErrorCode(new Error("ECONNREFUSED 127.0.0.1:1337"))
    ).toBe("INTERNAL_ERROR")
    expect(extractVenueProfileErrorCode("not an error")).toBe("INTERNAL_ERROR")
    expect(extractVenueProfileErrorCode(undefined)).toBe("INTERNAL_ERROR")
  })
})

describe("normalizeLongitude", () => {
  // Leaflet keeps counting past the date line, so a pin dropped one world-copy
  // east reports 190.25 — the same place as -169.75, but rejected by both
  // schemas with VENUE_GEO_INVALID on a field that has no input to render an
  // error under, which makes Save look dead.
  it("wraps an out-of-range longitude back into ±180", () => {
    expect(normalizeLongitude(190.25)).toBeCloseTo(-169.75, 10)
    expect(normalizeLongitude(-190.25)).toBeCloseTo(169.75, 10)
    expect(normalizeLongitude(540)).toBeCloseTo(-180, 10)
  })

  it("leaves an in-range longitude alone", () => {
    expect(normalizeLongitude(10.18)).toBeCloseTo(10.18, 10)
    expect(normalizeLongitude(-73.5)).toBeCloseTo(-73.5, 10)
    expect(normalizeLongitude(0)).toBe(0)
  })

  it("produces coordinates the wire schema accepts", () => {
    const geo = normalizeGeoPoint({ latitude: 36.8, longitude: 190.25 })
    expect(geo.latitude).toBe(36.8)
    expect(venueProfileUpdateSchema.safeParse({ geo }).success).toBe(true)
    // ... where the raw picker output would NOT have been.
    expect(
      venueProfileUpdateSchema.safeParse({
        geo: { latitude: 36.8, longitude: 190.25 },
      }).success
    ).toBe(false)
  })
})

describe("property helpers", () => {
  it("narrows only the four renderable control types", () => {
    expect(propertyControlType("boolean")).toBe("boolean")
    expect(propertyControlType("enum")).toBe("enum")
    expect(propertyControlType("relation")).toBeUndefined()
    expect(propertyControlType(undefined)).toBeUndefined()
  })

  it("keeps only string enum options", () => {
    expect(propertyEnumOptions(["fixed", 3, "flexible"])).toEqual([
      "fixed",
      "flexible",
    ])
    expect(propertyEnumOptions(null)).toEqual([])
  })
})

describe("error vocabulary", () => {
  const catalogs = ["en", "fr", "ar"] as const

  it.each(catalogs)(
    "%s.json translates every VENUE_PROFILE_ERROR_CODE",
    (locale) => {
      const messages = JSON.parse(
        readFileSync(join(process.cwd(), "locales", `${locale}.json`), "utf-8")
      ) as {
        venues: { profile: { errors: Record<string, string> } }
      }

      for (const code of VENUE_PROFILE_ERROR_CODES) {
        expect(messages.venues.profile.errors[code]).toBeTruthy()
      }
    }
  )
})

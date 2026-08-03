import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import type { VenueRegistrationFormValues } from "./venue-registration"

import {
  MAX_IMAGES,
  toRegistrationPayload,
  VENUE_REGISTRATION_ERROR_CODES,
  venueRegistrationFormSchema,
  venueRegistrationSchema,
} from "./venue-registration"

/**
 * Tests for the venue-registration schemas (Story 7.1).
 *
 * Two properties matter beyond "does it validate":
 *  - every issue `message` is a SCREAMING_SNAKE CODE, never prose — the UI
 *    translates the code, so a prose message would render raw English at an
 *    Arabic user, and
 *  - every code in the shared vocabulary actually has a translation in ALL
 *    THREE catalogs. Without that check a new code silently renders as a key.
 */

const VALID_FORM: VenueRegistrationFormValues = {
  name: "Le Rio",
  description: "Cinéma d'art et d'essai",
  address: "12 rue de Rome, Tunis",
  type: "cinema",
  phone: "+21671000000",
  venueEmail: "contact@rio.test",
  website: "https://rio.test",
  capacity: "220",
  firstName: "Alice",
  lastName: "Dupont",
  managerEmail: "alice@example.test",
  password: "Password1",
  passwordConfirmation: "Password1",
}

function parseForm(overrides: Record<string, unknown> = {}) {
  return venueRegistrationFormSchema.safeParse({ ...VALID_FORM, ...overrides })
}

/** Every issue message produced for a given override. */
function codesFor(overrides: Record<string, unknown>): string[] {
  const result = parseForm(overrides)
  if (result.success) return []
  return result.error.issues.map((i) => i.message)
}

describe("venueRegistrationFormSchema", () => {
  it("accepts a complete valid application", () => {
    expect(parseForm().success).toBe(true)
  })

  it("accepts an application with every optional field omitted", () => {
    const result = venueRegistrationFormSchema.safeParse({
      name: "Le Rio",
      address: "12 rue de Rome",
      type: "theater",
      phone: "+21671000000",
      venueEmail: "contact@rio.test",
      firstName: "Alice",
      lastName: "Dupont",
      managerEmail: "alice@example.test",
      password: "Password1",
      passwordConfirmation: "Password1",
    })
    expect(result.success).toBe(true)
  })

  it("emits only SCREAMING_SNAKE codes, never prose", () => {
    const result = venueRegistrationFormSchema.safeParse({})
    expect(result.success).toBe(false)
    if (result.success) return
    for (const issue of result.error.issues) {
      expect(issue.message).toMatch(/^[A-Z0-9_]+$/)
    }
  })

  it.each([
    [{ name: "  " }, "VENUE_NAME_REQUIRED"],
    [{ address: "" }, "VENUE_ADDRESS_REQUIRED"],
    [{ type: "spaceship" }, "VENUE_TYPE_INVALID"],
    [{ phone: "" }, "VENUE_PHONE_REQUIRED"],
    [{ venueEmail: "not-an-email" }, "VENUE_EMAIL_INVALID"],
    [{ website: "not-a-url" }, "VENUE_WEBSITE_INVALID"],
    [{ capacity: "0" }, "VENUE_CAPACITY_INVALID"],
    [{ capacity: "-5" }, "VENUE_CAPACITY_INVALID"],
    [{ firstName: "" }, "MANAGER_FIRST_NAME_REQUIRED"],
    [{ lastName: "" }, "MANAGER_LAST_NAME_REQUIRED"],
    [{ managerEmail: "nope" }, "MANAGER_EMAIL_INVALID"],
    [
      { password: "Pass1", passwordConfirmation: "Pass1" },
      "MANAGER_PASSWORD_TOO_SHORT",
    ],
    [
      { password: "password1", passwordConfirmation: "password1" },
      "MANAGER_PASSWORD_WEAK",
    ],
    [
      { password: "PASSWORD1", passwordConfirmation: "PASSWORD1" },
      "MANAGER_PASSWORD_WEAK",
    ],
    [
      { password: "Passwords", passwordConfirmation: "Passwords" },
      "MANAGER_PASSWORD_WEAK",
    ],
    [{ passwordConfirmation: "Different1" }, "PASSWORD_MISMATCH"],
  ])("rejects %o with %s", (overrides, code) => {
    expect(codesFor(overrides)).toContain(code)
  })

  it("rejects a password over the 72-byte bcrypt cap", () => {
    const tooLong = "A" + "a".repeat(70) + "1x"
    expect(tooLong.length).toBe(73)
    expect(
      codesFor({ password: tooLong, passwordConfirmation: tooLong })
    ).toContain("MANAGER_PASSWORD_TOO_LONG")
  })

  it("trims surrounding whitespace off text fields", () => {
    const result = parseForm({ name: "  Le Rio  ", address: " 12 rue " })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.name).toBe("Le Rio")
    expect(result.data.address).toBe("12 rue")
  })

  it("accepts a blank optional field instead of rejecting it", () => {
    const result = parseForm({ website: "   ", description: "" })
    expect(result.success).toBe(true)
  })

  it("drops blank optional fields from the wire payload", () => {
    const result = parseForm({ website: "   ", description: "" })
    if (!result.success) throw new Error("fixture invalid")

    const payload = toRegistrationPayload(result.data)
    expect(payload.venue.website).toBeUndefined()
    expect(payload.venue.description).toBeUndefined()
  })

  it("accepts a blank capacity (the field is optional)", () => {
    const result = parseForm({ capacity: "" })
    expect(result.success).toBe(true)
  })

  it("rejects a non-numeric capacity", () => {
    expect(codesFor({ capacity: "many" })).toContain("VENUE_CAPACITY_INVALID")
  })
})

describe("toRegistrationPayload", () => {
  it("folds the flat form into the nested payload the API accepts", () => {
    const parsed = parseForm()
    expect(parsed.success).toBe(true)
    if (!parsed.success) return

    const payload = toRegistrationPayload(parsed.data, {
      preferredLanguage: "ar",
      logo: 7,
      images: [8, 9],
    })

    expect(venueRegistrationSchema.safeParse(payload).success).toBe(true)
    expect(payload.venue).toMatchObject({
      name: "Le Rio",
      email: "contact@rio.test",
      // The form holds the capacity as a string; the wire gets a number.
      capacity: 220,
      logo: 7,
      images: [8, 9],
    })
    expect(payload.manager).toMatchObject({
      email: "alice@example.test",
      preferredLanguage: "ar",
    })
  })

  it("omits media keys entirely when nothing was picked", () => {
    const parsed = parseForm()
    if (!parsed.success) throw new Error("fixture invalid")

    const payload = toRegistrationPayload(parsed.data, { images: [] })

    expect(payload.venue.logo).toBeUndefined()
    expect(payload.venue.images).toBeUndefined()
    expect(venueRegistrationSchema.safeParse(payload).success).toBe(true)
  })

  it("never leaks the password confirmation into the payload", () => {
    const parsed = parseForm()
    if (!parsed.success) throw new Error("fixture invalid")

    const payload = toRegistrationPayload(parsed.data)

    expect(JSON.stringify(payload)).not.toContain("passwordConfirmation")
  })
})

describe("venueRegistrationSchema (nested payload)", () => {
  const NESTED = {
    venue: {
      name: "Le Rio",
      address: "12 rue de Rome",
      type: "cinema",
      phone: "+21671000000",
      email: "contact@rio.test",
    },
    manager: {
      firstName: "Alice",
      lastName: "Dupont",
      email: "alice@example.test",
      password: "Password1",
    },
  }

  it("accepts the minimal nested payload", () => {
    expect(venueRegistrationSchema.safeParse(NESTED).success).toBe(true)
  })

  it("rejects more than MAX_IMAGES photo ids", () => {
    const images = Array.from({ length: MAX_IMAGES + 1 }, (_, i) => i + 1)
    const result = venueRegistrationSchema.safeParse({
      ...NESTED,
      venue: { ...NESTED.venue, images },
    })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.issues.map((i) => i.message)).toContain(
      "VENUE_IMAGES_TOO_MANY"
    )
  })

  it("rejects a non-positive file id", () => {
    const result = venueRegistrationSchema.safeParse({
      ...NESTED,
      venue: { ...NESTED.venue, logo: 0 },
    })
    expect(result.success).toBe(false)
  })

  it("rejects out-of-range geo coordinates", () => {
    const result = venueRegistrationSchema.safeParse({
      ...NESTED,
      venue: { ...NESTED.venue, geo: { latitude: 120, longitude: 10 } },
    })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.issues.map((i) => i.message)).toContain(
      "VENUE_GEO_INVALID"
    )
  })
})

describe("error-code translation coverage", () => {
  // The UI renders `venues.register.errors.<CODE>`; a code without a message in
  // every catalog would surface as a raw key to that locale's users.
  it.each(["en", "fr", "ar"])(
    "%s.json translates every registration error code",
    (locale) => {
      const catalog = JSON.parse(
        readFileSync(join(process.cwd(), "locales", `${locale}.json`), "utf-8")
      ) as { venues: { register: { errors: Record<string, string> } } }

      const errors = catalog.venues.register.errors
      for (const code of VENUE_REGISTRATION_ERROR_CODES) {
        expect(typeof errors[code]).toBe("string")
        expect(errors[code].length).toBeGreaterThan(0)
      }
    }
  )
})

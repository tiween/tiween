/**
 * Unit tests for the venue form's validation rules (DW-15).
 *
 * The form is the editor-facing half of the website-URL rule: it must block the
 * submit and surface a field error before any request is sent. Pinning that
 * here — rather than in the `.tsx` component, which the Jest gate never loads —
 * is what keeps the client-side layer from regressing silently.
 */
import type { VenueFormValues } from "./validate"

import { validateVenueForm } from "./validate"

const valid: VenueFormValues = {
  name: "Cinéma Madart",
  type: "cinema",
  email: "",
  website: "",
}

describe("validateVenueForm (unit)", () => {
  it("accepts a minimal valid form", () => {
    expect(validateVenueForm(valid)).toEqual({})
  })

  it("requires name and type", () => {
    const errors = validateVenueForm({ ...valid, name: "   ", type: "" })

    expect(errors.name).toBe("Le nom est requis")
    expect(errors.type).toBe("Le type est requis")
  })

  it.each([
    ["free text", "pas de site"],
    ["missing scheme", "cinemamadart.tn"],
    ["javascript scheme", "javascript:alert(1)"],
  ])("rejects a %s website with an inline error", (_label, website) => {
    expect(validateVenueForm({ ...valid, website }).website).toBe(
      "URL invalide (ex: https://www.lieu.tn)"
    )
  })

  it("accepts an empty website — the field stays optional", () => {
    expect(validateVenueForm({ ...valid, website: "" }).website).toBeUndefined()
  })

  it("tolerates surrounding whitespace, because the submit is trimmed", () => {
    expect(
      validateVenueForm({ ...valid, website: "  https://cinemamadart.tn  " })
        .website
    ).toBeUndefined()
  })

  it("still checks the email rule it inherited", () => {
    expect(validateVenueForm({ ...valid, email: "nope" }).email).toBe(
      "Email invalide"
    )
    expect(
      validateVenueForm({ ...valid, email: "a@b.tn" }).email
    ).toBeUndefined()
  })
})

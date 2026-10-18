/**
 * `venue-events` validation (D-21): venue managers may create only film and
 * play works; short films are admin-curated because the venue create-and-publish
 * flow cannot satisfy the D-19 short-film publish rules. Existing short films
 * stay schedulable, so the full type list is unchanged.
 */
import {
  CREATIVE_WORK_TYPES,
  VENUE_CREATABLE_WORK_TYPES,
  venueWorkCreateSchema,
} from "../venue-events"

describe("venueWorkCreateSchema work type (D-21, unit)", () => {
  it.each(["film", "play"])("accepts type %s", (type) => {
    const result = venueWorkCreateSchema.safeParse({ title: "Dune", type })

    expect(result.success).toBe(true)
  })

  it("rejects type short-film with WORK_TYPE_INVALID", () => {
    const result = venueWorkCreateSchema.safeParse({
      title: "Khalaa",
      type: "short-film",
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(
        result.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        }))
      ).toContainEqual({ path: "type", message: "WORK_TYPE_INVALID" })
    }
  })

  it("limits venue-creatable types to film and play", () => {
    expect([...VENUE_CREATABLE_WORK_TYPES]).toEqual(["film", "play"])
  })

  it("keeps short-film in CREATIVE_WORK_TYPES so existing shorts stay schedulable", () => {
    expect(CREATIVE_WORK_TYPES).toContain("short-film")
  })
})

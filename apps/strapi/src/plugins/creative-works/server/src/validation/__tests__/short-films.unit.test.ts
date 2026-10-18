/**
 * Strict query/param schemas for the public short-film routes (SDATA-03,
 * D-06 / D-07 / D-10): defaults, coercion, the eight-sort allowlist, caps and
 * the coded rejection of every unknown key.
 */
import { validate } from "../../../../../../shared/validation"
import {
  SHORT_FILM_SORTS,
  shortFilmDetailQuerySchema,
  shortFilmListQuerySchema,
  shortFilmSlugParamSchema,
} from "../short-films"

function validationCode(fn: () => unknown): string | undefined {
  try {
    fn()
  } catch (err: any) {
    return err?.details?.code
  }
  return undefined
}

describe("shortFilmListQuerySchema", () => {
  it("applies the defaults for an empty query", () => {
    expect(validate(shortFilmListQuerySchema, {})).toEqual({
      sort: "publishedAt:desc",
      page: 1,
      pageSize: 24,
    })
  })

  it("coerces page and pageSize from strings to numbers", () => {
    expect(
      validate(shortFilmListQuerySchema, { page: "2", pageSize: "10" })
    ).toMatchObject({ page: 2, pageSize: 10 })
  })

  it("accepts each of the eight allowlisted sorts", () => {
    expect(SHORT_FILM_SORTS).toHaveLength(8)
    for (const sort of SHORT_FILM_SORTS) {
      expect(validate(shortFilmListQuerySchema, { sort })).toMatchObject({
        sort,
      })
    }
  })

  it("trims the genre slug", () => {
    expect(
      validate(shortFilmListQuerySchema, { genre: "  drame " })
    ).toMatchObject({ genre: "drame" })
  })

  it.each([
    ["pageSize above the cap", { pageSize: "49" }],
    ["page zero", { page: "0" }],
    ["page above the cap", { page: "10001" }],
    ["a sort outside the allowlist", { sort: "rating:desc" }],
    ["an unknown key", { q: "alpha" }],
    ["a facet parameter", { country: "TN" }],
    ["an empty genre", { genre: "" }],
    ["a one-character locale", { locale: "f" }],
  ])("rejects %s with VALIDATION_FAILED", (_label, query) => {
    expect(
      validationCode(() => validate(shortFilmListQuerySchema, query))
    ).toBe("VALIDATION_FAILED")
  })
})

describe("shortFilmDetailQuerySchema", () => {
  it("accepts an empty query and a locale", () => {
    expect(validate(shortFilmDetailQuerySchema, {})).toEqual({})
    expect(validate(shortFilmDetailQuerySchema, { locale: "ar" })).toEqual({
      locale: "ar",
    })
  })

  it.each([["sort"], ["page"], ["genre"]])(
    "rejects any key other than locale (%s)",
    (key) => {
      expect(
        validationCode(() =>
          validate(shortFilmDetailQuerySchema, { [key]: "1" })
        )
      ).toBe("VALIDATION_FAILED")
    }
  )
})

describe("shortFilmSlugParamSchema", () => {
  it("accepts a normal slug", () => {
    expect(validate(shortFilmSlugParamSchema, { slug: "sf-alpha" })).toEqual({
      slug: "sf-alpha",
    })
  })

  it.each([["a b"], [""], ["a/b"], ["x".repeat(201)]])("rejects %j", (slug) => {
    expect(
      validationCode(() => validate(shortFilmSlugParamSchema, { slug }))
    ).toBe("VALIDATION_FAILED")
  })
})

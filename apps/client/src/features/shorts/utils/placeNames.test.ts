/**
 * Country and language names in the page locale (SPAGE-04, D-19).
 */
import { afterEach, describe, expect, it, vi } from "vitest"

import { countryNames, joinNames, languageNames } from "./placeNames"

const OVERRIDES = {
  fr: { aeb: "arabe tunisien", ber: "berbère" },
  ar: { aeb: "العربية التونسية", ber: "البربرية" },
  en: { aeb: "Tunisian Arabic", ber: "Berber" },
} as const

afterEach(() => {
  vi.restoreAllMocks()
})

describe("countryNames", () => {
  it("resolves region codes in the page locale", () => {
    expect(countryNames(["TN", "FR"], "fr")).toEqual(["Tunisie", "France"])
    expect(countryNames(["TN", "FR"], "ar")).toEqual(["تونس", "فرنسا"])
    expect(countryNames(["TN", "FR"], "en")).toEqual(["Tunisia", "France"])
  })

  it("accepts lowercase codes and removes duplicates", () => {
    expect(countryNames(["tn", "TN", "fr"], "fr")).toEqual([
      "Tunisie",
      "France",
    ])
  })

  it("skips a code that is not two letters or three digits, before Intl runs", () => {
    const of = vi.spyOn(Intl.DisplayNames.prototype, "of")
    expect(
      countryNames(["TUN", "T", "", "T1", "12", "TN", "../x"], "fr")
    ).toEqual(["Tunisie"])
    expect(of.mock.calls.map((call) => call[0])).toEqual(["TN"])
  })

  it("accepts a three-digit UN M.49 region", () => {
    const names = countryNames(["150"], "en")
    expect(names).toEqual(["Europe"])
  })

  it("drops a code Intl cannot name and never prints a raw code", () => {
    const names = countryNames(["XX", "TN"], "fr")
    expect(names).toEqual(["Tunisie"])
  })

  it("returns an empty list for no input", () => {
    expect(countryNames([], "fr")).toEqual([])
    expect(countryNames(undefined, "fr")).toEqual([])
  })
})

describe("languageNames", () => {
  it("resolves language codes in the page locale", () => {
    expect(languageNames(["fr", "ar"], "fr", OVERRIDES.fr)).toEqual([
      "français",
      "arabe",
    ])
    expect(languageNames(["en"], "en", OVERRIDES.en)).toEqual(["English"])
  })

  it("resolves aeb and ber through the overrides in every locale", () => {
    for (const locale of ["fr", "ar", "en"] as const) {
      expect(languageNames(["aeb", "ber"], locale, OVERRIDES[locale])).toEqual([
        OVERRIDES[locale].aeb,
        OVERRIDES[locale].ber,
      ])
    }
  })

  it("consults overrides case-insensitively and before Intl", () => {
    const of = vi.spyOn(Intl.DisplayNames.prototype, "of")
    expect(languageNames(["AEB"], "fr", OVERRIDES.fr)).toEqual([
      "arabe tunisien",
    ])
    expect(of).not.toHaveBeenCalled()
  })

  it("drops none silently and never calls Intl.DisplayNames with it", () => {
    const of = vi.spyOn(Intl.DisplayNames.prototype, "of")
    const names = languageNames(["none", "fr"], "fr", OVERRIDES.fr)
    expect(names).toEqual(["français"])
    expect(of.mock.calls.map((call) => call[0])).not.toContain("none")
    expect(names.join(" ")).not.toMatch(/none/i)
  })

  it("drops a code that is not 2-3 ASCII letters before Intl runs", () => {
    const of = vi.spyOn(Intl.DisplayNames.prototype, "of")
    expect(languageNames(["f", "frxx", "f1", "", "fr-TN"], "fr", {})).toEqual(
      []
    )
    expect(of).not.toHaveBeenCalled()
  })

  it("drops a result that echoes the code", () => {
    vi.spyOn(Intl.DisplayNames.prototype, "of").mockImplementation(
      (code: string) => code
    )
    expect(languageNames(["zzz"], "fr", {})).toEqual([])
  })

  it("catches a throwing Intl call", () => {
    vi.spyOn(Intl.DisplayNames.prototype, "of").mockImplementation(() => {
      throw new RangeError("invalid_argument")
    })
    expect(languageNames(["fr"], "fr", {})).toEqual([])
    expect(countryNames(["TN"], "fr")).toEqual([])
  })

  it("removes duplicates", () => {
    expect(languageNames(["fr", "FR", "fra"], "fr", {}).length).toBeLessThan(3)
    expect(languageNames(["aeb", "aeb"], "en", OVERRIDES.en)).toEqual([
      "Tunisian Arabic",
    ])
  })

  it("returns an empty list for no input", () => {
    expect(languageNames([], "fr", {})).toEqual([])
    expect(languageNames(undefined, "fr", {})).toEqual([])
  })
})

describe("joinNames", () => {
  it("joins with a locale-aware list", () => {
    expect(joinNames(["Tunisie", "France"], "fr")).toMatch(/Tunisie.*France/)
    expect(joinNames(["Tunisia", "France"], "en")).toBe("Tunisia, France")
    expect(joinNames(["تونس", "فرنسا"], "ar")).toBe("تونس وفرنسا")
  })

  it("returns the single name unchanged and an empty string for none", () => {
    expect(joinNames(["Tunisie"], "fr")).toBe("Tunisie")
    expect(joinNames([], "fr")).toBe("")
  })

  it("builds the formatter from the numeral-safe locale only", () => {
    const seen: string[] = []
    const Original = Intl.ListFormat
    vi.spyOn(Intl, "ListFormat").mockImplementation(function (
      this: unknown,
      locales?: string | string[],
      options?: Intl.ListFormatOptions
    ) {
      seen.push(String(locales))
      return new Original(locales, options)
    } as unknown as typeof Intl.ListFormat)
    joinNames(["a", "b"], "ar")
    expect(seen).toEqual(["ar-u-nu-latn"])
  })
})

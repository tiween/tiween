import { describe, expect, it } from "vitest"

import { toNumeralSafeLocale } from "./intl-locale"

/**
 * The helper is the single expression of the Western-numeral invariant, so its
 * contract is asserted directly *and* through real `Intl` output forced onto an
 * Arabic-Indic default (`ar-u-nu-arab`). The forced-worst-case assertion is the
 * one that matters: on this host `ar` already resolves to `latn`, so a test that
 * only formatted `ar` would pass even with the helper deleted.
 */
describe("toNumeralSafeLocale", () => {
  it("appends the latn numbering system to a bare language tag", () => {
    expect(toNumeralSafeLocale("ar")).toBe("ar-u-nu-latn")
  })

  it("appends the latn numbering system to a language-region tag", () => {
    expect(toNumeralSafeLocale("fr-TN")).toBe("fr-TN-u-nu-latn")
    expect(toNumeralSafeLocale("en-US")).toBe("en-US-u-nu-latn")
  })

  it("overrides an incoming non-latn numbering system", () => {
    // `latn` is not negotiable: an `-u-nu-arab` tag can arrive from a URL
    // segment, an Accept-Language header or a stored preference, and the lint
    // rule treats every helper call as proof of safety — so the helper must
    // make that proof true rather than honour the caller's numbering system.
    expect(toNumeralSafeLocale("ar-u-nu-arab")).toBe("ar-u-nu-latn")
    expect(toNumeralSafeLocale("ar-u-nu-latn")).toBe("ar-u-nu-latn")
    expect(toNumeralSafeLocale("AR-U-NU-ARAB")).toBe("ar-u-nu-latn")
  })

  it("stays valid BCP-47 when the tag already carries another extension", () => {
    // Naive concatenation would emit a second `-u-` singleton
    // (`ar-u-ca-islamic-u-nu-latn`), which every Intl constructor rejects.
    // (The helper call stays inline: the lint rule treats a hoisted `const tag`
    // as unproven, which is the rule working — see the `AttendanceCounter` note
    // in the story's Completion Notes.)
    expect(
      () => new Intl.NumberFormat(toNumeralSafeLocale("ar-u-ca-islamic"))
    ).not.toThrow()
    expect(
      new Intl.NumberFormat(
        toNumeralSafeLocale("ar-u-ca-islamic")
      ).resolvedOptions().numberingSystem
    ).toBe("latn")
  })

  it("degrades to the fallback for an unparseable tag instead of throwing", () => {
    expect(toNumeralSafeLocale("en_US")).toBe("fr-TN-u-nu-latn")
    expect(toNumeralSafeLocale("not a locale")).toBe("fr-TN-u-nu-latn")
    // A broken *fallback* must not throw either — the helper is total.
    expect(() =>
      new Intl.NumberFormat(toNumeralSafeLocale("en_US", "also_broken")).format(
        1
      )
    ).not.toThrow()
  })

  it("falls back to fr-TN rather than the ambient runtime default", () => {
    expect(toNumeralSafeLocale()).toBe("fr-TN-u-nu-latn")
    expect(toNumeralSafeLocale(undefined)).toBe("fr-TN-u-nu-latn")
    expect(toNumeralSafeLocale(null)).toBe("fr-TN-u-nu-latn")
    expect(toNumeralSafeLocale("")).toBe("fr-TN-u-nu-latn")
    expect(toNumeralSafeLocale("   ")).toBe("fr-TN-u-nu-latn")
  })

  it("honours an explicit fallback", () => {
    expect(toNumeralSafeLocale(undefined, "en-US")).toBe("en-US-u-nu-latn")
  })

  it("produces a tag Intl resolves to the latn numbering system", () => {
    for (const locale of ["ar", "ar-TN", "ar-EG", "ar-SA", "fr-TN", "en-US"]) {
      expect(
        new Intl.NumberFormat(toNumeralSafeLocale(locale)).resolvedOptions()
          .numberingSystem
      ).toBe("latn")
    }
  })

  it("forces Western digits even from an Arabic-Indic-defaulting tag", () => {
    // `ar-EG` / `ar-SA` genuinely default to `arab` on this host, so these are
    // real worst-case inputs rather than a simulation — and `ar-u-nu-arab` is
    // what an ICU build with an `arab`-defaulting `ar` behaves like everywhere.
    for (const locale of ["ar-u-nu-arab", "ar-EG", "ar-SA"]) {
      expect(
        new Intl.NumberFormat(toNumeralSafeLocale(locale)).format(1234)
      ).not.toMatch(/[٠-٩۰-۹]/)
    }
    // This is not passing for free: `ar-EG` / `ar-SA` resolve to `arab` on this
    // host, so the loop fails the moment the helper stops rewriting the tag.
    // (The raw-tag counter-example cannot be written here — the lint rule makes
    // Arabic-Indic output unexpressible without a banned eslint-disable. The
    // synthetic control lives in `icu-numerals.test.ts`.)
  })
})

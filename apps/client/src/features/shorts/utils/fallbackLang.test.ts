/**
 * Silent French-fallback tagging (FR56, D-11). The page never shows a label;
 * the text node is only tagged so screen readers and font stacks switch.
 */
import { describe, expect, it } from "vitest"

import { fallbackTextAttrs } from "./fallbackLang"

describe("fallbackTextAttrs", () => {
  it("adds nothing on a French page", () => {
    expect(fallbackTextAttrs("Les Souliers", "fr", "fr")).toEqual({})
    expect(fallbackTextAttrs("Les Souliers", "fr", "ar")).toEqual({})
    expect(fallbackTextAttrs("Les Souliers", "fr", undefined)).toEqual({})
  })

  it("tags lang fr when the served locale differs from an English page", () => {
    expect(fallbackTextAttrs("Les Souliers", "en", "fr")).toEqual({
      lang: "fr",
    })
  })

  it("adds dir ltr only on an Arabic page", () => {
    expect(fallbackTextAttrs("Les Souliers", "ar", "fr")).toEqual({
      lang: "fr",
      dir: "ltr",
    })
  })

  it("adds nothing when the served locale matches an English page", () => {
    expect(fallbackTextAttrs("Shoes", "en", "en")).toEqual({})
    expect(fallbackTextAttrs("Shoes", "en", undefined)).toEqual({})
  })

  it("tags Latin-script text on an Arabic page even when ar was served", () => {
    expect(fallbackTextAttrs("Trois générations", "ar", "ar")).toEqual({
      lang: "fr",
      dir: "ltr",
    })
  })

  it("leaves Arabic text on an Arabic page alone", () => {
    expect(fallbackTextAttrs("صباط العيد", "ar", "ar")).toEqual({})
  })

  it("compares the primary language subtag only", () => {
    expect(fallbackTextAttrs("صباط العيد", "ar", "ar-TN")).toEqual({})
    expect(fallbackTextAttrs("Shoes", "en", "en-GB")).toEqual({})
  })

  it("adds nothing for empty text", () => {
    expect(fallbackTextAttrs("", "ar", "fr")).toEqual({})
    expect(fallbackTextAttrs("   ", "en", "fr")).toEqual({})
    expect(fallbackTextAttrs(undefined, "ar", "fr")).toEqual({})
    expect(fallbackTextAttrs(null, "ar", "fr")).toEqual({})
  })
})

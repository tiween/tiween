/**
 * Initials for the plain disc avatar (D-12, D-21).
 */
import { describe, expect, it } from "vitest"

import { getInitials } from "./initials"

const ZWNJ = "‌"

describe("getInitials", () => {
  it("takes the first letter of the first and last word", () => {
    expect(getInitials("Hend Sabri")).toBe("HS")
    expect(getInitials("Jean Pierre Dupont")).toBe("JD")
  })

  it("gives one letter for a one-word name", () => {
    expect(getInitials("Madonna")).toBe("M")
  })

  it("uppercases Latin letters", () => {
    expect(getInitials("anis lassoued")).toBe("AL")
  })

  it("ignores surrounding and repeated whitespace", () => {
    expect(getInitials("  Anis   Lassoued  ")).toBe("AL")
  })

  it("returns an empty string for an empty or blank name", () => {
    expect(getInitials("")).toBe("")
    expect(getInitials("   ")).toBe("")
  })

  it("does not split a combining-mark grapheme", () => {
    const decomposed = "Élodie Nadal"
    expect(getInitials(decomposed)).toBe("ÉN")
  })

  it("does not split an emoji grapheme cluster", () => {
    const astronaut = "\u{1F469}‍\u{1F680}"
    expect(getInitials(`${astronaut} Nova`)).toBe(`${astronaut}N`)
  })

  it("never slices a surrogate pair", () => {
    expect(getInitials("\u{1D400}ada Kofi")).toBe("\u{1D400}K")
  })

  it("joins two Arabic-script letters with a zero-width non-joiner", () => {
    expect(getInitials("هند صبري")).toBe(`ه${ZWNJ}ص`)
  })

  it("does not insert a joiner for a single Arabic letter or mixed scripts", () => {
    expect(getInitials("هند")).toBe("ه")
    expect(getInitials("Hend صبري")).toBe("Hص")
  })
})

import { describe, expect, it } from "vitest"

import { formatPrice } from "./formatPrice"

describe("formatPrice (Story 6.1)", () => {
  it("maps TND to the DT symbol and formats with a comma separator (golden)", () => {
    expect(formatPrice(15, "TND")).toBe("15,00 DT")
  })

  it("defaults the currency to TND -> DT", () => {
    expect(formatPrice(15)).toBe("15,00 DT")
  })

  it("keeps two decimals with a comma separator", () => {
    expect(formatPrice(12.5)).toBe("12,50 DT")
    expect(formatPrice(0)).toBe("0,00 DT")
    expect(formatPrice(9.99)).toBe("9,99 DT")
  })

  it("shows a non-TND currency code verbatim", () => {
    expect(formatPrice(15, "EUR")).toBe("15,00 EUR")
  })

  it("emits Western (Latin) numerals (correct for the Arabic locale)", () => {
    expect(formatPrice(1234.5)).toBe("1234,50 DT")
    expect(/[0-9]/.test(formatPrice(15))).toBe(true)
  })
})

import { describe, expect, it } from "vitest"

import { extractErrorCode } from "./extractErrorCode"

/**
 * `extractErrorCode` (Story 6.3): pulls the backend SCREAMING_SNAKE CODE out of
 * the JSON-encoded AppError that `BaseStrapiClient.fetchAPI` throws.
 */
describe("extractErrorCode", () => {
  it("reads details.code from a JSON-encoded AppError", () => {
    const err = new Error(
      JSON.stringify({
        name: "CheckoutError",
        message: "boom",
        details: { code: "KONNECT_UNAVAILABLE" },
        status: 502,
      })
    )
    expect(extractErrorCode(err)).toBe("KONNECT_UNAVAILABLE")
  })

  it("falls back to UNKNOWN_ERROR for a non-JSON message", () => {
    expect(extractErrorCode(new Error("plain text"))).toBe("UNKNOWN_ERROR")
  })

  it("falls back to UNKNOWN_ERROR when no code is present", () => {
    const err = new Error(JSON.stringify({ details: {} }))
    expect(extractErrorCode(err)).toBe("UNKNOWN_ERROR")
  })

  it("falls back to UNKNOWN_ERROR for a non-Error value", () => {
    expect(extractErrorCode("nope")).toBe("UNKNOWN_ERROR")
  })
})

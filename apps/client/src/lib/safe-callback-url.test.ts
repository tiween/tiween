/**
 * safeCallbackUrl / toRouterPath (phase 2, D-14, threat T-02-10).
 */
import { describe, expect, it } from "vitest"

import { safeCallbackUrl, toRouterPath } from "./safe-callback-url"

describe("safeCallbackUrl", () => {
  it.each([
    ["null", null],
    ["undefined", undefined],
    ["empty string", ""],
    ["protocol-relative", "//evil.com"],
    ["backslash host", "/\\evil.com"],
    ["absolute https", "https://evil.com"],
    ["absolute http", "http://evil.com/x"],
    ["javascript scheme", "javascript:alert(1)"],
    ["bare relative", "shorts/x"],
    ["tab inside", "/shorts/\tx"],
    ["newline before host", "/\n/evil.com"],
    ["carriage return", "/shorts\r/x"],
    ["DEL character", "/shorts/\u007fx"],
    ["NUL character", "/shorts/\u0000x"],
  ])("resolves %s to /", (_label, input) => {
    expect(safeCallbackUrl(input)).toBe("/")
  })

  it.each(["/shorts/x", "/ar/shorts/x?foo=1", "/dashboard", "/fr/shorts#top"])(
    "returns the safe path %s unchanged",
    (input) => {
      expect(safeCallbackUrl(input)).toBe(input)
    }
  )
})

describe("toRouterPath", () => {
  it.each([
    ["/ar/shorts/x?a=1", "/shorts/x?a=1"],
    ["/en/shorts/x", "/shorts/x"],
    ["/fr/shorts/x#top", "/shorts/x#top"],
    ["/fr", "/"],
    ["/en/", "/"],
    ["/ar?a=1", "/?a=1"],
  ])("strips one leading locale segment: %s", (input, expected) => {
    expect(toRouterPath(input)).toBe(expected)
  })

  it.each(["/arc/x", "/shorts/ar/x", "/", "/shorts/x", "/frx", "/ar-x/y"])(
    "leaves %s unchanged",
    (input) => {
      expect(toRouterPath(input)).toBe(input)
    }
  )

  it("removes only one locale segment", () => {
    expect(toRouterPath("/ar/fr/x")).toBe("/fr/x")
  })
})

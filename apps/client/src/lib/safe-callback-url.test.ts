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

  it("keeps a normal path with query and fragment intact", () => {
    expect(toRouterPath("/ar/shorts/x?y=1#z")).toBe("/shorts/x?y=1#z")
  })

  // Stripping the locale must not expose an off-site target (T-02-10).
  it.each([
    ["double slash after the locale", "/fr//evil.com"],
    ["backslash after the locale", "/ar/\\evil.com"],
    ["double slash after a bare locale", "/en//evil.com/x"],
    ["tab after the locale", "/fr/\t/evil.com"],
    ["control character in the rest", "/ar/shorts/\nx"],
  ])("returns / when stripping would expose %s", (_label, input) => {
    expect(toRouterPath(input)).toBe("/")
  })

  it("never returns a protocol-relative or backslash path", () => {
    for (const input of [
      "/fr//evil.com",
      "/ar/\\evil.com",
      "/en/%2F%2Fevil.com",
      "//evil.com",
      "/\\evil.com",
      "https://evil.com",
    ]) {
      const out = toRouterPath(input)
      expect(out.startsWith("/")).toBe(true)
      expect(out.startsWith("//")).toBe(false)
      expect(out.startsWith("/\\")).toBe(false)
    }
  })

  it("keeps an encoded double slash as an on-origin path", () => {
    // Percent-encoded slashes are not path separators to the URL parser, so
    // this stays a same-origin path and is never treated as a host.
    expect(toRouterPath("/en/%2F%2Fevil.com")).toBe("/%2F%2Fevil.com")
  })

  it("maps a bare locale to /", () => {
    expect(toRouterPath("/fr")).toBe("/")
  })
})

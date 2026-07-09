import { describe, expect, it } from "vitest"

import {
  buildEventShareUrl,
  buildSocialShareLinks,
  shouldFallbackAfterShareError,
  toAbsoluteMediaUrl,
} from "./share"

describe("buildEventShareUrl", () => {
  it("composes the canonical /{locale}/events/{documentId} URL", () => {
    expect(
      buildEventShareUrl({
        baseUrl: "https://tiween.tn",
        locale: "fr",
        documentId: "abc",
      })
    ).toBe("https://tiween.tn/fr/events/abc")
  })

  it("strips a trailing slash on baseUrl (no double slash)", () => {
    expect(
      buildEventShareUrl({
        baseUrl: "https://tiween.tn/",
        locale: "en",
        documentId: "xyz",
      })
    ).toBe("https://tiween.tn/en/events/xyz")
  })

  it("strips multiple trailing slashes", () => {
    expect(
      buildEventShareUrl({
        baseUrl: "https://tiween.tn///",
        locale: "ar",
        documentId: "doc1",
      })
    ).toBe("https://tiween.tn/ar/events/doc1")
  })
})

describe("buildSocialShareLinks", () => {
  const url = "https://tiween.tn/fr/events/abc"
  const title = "Barbie"

  it("builds a WhatsApp link with an encoded 'title url' text", () => {
    expect(buildSocialShareLinks({ url, title }).whatsapp).toBe(
      "https://wa.me/?text=Barbie%20https%3A%2F%2Ftiween.tn%2Ffr%2Fevents%2Fabc"
    )
  })

  it("builds a Facebook sharer link with the encoded url", () => {
    expect(buildSocialShareLinks({ url, title }).facebook).toBe(
      "https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Ftiween.tn%2Ffr%2Fevents%2Fabc"
    )
  })

  it("builds a Twitter intent link with encoded text + url", () => {
    expect(buildSocialShareLinks({ url, title }).twitter).toBe(
      "https://twitter.com/intent/tweet?text=Barbie&url=https%3A%2F%2Ftiween.tn%2Ffr%2Fevents%2Fabc"
    )
  })

  it("URL-encodes special characters in the title", () => {
    const links = buildSocialShareLinks({
      url,
      title: "Tom & Jerry",
    })
    expect(links.twitter).toContain("text=Tom%20%26%20Jerry")
    expect(links.whatsapp).toContain("Tom%20%26%20Jerry")
  })
})

describe("toAbsoluteMediaUrl", () => {
  const baseUrl = "https://tiween.tn"

  it("passes an http(s):// URL through unchanged", () => {
    expect(
      toAbsoluteMediaUrl({ url: "https://cdn.example.com/x.jpg", baseUrl })
    ).toBe("https://cdn.example.com/x.jpg")
    expect(
      toAbsoluteMediaUrl({ url: "http://cdn.example.com/x.jpg", baseUrl })
    ).toBe("http://cdn.example.com/x.jpg")
  })

  it("joins a root-relative /uploads path to baseUrl", () => {
    expect(toAbsoluteMediaUrl({ url: "/uploads/x.jpg", baseUrl })).toBe(
      "https://tiween.tn/uploads/x.jpg"
    )
  })

  it("joins an /api/asset path with exactly one slash", () => {
    expect(
      toAbsoluteMediaUrl({ url: "/api/asset/uploads/x.jpg", baseUrl })
    ).toBe("https://tiween.tn/api/asset/uploads/x.jpg")
  })

  it("prefixes a protocol-relative URL with https:", () => {
    expect(toAbsoluteMediaUrl({ url: "//cdn/x.jpg", baseUrl })).toBe(
      "https://cdn/x.jpg"
    )
  })

  it("joins a bare (no leading slash) path with exactly one slash", () => {
    expect(toAbsoluteMediaUrl({ url: "images/x.jpg", baseUrl })).toBe(
      "https://tiween.tn/images/x.jpg"
    )
  })

  it("does not double the slash when baseUrl has a trailing slash", () => {
    expect(
      toAbsoluteMediaUrl({ url: "/uploads/x.jpg", baseUrl: "https://tiween.tn/" })
    ).toBe("https://tiween.tn/uploads/x.jpg")
  })
})

describe("shouldFallbackAfterShareError", () => {
  it("returns false for an AbortError DOMException (user cancelled)", () => {
    expect(
      shouldFallbackAfterShareError(
        new DOMException("cancelled", "AbortError")
      )
    ).toBe(false)
  })

  it("returns true for a generic Error", () => {
    expect(shouldFallbackAfterShareError(new Error("boom"))).toBe(true)
  })

  it("returns true for a non-abort DOMException", () => {
    expect(
      shouldFallbackAfterShareError(
        new DOMException("denied", "NotAllowedError")
      )
    ).toBe(true)
  })
})

import { describe, expect, it } from "vitest"

import { buildDirectionsUrl, platformFromUserAgent } from "./directions"

describe("buildDirectionsUrl", () => {
  it("returns a Google Maps universal directions URL by default", () => {
    expect(buildDirectionsUrl({ latitude: 36.8, longitude: 10.18 })).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=36.8,10.18"
    )
  })

  it("returns a Google Maps URL for an explicit non-Apple platform hint", () => {
    expect(
      buildDirectionsUrl(
        { latitude: 36.8065, longitude: 10.1815 },
        { platform: "other" }
      )
    ).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=36.8065,10.1815"
    )
  })

  it("returns an Apple Maps URL on the apple platform branch", () => {
    expect(
      buildDirectionsUrl(
        { latitude: 36.8, longitude: 10.18 },
        { platform: "apple" }
      )
    ).toBe("https://maps.apple.com/?daddr=36.8,10.18")
  })

  it("keeps the lat,lng destination literal (no encoded comma)", () => {
    const url = buildDirectionsUrl({ latitude: 36.8528, longitude: 10.3233 })
    expect(url).toContain("destination=36.8528,10.3233")
    expect(url).not.toContain("%2C")
  })

  it("preserves negative coordinates verbatim", () => {
    expect(
      buildDirectionsUrl({ latitude: -33.8688, longitude: 151.2093 })
    ).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=-33.8688,151.2093"
    )
  })
})

describe("platformFromUserAgent", () => {
  it.each([
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
  ])("returns 'apple' for Apple-family UA: %s", (ua) => {
    expect(platformFromUserAgent(ua)).toBe("apple")
  })

  it.each([
    "Mozilla/5.0 (Linux; Android 14; Pixel 8)",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    "Mozilla/5.0 (X11; Linux x86_64)",
    "",
  ])("returns 'other' for non-Apple UA: %s", (ua) => {
    expect(platformFromUserAgent(ua)).toBe("other")
  })
})

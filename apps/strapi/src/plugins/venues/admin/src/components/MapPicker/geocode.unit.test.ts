/**
 * The geocoding adapter (Story 2D.2, AC 4 / OQ-1).
 *
 * The point of the adapter is that the PROVIDER is swappable, so what is pinned
 * here is the contract every provider must honour — not Nominatim's JSON
 * shape for its own sake:
 *  - a resolved address yields `{ latitude, longitude }` (the `shared.geo-point`
 *    field names, not `lat`/`lon`)
 *  - "no result" and "provider broke" are DIFFERENT codes; only the first is
 *    the editor's problem to fix
 *  - the request never carries an admin credential (plain `fetch`, absolute
 *    third-party URL)
 */
import { formatCoordinate, isValidGeoPoint, nominatimGeocoder } from "./geocode"

const originalFetch = global.fetch

function mockFetch(impl: () => unknown) {
  const fn = jest.fn(async () => impl() as never)
  ;(global as { fetch: unknown }).fetch = fn
  return fn
}

afterEach(() => {
  ;(global as { fetch: unknown }).fetch = originalFetch
})

/** Run `fn` and return the thrown error's `code`. */
async function codeOf(fn: () => Promise<unknown>): Promise<string | undefined> {
  try {
    await fn()
  } catch (err) {
    return (err as { code?: string }).code
  }
  return undefined
}

describe("nominatimGeocoder (unit)", () => {
  it("resolves the first hit into the geo-point field names", async () => {
    const fetchMock = mockFetch(() => ({
      ok: true,
      json: async () => [{ lat: "36.8065", lon: "10.1815" }],
    }))

    await expect(
      nominatimGeocoder.geocode("15 avenue Habib Bourguiba")
    ).resolves.toEqual({ latitude: 36.8065, longitude: 10.1815 })

    const url = String(fetchMock.mock.calls[0][0])
    expect(url).toContain("nominatim.openstreetmap.org")
    expect(url).toContain("countrycodes=tn")
    // No Authorization header: an admin JWT must never reach a third party.
    const init = fetchMock.mock.calls[0][1] as {
      headers?: Record<string, string>
    }
    expect(Object.keys(init?.headers ?? {})).toEqual(["Accept"])
  })

  it("answers GEOCODE_NO_RESULT for an empty query without calling the provider", async () => {
    const fetchMock = mockFetch(() => ({ ok: true, json: async () => [] }))

    expect(await codeOf(() => nominatimGeocoder.geocode("   "))).toBe(
      "GEOCODE_NO_RESULT"
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("answers GEOCODE_NO_RESULT for an empty result set", async () => {
    mockFetch(() => ({ ok: true, json: async () => [] }))

    expect(await codeOf(() => nominatimGeocoder.geocode("nowhere"))).toBe(
      "GEOCODE_NO_RESULT"
    )
  })

  it("answers GEOCODE_NO_RESULT when the hit has unusable coordinates", async () => {
    mockFetch(() => ({ ok: true, json: async () => [{ lat: "n/a" }] }))

    expect(await codeOf(() => nominatimGeocoder.geocode("somewhere"))).toBe(
      "GEOCODE_NO_RESULT"
    )
  })

  it.each([
    ["a non-OK response", () => ({ ok: false, json: async () => [] })],
    [
      "a network failure",
      () => {
        throw new Error("offline")
      },
    ],
  ])("answers GEOCODE_FAILED for %s", async (_label, impl) => {
    mockFetch(impl)

    expect(await codeOf(() => nominatimGeocoder.geocode("somewhere"))).toBe(
      "GEOCODE_FAILED"
    )
  })
})

describe("geo helpers (unit)", () => {
  it("formats coordinates with Western numerals and metre precision", () => {
    expect(formatCoordinate(36.806512345)).toBe("36.80651")
  })

  it("rejects out-of-range and absent points", () => {
    expect(isValidGeoPoint(null)).toBe(false)
    expect(isValidGeoPoint({ latitude: 91, longitude: 10 })).toBe(false)
    expect(isValidGeoPoint({ latitude: 36, longitude: 181 })).toBe(false)
    expect(isValidGeoPoint({ latitude: 36.8, longitude: 10.18 })).toBe(true)
  })
})

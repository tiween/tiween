/**
 * The Web Mercator transform behind the map picker.
 *
 * `toWorldPixel` / `fromWorldPixel` are the ONLY thing standing between a pin
 * drag and the coordinates written to the venue's `geo` component — a sign flip
 * or a factor of two here silently stores a point in the wrong hemisphere, and
 * no component test would catch it (the form test mocks the whole picker out).
 * They are pure and deterministic, so they are pinned directly.
 */
import { MERCATOR_MAX_LATITUDE } from "./geocode"
import { fromWorldPixel, TILE_SIZE, toWorldPixel, ZOOM } from "./projection"

/** Round-trip tolerance: ~1e-9° is far below a pixel at zoom 15. */
const EPSILON = 1e-6

const PLACES: [string, number, number][] = [
  ["Tunis", 36.8065, 10.1815],
  ["equator/prime meridian", 0, 0],
  ["southern + western hemisphere", -33.8688, -70.6693],
  ["far east", 35.6762, 139.6503],
]

describe("Web Mercator round trip (unit)", () => {
  it.each(PLACES)("survives a round trip through %s", (_name, lat, lng) => {
    const back = fromWorldPixel(toWorldPixel({ latitude: lat, longitude: lng }))

    expect(back.latitude).toBeCloseTo(lat, 6)
    expect(back.longitude).toBeCloseTo(lng, 6)
  })

  it("keeps north up and east right", () => {
    // A sign flip is the failure mode that silently mirrors the map: further
    // north must be a SMALLER y, further east a LARGER x.
    const north = toWorldPixel({ latitude: 37, longitude: 10 })
    const south = toWorldPixel({ latitude: 36, longitude: 10 })
    const east = toWorldPixel({ latitude: 36, longitude: 11 })

    expect(north.y).toBeLessThan(south.y)
    expect(east.x).toBeGreaterThan(south.x)
  })

  it("places the antimeridian and the prime meridian where the tile grid expects", () => {
    const scale = TILE_SIZE * 2 ** ZOOM

    expect(toWorldPixel({ latitude: 0, longitude: -180 }).x).toBeCloseTo(0, 6)
    expect(toWorldPixel({ latitude: 0, longitude: 0 }).x).toBeCloseTo(
      scale / 2,
      6
    )
    expect(toWorldPixel({ latitude: 0, longitude: 0 }).y).toBeCloseTo(
      scale / 2,
      6
    )
  })

  it("CLAMPS the poles instead of returning Infinity", () => {
    // `log((1+sin φ)/(1−sin φ))` diverges at ±90°: unclamped, the pin offset is
    // NaN and the canvas renders blank with no way to recover.
    for (const latitude of [90, -90, 91, -1000]) {
      const pixel = toWorldPixel({ latitude, longitude: 10 })
      expect(Number.isFinite(pixel.x)).toBe(true)
      expect(Number.isFinite(pixel.y)).toBe(true)
    }

    expect(toWorldPixel({ latitude: 90, longitude: 10 })).toEqual(
      toWorldPixel({ latitude: MERCATOR_MAX_LATITUDE, longitude: 10 })
    )
  })

  it("clamps an out-of-range longitude rather than wrapping the world", () => {
    expect(toWorldPixel({ latitude: 0, longitude: 200 })).toEqual(
      toWorldPixel({ latitude: 0, longitude: 180 })
    )
  })

  it("moves the pin by a predictable amount for a one-pixel nudge", () => {
    // What the arrow-key path relies on: one screen pixel is a small, non-zero
    // and monotonic change in latitude at this zoom.
    const origin = toWorldPixel({ latitude: 36.8065, longitude: 10.1815 })
    const nudged = fromWorldPixel({ x: origin.x, y: origin.y - 1 })

    expect(nudged.latitude).toBeGreaterThan(36.8065)
    expect(nudged.latitude - 36.8065).toBeLessThan(0.001)
    expect(Math.abs(nudged.longitude - 10.1815)).toBeLessThan(EPSILON)
  })
})

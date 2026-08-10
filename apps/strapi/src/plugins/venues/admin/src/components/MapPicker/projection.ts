/**
 * Web Mercator, the only maths a fixed-zoom tile grid needs.
 *
 * A SEPARATE MODULE from the component on purpose: these two functions are the
 * only thing standing between a pin drag and the coordinates written to the
 * venue's `geo` component, and the Jest unit gate matches `**\/*.unit.test.ts`
 * in a node environment — it cannot load a `.tsx`. Keeping them here makes the
 * transform verifiable without a DOM (`./projection.unit.test.ts`).
 */
import type { GeoPoint } from "./geocode"

import { MERCATOR_MAX_LATITUDE } from "./geocode"

/** Zoom level and tile size the whole picker is pinned to (street level). */
export const ZOOM = 15
export const TILE_SIZE = 256

export interface PixelPoint {
  x: number
  y: number
}

/**
 * Latitude → Y is `log((1+sin φ)/(1−sin φ))`, which is **Infinity at ±90°** —
 * the poles are infinitely far away in Mercator. Clamping to the projection's
 * conventional limit keeps a pole-ish input (a bad geocoder answer, a legacy
 * row) as a placeable pin instead of `NaN` offsets that blank the canvas.
 */
export function toWorldPixel(point: GeoPoint): PixelPoint {
  const scale = TILE_SIZE * 2 ** ZOOM
  const latitude = Math.min(
    Math.max(point.latitude, -MERCATOR_MAX_LATITUDE),
    MERCATOR_MAX_LATITUDE
  )
  const longitude = Math.min(Math.max(point.longitude, -180), 180)

  const x = ((longitude + 180) / 360) * scale
  const sinLat = Math.sin((latitude * Math.PI) / 180)
  const y =
    (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale
  return { x, y }
}

/** The exact inverse of {@link toWorldPixel} inside the Mercator band. */
export function fromWorldPixel(pixel: PixelPoint): GeoPoint {
  const scale = TILE_SIZE * 2 ** ZOOM
  const longitude = (pixel.x / scale) * 360 - 180
  const n = Math.PI - 2 * Math.PI * (pixel.y / scale)
  const latitude = (180 / Math.PI) * Math.atan(Math.sinh(n))
  return { latitude, longitude }
}

/**
 * Pure, dependency-free builder for a maps "directions" deep link to a venue's
 * coordinates. Kept side-effect-free (the platform hint is passed in, never read
 * from `navigator` here) so it is trivially unit-testable and reused by both the
 * Leaflet popup (`VenueMapClient`) and the event detail page directions control.
 */

/** A pair of decimal coordinates for the directions destination. */
export interface DirectionsCoords {
  latitude: number
  longitude: number
}

/** Platform hint chosen at the call site (Apple → Apple Maps, else Google). */
export type DirectionsPlatform = "apple" | "other"

export interface BuildDirectionsUrlOptions {
  /** Which maps provider to target. Defaults to Google Maps. */
  platform?: DirectionsPlatform
}

/**
 * Build a directions URL to `{ latitude, longitude }`.
 *
 * - Default / `platform: "other"` → Google Maps universal URL:
 *   `https://www.google.com/maps/dir/?api=1&destination=<lat>,<lng>`
 * - `platform: "apple"` → Apple Maps: `https://maps.apple.com/?daddr=<lat>,<lng>`
 */
export function buildDirectionsUrl(
  { latitude, longitude }: DirectionsCoords,
  { platform = "other" }: BuildDirectionsUrlOptions = {}
): string {
  // Coordinates are finite numbers (the caller gates on `Number.isFinite`), so
  // the `lat,lng` pair is URL-safe as-is — kept literal to match the canonical
  // Google/Apple deep-link format (an encoded comma would break the pin).
  const destination = `${latitude},${longitude}`

  if (platform === "apple") {
    return `https://maps.apple.com/?daddr=${destination}`
  }

  return `https://www.google.com/maps/dir/?api=1&destination=${destination}`
}

/**
 * Classify a user-agent / platform string to a maps provider: Apple-family
 * devices (iPhone/iPad/iPod/Mac) → Apple Maps, everything else → Google. Pure
 * (the string is passed in) so the sniff is unit-testable away from `navigator`.
 */
export function platformFromUserAgent(ua: string): DirectionsPlatform {
  return /iPhone|iPad|iPod|Macintosh|Mac OS X/i.test(ua) ? "apple" : "other"
}

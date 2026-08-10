/**
 * Geocoding adapter (Story 2D.2, AC 4 / Dev Notes §5).
 *
 * TODO(OQ-1): the geocoding PROVIDER is still an open question — Nominatim/OSM
 * vs Google Geocoding vs reusing the geography plugin's city coordinates. That
 * decision is deliberately NOT baked into `MapPicker`: the component depends on
 * the {@link Geocoder} interface only and takes an implementation as a prop, so
 * swapping providers is one new module plus one default, not a component
 * rewrite. Whoever closes OQ-1: add the new implementation next to
 * {@link nominatimGeocoder}, change {@link defaultGeocoder}, and delete this
 * paragraph.
 *
 * The shipped default is Nominatim because it is the no-cost option and needs
 * no key. Its usage policy requires an identifying User-Agent/Referer and caps
 * traffic at ~1 request/second; both are satisfied here in practice (a browser
 * sends a Referer automatically, and a request only happens when an editor
 * clicks "Localiser"), but a bulk/automated caller MUST NOT reuse this module.
 */

/** A resolved point, in the `shared.geo-point` component's own field names. */
export interface GeoPoint {
  latitude: number
  longitude: number
}

/** Stable error CODES (project rule: codes, not prose; the UI translates). */
export const GEOCODE_FAILED = "GEOCODE_FAILED"
export const GEOCODE_NO_RESULT = "GEOCODE_NO_RESULT"

/**
 * The whole provider contract. Anything satisfying this can be injected into
 * `MapPicker` — including a test double, which is why the component takes it as
 * a prop instead of importing the default directly.
 */
export interface Geocoder {
  /**
   * @param options.signal aborts the request — the caller applies the timeout
   * and cancels a superseded lookup, so a provider that never answers cannot
   * pin the UI in a loading state.
   * @throws an `Error` whose `code` is `GEOCODE_NO_RESULT` (the address is
   * unknown) or `GEOCODE_FAILED` (the provider is unreachable, aborted or
   * broken). The two are distinguished because only the first is the editor's
   * problem to fix.
   */
  geocode(
    address: string,
    options?: { signal?: AbortSignal }
  ): Promise<GeoPoint>
}

/**
 * The conventional latitude limit of the Web Mercator projection
 * (`atan(sinh(π))`). Beyond it the projection diverges — `Math.log` at ±90°
 * is Infinity — so a point outside this band cannot be drawn on, or corrected
 * with, a tile map. Coordinates are bounded to it rather than to ±90°.
 */
export const MERCATOR_MAX_LATITUDE = 85.05112878

function codedError(code: string): Error {
  return Object.assign(new Error(code), { code })
}

const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/search"

/**
 * Bias results towards Tunisia (`countrycodes=tn`).
 *
 * Not a hard restriction of the product — it is what makes "15 avenue Habib
 * Bourguiba" resolve to Tunis rather than to a same-named street elsewhere.
 */
const NOMINATIM_COUNTRY = "tn"

interface NominatimHit {
  lat?: string
  lon?: string
}

/** The shipped default (see the OQ-1 note above). */
export const nominatimGeocoder: Geocoder = {
  async geocode(
    address: string,
    options?: { signal?: AbortSignal }
  ): Promise<GeoPoint> {
    const query = address.trim()
    if (!query) throw codedError(GEOCODE_NO_RESULT)

    const url = `${NOMINATIM_ENDPOINT}?${new URLSearchParams({
      q: query,
      format: "json",
      limit: "1",
      countrycodes: NOMINATIM_COUNTRY,
    }).toString()}`

    let payload: unknown
    try {
      // Plain `fetch`, NOT `useFetchClient`: that client prefixes the Strapi
      // backend URL and attaches the admin JWT — sending an admin credential to
      // a third-party host is exactly what must not happen here.
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: options?.signal,
      })
      if (!response.ok) throw codedError(GEOCODE_FAILED)
      payload = await response.json()
    } catch (err) {
      throw (err as { code?: string })?.code
        ? (err as Error)
        : codedError(GEOCODE_FAILED)
    }

    const hit = Array.isArray(payload)
      ? (payload[0] as NominatimHit)
      : undefined
    const latitude = Number(hit?.lat)
    const longitude = Number(hit?.lon)

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw codedError(GEOCODE_NO_RESULT)
    }

    return { latitude, longitude }
  },
}

export const defaultGeocoder: Geocoder = nominatimGeocoder

/** Coordinates as text — Western numerals, fixed precision (~1 m). */
export function formatCoordinate(value: number): string {
  return value.toFixed(5)
}

/**
 * Is this a point the picker can both store AND draw?
 *
 * Bounded by {@link MERCATOR_MAX_LATITUDE}, not by ±90°: a pole-adjacent
 * latitude is a legal coordinate but not a renderable one here, and accepting
 * it would put a pin at an infinite offset — a blank canvas with no way for the
 * editor to correct it. The server's `geoSchema` uses the same bound.
 */
export function isValidGeoPoint(point: GeoPoint | null | undefined): boolean {
  if (!point) return false
  return (
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude) &&
    point.latitude >= -MERCATOR_MAX_LATITUDE &&
    point.latitude <= MERCATOR_MAX_LATITUDE &&
    point.longitude >= -180 &&
    point.longitude <= 180
  )
}

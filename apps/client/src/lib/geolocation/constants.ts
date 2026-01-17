/**
 * Geographic constants for Tunisia
 */

import type { Coordinates } from "./distance"

/**
 * Tunisia's geographic bounding box
 * Used to validate that coordinates are within Tunisia
 */
export const TUNISIA_BOUNDS = {
  north: 37.5,
  south: 30.2,
  east: 11.6,
  west: 7.5,
} as const

/**
 * Default location (Tunis city center)
 * Used as fallback when geolocation is unavailable
 */
export const DEFAULT_LOCATION: Coordinates = {
  latitude: 36.8065,
  longitude: 10.1815,
}

/**
 * Major cities with their coordinates
 * Used for quick location selection
 */
export const TUNISIA_CITIES: Record<string, Coordinates> = {
  tunis: { latitude: 36.8065, longitude: 10.1815 },
  sfax: { latitude: 34.7406, longitude: 10.7603 },
  sousse: { latitude: 35.8256, longitude: 10.6369 },
  kairouan: { latitude: 35.6781, longitude: 10.0963 },
  bizerte: { latitude: 37.2744, longitude: 9.8739 },
  gabes: { latitude: 33.8815, longitude: 10.0982 },
  ariana: { latitude: 36.8665, longitude: 10.1647 },
  gafsa: { latitude: 34.425, longitude: 8.7842 },
  monastir: { latitude: 35.7643, longitude: 10.8113 },
  kasserine: { latitude: 35.1674, longitude: 8.8365 },
}

/**
 * Check if coordinates are within Tunisia's bounds
 */
export function isWithinTunisia(coords: Coordinates): boolean {
  return (
    coords.latitude >= TUNISIA_BOUNDS.south &&
    coords.latitude <= TUNISIA_BOUNDS.north &&
    coords.longitude >= TUNISIA_BOUNDS.west &&
    coords.longitude <= TUNISIA_BOUNDS.east
  )
}

/**
 * Maximum distance in km to consider a venue "nearby"
 */
export const NEARBY_RADIUS_KM = 50

/**
 * Session storage key for cached location
 */
export const LOCATION_CACHE_KEY = "tiween_user_location"

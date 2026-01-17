/**
 * Distance calculation utilities using Haversine formula
 */

/**
 * Coordinates interface
 */
export interface Coordinates {
  latitude: number
  longitude: number
}

/**
 * Generic type for items with distance attached
 */
export interface WithDistance<T> {
  item: T
  distance: number // in kilometers
}

/**
 * Earth's radius in kilometers
 */
const EARTH_RADIUS_KM = 6371

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * Calculate the distance between two points using the Haversine formula
 *
 * The Haversine formula calculates the great-circle distance between two points
 * on a sphere given their longitudes and latitudes.
 *
 * @param point1 - First coordinate point
 * @param point2 - Second coordinate point
 * @returns Distance in kilometers
 *
 * @example
 * ```ts
 * const tunis = { latitude: 36.8065, longitude: 10.1815 }
 * const sfax = { latitude: 34.7406, longitude: 10.7603 }
 * const distance = calculateDistance(tunis, sfax)
 * // Returns approximately 233 km
 * ```
 */
export function calculateDistance(
  point1: Coordinates,
  point2: Coordinates
): number {
  const lat1 = toRadians(point1.latitude)
  const lat2 = toRadians(point2.latitude)
  const deltaLat = toRadians(point2.latitude - point1.latitude)
  const deltaLon = toRadians(point2.longitude - point1.longitude)

  // Haversine formula
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return EARTH_RADIUS_KM * c
}

/**
 * Format distance for display
 *
 * @param distanceKm - Distance in kilometers
 * @returns Formatted string (e.g., "2.3 km" or "850 m")
 *
 * @example
 * ```ts
 * formatDistance(2.3)   // "2,3 km"
 * formatDistance(0.85)  // "850 m"
 * formatDistance(0.05)  // "50 m"
 * ```
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    // Show in meters for distances under 1km
    const meters = Math.round(distanceKm * 1000)
    return `${meters} m`
  }

  // Show with one decimal place for km
  const rounded = Math.round(distanceKm * 10) / 10

  // Use comma as decimal separator (French/Arabic convention)
  return `${rounded.toString().replace(".", ",")} km`
}

/**
 * Sort an array of items by distance from a reference point
 *
 * @param items - Array of items with coordinates
 * @param reference - Reference point to measure distance from
 * @param getCoordinates - Function to extract coordinates from an item
 * @returns Array of items with distance, sorted by nearest first
 *
 * @example
 * ```ts
 * const venues = [{ name: "Cinema A", lat: 36.8, lng: 10.2 }, ...]
 * const userLocation = { latitude: 36.8065, longitude: 10.1815 }
 *
 * const sorted = sortByDistance(
 *   venues,
 *   userLocation,
 *   (v) => ({ latitude: v.lat, longitude: v.lng })
 * )
 * ```
 */
export function sortByDistance<T>(
  items: T[],
  reference: Coordinates,
  getCoordinates: (item: T) => Coordinates | null
): WithDistance<T>[] {
  return items
    .map((item) => {
      const coords = getCoordinates(item)
      if (!coords) {
        // Items without coordinates go to the end
        return { item, distance: Infinity }
      }
      return {
        item,
        distance: calculateDistance(reference, coords),
      }
    })
    .sort((a, b) => a.distance - b.distance)
}

/**
 * Filter items within a certain radius
 *
 * @param items - Array of items with distance attached
 * @param maxDistanceKm - Maximum distance in kilometers
 * @returns Filtered array with items within radius
 */
export function filterByRadius<T>(
  items: WithDistance<T>[],
  maxDistanceKm: number
): WithDistance<T>[] {
  return items.filter((item) => item.distance <= maxDistanceKm)
}

/**
 * Add distance to an array of items
 *
 * @param items - Array of items
 * @param reference - Reference point
 * @param getCoordinates - Function to extract coordinates
 * @returns Array of items with distance property added
 */
export function addDistanceToItems<T>(
  items: T[],
  reference: Coordinates,
  getCoordinates: (item: T) => Coordinates | null
): Array<T & { distance?: number }> {
  return items.map((item) => {
    const coords = getCoordinates(item)
    if (!coords) {
      return item
    }
    return {
      ...item,
      distance: calculateDistance(reference, coords),
    }
  })
}

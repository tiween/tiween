/**
 * Geolocation utilities for Tiween
 *
 * Provides location-based features:
 * - User geolocation with permission handling
 * - Distance calculation using Haversine formula
 * - Session-based location caching
 */

export { useGeolocation, type GeolocationState } from "./useGeolocation"
export {
  calculateDistance,
  formatDistance,
  sortByDistance,
  type Coordinates,
  type WithDistance,
} from "./distance"
export { TUNISIA_BOUNDS, isWithinTunisia, DEFAULT_LOCATION } from "./constants"

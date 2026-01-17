/**
 * Map component type definitions
 */

import type { VenueType } from "../VenueSelector"

/**
 * Location data for a venue on the map
 */
export interface VenueLocation {
  /** Unique identifier for the venue */
  documentId: string
  /** Display name of the venue */
  name: string
  /** Full address string */
  address?: string
  /** City name */
  city?: string
  /** Latitude coordinate */
  latitude: number
  /** Longitude coordinate */
  longitude: number
  /** Type of venue for icon styling */
  type?: VenueType
  /** Optional logo URL for popup */
  logoUrl?: string
}

/**
 * Map configuration options
 */
export interface MapConfig {
  /** Default zoom level (1-18, where 18 is most zoomed in) */
  defaultZoom?: number
  /** Minimum zoom level allowed */
  minZoom?: number
  /** Maximum zoom level allowed */
  maxZoom?: number
  /** Map tile provider URL */
  tileUrl?: string
  /** Attribution text for tile provider */
  attribution?: string
  /** Whether to show zoom controls */
  showZoomControl?: boolean
  /** Whether to enable scroll wheel zoom */
  scrollWheelZoom?: boolean
}

/**
 * Default Tunisia-centered map configuration
 * Tunisia bounds: ~30°N to 37.5°N, ~7°E to 12°E
 */
export const DEFAULT_MAP_CONFIG: Required<MapConfig> = {
  defaultZoom: 13,
  minZoom: 6,
  maxZoom: 18,
  tileUrl: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  showZoomControl: true,
  scrollWheelZoom: true,
}

/**
 * Default center point for Tunisia (Tunis)
 */
export const TUNISIA_CENTER = {
  latitude: 36.8065,
  longitude: 10.1815,
}

/**
 * Color scheme for different venue types
 */
export const VENUE_TYPE_COLORS: Record<VenueType, string> = {
  cinema: "#ef4444", // red-500
  theater: "#f97316", // orange-500
  "cultural-center": "#22c55e", // green-500
  museum: "#3b82f6", // blue-500
  other: "#8b5cf6", // violet-500
}

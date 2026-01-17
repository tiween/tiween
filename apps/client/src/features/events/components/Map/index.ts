/**
 * Map Components for Tiween
 *
 * REQUIRED DEPENDENCIES:
 * Run these commands to install map dependencies:
 *   yarn workspace @tiween/client add leaflet react-leaflet
 *   yarn workspace @tiween/client add -D @types/leaflet
 *
 * These components provide map functionality for:
 * - Displaying venue locations on event detail pages
 * - Showing multiple venues on search/listing pages
 * - Interactive maps with popups showing venue info
 */

export { VenueMap, type VenueMapProps } from "./VenueMap"
export type { VenueLocation, MapConfig } from "./types"
export { DEFAULT_MAP_CONFIG, TUNISIA_CENTER, VENUE_TYPE_COLORS } from "./types"

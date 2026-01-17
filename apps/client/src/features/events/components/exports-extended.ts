/**
 * Extended exports for events components
 *
 * This file contains exports for new components created during Epic 3.
 * These should be merged into index.ts when possible.
 *
 * Usage:
 *   import { VenueMap, RegionCitySelector } from "@/features/events/components/exports-extended"
 */

// Map Components (requires: leaflet, react-leaflet)
export { VenueMap } from "./Map"
export type { VenueMapProps, VenueLocation, MapConfig } from "./Map"
export { DEFAULT_MAP_CONFIG, TUNISIA_CENTER, VENUE_TYPE_COLORS } from "./Map"

// EventDetailPage with Map
export { EventDetailPageWithMap } from "./EventDetailPage/EventDetailPageWithMap"
export type {
  EventDetailPageWithMapProps,
  EventDetailPageWithMapLabels,
} from "./EventDetailPage/EventDetailPageWithMap"

// Region/City Selector
export { RegionCitySelector } from "./RegionCitySelector"
export type {
  RegionCitySelectorProps,
  RegionCitySelectorLabels,
  RegionOption,
  CityOption,
} from "./RegionCitySelector"

// Venue Selector
export { VenueSelector } from "./VenueSelector"
export type {
  VenueSelectorProps,
  VenueSelectorLabels,
  VenueOption,
  VenueType,
} from "./VenueSelector"

// HomePage variants with location filtering
export { HomePageWithCity } from "./HomePage/HomePageWithCity"
export type {
  HomePageWithCityProps,
  HomePageWithCityLabels,
} from "./HomePage/HomePageWithCity"

export { HomePageWithVenue } from "./HomePage/HomePageWithVenue"
export type {
  HomePageWithVenueProps,
  HomePageWithVenueLabels,
} from "./HomePage/HomePageWithVenue"

// Near Me / Geolocation
export { NearMeButton } from "./NearMeButton"
export type { NearMeButtonProps, NearMeButtonLabels } from "./NearMeButton"

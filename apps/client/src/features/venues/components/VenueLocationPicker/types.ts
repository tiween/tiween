/**
 * Shared types for the venue location picker (Story 7.2).
 *
 * Kept in their own module so `VenueLocationPicker` (SSR-safe wrapper) and
 * `VenueLocationPickerClient` (the Leaflet island) can share them without the
 * wrapper pulling `react-leaflet` — and therefore `window` — into the server
 * bundle.
 */

/** The coordinate pair the form binds to (`shared.geo-point`). */
export interface VenueGeoValue {
  latitude: number
  longitude: number
}

/** Every string the picker renders. No copy is hardcoded in the components. */
export interface VenueLocationPickerLabels {
  /** Instruction shown above the map. */
  hint: string
  /** Placeholder while the Leaflet chunk loads. */
  loading: string
  /** Accessible name of the draggable marker. */
  marker: string
  /** Rendered when no coordinates are set yet. */
  empty: string
  /** Button that removes the pin. */
  clear: string
  /** Label preceding the current coordinates readout. */
  coordinates: string
}

export interface VenueLocationPickerProps {
  /** Current coordinates, or `null` when the venue has no location yet. */
  value: VenueGeoValue | null
  /** Called with the new coordinates on every click / marker drag. */
  onChange: (value: VenueGeoValue) => void
  /** Called when the manager removes the pin (writes `null` to the form). */
  onClear?: () => void
  /** Map height (CSS value). */
  height?: string
  labels: VenueLocationPickerLabels
}

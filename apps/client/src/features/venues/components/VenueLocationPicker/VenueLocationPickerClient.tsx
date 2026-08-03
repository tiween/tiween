"use client"

/**
 * VenueLocationPickerClient — client-only Leaflet implementation (Story 7.2).
 *
 * Dynamically imported by `VenueLocationPicker` with `ssr: false`; Leaflet
 * touches `window`/`document` at module scope, so importing this directly from
 * a server-rendered tree throws. Do not import it anywhere else.
 *
 * NO GEOCODER. There is deliberately no address→lat/lng lookup: every provider
 * needs an API key this project does not have, and a silently-failing geocoder
 * is worse than an honest manual pin. The manager clicks the map or drags the
 * marker; both paths write the same coordinates back into the form.
 */
import * as React from "react"
import { Icon } from "leaflet"
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet"

import type {
  LatLngExpression,
  Marker as LeafletMarker,
  LeafletMouseEvent,
} from "leaflet"
import type { VenueGeoValue, VenueLocationPickerLabels } from "./types"

import "leaflet/dist/leaflet.css"

import { DEFAULT_MAP_CONFIG } from "@/features/events/components/Map/types"

/**
 * Leaflet's bundled marker asset paths do not survive Next's bundler, so the
 * icon is re-declared against the CDN copy — same workaround, same URLs as
 * `features/events/components/Map/VenueMapClient.tsx`.
 */
const markerIcon = new Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

interface VenueLocationPickerClientProps {
  value: VenueGeoValue | null
  center: VenueGeoValue
  onChange: (value: VenueGeoValue) => void
  labels: VenueLocationPickerLabels
}

/** Clicking anywhere on the map moves (or places) the pin. */
function ClickToPlace({
  onChange,
}: {
  onChange: (value: VenueGeoValue) => void
}) {
  useMapEvents({
    click(event: LeafletMouseEvent) {
      onChange({ latitude: event.latlng.lat, longitude: event.latlng.lng })
    },
  })
  return null
}

export default function VenueLocationPickerClient({
  value,
  center,
  onChange,
  labels,
}: VenueLocationPickerClientProps) {
  const markerRef = React.useRef<LeafletMarker | null>(null)
  const mapCenter: LatLngExpression = [center.latitude, center.longitude]

  const dragHandlers = React.useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current
        if (!marker) return
        const position = marker.getLatLng()
        onChange({ latitude: position.lat, longitude: position.lng })
      },
    }),
    [onChange]
  )

  return (
    <MapContainer
      center={mapCenter}
      zoom={DEFAULT_MAP_CONFIG.defaultZoom}
      minZoom={DEFAULT_MAP_CONFIG.minZoom}
      maxZoom={DEFAULT_MAP_CONFIG.maxZoom}
      zoomControl={DEFAULT_MAP_CONFIG.showZoomControl}
      // Off on purpose: the picker lives inside a long scrolling form, where a
      // wheel-zoom trap is the classic way to strand the user mid-page.
      scrollWheelZoom={false}
      className="h-full w-full"
      style={{ zIndex: 0 }}
    >
      <TileLayer
        url={DEFAULT_MAP_CONFIG.tileUrl}
        attribution={DEFAULT_MAP_CONFIG.attribution}
      />

      <ClickToPlace onChange={onChange} />

      {value && (
        <Marker
          position={[value.latitude, value.longitude]}
          icon={markerIcon}
          draggable
          ref={markerRef}
          eventHandlers={dragHandlers}
          alt={labels.marker}
        />
      )}
    </MapContainer>
  )
}

"use client"

/**
 * VenueMapClient - Client-only Leaflet implementation
 *
 * This file is dynamically imported by VenueMap.tsx with ssr: false
 * to avoid "window is not defined" errors during SSR.
 *
 * IMPORTANT: Do not import this directly! Use VenueMap instead.
 */
import * as React from "react"
import { Icon } from "leaflet"
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet"

import type { LatLngBoundsExpression, LatLngExpression } from "leaflet"

// Import Leaflet CSS - required for proper map rendering
import "leaflet/dist/leaflet.css"

import type { MapConfig, VenueLocation, VenueType } from "./types"

import { cn } from "@/lib/utils"

import { VENUE_TYPE_COLORS } from "./types"

// Fix for Leaflet default marker icon issue in Next.js/Webpack
// The default icon paths get broken by bundling
const defaultIcon = new Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

interface VenueMapClientProps {
  venues: VenueLocation[]
  center: { latitude: number; longitude: number }
  config: Required<MapConfig>
  onVenueClick?: (venue: VenueLocation) => void
  selectedVenueId?: string
  showDirections?: boolean
}

/**
 * Component to fit map bounds to markers
 */
function FitBounds({ venues }: { venues: VenueLocation[] }) {
  const map = useMap()

  React.useEffect(() => {
    if (venues.length <= 1) return

    const bounds: LatLngBoundsExpression = venues.map((v) => [
      v.latitude,
      v.longitude,
    ]) as LatLngBoundsExpression

    map.fitBounds(bounds, {
      padding: [50, 50],
      maxZoom: 15,
    })
  }, [map, venues])

  return null
}

/**
 * Get type label in French
 */
function getTypeLabel(type?: VenueType): string {
  if (!type) return "Lieu"
  const labels: Record<VenueType, string> = {
    cinema: "Cinéma",
    theater: "Théâtre",
    "cultural-center": "Centre culturel",
    museum: "Musée",
    other: "Lieu",
  }
  return labels[type] || "Lieu"
}

/**
 * Generate Google Maps directions URL
 */
function getDirectionsUrl(venue: VenueLocation): string {
  const destination = `${venue.latitude},${venue.longitude}`
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}`
}

export default function VenueMapClient({
  venues,
  center,
  config,
  onVenueClick,
  selectedVenueId,
  showDirections,
}: VenueMapClientProps) {
  const mapCenter: LatLngExpression = [center.latitude, center.longitude]

  return (
    <MapContainer
      center={mapCenter}
      zoom={config.defaultZoom}
      minZoom={config.minZoom}
      maxZoom={config.maxZoom}
      zoomControl={config.showZoomControl}
      scrollWheelZoom={config.scrollWheelZoom}
      className="h-full w-full"
      style={{ zIndex: 0 }}
    >
      {/* OpenStreetMap Tiles */}
      <TileLayer url={config.tileUrl} attribution={config.attribution} />

      {/* Auto-fit bounds for multiple venues */}
      {venues.length > 1 && <FitBounds venues={venues} />}

      {/* Venue Markers */}
      {venues.map((venue) => {
        const position: LatLngExpression = [venue.latitude, venue.longitude]
        const isSelected = venue.documentId === selectedVenueId

        return (
          <Marker
            key={venue.documentId}
            position={position}
            icon={defaultIcon}
            eventHandlers={{
              click: () => onVenueClick?.(venue),
            }}
          >
            <Popup>
              <div className="min-w-[180px] space-y-2">
                {/* Venue Logo */}
                {venue.logoUrl && (
                  <div className="flex justify-center pb-1">
                    <img
                      src={venue.logoUrl}
                      alt=""
                      className="h-10 w-auto object-contain"
                    />
                  </div>
                )}

                {/* Venue Name */}
                <h3 className="text-sm font-semibold text-gray-900">
                  {venue.name}
                </h3>

                {/* Venue Type Badge */}
                {venue.type && (
                  <span
                    className="inline-block rounded-full px-2 py-0.5 text-xs text-white"
                    style={{
                      backgroundColor: VENUE_TYPE_COLORS[venue.type],
                    }}
                  >
                    {getTypeLabel(venue.type)}
                  </span>
                )}

                {/* Address */}
                {venue.address && (
                  <p className="text-xs text-gray-600">{venue.address}</p>
                )}

                {/* City */}
                {venue.city && !venue.address?.includes(venue.city) && (
                  <p className="text-xs text-gray-500">{venue.city}</p>
                )}

                {/* Directions Button */}
                {showDirections && (
                  <a
                    href={getDirectionsUrl(venue)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 block rounded bg-blue-600 px-3 py-1.5 text-center text-xs font-medium text-white hover:bg-blue-700"
                  >
                    Itinéraire
                  </a>
                )}
              </div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}

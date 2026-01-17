"use client"

import * as React from "react"
import { Icon } from "leaflet"
import { Marker, Popup } from "react-leaflet"

import type { LatLngExpression } from "leaflet"
import type { VenueLocation, VenueType } from "./types"

import { cn } from "@/lib/utils"

import { VENUE_TYPE_COLORS } from "./types"

/**
 * Create a colored marker icon for venue type
 * Uses Leaflet's default marker with color customization via CSS filter
 */
function createMarkerIcon(venueType?: VenueType): Icon {
  const color = VENUE_TYPE_COLORS[venueType || "other"]

  // Use Leaflet's default marker as base
  return new Icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl:
      "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
    // Note: For custom colors, consider using Leaflet.awesome-markers or custom SVG markers
    className: `marker-${venueType || "other"}`,
  })
}

export interface MapMarkerProps {
  /** Venue location data */
  venue: VenueLocation
  /** Whether this marker is currently selected/highlighted */
  isSelected?: boolean
  /** Callback when marker is clicked */
  onClick?: (venue: VenueLocation) => void
  /** Custom popup content (replaces default) */
  customPopup?: React.ReactNode
  /** Additional class names for popup */
  popupClassName?: string
}

/**
 * MapMarker - Individual venue marker with popup
 *
 * Features:
 * - Color-coded by venue type
 * - Popup with venue details
 * - Click handling for selection
 * - Custom popup support
 *
 * @example
 * ```tsx
 * <MapMarker
 *   venue={{
 *     documentId: "venue-1",
 *     name: "Cinéma Le Palace",
 *     latitude: 36.8065,
 *     longitude: 10.1815,
 *     type: "cinema",
 *   }}
 *   onClick={(venue) => console.log("Clicked:", venue.name)}
 * />
 * ```
 */
export function MapMarker({
  venue,
  isSelected = false,
  onClick,
  customPopup,
  popupClassName,
}: MapMarkerProps) {
  const position: LatLngExpression = [venue.latitude, venue.longitude]
  const icon = React.useMemo(() => createMarkerIcon(venue.type), [venue.type])

  const handleClick = () => {
    onClick?.(venue)
  }

  return (
    <Marker
      position={position}
      icon={icon}
      eventHandlers={{
        click: handleClick,
      }}
    >
      <Popup className={cn("venue-popup", popupClassName)}>
        {customPopup || (
          <div className="min-w-[200px] space-y-2 p-1">
            {/* Venue Logo */}
            {venue.logoUrl && (
              <div className="flex justify-center">
                <img
                  src={venue.logoUrl}
                  alt={venue.name}
                  className="h-12 w-auto object-contain"
                />
              </div>
            )}

            {/* Venue Name */}
            <h3 className="text-foreground text-base font-semibold">
              {venue.name}
            </h3>

            {/* Venue Type Badge */}
            {venue.type && (
              <span
                className="inline-block rounded-full px-2 py-0.5 text-xs text-white"
                style={{ backgroundColor: VENUE_TYPE_COLORS[venue.type] }}
              >
                {getTypeLabel(venue.type)}
              </span>
            )}

            {/* Address */}
            {venue.address && (
              <p className="text-muted-foreground text-sm">{venue.address}</p>
            )}

            {/* City */}
            {venue.city && (
              <p className="text-muted-foreground text-xs">{venue.city}</p>
            )}
          </div>
        )}
      </Popup>
    </Marker>
  )
}

/**
 * Get localized label for venue type
 */
function getTypeLabel(type: VenueType): string {
  const labels: Record<VenueType, string> = {
    cinema: "Cinéma",
    theater: "Théâtre",
    "cultural-center": "Centre culturel",
    museum: "Musée",
    other: "Lieu",
  }
  return labels[type] || "Lieu"
}

MapMarker.displayName = "MapMarker"

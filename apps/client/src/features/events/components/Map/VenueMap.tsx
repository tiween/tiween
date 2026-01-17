"use client"

import * as React from "react"
import dynamic from "next/dynamic"

import type { MapConfig, VenueLocation } from "./types"

import { cn } from "@/lib/utils"

import { DEFAULT_MAP_CONFIG, TUNISIA_CENTER } from "./types"

// Dynamically import the map implementation to avoid SSR issues
// Leaflet requires window/document which don't exist on server
const MapImplementation = dynamic(() => import("./VenueMapClient"), {
  ssr: false,
  loading: () => (
    <div className="bg-muted flex h-full w-full items-center justify-center">
      <div className="text-muted-foreground text-sm">
        Chargement de la carte...
      </div>
    </div>
  ),
})

export interface VenueMapProps {
  /** Single venue to display (for event detail pages) */
  venue?: VenueLocation
  /** Multiple venues to display (for listing pages) */
  venues?: VenueLocation[]
  /** Map height (CSS value) */
  height?: string
  /** Additional class names */
  className?: string
  /** Map configuration overrides */
  config?: Partial<MapConfig>
  /** Called when a venue marker is clicked */
  onVenueClick?: (venue: VenueLocation) => void
  /** Currently selected venue ID (for highlighting) */
  selectedVenueId?: string
  /** Whether to show a "Get directions" button */
  showDirections?: boolean
}

/**
 * VenueMap - Interactive map component for displaying venue locations
 *
 * Uses Leaflet with OpenStreetMap tiles. Handles SSR gracefully through
 * dynamic imports.
 *
 * IMPORTANT: Requires leaflet and react-leaflet packages:
 *   yarn workspace @tiween/client add leaflet react-leaflet
 *   yarn workspace @tiween/client add -D @types/leaflet
 *
 * Usage Patterns:
 *
 * 1. Single venue (event detail page):
 * ```tsx
 * <VenueMap
 *   venue={{
 *     documentId: "venue-1",
 *     name: "Cinéma Le Palace",
 *     latitude: 36.8065,
 *     longitude: 10.1815,
 *     type: "cinema",
 *   }}
 *   height="300px"
 *   showDirections
 * />
 * ```
 *
 * 2. Multiple venues (search/listing):
 * ```tsx
 * <VenueMap
 *   venues={venueList}
 *   height="400px"
 *   onVenueClick={(venue) => router.push(`/venues/${venue.documentId}`)}
 *   selectedVenueId={highlightedVenueId}
 * />
 * ```
 */
export function VenueMap({
  venue,
  venues = [],
  height = "300px",
  className,
  config,
  onVenueClick,
  selectedVenueId,
  showDirections = false,
}: VenueMapProps) {
  // Combine single venue with venues array
  const allVenues = React.useMemo(() => {
    if (venue) {
      // Check if venue is already in venues array
      const exists = venues.some((v) => v.documentId === venue.documentId)
      return exists ? venues : [venue, ...venues]
    }
    return venues
  }, [venue, venues])

  // Calculate center point
  const center = React.useMemo(() => {
    if (allVenues.length === 0) {
      return TUNISIA_CENTER
    }

    if (allVenues.length === 1) {
      return {
        latitude: allVenues[0].latitude,
        longitude: allVenues[0].longitude,
      }
    }

    // Calculate center of all venues
    const sumLat = allVenues.reduce((sum, v) => sum + v.latitude, 0)
    const sumLng = allVenues.reduce((sum, v) => sum + v.longitude, 0)

    return {
      latitude: sumLat / allVenues.length,
      longitude: sumLng / allVenues.length,
    }
  }, [allVenues])

  // Merge config with defaults
  const mergedConfig = React.useMemo(
    () => ({
      ...DEFAULT_MAP_CONFIG,
      ...config,
    }),
    [config]
  )

  // Don't render map if no venues
  if (allVenues.length === 0) {
    return null
  }

  return (
    <div
      className={cn("relative w-full overflow-hidden rounded-lg", className)}
      style={{ height }}
    >
      <MapImplementation
        venues={allVenues}
        center={center}
        config={mergedConfig}
        onVenueClick={onVenueClick}
        selectedVenueId={selectedVenueId}
        showDirections={showDirections}
      />
    </div>
  )
}

VenueMap.displayName = "VenueMap"

"use client"

import * as React from "react"
import { Building2 } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

/**
 * Venue type enumeration
 */
export type VenueType =
  | "cinema"
  | "theater"
  | "cultural-center"
  | "museum"
  | "other"

/**
 * Venue option for the selector
 */
export interface VenueOption {
  documentId: string
  name: string
  type: VenueType
  city?: string
}

/**
 * Localized labels for VenueSelector
 */
export interface VenueSelectorLabels {
  allVenues: string
  selectVenue: string
  cinema: string
  theater: string
  culturalCenter: string
  museum: string
  other: string
}

const defaultLabels: VenueSelectorLabels = {
  allVenues: "Tous les lieux",
  selectVenue: "Lieu",
  cinema: "Cinémas",
  theater: "Théâtres",
  culturalCenter: "Centres culturels",
  museum: "Musées",
  other: "Autres",
}

/**
 * Get localized type label
 */
function getTypeLabel(type: VenueType, labels: VenueSelectorLabels): string {
  const typeLabels: Record<VenueType, string> = {
    cinema: labels.cinema,
    theater: labels.theater,
    "cultural-center": labels.culturalCenter,
    museum: labels.museum,
    other: labels.other,
  }
  return typeLabels[type] || labels.other
}

export interface VenueSelectorProps {
  /** Available venues */
  venues: VenueOption[]
  /** Currently selected venue documentId (null = all venues) */
  selectedVenueId: string | null
  /** Called when selection changes */
  onVenueChange: (venueDocumentId: string | null) => void
  /** Localized labels */
  labels?: VenueSelectorLabels
  /** Additional class names */
  className?: string
  /** Group venues by type (default: true) */
  groupByType?: boolean
}

/**
 * VenueSelector - Venue filter dropdown grouped by type
 *
 * Features:
 * - Venue types as group headers (Cinemas, Theaters, etc.)
 * - Venues as selectable options within each type
 * - "All venues" option to clear filter
 * - Shows venue name and city
 * - Touch-friendly, accessible
 *
 * @example
 * ```tsx
 * const [venueId, setVenueId] = useState<string | null>(null)
 *
 * <VenueSelector
 *   venues={venues}
 *   selectedVenueId={venueId}
 *   onVenueChange={setVenueId}
 * />
 * ```
 */
export function VenueSelector({
  venues,
  selectedVenueId,
  onVenueChange,
  labels = defaultLabels,
  className,
  groupByType = true,
}: VenueSelectorProps) {
  // Find the currently selected venue for display
  const selectedVenue = React.useMemo(() => {
    if (!selectedVenueId) return null
    return venues.find((v) => v.documentId === selectedVenueId) || null
  }, [selectedVenueId, venues])

  // Group venues by type
  const groupedVenues = React.useMemo(() => {
    if (!groupByType) return null

    const groups: Record<VenueType, VenueOption[]> = {
      cinema: [],
      theater: [],
      "cultural-center": [],
      museum: [],
      other: [],
    }

    venues.forEach((venue) => {
      const type = venue.type || "other"
      if (groups[type]) {
        groups[type].push(venue)
      } else {
        groups.other.push(venue)
      }
    })

    // Return only non-empty groups
    return Object.entries(groups).filter(
      ([, venueList]) => venueList.length > 0
    ) as [VenueType, VenueOption[]][]
  }, [venues, groupByType])

  const handleValueChange = (value: string) => {
    if (value === "all") {
      onVenueChange(null)
    } else {
      onVenueChange(value)
    }
  }

  // Don't render if no venues
  if (venues.length === 0) {
    return null
  }

  return (
    <Select value={selectedVenueId || "all"} onValueChange={handleValueChange}>
      <SelectTrigger
        className={cn(
          "min-h-[44px] min-w-[160px] gap-2 rounded-full px-4",
          className
        )}
        aria-label={labels.selectVenue}
      >
        <Building2 className="h-4 w-4 shrink-0 opacity-70" />
        <SelectValue>
          {selectedVenue ? selectedVenue.name : labels.allVenues}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        {/* "All venues" option */}
        <SelectItem value="all">{labels.allVenues}</SelectItem>

        {/* Grouped by type */}
        {groupByType && groupedVenues
          ? groupedVenues.map(([type, venueList]) => (
              <SelectGroup key={type}>
                <SelectLabel className="text-muted-foreground text-xs tracking-wider uppercase">
                  {getTypeLabel(type, labels)}
                </SelectLabel>
                {venueList.map((venue) => (
                  <SelectItem
                    key={venue.documentId}
                    value={venue.documentId}
                    className="ps-6"
                  >
                    <span className="flex flex-col">
                      <span>{venue.name}</span>
                      {venue.city && (
                        <span className="text-muted-foreground text-xs">
                          {venue.city}
                        </span>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectGroup>
            ))
          : /* Flat list without grouping */
            venues.map((venue) => (
              <SelectItem key={venue.documentId} value={venue.documentId}>
                <span className="flex flex-col">
                  <span>{venue.name}</span>
                  {venue.city && (
                    <span className="text-muted-foreground text-xs">
                      {venue.city}
                    </span>
                  )}
                </span>
              </SelectItem>
            ))}
      </SelectContent>
    </Select>
  )
}

VenueSelector.displayName = "VenueSelector"

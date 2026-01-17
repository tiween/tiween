"use client"

import * as React from "react"
import { MapPin } from "lucide-react"

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
 * Region data structure from Strapi
 */
export interface RegionOption {
  documentId: string
  name: string
  slug: string
  cities?: CityOption[]
}

/**
 * City data structure from Strapi
 */
export interface CityOption {
  documentId: string
  name: string
  slug: string
}

/**
 * Localized labels for RegionCitySelector
 */
export interface RegionCitySelectorLabels {
  allLocations: string
  selectLocation: string
  allCities: string
}

const defaultLabels: RegionCitySelectorLabels = {
  allLocations: "Toute la Tunisie",
  selectLocation: "Lieu",
  allCities: "Toutes les villes",
}

export interface RegionCitySelectorProps {
  /** Available regions with their cities */
  regions: RegionOption[]
  /** Currently selected city documentId (null = all locations) */
  selectedCityId: string | null
  /** Called when selection changes */
  onCityChange: (cityDocumentId: string | null) => void
  /** Localized labels */
  labels?: RegionCitySelectorLabels
  /** Additional class names */
  className?: string
}

/**
 * RegionCitySelector - Location filter dropdown grouped by region
 *
 * Features:
 * - Regions as group headers
 * - Cities as selectable options within each region
 * - "All locations" option to clear filter
 * - Compact display showing selected city name
 * - RTL-aware layout
 *
 * @example
 * ```tsx
 * const [cityId, setCityId] = useState<string | null>(null)
 *
 * <RegionCitySelector
 *   regions={regions}
 *   selectedCityId={cityId}
 *   onCityChange={setCityId}
 * />
 * ```
 */
export function RegionCitySelector({
  regions,
  selectedCityId,
  onCityChange,
  labels = defaultLabels,
  className,
}: RegionCitySelectorProps) {
  // Find the currently selected city for display
  const selectedCity = React.useMemo(() => {
    if (!selectedCityId) return null
    for (const region of regions) {
      const city = region.cities?.find((c) => c.documentId === selectedCityId)
      if (city) return city
    }
    return null
  }, [selectedCityId, regions])

  const handleValueChange = (value: string) => {
    if (value === "all") {
      onCityChange(null)
    } else {
      onCityChange(value)
    }
  }

  // Don't render if no regions
  if (regions.length === 0) {
    return null
  }

  return (
    <Select value={selectedCityId || "all"} onValueChange={handleValueChange}>
      <SelectTrigger
        className={cn(
          "min-h-[44px] min-w-[140px] gap-2 rounded-full px-4",
          className
        )}
        aria-label={labels.selectLocation}
      >
        <MapPin className="h-4 w-4 shrink-0 opacity-70" />
        <SelectValue>
          {selectedCity ? selectedCity.name : labels.allLocations}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {/* "All locations" option */}
        <SelectItem value="all">{labels.allLocations}</SelectItem>

        {/* Regions as groups with cities as items */}
        {regions.map((region) => (
          <SelectGroup key={region.documentId}>
            <SelectLabel className="text-muted-foreground text-xs tracking-wider uppercase">
              {region.name}
            </SelectLabel>
            {region.cities?.map((city) => (
              <SelectItem
                key={city.documentId}
                value={city.documentId}
                className="ps-6"
              >
                {city.name}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  )
}

RegionCitySelector.displayName = "RegionCitySelector"

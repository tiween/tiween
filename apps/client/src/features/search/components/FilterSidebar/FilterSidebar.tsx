"use client"

import * as React from "react"
import { CategoryTabs } from "@/features/events/components"
import { RegionCitySelector } from "@/features/events/components/RegionCitySelector"
import { X } from "lucide-react"

import type { CategoryType } from "@/features/events/components"
import type { RegionOption } from "@/features/events/components/RegionCitySelector"

import { cn } from "@/lib/utils"
import { Sidebar } from "@/components/layout/Sidebar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export interface FilterSidebarLabels {
  title: string
  category: string
  location: string
  clearAll: string
  activeFilters: string
}

const defaultLabels: FilterSidebarLabels = {
  title: "Filtres",
  category: "Catégorie",
  location: "Ville",
  clearAll: "Tout effacer",
  activeFilters: "Filtres actifs",
}

export interface FilterSidebarProps {
  /** Currently active category */
  category?: CategoryType
  /** Callback when category changes */
  onCategoryChange: (category: CategoryType | undefined) => void
  /** Currently selected city ID */
  cityId?: string
  /** Callback when city changes */
  onCityChange: (cityId: string | null) => void
  /** Available regions with their cities */
  regions: RegionOption[]
  /** Number of active filters */
  filterCount?: number
  /** Callback to clear all filters */
  onClearAll?: () => void
  /** Additional class names */
  className?: string
  /** Localized labels */
  labels?: FilterSidebarLabels
}

/**
 * FilterSidebar - Desktop filter panel for search page
 *
 * Displays category and location filters in a persistent sidebar.
 * Shows active filter count and clear all button.
 *
 * @example
 * ```tsx
 * <FilterSidebar
 *   category={activeCategory}
 *   onCategoryChange={setCategory}
 *   cityId={activeCityId}
 *   onCityChange={setCityId}
 *   regions={regions}
 *   filterCount={2}
 *   onClearAll={handleClearAll}
 * />
 * ```
 */
export function FilterSidebar({
  category,
  onCategoryChange,
  cityId,
  onCityChange,
  regions,
  filterCount = 0,
  onClearAll,
  className,
  labels = defaultLabels,
}: FilterSidebarProps) {
  // Build active filters for display
  const activeFilters: { key: string; label: string }[] = []

  if (category && category !== "all") {
    const categoryLabels: Record<string, string> = {
      cinema: "Cinéma",
      theater: "Théâtre",
      shorts: "Courts-métrages",
      music: "Musique",
      exhibitions: "Expositions",
    }
    activeFilters.push({
      key: "category",
      label: categoryLabels[category] || category,
    })
  }

  if (cityId) {
    const cityName = regions
      .flatMap((r) => r.cities || [])
      .find((c) => c.documentId === cityId)?.name
    if (cityName) {
      activeFilters.push({ key: "city", label: cityName })
    }
  }

  const handleRemoveFilter = (key: string) => {
    if (key === "category") onCategoryChange(undefined)
    if (key === "city") onCityChange(null)
  }

  return (
    <Sidebar filled className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-foreground text-lg font-semibold">
          {labels.title}
          {filterCount > 0 && (
            <Badge variant="secondary" className="ms-2">
              {filterCount}
            </Badge>
          )}
        </h2>
        {filterCount > 0 && onClearAll && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="text-muted-foreground hover:text-foreground h-auto p-0 text-sm"
          >
            {labels.clearAll}
          </Button>
        )}
      </div>

      {/* Active Filters */}
      {activeFilters.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
            {labels.activeFilters}
          </h3>
          <div className="flex flex-wrap gap-2">
            {activeFilters.map((filter) => (
              <Badge
                key={filter.key}
                variant="secondary"
                className="gap-1 pe-1"
              >
                {filter.label}
                <button
                  type="button"
                  onClick={() => handleRemoveFilter(filter.key)}
                  className="hover:bg-muted rounded-full p-0.5"
                  aria-label={`Retirer le filtre ${filter.label}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div className="space-y-3">
        <h3 className="text-foreground text-sm font-medium">
          {labels.category}
        </h3>
        <CategoryTabs
          activeCategory={category || "all"}
          onCategoryChange={(cat) =>
            onCategoryChange(cat === "all" ? undefined : cat)
          }
          className="flex-wrap"
        />
      </div>

      {/* Location Filter */}
      <div className="space-y-3">
        <h3 className="text-foreground text-sm font-medium">
          {labels.location}
        </h3>
        <RegionCitySelector
          regions={regions}
          selectedCityId={cityId || null}
          onCityChange={onCityChange}
        />
      </div>
    </Sidebar>
  )
}

FilterSidebar.displayName = "FilterSidebar"

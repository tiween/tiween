"use client"

import * as React from "react"
import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react"
import { useLocale } from "next-intl"

import type {
  ShortsFiltersLabels,
  ShortsFilters as ShortsFiltersType,
} from "../../types"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Slider } from "@/components/ui/slider"

const defaultLabels: ShortsFiltersLabels = {
  search: "Rechercher",
  searchPlaceholder: "Titre, réalisateur...",
  genres: "Genres",
  duration: "Durée",
  durationRange: "De {min} à {max} minutes",
  year: "Année",
  yearRange: "De {min} à {max}",
  country: "Pays",
  language: "Langue",
  awards: "Récompenses",
  hasAwards: "Films primés uniquement",
  availability: "Disponibilité",
  availableOnline: "Disponible en ligne",
  platforms: "Plateformes",
  rating: "Note",
  ratingMin: "Note minimale",
  sortBy: "Trier par",
  sortByOptions: {
    latest: "Plus récents",
    rating: "Mieux notés",
    year: "Année",
    duration: "Durée",
    title: "Titre",
  },
  clearFilters: "Effacer les filtres",
  applyFilters: "Appliquer",
  resultsCount: "{count} résultats",
  noResults: "Aucun résultat",
}

export interface GenreOption {
  slug: string
  name: string
}

export interface ShortsFiltersProps {
  /** Current filter values */
  filters: ShortsFiltersType
  /** Available genre options */
  genres?: GenreOption[]
  /** Total results count */
  totalResults?: number
  /** Called when filters change */
  onFiltersChange: (filters: ShortsFiltersType) => void
  /** Called when search is submitted */
  onSearch?: (query: string) => void
  /** Additional class names */
  className?: string
  /** Localized labels */
  labels?: ShortsFiltersLabels
}

export function ShortsFilters({
  filters,
  genres = [],
  totalResults = 0,
  onFiltersChange,
  onSearch,
  className,
  labels = defaultLabels,
}: ShortsFiltersProps) {
  const locale = useLocale()
  const isRTL = locale === "ar"

  const [localQuery, setLocalQuery] = React.useState(filters.query || "")
  const [isSheetOpen, setIsSheetOpen] = React.useState(false)
  const [tempFilters, setTempFilters] =
    React.useState<ShortsFiltersType>(filters)

  // Sync tempFilters when filters prop changes
  React.useEffect(() => {
    setTempFilters(filters)
  }, [filters])

  // Debounced search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (localQuery !== filters.query) {
        onSearch?.(localQuery)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [localQuery, filters.query, onSearch])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch?.(localQuery)
  }

  const handleClearSearch = () => {
    setLocalQuery("")
    onSearch?.("")
  }

  const handleGenreToggle = (slug: string) => {
    const currentGenres = tempFilters.genres || []
    const newGenres = currentGenres.includes(slug)
      ? currentGenres.filter((g) => g !== slug)
      : [...currentGenres, slug]
    setTempFilters({ ...tempFilters, genres: newGenres })
  }

  const handleApplyFilters = () => {
    onFiltersChange(tempFilters)
    setIsSheetOpen(false)
  }

  const handleClearFilters = () => {
    const clearedFilters: ShortsFiltersType = {
      query: filters.query,
      sortBy: "latest",
      sortOrder: "desc",
    }
    setTempFilters(clearedFilters)
    onFiltersChange(clearedFilters)
    setIsSheetOpen(false)
  }

  const activeFilterCount = [
    (filters.genres?.length || 0) > 0,
    filters.durationMin !== undefined || filters.durationMax !== undefined,
    filters.yearMin !== undefined || filters.yearMax !== undefined,
    filters.hasAwards,
    filters.availableOnline,
    filters.rating !== undefined,
  ].filter(Boolean).length

  // Active filter chips for display
  const activeFilterChips: Array<{ key: string; label: string }> = []

  if (filters.genres?.length) {
    const genreNames = filters.genres
      .map((slug) => genres.find((g) => g.slug === slug)?.name)
      .filter(Boolean)
      .join(", ")
    if (genreNames) {
      activeFilterChips.push({ key: "genres", label: genreNames })
    }
  }

  if (filters.durationMin !== undefined || filters.durationMax !== undefined) {
    activeFilterChips.push({
      key: "duration",
      label: `${filters.durationMin || 0}-${filters.durationMax || 60} min`,
    })
  }

  if (filters.yearMin !== undefined || filters.yearMax !== undefined) {
    activeFilterChips.push({
      key: "year",
      label: `${filters.yearMin || 1900}-${filters.yearMax || new Date().getFullYear()}`,
    })
  }

  if (filters.hasAwards) {
    activeFilterChips.push({ key: "awards", label: labels.hasAwards })
  }

  if (filters.availableOnline) {
    activeFilterChips.push({ key: "online", label: labels.availableOnline })
  }

  if (filters.rating !== undefined) {
    activeFilterChips.push({ key: "rating", label: `★ ${filters.rating}+` })
  }

  const handleRemoveFilter = (key: string) => {
    const newFilters = { ...filters }
    switch (key) {
      case "genres":
        newFilters.genres = undefined
        break
      case "duration":
        newFilters.durationMin = undefined
        newFilters.durationMax = undefined
        break
      case "year":
        newFilters.yearMin = undefined
        newFilters.yearMax = undefined
        break
      case "awards":
        newFilters.hasAwards = undefined
        break
      case "online":
        newFilters.availableOnline = undefined
        break
      case "rating":
        newFilters.rating = undefined
        break
    }
    onFiltersChange(newFilters)
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search bar and filter button */}
      <div className="flex gap-2">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="text-muted-foreground absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            type="search"
            placeholder={labels.searchPlaceholder}
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            className="ps-10 pe-10"
          />
          {localQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="text-muted-foreground hover:text-foreground absolute end-3 top-1/2 -translate-y-1/2"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </form>

        {/* Filter sheet trigger */}
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="relative shrink-0">
              <SlidersHorizontal className="h-4 w-4" />
              {activeFilterCount > 0 && (
                <span className="bg-primary text-primary-foreground absolute -end-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-xs">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </SheetTrigger>

          <SheetContent
            side={isRTL ? "left" : "right"}
            className="flex flex-col"
          >
            <SheetHeader>
              <SheetTitle>Filtres</SheetTitle>
            </SheetHeader>

            <div className="flex-1 space-y-6 overflow-y-auto py-4">
              {/* Sort by */}
              <div>
                <label className="text-foreground mb-2 block text-sm font-medium">
                  {labels.sortBy}
                </label>
                <Select
                  value={tempFilters.sortBy || "latest"}
                  onValueChange={(value) =>
                    setTempFilters({
                      ...tempFilters,
                      sortBy: value as ShortsFiltersType["sortBy"],
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="latest">
                      {labels.sortByOptions.latest}
                    </SelectItem>
                    <SelectItem value="rating">
                      {labels.sortByOptions.rating}
                    </SelectItem>
                    <SelectItem value="year">
                      {labels.sortByOptions.year}
                    </SelectItem>
                    <SelectItem value="duration">
                      {labels.sortByOptions.duration}
                    </SelectItem>
                    <SelectItem value="title">
                      {labels.sortByOptions.title}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Genres */}
              {genres.length > 0 && (
                <Collapsible defaultOpen>
                  <CollapsibleTrigger className="text-foreground flex w-full items-center justify-between text-sm font-medium">
                    {labels.genres}
                    <ChevronDown className="h-4 w-4" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3 space-y-2">
                    {genres.map((genre) => (
                      <label
                        key={genre.slug}
                        className="flex cursor-pointer items-center gap-2"
                      >
                        <Checkbox
                          checked={
                            tempFilters.genres?.includes(genre.slug) || false
                          }
                          onCheckedChange={() => handleGenreToggle(genre.slug)}
                        />
                        <span className="text-sm">{genre.name}</span>
                      </label>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Duration slider */}
              <Collapsible>
                <CollapsibleTrigger className="text-foreground flex w-full items-center justify-between text-sm font-medium">
                  {labels.duration}
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3">
                  <div className="px-2">
                    <Slider
                      min={0}
                      max={60}
                      step={5}
                      value={[
                        tempFilters.durationMin || 0,
                        tempFilters.durationMax || 60,
                      ]}
                      onValueChange={(values: number[]) =>
                        setTempFilters({
                          ...tempFilters,
                          durationMin: values[0],
                          durationMax: values[1],
                        })
                      }
                      className="mt-2"
                    />
                    <div className="text-muted-foreground mt-2 flex justify-between text-xs">
                      <span>{tempFilters.durationMin || 0} min</span>
                      <span>{tempFilters.durationMax || 60} min</span>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Year slider */}
              <Collapsible>
                <CollapsibleTrigger className="text-foreground flex w-full items-center justify-between text-sm font-medium">
                  {labels.year}
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3">
                  <div className="px-2">
                    <Slider
                      min={1990}
                      max={new Date().getFullYear()}
                      step={1}
                      value={[
                        tempFilters.yearMin || 1990,
                        tempFilters.yearMax || new Date().getFullYear(),
                      ]}
                      onValueChange={(values: number[]) =>
                        setTempFilters({
                          ...tempFilters,
                          yearMin: values[0],
                          yearMax: values[1],
                        })
                      }
                      className="mt-2"
                    />
                    <div className="text-muted-foreground mt-2 flex justify-between text-xs">
                      <span>{tempFilters.yearMin || 1990}</span>
                      <span>
                        {tempFilters.yearMax || new Date().getFullYear()}
                      </span>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Rating */}
              <Collapsible>
                <CollapsibleTrigger className="text-foreground flex w-full items-center justify-between text-sm font-medium">
                  {labels.rating}
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3">
                  <div className="px-2">
                    <Slider
                      min={0}
                      max={10}
                      step={0.5}
                      value={[tempFilters.rating || 0]}
                      onValueChange={(values: number[]) => {
                        const rating = values[0] ?? 0
                        setTempFilters({
                          ...tempFilters,
                          rating: rating > 0 ? rating : undefined,
                        })
                      }}
                      className="mt-2"
                    />
                    <div className="text-muted-foreground mt-2 text-center text-xs">
                      {labels.ratingMin}: ★ {tempFilters.rating || 0}+
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Boolean filters */}
              <div className="space-y-3">
                <label className="flex cursor-pointer items-center gap-2">
                  <Checkbox
                    checked={tempFilters.hasAwards || false}
                    onCheckedChange={(checked) =>
                      setTempFilters({
                        ...tempFilters,
                        hasAwards: checked === true ? true : undefined,
                      })
                    }
                  />
                  <span className="text-sm">{labels.hasAwards}</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <Checkbox
                    checked={tempFilters.availableOnline || false}
                    onCheckedChange={(checked) =>
                      setTempFilters({
                        ...tempFilters,
                        availableOnline: checked === true ? true : undefined,
                      })
                    }
                  />
                  <span className="text-sm">{labels.availableOnline}</span>
                </label>
              </div>
            </div>

            <SheetFooter className="flex-row gap-2 pt-4">
              <Button
                variant="outline"
                onClick={handleClearFilters}
                className="flex-1"
              >
                {labels.clearFilters}
              </Button>
              <Button onClick={handleApplyFilters} className="flex-1">
                {labels.applyFilters}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      {/* Active filters chips */}
      {activeFilterChips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilterChips.map((chip) => (
            <Badge key={chip.key} variant="secondary" className="gap-1 pe-1">
              {chip.label}
              <button
                onClick={() => handleRemoveFilter(chip.key)}
                className="hover:bg-muted ml-1 rounded-full p-0.5"
                aria-label={`Remove ${chip.label} filter`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {activeFilterChips.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="h-6 px-2 text-xs"
            >
              {labels.clearFilters}
            </Button>
          )}
        </div>
      )}

      {/* Results count */}
      {totalResults > 0 && (
        <p className="text-muted-foreground text-sm">
          {labels.resultsCount.replace("{count}", totalResults.toString())}
        </p>
      )}
    </div>
  )
}

ShortsFilters.displayName = "ShortsFilters"

"use client"

import * as React from "react"
import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"

import type { ShortsFilters as ShortsFiltersType } from "../../types"

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

import { formatCount } from "../../utils"

/** Slider bounds. A thumb resting on a bound means "no limit on that side". */
const DURATION_FLOOR = 0
const DURATION_CEILING = 60
const YEAR_FLOOR = 1990
const SEARCH_DEBOUNCE_MS = 300
const SEARCH_MAX_LENGTH = 100

// Ratings are out of v1 (PRODUCT.md), so there is no rating sort or filter.
const SORT_KEYS = ["latest", "year", "duration", "title"] as const

export interface GenreOption {
  slug: string
  name: string
}

export interface ShortsFiltersProps {
  /** Current (applied) filter values */
  filters: ShortsFiltersType
  /** Available genre options */
  genres?: GenreOption[]
  /** Total results count */
  totalResults?: number
  /** Called when filters change */
  onFiltersChange: (filters: ShortsFiltersType) => void
  /** Called (debounced) when the search query changes */
  onSearch?: (query: string) => void
  /** Additional class names */
  className?: string
}

/** A bound at its extreme is "unset", so a full-range slider is not a filter. */
function boundOrUndefined(value: number | undefined, extreme: number) {
  return value === undefined || value === extreme ? undefined : value
}

export function ShortsFilters({
  filters,
  genres = [],
  totalResults = 0,
  onFiltersChange,
  onSearch,
  className,
}: ShortsFiltersProps) {
  const locale = useLocale()
  const t = useTranslations("shorts.filters")
  const tShorts = useTranslations("shorts")
  const formatMinutes = (n: number) =>
    tShorts("durationMinutes", { count: n, display: formatCount(n, locale) })
  const isRTL = locale === "ar"
  const dir = isRTL ? "rtl" : "ltr"
  const yearCeiling = React.useMemo(() => new Date().getFullYear(), [])
  const sortLabelId = React.useId()

  // ------------------------------------------------------------- search --
  // `lastEmitted` is the query this component last reported upward. It lets
  // an EXTERNAL change (e.g. "reset filters" in the empty state) refill the
  // input, without the parent's echo of our own debounced value clobbering
  // characters typed since.
  const [localQuery, setLocalQuery] = React.useState(filters.query ?? "")
  const lastEmitted = React.useRef(filters.query ?? "")

  React.useEffect(() => {
    const incoming = filters.query ?? ""
    if (incoming !== lastEmitted.current) {
      lastEmitted.current = incoming
      setLocalQuery(incoming)
    }
  }, [filters.query])

  const emitSearch = React.useCallback(
    (raw: string) => {
      const query = raw.trim()
      if (query === lastEmitted.current) return
      lastEmitted.current = query
      onSearch?.(query)
    },
    [onSearch]
  )

  React.useEffect(() => {
    // Compared against the last emitted value — not `filters.query` — so the
    // initial render (undefined vs "") never fires a spurious refetch.
    if (localQuery.trim() === lastEmitted.current) return
    const timer = setTimeout(() => emitSearch(localQuery), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [localQuery, emitSearch])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    emitSearch(localQuery)
  }

  const handleClearSearch = () => {
    setLocalQuery("")
    emitSearch("")
  }

  // -------------------------------------------------------------- sheet --
  const [isSheetOpen, setIsSheetOpen] = React.useState(false)
  const [tempFilters, setTempFilters] =
    React.useState<ShortsFiltersType>(filters)

  // Opening the sheet always starts from the APPLIED filters, so edits that
  // were dismissed without "Apply" do not resurface as if they were active.
  const handleSheetOpenChange = (open: boolean) => {
    if (open) setTempFilters(filters)
    setIsSheetOpen(open)
  }

  const handleGenreToggle = (slug: string) => {
    setTempFilters((current) => {
      const selected = current.genres ?? []
      const next = selected.includes(slug)
        ? selected.filter((g) => g !== slug)
        : [...selected, slug]
      return { ...current, genres: next.length > 0 ? next : undefined }
    })
  }

  const handleApplyFilters = () => {
    onFiltersChange({
      ...tempFilters,
      durationMin: boundOrUndefined(tempFilters.durationMin, DURATION_FLOOR),
      durationMax: boundOrUndefined(tempFilters.durationMax, DURATION_CEILING),
      yearMin: boundOrUndefined(tempFilters.yearMin, YEAR_FLOOR),
      yearMax: boundOrUndefined(tempFilters.yearMax, yearCeiling),
      // The search box owns the query; never let a stale sheet copy win.
      query: filters.query,
    })
    setIsSheetOpen(false)
  }

  const handleClearFilters = () => {
    const cleared: ShortsFiltersType = {
      query: filters.query,
      sortBy: "latest",
      sortOrder: "desc",
    }
    setTempFilters(cleared)
    onFiltersChange(cleared)
    setIsSheetOpen(false)
  }

  // -------------------------------------------------------------- chips --
  const hasDuration =
    filters.durationMin !== undefined || filters.durationMax !== undefined
  const hasYear = filters.yearMin !== undefined || filters.yearMax !== undefined

  const activeFilterChips: Array<{ key: string; label: string }> = []

  if (filters.genres?.length) {
    const genreNames = filters.genres
      .map((slug) => genres.find((g) => g.slug === slug)?.name ?? slug)
      .join(", ")
    activeFilterChips.push({ key: "genres", label: genreNames })
  }
  if (hasDuration) {
    activeFilterChips.push({
      key: "duration",
      label: t("durationRange", {
        min: String(filters.durationMin ?? DURATION_FLOOR),
        max: formatMinutes(filters.durationMax ?? DURATION_CEILING),
      }),
    })
  }
  if (hasYear) {
    activeFilterChips.push({
      key: "year",
      label: t("yearRange", {
        min: String(filters.yearMin ?? YEAR_FLOOR),
        max: String(filters.yearMax ?? yearCeiling),
      }),
    })
  }
  if (filters.hasAwards) {
    activeFilterChips.push({ key: "awards", label: t("hasAwards") })
  }
  if (filters.availableOnline) {
    activeFilterChips.push({ key: "online", label: t("availableOnline") })
  }

  const activeFilterCount = activeFilterChips.length

  const handleRemoveFilter = (key: string) => {
    const next = { ...filters }
    switch (key) {
      case "genres":
        next.genres = undefined
        break
      case "duration":
        next.durationMin = undefined
        next.durationMax = undefined
        break
      case "year":
        next.yearMin = undefined
        next.yearMax = undefined
        break
      case "awards":
        next.hasAwards = undefined
        break
      case "online":
        next.availableOnline = undefined
        break
    }
    onFiltersChange(next)
  }

  const durationMin = tempFilters.durationMin ?? DURATION_FLOOR
  const durationMax = tempFilters.durationMax ?? DURATION_CEILING
  const yearMin = tempFilters.yearMin ?? YEAR_FLOOR
  const yearMax = tempFilters.yearMax ?? yearCeiling

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex gap-2">
        <form
          role="search"
          onSubmit={handleSearchSubmit}
          className="relative min-w-0 flex-1"
        >
          <Search
            className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            type="search"
            aria-label={t("search")}
            placeholder={t("searchPlaceholder")}
            value={localQuery}
            maxLength={SEARCH_MAX_LENGTH}
            onChange={(e) => setLocalQuery(e.target.value)}
            enterKeyHint="search"
            autoComplete="off"
            className="h-11 rounded-lg ps-10 pe-11 text-base"
          />
          {localQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="text-muted-foreground hover:text-foreground absolute end-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg"
              aria-label={t("clearSearch")}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </form>

        <Sheet open={isSheetOpen} onOpenChange={handleSheetOpenChange}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="relative h-11 w-11 shrink-0"
              aria-label={
                activeFilterCount > 0
                  ? t("openWithCount", {
                      count: activeFilterCount,
                      display: formatCount(activeFilterCount, locale),
                    })
                  : t("open")
              }
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              {activeFilterCount > 0 && (
                <span
                  aria-hidden="true"
                  className="bg-primary text-primary-foreground absolute -end-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs"
                >
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </SheetTrigger>

          <SheetContent
            side={isRTL ? "left" : "right"}
            dir={dir}
            className="flex flex-col"
          >
            <SheetHeader>
              <SheetTitle>{t("title")}</SheetTitle>
            </SheetHeader>

            <div className="flex-1 space-y-6 overflow-y-auto py-4">
              <div>
                <span
                  id={sortLabelId}
                  className="text-foreground mb-2 block text-sm font-medium"
                >
                  {t("sortBy")}
                </span>
                <Select
                  dir={dir}
                  value={
                    tempFilters.sortBy &&
                    (SORT_KEYS as readonly string[]).includes(
                      tempFilters.sortBy
                    )
                      ? tempFilters.sortBy
                      : "latest"
                  }
                  onValueChange={(value) =>
                    setTempFilters((current) => ({
                      ...current,
                      sortBy: value as ShortsFiltersType["sortBy"],
                    }))
                  }
                >
                  <SelectTrigger aria-labelledby={sortLabelId}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_KEYS.map((key) => (
                      <SelectItem key={key} value={key}>
                        {t(`sort.${key}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {genres.length > 0 && (
                <Collapsible defaultOpen>
                  <CollapsibleTrigger className="text-foreground flex min-h-11 w-full items-center justify-between text-sm font-medium">
                    {t("genres")}
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-1 space-y-1">
                    {genres.map((genre) => (
                      <label
                        key={genre.slug}
                        className="flex min-h-11 cursor-pointer items-center gap-3"
                      >
                        <Checkbox
                          checked={
                            tempFilters.genres?.includes(genre.slug) ?? false
                          }
                          onCheckedChange={() => handleGenreToggle(genre.slug)}
                        />
                        <span className="min-w-0 text-sm break-words">
                          <bdi>{genre.name}</bdi>
                        </span>
                      </label>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}

              <Collapsible>
                <CollapsibleTrigger className="text-foreground flex min-h-11 w-full items-center justify-between text-sm font-medium">
                  {t("duration")}
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3">
                  <div className="px-2">
                    <Slider
                      dir={dir}
                      min={DURATION_FLOOR}
                      max={DURATION_CEILING}
                      step={5}
                      minStepsBetweenThumbs={1}
                      value={[durationMin, durationMax]}
                      thumbLabels={[t("durationFrom"), t("durationTo")]}
                      onValueChange={([min, max]: number[]) =>
                        setTempFilters((current) => ({
                          ...current,
                          durationMin: min,
                          durationMax: max,
                        }))
                      }
                      className="mt-2"
                    />
                    <p className="text-muted-foreground mt-2 text-center text-xs">
                      {t("durationRange", {
                        min: String(durationMin),
                        max: formatMinutes(durationMax),
                      })}
                    </p>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <Collapsible>
                <CollapsibleTrigger className="text-foreground flex min-h-11 w-full items-center justify-between text-sm font-medium">
                  {t("year")}
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3">
                  <div className="px-2">
                    <Slider
                      dir={dir}
                      min={YEAR_FLOOR}
                      max={yearCeiling}
                      step={1}
                      value={[yearMin, yearMax]}
                      thumbLabels={[t("yearFrom"), t("yearTo")]}
                      onValueChange={([min, max]: number[]) =>
                        setTempFilters((current) => ({
                          ...current,
                          yearMin: min,
                          yearMax: max,
                        }))
                      }
                      className="mt-2"
                    />
                    <p className="text-muted-foreground mt-2 text-center text-xs">
                      {t("yearRange", {
                        min: String(yearMin),
                        max: String(yearMax),
                      })}
                    </p>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <div className="space-y-1">
                <label className="flex min-h-11 cursor-pointer items-center gap-3">
                  <Checkbox
                    checked={tempFilters.hasAwards ?? false}
                    onCheckedChange={(checked) =>
                      setTempFilters((current) => ({
                        ...current,
                        hasAwards: checked === true ? true : undefined,
                      }))
                    }
                  />
                  <span className="text-sm">{t("hasAwards")}</span>
                </label>
                <label className="flex min-h-11 cursor-pointer items-center gap-3">
                  <Checkbox
                    checked={tempFilters.availableOnline ?? false}
                    onCheckedChange={(checked) =>
                      setTempFilters((current) => ({
                        ...current,
                        availableOnline: checked === true ? true : undefined,
                      }))
                    }
                  />
                  <span className="text-sm">{t("availableOnline")}</span>
                </label>
              </div>
            </div>

            <SheetFooter className="flex-row gap-2 pt-4">
              <Button
                variant="outline"
                onClick={handleClearFilters}
                className="h-11 min-w-0 flex-1"
              >
                <span className="truncate">{t("clear")}</span>
              </Button>
              <Button
                onClick={handleApplyFilters}
                className="h-11 min-w-0 flex-1"
              >
                <span className="truncate">{t("apply")}</span>
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      {activeFilterChips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilterChips.map((chip) => (
            <Badge
              key={chip.key}
              variant="secondary"
              className="max-w-full gap-1 pe-0.5"
            >
              <bdi className="min-w-0 truncate">{chip.label}</bdi>
              <button
                type="button"
                onClick={() => handleRemoveFilter(chip.key)}
                className="hover:bg-muted flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                aria-label={t("removeFilter", { label: chip.label })}
              >
                <X className="h-3 w-3" aria-hidden="true" />
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
              {t("clear")}
            </Button>
          )}
        </div>
      )}

      {/* Announced when filters or search change the result set. */}
      <p className="text-muted-foreground text-sm" aria-live="polite">
        {totalResults > 0
          ? t("results", {
              count: totalResults,
              display: formatCount(totalResults, locale),
            })
          : null}
      </p>
    </div>
  )
}

ShortsFilters.displayName = "ShortsFilters"

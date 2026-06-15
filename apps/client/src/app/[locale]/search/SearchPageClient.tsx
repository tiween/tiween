"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CategoryTabs } from "@/features/events/components"
import { RegionCitySelector } from "@/features/events/components/RegionCitySelector"
import { mapTypeToCategory } from "@/features/events/utils"
import { FilterSidebar } from "@/features/search/components/FilterSidebar"
import { SearchBar } from "@/features/search/components/SearchBar"
import { SearchResults } from "@/features/search/components/SearchResults"
import { ArrowLeft, SlidersHorizontal } from "lucide-react"
import { useTranslations } from "next-intl"

import type { CategoryType } from "@/features/events/components"
import type { RegionOption } from "@/features/events/components/RegionCitySelector"
import type { EventCardEvent } from "@/features/events/types"
import type { StrapiEvent } from "@/features/events/types/strapi.types"
import type { SearchFilter } from "@/features/search/components/SearchResults"

import { cn } from "@/lib/utils"
import { DesktopNav } from "@/components/layout/DesktopNav"
import { Footer } from "@/components/layout/Footer"
import { MaxWidthContainer } from "@/components/layout/MaxWidthContainer"
import { TwoColumnLayout } from "@/components/layout/TwoColumnLayout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

// Local storage key for recent searches
const RECENT_SEARCHES_KEY = "tiween_recent_searches"
const MAX_RECENT_SEARCHES = 5

/**
 * API response type for search endpoint
 */
interface SearchApiResponse {
  events: StrapiEvent[]
  total: number
}

interface SearchResult {
  events: StrapiEvent[]
  total: number
  query: string
}

export interface SearchPageClientProps {
  locale: string
  initialQuery: string
  initialResults: SearchResult | null
  initialCategory?: string
  initialCityId?: string
  regions: RegionOption[]
  popularSearches: string[]
}

/**
 * Convert Strapi event to EventCardEvent for display
 */
function toEventCardEvent(event: StrapiEvent): EventCardEvent {
  const work = event.creativeWork
  return {
    id: event.documentId,
    title: work?.title || event.title,
    posterUrl: work?.poster?.formats?.medium?.url || work?.poster?.url,
    category: mapTypeToCategory(work?.type),
    venueName: event.venue?.name || "",
    date: event.startDate,
  }
}

/**
 * SearchPageClient - Interactive search page with filters
 *
 * Features:
 * - Real-time search with debounce
 * - Recent searches (persisted to localStorage)
 * - Category and location filters
 * - Infinite scroll results
 * - Mobile-friendly filter sheet
 */
export function SearchPageClient({
  locale,
  initialQuery,
  initialResults,
  initialCategory,
  initialCityId,
  regions,
  popularSearches,
}: SearchPageClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isRTL = locale === "ar"
  const t = useTranslations("search")

  // State
  const [query, setQuery] = React.useState(initialQuery)
  const [debouncedQuery, setDebouncedQuery] = React.useState(initialQuery)
  const [results, setResults] = React.useState<EventCardEvent[]>(
    initialResults?.events.map(toEventCardEvent) || []
  )
  const [totalCount, setTotalCount] = React.useState(initialResults?.total || 0)
  const [isLoading, setIsLoading] = React.useState(false)
  const [isLoadingMore, setIsLoadingMore] = React.useState(false)
  const [hasMore, setHasMore] = React.useState(
    initialResults ? initialResults.events.length < initialResults.total : false
  )
  const [offset, setOffset] = React.useState(initialResults?.events.length || 0)

  // Filters
  const [category, setCategory] = React.useState<CategoryType | undefined>(
    initialCategory as CategoryType | undefined
  )
  const [cityId, setCityId] = React.useState<string | undefined>(initialCityId)

  // Recent searches
  const [recentSearches, setRecentSearches] = React.useState<string[]>([])

  // Load recent searches from localStorage
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY)
      if (stored) {
        setRecentSearches(JSON.parse(stored))
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [])

  // Debounce query changes
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  // Perform search when debounced query or filters change
  React.useEffect(() => {
    const performSearch = async () => {
      if (!debouncedQuery.trim()) {
        setResults([])
        setTotalCount(0)
        setHasMore(false)
        return
      }

      setIsLoading(true)

      try {
        // Build URL params
        const params = new URLSearchParams()
        params.set("q", debouncedQuery)
        if (category) params.set("category", category)
        if (cityId) params.set("city", cityId)

        // Update URL without navigation
        window.history.replaceState(null, "", `?${params.toString()}`)

        // Fetch results
        const response = await fetch(
          `/api/search?${params.toString()}&locale=${locale}&limit=20`
        )
        const data: SearchApiResponse = await response.json()

        const events = (data.events || []).map(toEventCardEvent)
        setResults(events)
        setTotalCount(data.total || 0)
        setHasMore(events.length < (data.total || 0))
        setOffset(events.length)
      } catch (error) {
        console.error("Search error:", error)
        setResults([])
        setTotalCount(0)
        setHasMore(false)
      } finally {
        setIsLoading(false)
      }
    }

    performSearch()
  }, [debouncedQuery, category, cityId, locale])

  // Handle search submission
  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery)
    setDebouncedQuery(searchQuery) // Immediate search on submit

    // Save to recent searches
    if (searchQuery.trim()) {
      const updated = [
        searchQuery,
        ...recentSearches.filter((s) => s !== searchQuery),
      ].slice(0, MAX_RECENT_SEARCHES)

      setRecentSearches(updated)
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
      } catch {
        // Ignore localStorage errors
      }
    }
  }

  // Handle load more
  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore) return

    setIsLoadingMore(true)

    try {
      const params = new URLSearchParams()
      params.set("q", debouncedQuery)
      if (category) params.set("category", category)
      if (cityId) params.set("city", cityId)
      params.set("offset", String(offset))

      const response = await fetch(
        `/api/search?${params.toString()}&locale=${locale}&limit=20`
      )
      const data: SearchApiResponse = await response.json()

      const newEvents = (data.events || []).map(toEventCardEvent)
      setResults((prev) => [...prev, ...newEvents])
      setOffset((prev) => prev + newEvents.length)
      setHasMore(results.length + newEvents.length < (data.total || 0))
    } catch (error) {
      console.error("Load more error:", error)
    } finally {
      setIsLoadingMore(false)
    }
  }

  // Handle clear search
  const handleClear = () => {
    setQuery("")
    setDebouncedQuery("")
    setResults([])
    setTotalCount(0)
    window.history.replaceState(null, "", "?")
  }

  // Handle remove recent search
  const handleRemoveRecentSearch = (searchToRemove: string) => {
    const updated = recentSearches.filter((s) => s !== searchToRemove)
    setRecentSearches(updated)
    try {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
    } catch {
      // Ignore localStorage errors
    }
  }

  // Handle event click
  const handleEventClick = (event: EventCardEvent) => {
    router.push(`/${locale}/events/${event.id}`)
  }

  // Handle category change
  const handleCategoryChange = (newCategory: CategoryType | undefined) => {
    setCategory(newCategory === category ? undefined : newCategory)
  }

  // Handle city change
  const handleCityChange = (newCityId: string | null) => {
    setCityId(newCityId || undefined)
  }

  // Build active filters array for display
  const activeFilters: SearchFilter[] = []
  if (category) {
    const categoryKey = category as
      | "cinema"
      | "theater"
      | "music"
      | "exhibition"
    activeFilters.push({
      key: "category",
      label: t(`categories.${categoryKey}`),
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

  // Handle remove filter
  const handleRemoveFilter = (key: string) => {
    if (key === "category") setCategory(undefined)
    if (key === "city") setCityId(undefined)
  }

  // Handle clear all filters
  const handleClearAllFilters = () => {
    setCategory(undefined)
    setCityId(undefined)
  }

  // Calculate filter count
  const filterCount =
    (category && category !== "all" ? 1 : 0) + (cityId ? 1 : 0)

  return (
    <div className="bg-background min-h-screen">
      {/* Desktop Navigation */}
      <DesktopNav />

      {/* Sticky Header */}
      <header className="bg-background/95 sticky top-0 z-40 border-b backdrop-blur-sm lg:top-16">
        <MaxWidthContainer className="py-3">
          {/* Back button and search bar */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="shrink-0"
              aria-label={t("back")}
            >
              <ArrowLeft className={cn("h-5 w-5", isRTL && "rotate-180")} />
            </Button>

            <SearchBar
              value={query}
              onChange={setQuery}
              onSearch={handleSearch}
              onClear={handleClear}
              isLoading={isLoading}
              recentSearches={recentSearches}
              onRemoveRecentSearch={handleRemoveRecentSearch}
              autoFocus
              className="flex-1"
            />

            {/* Mobile Filters Sheet - hidden on desktop */}
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="relative shrink-0 lg:hidden"
                >
                  <SlidersHorizontal className="h-5 w-5" />
                  {filterCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -end-1 -top-1 flex h-5 w-5 items-center justify-center p-0 text-xs"
                    >
                      {filterCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side={isRTL ? "left" : "right"}>
                <SheetHeader>
                  <SheetTitle>{t("filters")}</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-6">
                  {/* Category filter */}
                  <div>
                    <h3 className="text-foreground mb-3 text-sm font-medium">
                      {t("category")}
                    </h3>
                    <CategoryTabs
                      activeCategory={category || "all"}
                      onCategoryChange={(cat) =>
                        handleCategoryChange(cat === "all" ? undefined : cat)
                      }
                    />
                  </div>

                  {/* Location filter */}
                  <div>
                    <h3 className="text-foreground mb-3 text-sm font-medium">
                      {t("city")}
                    </h3>
                    <RegionCitySelector
                      regions={regions}
                      selectedCityId={cityId || null}
                      onCityChange={handleCityChange}
                    />
                  </div>

                  {/* Clear all button */}
                  {filterCount > 0 && (
                    <Button
                      variant="outline"
                      onClick={handleClearAllFilters}
                      className="w-full"
                    >
                      {t("clearFilters", { count: filterCount })}
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </MaxWidthContainer>
      </header>

      {/* Main Content */}
      <MaxWidthContainer className="py-6">
        {/* Mobile: Full-width content */}
        <div className="lg:hidden">
          {/* Show popular searches when no query */}
          {!debouncedQuery && !isLoading && (
            <div className="space-y-4">
              <h2 className="text-foreground text-lg font-medium">
                {t("popularSearches")}
              </h2>
              <div className="flex flex-wrap gap-2">
                {popularSearches.map((term) => (
                  <Button
                    key={term}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSearch(term)}
                    className="rounded-full"
                  >
                    {term}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Search results */}
          {(debouncedQuery || isLoading) && (
            <SearchResults
              query={debouncedQuery}
              results={results}
              totalCount={totalCount}
              isLoading={isLoading}
              hasMore={hasMore}
              isLoadingMore={isLoadingMore}
              activeFilters={activeFilters}
              onLoadMore={handleLoadMore}
              onRemoveFilter={handleRemoveFilter}
              onEventClick={handleEventClick}
              onClear={handleClear}
            />
          )}
        </div>

        {/* Desktop: Two-column layout with sidebar */}
        <div className="hidden lg:block">
          <TwoColumnLayout
            sidebarWidth={3}
            sidebarPosition="start"
            sidebar={
              <FilterSidebar
                category={category}
                onCategoryChange={handleCategoryChange}
                cityId={cityId}
                onCityChange={handleCityChange}
                regions={regions}
                filterCount={filterCount}
                onClearAll={handleClearAllFilters}
              />
            }
          >
            {/* Show popular searches when no query */}
            {!debouncedQuery && !isLoading && (
              <div className="space-y-4">
                <h2 className="text-foreground text-xl font-medium">
                  {t("popularSearches")}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {popularSearches.map((term) => (
                    <Button
                      key={term}
                      variant="outline"
                      size="sm"
                      onClick={() => handleSearch(term)}
                      className="rounded-full"
                    >
                      {term}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Search results in grid */}
            {(debouncedQuery || isLoading) && (
              <SearchResults
                query={debouncedQuery}
                results={results}
                totalCount={totalCount}
                isLoading={isLoading}
                hasMore={hasMore}
                isLoadingMore={isLoadingMore}
                activeFilters={activeFilters}
                onLoadMore={handleLoadMore}
                onRemoveFilter={handleRemoveFilter}
                onEventClick={handleEventClick}
                onClear={handleClear}
                layout="grid"
                gridColumns={3}
              />
            )}
          </TwoColumnLayout>
        </div>
      </MaxWidthContainer>

      {/* Desktop Footer */}
      <Footer />
    </div>
  )
}

SearchPageClient.displayName = "SearchPageClient"

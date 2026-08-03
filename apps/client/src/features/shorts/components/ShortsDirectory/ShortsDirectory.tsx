"use client"

import * as React from "react"
import { ChevronRight, Film } from "lucide-react"
import { useLocale } from "next-intl"

import type { ShortFilm, ShortsFilters as ShortsFiltersType } from "../../types"
import type { GenreOption } from "../ShortsFilters"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

import { toShortFilmCard } from "../../types"
import { ShortFilmCard, ShortFilmCardSkeleton } from "../ShortFilmCard"
import { ShortFilmDetail } from "../ShortFilmDetail"
import { ShortsFilters } from "../ShortsFilters"
import { ShortsHero } from "../ShortsHero"
import { SuggestionForm } from "../SuggestionForm"

export interface ShortsDirectoryLabels {
  pageTitle: string
  pageDescription: string
  latestShorts: string
  seeAll: string
  allShorts: string
  loadMore: string
  loading: string
  noResults: string
  noResultsDescription: string
  suggestShort: string
}

const defaultLabels: ShortsDirectoryLabels = {
  pageTitle: "Courts métrages",
  pageDescription:
    "Découvrez notre sélection de courts métrages du monde entier",
  latestShorts: "Derniers ajouts",
  seeAll: "Voir tout",
  allShorts: "Tous les courts métrages",
  loadMore: "Charger plus",
  loading: "Chargement...",
  noResults: "Aucun court métrage trouvé",
  noResultsDescription:
    "Essayez de modifier vos filtres ou effectuez une nouvelle recherche",
  suggestShort: "Suggérer un court métrage",
}

export interface ShortsDirectoryProps {
  /** Featured short films for hero carousel */
  featuredShorts: ShortFilm[]
  /** Latest added short films */
  latestShorts: ShortFilm[]
  /** Initial shorts list for directory */
  initialShorts: ShortFilm[]
  /** Total count of shorts */
  totalShorts: number
  /** Available genres for filtering */
  genres: GenreOption[]
  /** Initial filter values from URL */
  initialFilters?: ShortsFiltersType
  /** Additional class names */
  className?: string
  /** Localized labels */
  labels?: ShortsDirectoryLabels
}

export function ShortsDirectory({
  featuredShorts,
  latestShorts,
  initialShorts,
  totalShorts,
  genres,
  initialFilters = {},
  className,
  labels = defaultLabels,
}: ShortsDirectoryProps) {
  const locale = useLocale()
  const isRTL = locale === "ar"

  // State
  const [filters, setFilters] =
    React.useState<ShortsFiltersType>(initialFilters)
  const [shorts, setShorts] = React.useState<ShortFilm[]>(initialShorts)
  const [total, setTotal] = React.useState(totalShorts)
  const [page, setPage] = React.useState(1)
  const [isLoading, setIsLoading] = React.useState(false)
  const [isLoadingMore, setIsLoadingMore] = React.useState(false)
  const [selectedFilm, setSelectedFilm] = React.useState<ShortFilm | null>(null)
  const [isDetailOpen, setIsDetailOpen] = React.useState(false)

  const hasMore = shorts.length < total

  // Fetch shorts when filters change
  const fetchShorts = React.useCallback(
    async (newFilters: ShortsFiltersType, pageNum: number = 1) => {
      setIsLoading(pageNum === 1)
      setIsLoadingMore(pageNum > 1)

      try {
        const params = new URLSearchParams()
        if (newFilters.query) params.set("q", newFilters.query)
        if (newFilters.genres?.length)
          params.set("genres", newFilters.genres.join(","))
        if (newFilters.durationMin)
          params.set("durationMin", String(newFilters.durationMin))
        if (newFilters.durationMax)
          params.set("durationMax", String(newFilters.durationMax))
        if (newFilters.yearMin)
          params.set("yearMin", String(newFilters.yearMin))
        if (newFilters.yearMax)
          params.set("yearMax", String(newFilters.yearMax))
        if (newFilters.hasAwards) params.set("hasAwards", "true")
        if (newFilters.availableOnline) params.set("availableOnline", "true")
        if (newFilters.rating) params.set("rating", String(newFilters.rating))
        if (newFilters.sortBy) params.set("sortBy", newFilters.sortBy)
        params.set("page", String(pageNum))

        const response = await fetch(`/api/shorts?${params.toString()}`)
        const data = await response.json()

        if (pageNum === 1) {
          setShorts(data.shorts || [])
        } else {
          setShorts((prev) => [...prev, ...(data.shorts || [])])
        }
        setTotal(data.total || 0)
        setPage(pageNum)
      } catch (error) {
        console.error("Error fetching shorts:", error)
      } finally {
        setIsLoading(false)
        setIsLoadingMore(false)
      }
    },
    []
  )

  // Handle filter changes
  const handleFiltersChange = React.useCallback(
    (newFilters: ShortsFiltersType) => {
      setFilters(newFilters)
      fetchShorts(newFilters, 1)

      // Update URL with filters
      const params = new URLSearchParams()
      if (newFilters.query) params.set("q", newFilters.query)
      if (newFilters.genres?.length)
        params.set("genres", newFilters.genres.join(","))
      if (newFilters.sortBy && newFilters.sortBy !== "latest")
        params.set("sort", newFilters.sortBy)

      const queryString = params.toString()
      window.history.replaceState(
        null,
        "",
        queryString ? `?${queryString}` : window.location.pathname
      )
    },
    [fetchShorts]
  )

  // Handle search
  const handleSearch = React.useCallback(
    (query: string) => {
      const newFilters = { ...filters, query }
      handleFiltersChange(newFilters)
    },
    [filters, handleFiltersChange]
  )

  // Handle load more
  const handleLoadMore = React.useCallback(() => {
    if (!isLoadingMore && hasMore) {
      fetchShorts(filters, page + 1)
    }
  }, [isLoadingMore, hasMore, fetchShorts, filters, page])

  // Handle film click
  const handleFilmClick = (film: ShortFilm) => {
    setSelectedFilm(film)
    setIsDetailOpen(true)
  }

  // Handle play trailer
  const handlePlayTrailer = (film: ShortFilm) => {
    if (film.trailer) {
      window.open(film.trailer, "_blank", "noopener,noreferrer")
    }
  }

  // Handle watch link
  const handleWatch = (film: ShortFilm, url: string) => {
    window.open(url, "_blank", "noopener,noreferrer")
  }

  // Handle suggestion submission
  const handleSuggestionSubmit = async (suggestion: unknown) => {
    const response = await fetch("/api/shorts/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(suggestion),
    })

    if (!response.ok) {
      throw new Error("Failed to submit suggestion")
    }
  }

  // Intersection observer for infinite scroll
  const loadMoreRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0]
        if (
          firstEntry?.isIntersecting &&
          hasMore &&
          !isLoading &&
          !isLoadingMore
        ) {
          handleLoadMore()
        }
      },
      { threshold: 0.1 }
    )

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current)
    }

    return () => observer.disconnect()
  }, [hasMore, isLoading, isLoadingMore, handleLoadMore])

  return (
    <div className={cn("bg-background min-h-screen", className)}>
      {/* Hero section with featured shorts */}
      {featuredShorts.length > 0 && (
        <ShortsHero
          films={featuredShorts}
          onPlayTrailer={handlePlayTrailer}
          onViewDetails={handleFilmClick}
        />
      )}

      {/* Latest shorts section */}
      {latestShorts.length > 0 && (
        <section className="py-8">
          <div className="px-4 md:px-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-foreground text-xl font-bold">
                {labels.latestShorts}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary gap-1"
                onClick={() => handleFiltersChange({ sortBy: "latest" })}
              >
                {labels.seeAll}
                <ChevronRight
                  className={cn("h-4 w-4", isRTL && "rotate-180")}
                />
              </Button>
            </div>

            {/* Horizontal scroll */}
            <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-4 md:-mx-8 md:px-8">
              {latestShorts.map((film) => (
                <div
                  key={film.documentId}
                  className="w-[160px] shrink-0 md:w-[180px]"
                >
                  <ShortFilmCard
                    film={toShortFilmCard(film)}
                    onClick={() => handleFilmClick(film)}
                    onPlayTrailer={() => handlePlayTrailer(film)}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Main directory section */}
      <section className="px-4 py-8 md:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Section header */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-foreground text-xl font-bold">
                {labels.allShorts}
              </h2>
              <p className="text-muted-foreground text-sm">
                {labels.pageDescription}
              </p>
            </div>
            <SuggestionForm onSubmit={handleSuggestionSubmit} />
          </div>

          {/* Filters */}
          <ShortsFilters
            filters={filters}
            genres={genres}
            totalResults={total}
            onFiltersChange={handleFiltersChange}
            onSearch={handleSearch}
            className="mb-6"
          />

          {/* Grid */}
          {isLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <ShortFilmCardSkeleton key={i} />
              ))}
            </div>
          ) : shorts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Film className="text-muted-foreground mb-4 h-16 w-16" />
              <h3 className="text-foreground text-lg font-medium">
                {labels.noResults}
              </h3>
              <p className="text-muted-foreground mt-1 max-w-md text-sm">
                {labels.noResultsDescription}
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => handleFiltersChange({})}
              >
                Réinitialiser les filtres
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {shorts.map((film) => (
                  <ShortFilmCard
                    key={film.documentId}
                    film={toShortFilmCard(film)}
                    onClick={() => handleFilmClick(film)}
                    onPlayTrailer={() => handlePlayTrailer(film)}
                  />
                ))}
              </div>

              {/* Load more trigger */}
              {hasMore && (
                <div ref={loadMoreRef} className="flex justify-center py-8">
                  {isLoadingMore ? (
                    <div className="flex items-center gap-2">
                      <div className="border-primary h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" />
                      <span className="text-muted-foreground text-sm">
                        {labels.loading}
                      </span>
                    </div>
                  ) : (
                    <Button variant="outline" onClick={handleLoadMore}>
                      {labels.loadMore}
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Detail modal */}
      <ShortFilmDetail
        film={selectedFilm}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onPlayTrailer={handlePlayTrailer}
        onWatch={handleWatch}
      />
    </div>
  )
}

ShortsDirectory.displayName = "ShortsDirectory"

"use client"

import * as React from "react"
import { EventCard } from "@/features/events/components"
import { Loader2, X } from "lucide-react"

import type { EventCardEvent } from "@/features/events/types"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

import { SearchResultsEmpty } from "./SearchResultsEmpty"
import { SearchResultsSkeleton } from "./SearchResultsSkeleton"

/**
 * Localized labels for SearchResults
 */
export interface SearchResultsLabels {
  resultsFor: (count: number, query: string) => string
  noResults: string
  noResultsSuggestion: string
  tryAgain: string
  loadingMore: string
}

const defaultLabels: SearchResultsLabels = {
  resultsFor: (count, query) =>
    `${count} résultat${count > 1 ? "s" : ""} pour "${query}"`,
  noResults: "Aucun résultat pour",
  noResultsSuggestion:
    "Essayez une autre recherche ou explorez les catégories ci-dessous",
  tryAgain: "Effacer la recherche",
  loadingMore: "Chargement...",
}

/**
 * Active filter chip
 */
export interface SearchFilter {
  key: string
  label: string
}

export interface SearchResultsProps {
  /** The search query */
  query: string
  /** Array of event results */
  results: EventCardEvent[]
  /** Total count of results (may be more than loaded) */
  totalCount: number
  /** Whether initial loading is in progress */
  isLoading?: boolean
  /** Whether more results are available */
  hasMore?: boolean
  /** Whether loading more is in progress */
  isLoadingMore?: boolean
  /** Active filters to display */
  activeFilters?: SearchFilter[]
  /** Called when user scrolls to bottom */
  onLoadMore?: () => void
  /** Called when user removes a filter */
  onRemoveFilter?: (key: string) => void
  /** Called when user clicks an event card */
  onEventClick?: (event: EventCardEvent) => void
  /** Called when user toggles watchlist */
  onWatchlist?: (eventId: string | number) => void
  /** Called when user wants to clear search */
  onClear?: () => void
  /** Set of watchlisted event IDs */
  watchlistedIds?: Set<string | number>
  /** Localized labels */
  labels?: SearchResultsLabels
  /** Additional class names */
  className?: string
}

/**
 * SearchResults - Display search results with infinite scroll
 *
 * Features:
 * - Result count header
 * - Active filter chips with remove capability
 * - List of EventCard components
 * - Empty state for no results
 * - Loading skeleton for initial load
 * - Infinite scroll with intersection observer
 * - RTL support
 *
 * @example
 * ```tsx
 * <SearchResults
 *   query="Cinema"
 *   results={events}
 *   totalCount={42}
 *   hasMore={true}
 *   onLoadMore={() => fetchMore()}
 *   onEventClick={(e) => router.push(`/events/${e.id}`)}
 * />
 * ```
 */
export function SearchResults({
  query,
  results,
  totalCount,
  isLoading = false,
  hasMore = false,
  isLoadingMore = false,
  activeFilters = [],
  onLoadMore,
  onRemoveFilter,
  onEventClick,
  onWatchlist,
  onClear,
  watchlistedIds = new Set(),
  labels = defaultLabels,
  className,
}: SearchResultsProps) {
  const loadMoreRef = React.useRef<HTMLDivElement>(null)

  // Intersection observer for infinite scroll
  React.useEffect(() => {
    if (!hasMore || isLoadingMore || !onLoadMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry.isIntersecting) {
          onLoadMore()
        }
      },
      {
        rootMargin: "100px", // Start loading before reaching the bottom
        threshold: 0,
      }
    )

    const currentRef = loadMoreRef.current
    if (currentRef) {
      observer.observe(currentRef)
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef)
      }
    }
  }, [hasMore, isLoadingMore, onLoadMore])

  // Show loading skeleton for initial load
  if (isLoading) {
    return <SearchResultsSkeleton count={3} className={className} />
  }

  // Show empty state if no results
  if (results.length === 0) {
    return (
      <SearchResultsEmpty
        query={query}
        onClear={onClear}
        labels={{
          noResults: labels.noResults,
          noResultsSuggestion: labels.noResultsSuggestion,
          tryAgain: labels.tryAgain,
        }}
        className={className}
      />
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with result count */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-foreground text-lg font-medium">
          {labels.resultsFor(totalCount, query)}
        </h2>
      </div>

      {/* Active filter chips */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map((filter) => (
            <Badge
              key={filter.key}
              variant="secondary"
              className="flex items-center gap-1 pe-1"
            >
              {filter.label}
              {onRemoveFilter && (
                <button
                  type="button"
                  onClick={() => onRemoveFilter(filter.key)}
                  aria-label={`Remove ${filter.label} filter`}
                  className="hover:bg-secondary-foreground/10 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Results list */}
      <div className="space-y-3">
        {results.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            variant="default"
            isWatchlisted={watchlistedIds.has(event.id)}
            onClick={onEventClick ? () => onEventClick(event) : undefined}
            onWatchlist={onWatchlist ? () => onWatchlist(event.id) : undefined}
          />
        ))}
      </div>

      {/* Load more sentinel / Loading indicator */}
      {hasMore && (
        <div
          ref={loadMoreRef}
          className="flex items-center justify-center py-4"
        >
          {isLoadingMore && (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              {labels.loadingMore}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

SearchResults.displayName = "SearchResults"

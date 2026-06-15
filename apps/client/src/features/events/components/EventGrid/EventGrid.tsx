"use client"

import * as React from "react"
import Link from "next/link"
import { useLocale } from "next-intl"

import type { EventCardEvent, EventCardVariant } from "../../types/event.types"

import { cn } from "@/lib/utils"

import { EventCard } from "../EventCard"
import { EventCardSkeleton } from "../EventCard/EventCardSkeleton"

export interface EventGridLabels {
  seeAll: string
  noEvents: string
}

const defaultLabels: EventGridLabels = {
  seeAll: "Voir tout",
  noEvents: "Aucun événement disponible",
}

export interface EventGridProps {
  /** Section title */
  title?: string
  /** Events to display */
  events: EventCardEvent[]
  /** Card variant */
  variant?: EventCardVariant
  /** Whether the section is loading */
  isLoading?: boolean
  /** Number of skeleton cards to show while loading */
  skeletonCount?: number
  /** URL to "see all" page */
  seeAllHref?: string
  /** Callback when event card is clicked */
  onEventClick?: (eventId: string | number) => void
  /** Callback when watchlist button is clicked */
  onWatchlist?: (eventId: string | number) => void
  /** Set of watchlisted event IDs */
  watchlistedIds?: Set<string | number>
  /** Number of columns on desktop (2, 3, or 4) */
  columns?: 2 | 3 | 4
  /** Maximum number of items to show (for "show more" pattern) */
  maxItems?: number
  /** Additional class names */
  className?: string
  /** Localized labels */
  labels?: EventGridLabels
}

/**
 * EventGrid - Grid-based event card layout for desktop
 *
 * Alternative to EventSection's horizontal scroll pattern.
 * Shows events in a responsive grid (1 col mobile, 2 tablet, 3-4 desktop).
 *
 * Features:
 * - Optional section title with "See all" link
 * - Responsive grid columns
 * - Loading skeleton state
 * - Empty state message
 * - Max items limit with overflow hidden
 *
 * @example
 * ```tsx
 * <EventGrid
 *   title="À l'affiche"
 *   events={featuredEvents}
 *   columns={4}
 *   maxItems={8}
 *   seeAllHref="/events?featured=true"
 *   onEventClick={(id) => router.push(`/events/${id}`)}
 * />
 * ```
 */
export function EventGrid({
  title,
  events,
  variant = "default",
  isLoading = false,
  skeletonCount = 8,
  seeAllHref,
  onEventClick,
  onWatchlist,
  watchlistedIds = new Set(),
  columns = 4,
  maxItems,
  className,
  labels = defaultLabels,
}: EventGridProps) {
  const locale = useLocale()

  // Determine grid columns class
  const gridColsClass = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  }[columns]

  // Limit displayed events if maxItems is set
  const displayedEvents = maxItems ? events.slice(0, maxItems) : events

  return (
    <section className={cn("py-6", className)}>
      {/* Header */}
      {title && (
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-foreground text-xl font-semibold lg:text-2xl">
            {title}
          </h2>
          {seeAllHref && (
            <Link
              href={seeAllHref}
              className="text-primary text-sm font-medium hover:underline"
            >
              {labels.seeAll}
            </Link>
          )}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        // Loading skeletons in grid
        <div className={cn("grid gap-4 lg:gap-6", gridColsClass)}>
          {Array.from({ length: skeletonCount }).map((_, index) => (
            <EventCardSkeleton key={index} variant={variant} />
          ))}
        </div>
      ) : displayedEvents.length === 0 ? (
        // Empty state
        <div className="text-muted-foreground flex items-center justify-center py-12 text-sm">
          {labels.noEvents}
        </div>
      ) : (
        // Event cards in grid
        <div className={cn("grid gap-4 lg:gap-6", gridColsClass)}>
          {displayedEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              variant={variant}
              isWatchlisted={watchlistedIds.has(event.id)}
              onClick={() => onEventClick?.(event.id)}
              onWatchlist={() => onWatchlist?.(event.id)}
            />
          ))}
        </div>
      )}
    </section>
  )
}

EventGrid.displayName = "EventGrid"

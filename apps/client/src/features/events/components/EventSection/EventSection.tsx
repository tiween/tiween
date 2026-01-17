"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useLocale } from "next-intl"

import type { EventCardEvent, EventCardVariant } from "../../types/event.types"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

import { EventCard } from "../EventCard"
import { EventCardSkeleton } from "../EventCard/EventCardSkeleton"

export interface EventSectionLabels {
  seeAll: string
  noEvents: string
}

const defaultLabels: EventSectionLabels = {
  seeAll: "Voir tout",
  noEvents: "Aucun événement disponible",
}

export interface EventSectionProps {
  /** Section title */
  title: string
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
  /** Additional class names */
  className?: string
  /** Localized labels */
  labels?: EventSectionLabels
}

/**
 * EventSection - Horizontal scrollable section of event cards
 *
 * Features:
 * - Section title with optional "See all" link
 * - Horizontal scrolling event cards
 * - Loading skeleton state
 * - Empty state message
 * - RTL support
 *
 * @example
 * ```tsx
 * <EventSection
 *   title="À l'affiche"
 *   events={featuredEvents}
 *   variant="featured"
 *   seeAllHref="/events?featured=true"
 *   onEventClick={(id) => router.push(`/events/${id}`)}
 * />
 * ```
 */
export function EventSection({
  title,
  events,
  variant = "default",
  isLoading = false,
  skeletonCount = 4,
  seeAllHref,
  onEventClick,
  onWatchlist,
  watchlistedIds = new Set(),
  className,
  labels = defaultLabels,
}: EventSectionProps) {
  const locale = useLocale()
  const isRTL = locale === "ar"
  const scrollContainerRef = React.useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = React.useState(false)
  const [canScrollRight, setCanScrollRight] = React.useState(true)

  // Update scroll indicators
  const updateScrollState = React.useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const { scrollLeft, scrollWidth, clientWidth } = container
    const scrollStart = Math.abs(scrollLeft)
    const maxScroll = scrollWidth - clientWidth

    if (isRTL) {
      setCanScrollRight(scrollStart > 10)
      setCanScrollLeft(scrollStart < maxScroll - 10)
    } else {
      setCanScrollLeft(scrollStart > 10)
      setCanScrollRight(scrollStart < maxScroll - 10)
    }
  }, [isRTL])

  React.useEffect(() => {
    updateScrollState()
    const container = scrollContainerRef.current
    if (container) {
      container.addEventListener("scroll", updateScrollState)
      window.addEventListener("resize", updateScrollState)
      return () => {
        container.removeEventListener("scroll", updateScrollState)
        window.removeEventListener("resize", updateScrollState)
      }
    }
  }, [updateScrollState, events])

  // Scroll by one card width
  const scroll = (direction: "left" | "right") => {
    const container = scrollContainerRef.current
    if (!container) return

    const cardWidth = container.querySelector("article")?.offsetWidth || 280
    const scrollAmount = direction === "left" ? -cardWidth : cardWidth
    const finalAmount = isRTL ? -scrollAmount : scrollAmount

    container.scrollBy({ left: finalAmount, behavior: "smooth" })
  }

  // Card width based on variant
  const cardWidthClass = {
    default: "w-[280px]",
    compact: "w-[200px]",
    featured: "w-[320px]",
  }[variant]

  const showNavigation = !isLoading && events.length > 2

  return (
    <section className={cn("py-4", className)}>
      {/* Header */}
      <div className="mb-3 flex items-center justify-between px-4">
        <h2 className="text-foreground text-lg font-semibold">{title}</h2>
        {seeAllHref && (
          <Link
            href={seeAllHref}
            className="text-primary text-sm font-medium hover:underline"
          >
            {labels.seeAll}
          </Link>
        )}
      </div>

      {/* Content */}
      <div className="relative">
        {/* Scroll buttons - desktop only */}
        {showNavigation && canScrollLeft && (
          <Button
            variant="secondary"
            size="icon"
            onClick={() => scroll("left")}
            className="absolute start-2 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 rounded-full shadow-lg md:flex"
            aria-label={isRTL ? "التالي" : "Précédent"}
          >
            {isRTL ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </Button>
        )}

        {showNavigation && canScrollRight && (
          <Button
            variant="secondary"
            size="icon"
            onClick={() => scroll("right")}
            className="absolute end-2 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 rounded-full shadow-lg md:flex"
            aria-label={isRTL ? "السابق" : "Suivant"}
          >
            {isRTL ? (
              <ChevronLeft className="h-5 w-5" />
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
          </Button>
        )}

        {/* Scrollable container */}
        <div
          ref={scrollContainerRef}
          className="no-scrollbar flex gap-3 overflow-x-auto scroll-smooth px-4"
        >
          {isLoading ? (
            // Loading skeletons
            Array.from({ length: skeletonCount }).map((_, index) => (
              <div key={index} className={cn("shrink-0", cardWidthClass)}>
                <EventCardSkeleton variant={variant} />
              </div>
            ))
          ) : events.length === 0 ? (
            // Empty state
            <div className="text-muted-foreground flex w-full items-center justify-center py-8 text-sm">
              {labels.noEvents}
            </div>
          ) : (
            // Event cards
            events.map((event) => (
              <div key={event.id} className={cn("shrink-0", cardWidthClass)}>
                <EventCard
                  event={event}
                  variant={variant}
                  isWatchlisted={watchlistedIds.has(event.id)}
                  onClick={() => onEventClick?.(event.id)}
                  onWatchlist={() => onWatchlist?.(event.id)}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  )
}

EventSection.displayName = "EventSection"

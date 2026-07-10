"use client"

import * as React from "react"
import Image from "next/image"
import { Heart } from "lucide-react"

import type { EventCardEvent, EventCardVariant } from "../../types/event.types"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import { EventCardSkeleton } from "./EventCardSkeleton"

// Placeholder blur data URL for images
const BLUR_DATA_URL =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMCwsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAAIAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAYH/8QAIhAAAgEEAgIDAQAAAAAAAAAAAQIDAAQFESEGEhMxQVFh/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAZEQADAQEBAAAAAAAAAAAAAAABAgMAEUH/2gAMAwEAAhEDEEA/ANM4/wAix+TwGNvIZ4Xknt0kkiWVWeNmUEqw+iCexrxSlOhIqnAiYp//2Q=="

export interface EventCardLabels {
  addToWatchlist: string
  removeFromWatchlist: string
  priceFrom: (price: string) => string
  /** Tooltip shown when the watchlist control is disabled (e.g. offline). */
  watchlistDisabledHint?: string
}

const defaultLabels: EventCardLabels = {
  addToWatchlist: "Ajouter à la liste de suivi",
  removeFromWatchlist: "Retirer de la liste de suivi",
  priceFrom: (price) => `À partir de ${price}`,
}

export interface EventCardProps {
  /** Event data to display */
  event: EventCardEvent
  /** Visual variant of the card */
  variant?: EventCardVariant
  /** Whether the event is in the user's watchlist */
  isWatchlisted?: boolean
  /** Whether to show loading skeleton */
  isLoading?: boolean
  /** Called when watchlist button is clicked */
  onWatchlist?: () => void
  /** Whether the watchlist control is disabled (e.g. read-only while offline) */
  watchlistDisabled?: boolean
  /** Called when the card is clicked */
  onClick?: () => void
  /** Additional class names */
  className?: string
  /** Localized labels */
  labels?: EventCardLabels
}

// Variant-specific configurations
const variantConfig = {
  default: {
    imageHeight: "h-40", // 160px
    titleSize: "text-lg",
    showPrice: true,
    showDate: true,
  },
  compact: {
    imageHeight: "h-[100px]",
    titleSize: "text-base",
    showPrice: false,
    showDate: true,
  },
  featured: {
    imageHeight: "h-[200px]",
    titleSize: "text-xl",
    showPrice: true,
    showDate: true,
  },
} as const

// Category badge variant mapping
const categoryVariants: Record<string, "default" | "secondary" | "outline"> = {
  Cinéma: "default",
  Cinema: "default",
  Théâtre: "secondary",
  Theatre: "secondary",
  "Courts-métrages": "outline",
  Musique: "secondary",
  Music: "secondary",
  Expositions: "secondary",
  Exhibitions: "secondary",
}

function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date
  // Guard against a missing/unparseable date ("" from the curated mapper when an
  // event has no start instant) — render nothing rather than "Invalid Date".
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleDateString("fr-TN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function formatPrice(price: number, currency = "TND"): string {
  return new Intl.NumberFormat("fr-TN", {
    style: "currency",
    currency,
  }).format(price)
}

export function EventCard({
  event,
  variant = "default",
  isWatchlisted = false,
  isLoading = false,
  onWatchlist,
  watchlistDisabled = false,
  onClick,
  className,
  labels = defaultLabels,
}: EventCardProps) {
  const config = variantConfig[variant]
  const badgeVariant = categoryVariants[event.category] || "secondary"

  // Handle watchlist click without triggering card click
  const handleWatchlistClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    // Read-only affordance (e.g. offline): a tap does nothing.
    if (watchlistDisabled) return
    onWatchlist?.()
  }

  if (isLoading) {
    return <EventCardSkeleton variant={variant} className={className} />
  }

  const disabledHint = labels.watchlistDisabledHint

  const watchlistButton = (
    <button
      type="button"
      onClick={handleWatchlistClick}
      // Use `aria-disabled` (not the native `disabled` attribute) so the control
      // stays focusable/hoverable — a natively-disabled button suppresses the
      // hover/focus the Radix tooltip needs and drops out of the tab order. The
      // click handler no-ops the action instead. `title` is a native fallback.
      aria-disabled={watchlistDisabled}
      title={watchlistDisabled ? disabledHint : undefined}
      aria-label={
        isWatchlisted ? labels.removeFromWatchlist : labels.addToWatchlist
      }
      aria-pressed={isWatchlisted}
      className={cn(
        // Position - RTL aware using logical properties
        "absolute end-2 top-2",
        // Size - minimum 44x44px touch target
        "flex h-11 w-11 items-center justify-center",
        // Background
        "rounded-full bg-black/50 backdrop-blur-sm",
        // Transition for smooth state changes
        "transition-all duration-200",
        // Hover state
        "hover:bg-black/70",
        // Focus styles
        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
        // Active state animation
        "active:scale-95",
        // Disabled (read-only offline) affordance
        watchlistDisabled && "cursor-not-allowed opacity-50"
      )}
    >
      <Heart
        className={cn(
          "h-5 w-5 transition-all duration-200",
          isWatchlisted
            ? "fill-primary text-primary"
            : "fill-transparent text-white"
        )}
      />
    </button>
  )

  return (
    <article
      role="article"
      aria-labelledby={`event-title-${event.id}`}
      onClick={onClick}
      className={cn(
        // Base card styles
        "bg-card text-card-foreground relative overflow-hidden rounded-xl border",
        // Hover state with elevation and scale (desktop only)
        "transition-all duration-200",
        "hover:shadow-lg lg:hover:scale-[1.02] lg:hover:shadow-xl",
        // Cursor pointer if clickable
        onClick && "cursor-pointer",
        // Focus styles for keyboard navigation
        "focus-within:ring-ring focus-within:ring-2 focus-within:ring-offset-2",
        className
      )}
    >
      {/* Image Container */}
      <div className={cn("relative w-full", config.imageHeight)}>
        <Image
          src={event.posterUrl || "/images/placeholder-poster.jpg"}
          alt={event.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover"
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
        />

        {/* Category Badge - positioned top-left */}
        <div className="absolute start-2 top-2">
          <Badge variant={badgeVariant}>{event.category}</Badge>
        </div>

        {/* Watchlist Button - positioned top-right */}
        {watchlistDisabled && disabledHint ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>{watchlistButton}</TooltipTrigger>
              <TooltipContent>{disabledHint}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          watchlistButton
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        {/* Title */}
        <h3
          id={`event-title-${event.id}`}
          className={cn(
            "font-semibold",
            config.titleSize,
            // Truncate long titles to 2 lines
            "line-clamp-2"
          )}
        >
          {event.title}
        </h3>

        {/* Venue and Date */}
        <div className="text-muted-foreground mt-1 text-sm">
          <span>{event.venueName}</span>
          {config.showDate && formatDate(event.date) && (
            <>
              <span className="mx-1">•</span>
              <span>{formatDate(event.date)}</span>
            </>
          )}
        </div>

        {/* Price */}
        {config.showPrice && event.price !== undefined && (
          <p className="text-primary mt-2 text-sm font-medium">
            {labels.priceFrom(formatPrice(event.price, event.currency))}
          </p>
        )}
      </div>
    </article>
  )
}

EventCard.displayName = "EventCard"

"use client"

import * as React from "react"
import Image from "next/image"
import { Heart } from "lucide-react"

import type { EventCardEvent, EventCardVariant } from "../../types/event.types"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

import { EventCardSkeleton } from "./EventCardSkeleton"

// Placeholder blur data URL for images
const BLUR_DATA_URL =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMCwsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAAIAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAYH/8QAIhAAAgEEAgIDAQAAAAAAAAAAAQIDAAQFESEGEhMxQVFh/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAZEQADAQEBAAAAAAAAAAAAAAABAgMAEUH/2gAMAwEAAhEDEEA/ANM4/wAix+TwGNvIZ4Xknt0kkiWVWeNmUEqw+iCexrxSlOhIqnAiYp//2Q=="

export interface EventCardLabels {
  addToWatchlist: string
  removeFromWatchlist: string
  priceFrom: (price: string) => string
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
  onClick,
  className,
  labels = defaultLabels,
}: EventCardProps) {
  const config = variantConfig[variant]
  const badgeVariant = categoryVariants[event.category] || "secondary"

  // Handle watchlist click without triggering card click
  const handleWatchlistClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onWatchlist?.()
  }

  if (isLoading) {
    return <EventCardSkeleton variant={variant} className={className} />
  }

  return (
    <article
      role="article"
      aria-labelledby={`event-title-${event.id}`}
      onClick={onClick}
      className={cn(
        // Base card styles
        "bg-card text-card-foreground relative overflow-hidden rounded-xl border",
        // Hover state with elevation
        "transition-shadow duration-200 hover:shadow-lg",
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
        <button
          type="button"
          onClick={handleWatchlistClick}
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
            "active:scale-95"
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
          {config.showDate && (
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

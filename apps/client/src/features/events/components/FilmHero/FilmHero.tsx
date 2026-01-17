"use client"

import * as React from "react"
import Image from "next/image"
import { Calendar, Clock, Heart, Share2, Star } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

// Placeholder blur data URL for images
const BLUR_DATA_URL =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMCwsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAAIAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAYH/8QAIhAAAgEEAgIDAQAAAAAAAAAAAQIDAAQFESEGEhMxQVFh/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAZEQADAQEBAAAAAAAAAAAAAAABAgMAEUH/2gAMAwEAAhEDEQA/ANM4/wAix+TwGNvIZ4Xknt0kkiWVWeNmUEqw+iCexrxSlOhIqnAiYp//2Q=="

/**
 * Event data for FilmHero display
 */
export interface FilmHeroEvent {
  id: string | number
  title: string
  backdropUrl?: string
  category: string
  genres?: string[]
  rating?: number
  duration?: number // in minutes
  year?: number
  venueCount?: number
}

/**
 * Localized labels for FilmHero
 */
export interface FilmHeroLabels {
  addToWatchlist: string
  removeFromWatchlist: string
  share: string
  inVenues: (count: number) => string
  minutes: string
}

const defaultLabels: FilmHeroLabels = {
  addToWatchlist: "Ajouter à la liste de suivi",
  removeFromWatchlist: "Retirer de la liste de suivi",
  share: "Partager",
  inVenues: (count) => `Dans ${count} salle${count > 1 ? "s" : ""}`,
  minutes: "min",
}

export interface FilmHeroProps {
  /** Event data to display */
  event: FilmHeroEvent
  /** Whether the event is in the user's watchlist */
  isWatchlisted?: boolean
  /** Called when watchlist button is clicked */
  onWatchlist?: () => void
  /** Called when share button is clicked */
  onShare?: () => void
  /** Additional class names */
  className?: string
  /** Localized labels */
  labels?: FilmHeroLabels
}

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

/**
 * FilmHero - Full-bleed hero component for event detail pages
 *
 * Displays event information with visual impact including:
 * - Full-bleed backdrop image with gradient overlay
 * - Title, category, genres, rating, duration, year
 * - Venue count and action buttons
 *
 * @example
 * ```tsx
 * <FilmHero
 *   event={{
 *     id: "1",
 *     title: "Inception",
 *     backdropUrl: "/images/inception.jpg",
 *     category: "Cinéma",
 *     genres: ["Sci-Fi", "Action"],
 *     rating: 8.8,
 *     duration: 148,
 *     year: 2010,
 *     venueCount: 5,
 *   }}
 *   isWatchlisted={false}
 *   onWatchlist={() => console.log("Watchlist toggled")}
 *   onShare={() => console.log("Share clicked")}
 * />
 * ```
 */
export function FilmHero({
  event,
  isWatchlisted = false,
  onWatchlist,
  onShare,
  className,
  labels = defaultLabels,
}: FilmHeroProps) {
  const badgeVariant = categoryVariants[event.category] || "secondary"

  // Handle button clicks without bubbling
  const handleWatchlistClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onWatchlist?.()
  }

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onShare?.()
  }

  return (
    <section
      aria-labelledby={`film-hero-title-${event.id}`}
      className={cn(
        // Responsive height: 300px mobile, 350px tablet, 400px desktop
        "relative h-[300px] w-full md:h-[350px] lg:h-[400px]",
        // Desktop: 60% width with sidebar space
        "lg:w-[60%]",
        // Overflow hidden for image
        "overflow-hidden",
        className
      )}
    >
      {/* Backdrop Image */}
      <div className="absolute inset-0">
        <Image
          src={event.backdropUrl || "/images/placeholder-backdrop.jpg"}
          alt=""
          fill
          sizes="(max-width: 1024px) 100vw, 60vw"
          className="object-cover"
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
          priority
        />
      </div>

      {/* Gradient Overlay - ensures text readability */}
      <div
        className={cn(
          "absolute inset-0",
          "from-background via-background/80 bg-gradient-to-t to-transparent"
        )}
        aria-hidden="true"
      />

      {/* Action Buttons - Top Right */}
      <div className="absolute end-4 top-4 flex gap-2">
        {/* Share Button */}
        <button
          type="button"
          onClick={handleShareClick}
          aria-label={labels.share}
          className={cn(
            // Size - minimum 44x44px touch target
            "flex h-11 w-11 items-center justify-center",
            // Background
            "rounded-full bg-black/50 backdrop-blur-sm",
            // Transition
            "transition-all duration-200",
            // Hover state
            "hover:bg-black/70",
            // Focus styles
            "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
            // Active state
            "active:scale-95"
          )}
        >
          <Share2 className="h-5 w-5 text-white" />
        </button>

        {/* Watchlist Button */}
        <button
          type="button"
          onClick={handleWatchlistClick}
          aria-label={
            isWatchlisted ? labels.removeFromWatchlist : labels.addToWatchlist
          }
          aria-pressed={isWatchlisted}
          className={cn(
            // Size - minimum 44x44px touch target
            "flex h-11 w-11 items-center justify-center",
            // Background
            "rounded-full bg-black/50 backdrop-blur-sm",
            // Transition
            "transition-all duration-200",
            // Hover state
            "hover:bg-black/70",
            // Focus styles
            "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
            // Active state
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

      {/* Content - Bottom */}
      <div className="absolute inset-x-0 bottom-0 p-4 md:p-6">
        {/* Badges Row */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {/* Category Badge */}
          <Badge variant={badgeVariant}>{event.category}</Badge>

          {/* Genre Badges */}
          {event.genres?.map((genre) => (
            <Badge key={genre} variant="outline">
              {genre}
            </Badge>
          ))}
        </div>

        {/* Title - Display font (Lalezar) */}
        <h1
          id={`film-hero-title-${event.id}`}
          className={cn(
            "font-display text-foreground",
            // Responsive font size
            "text-2xl md:text-3xl lg:text-4xl",
            // Line clamp for very long titles
            "line-clamp-2",
            "mb-3"
          )}
        >
          {event.title}
        </h1>

        {/* Metadata Row */}
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          {/* Rating */}
          {event.rating !== undefined && (
            <div className="flex items-center gap-1">
              <Star className="text-primary h-4 w-4 fill-current" />
              <span className="font-medium">{event.rating.toFixed(1)}</span>
            </div>
          )}

          {/* Duration */}
          {event.duration !== undefined && (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>
                {event.duration} {labels.minutes}
              </span>
            </div>
          )}

          {/* Year */}
          {event.year !== undefined && (
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{event.year}</span>
            </div>
          )}

          {/* Venue Count */}
          {event.venueCount !== undefined && event.venueCount > 0 && (
            <span className="text-primary font-medium">
              {labels.inVenues(event.venueCount)}
            </span>
          )}
        </div>
      </div>
    </section>
  )
}

FilmHero.displayName = "FilmHero"

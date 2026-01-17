"use client"

import * as React from "react"
import Image from "next/image"
import { Calendar, MapPin } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

// Placeholder blur data URL for images
const BLUR_DATA_URL =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMCwsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAAIAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAYH/8QAIhAAAgEEAgIDAQAAAAAAAAAAAQIDAAQFESEGEhMxQVFh/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAZEQADAQEBAAAAAAAAAAAAAAABAgMAEUH/2gAMAwEAAhEDEEA/ANM4/wAix+TwGNvIZ4Xknt0kkiWVWeNmUEqw+iCexrxSlOhIqnAiYp//2Q=="

/**
 * Venue data for VenueCard display
 */
export interface VenueCardVenue {
  id: string | number
  name: string
  imageUrl?: string
  address: string
  city?: string
  eventCount?: number
  distance?: number // in km
}

/**
 * Localized labels for VenueCard
 */
export interface VenueCardLabels {
  eventsThisWeek: (count: number) => string
  noEvents: string
  distanceAway: (km: number) => string
}

const defaultLabels: VenueCardLabels = {
  eventsThisWeek: (count) =>
    `${count} événement${count > 1 ? "s" : ""} cette semaine`,
  noEvents: "Aucun événement",
  distanceAway: (km) => `${km.toFixed(1)} km`,
}

export interface VenueCardProps {
  /** Venue data to display */
  venue: VenueCardVenue
  /** Called when the card is clicked */
  onClick?: () => void
  /** Additional class names */
  className?: string
  /** Localized labels */
  labels?: VenueCardLabels
}

/**
 * VenueCard - Displays venue information in a card format
 *
 * Features:
 * - Venue image with fallback placeholder
 * - Name and location display
 * - Event count badge
 * - Optional distance indicator
 * - Touch-friendly with hover states
 *
 * @example
 * ```tsx
 * <VenueCard
 *   venue={{
 *     id: "1",
 *     name: "Cinéma Le Palace",
 *     address: "Avenue Habib Bourguiba",
 *     city: "Tunis",
 *     imageUrl: "/images/palace.jpg",
 *     eventCount: 5,
 *     distance: 2.3,
 *   }}
 *   onClick={() => router.push(`/venues/${venue.id}`)}
 * />
 * ```
 */
export function VenueCard({
  venue,
  onClick,
  className,
  labels = defaultLabels,
}: VenueCardProps) {
  const hasEvents = venue.eventCount !== undefined && venue.eventCount > 0

  return (
    <article
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault()
          onClick()
        }
      }}
      className={cn(
        // Base card styles
        "bg-card text-card-foreground overflow-hidden rounded-lg",
        // Border
        "border-border border",
        // Flex layout
        "flex gap-3 p-3",
        // Interactive styles when clickable
        onClick && [
          "cursor-pointer",
          "transition-all duration-200",
          "hover:border-primary/50 hover:shadow-md",
          "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
          "active:scale-[0.99]",
        ],
        className
      )}
    >
      {/* Venue Image */}
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md">
        <Image
          src={venue.imageUrl || "/images/placeholder-venue.jpg"}
          alt={venue.name}
          fill
          sizes="80px"
          className="object-cover"
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
        />
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        {/* Top: Name and Event Count */}
        <div>
          {/* Venue Name */}
          <h3 className="text-foreground line-clamp-1 font-medium">
            {venue.name}
          </h3>

          {/* Location */}
          <div className="text-muted-foreground mt-1 flex items-center gap-1 text-sm">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="line-clamp-1">
              {venue.address}
              {venue.city && `, ${venue.city}`}
            </span>
          </div>
        </div>

        {/* Bottom: Event Count and Distance */}
        <div className="mt-2 flex items-center justify-between gap-2">
          {/* Event Count Badge */}
          <Badge
            variant={hasEvents ? "secondary" : "outline"}
            className="shrink-0"
          >
            <Calendar className="me-1 h-3 w-3" />
            {hasEvents
              ? labels.eventsThisWeek(venue.eventCount!)
              : labels.noEvents}
          </Badge>

          {/* Distance (if available) */}
          {venue.distance !== undefined && (
            <span className="text-muted-foreground shrink-0 text-xs">
              {labels.distanceAway(venue.distance)}
            </span>
          )}
        </div>
      </div>
    </article>
  )
}

VenueCard.displayName = "VenueCard"

"use client"

import * as React from "react"
import { MapPin, MoreVertical } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export type ShowtimeFormat = "VOST" | "VF" | "VO" | "3D" | "IMAX" | "4DX"

export interface ShowtimeSlot {
  id: string | number
  startTime: string // e.g., "15h00"
  endTime?: string // e.g., "16h15"
  formats: ShowtimeFormat[]
  price?: number
  isAvailable?: boolean
  isSelected?: boolean
}

export interface VenueShowtimeCardProps {
  venueName: string
  venueAddress: string
  showtimes: ShowtimeSlot[]
  selectedShowtimeId?: string | number | null
  onShowtimeSelect: (showtimeId: string | number) => void
  onMoreOptions?: () => void
  className?: string
}

/**
 * Format badge variant mapping
 */
const formatStyles: Record<ShowtimeFormat, { bg: string; text: string }> = {
  VOST: { bg: "bg-teal-800/60", text: "text-teal-200" },
  VF: { bg: "bg-teal-800/60", text: "text-teal-200" },
  VO: { bg: "bg-teal-800/60", text: "text-teal-200" },
  "3D": { bg: "bg-amber-600/80", text: "text-amber-100" },
  IMAX: { bg: "bg-amber-600/80", text: "text-amber-100" },
  "4DX": { bg: "bg-amber-600/80", text: "text-amber-100" },
}

/**
 * VenueShowtimeCard - Cinema/venue card with showtime grid
 *
 * Based on Tiween ticketing desktop design:
 * - Venue name and address with location icon
 * - Grid of showtime buttons with format badges
 * - Each showtime shows start time, optional end time
 * - Format badges (VOST 3D, VF) above the time
 * - Selected state with highlight
 * - Optional "more" menu button
 */
export function VenueShowtimeCard({
  venueName,
  venueAddress,
  showtimes,
  selectedShowtimeId,
  onShowtimeSelect,
  onMoreOptions,
  className,
}: VenueShowtimeCardProps) {
  return (
    <div
      className={cn(
        "bg-secondary/50 border-border/30 rounded-xl border p-4 transition-all",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Venue Info */}
        <div className="flex items-start gap-3">
          <div className="bg-background/30 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
            <MapPin className="text-muted-foreground h-4 w-4" />
          </div>
          <div>
            <h3 className="text-foreground font-semibold">{venueName}</h3>
            <p className="text-muted-foreground text-sm">{venueAddress}</p>
          </div>
        </div>

        {/* Showtimes Grid */}
        <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
          {showtimes.map((showtime) => {
            const isSelected = selectedShowtimeId === showtime.id
            const isUnavailable = showtime.isAvailable === false

            return (
              <button
                key={showtime.id}
                onClick={() => !isUnavailable && onShowtimeSelect(showtime.id)}
                disabled={isUnavailable}
                className={cn(
                  "group relative flex min-w-[100px] flex-col rounded-lg px-3 py-2 transition-all",
                  "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
                  isSelected
                    ? "bg-primary/20 ring-primary ring-2"
                    : "bg-secondary hover:bg-accent",
                  isUnavailable && "cursor-not-allowed opacity-50"
                )}
              >
                {/* Format Badges */}
                {showtime.formats.length > 0 && (
                  <div className="mb-1 flex flex-wrap gap-1">
                    {showtime.formats.map((format) => (
                      <span
                        key={format}
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[10px] font-medium",
                          formatStyles[format].bg,
                          formatStyles[format].text
                        )}
                      >
                        {format}
                      </span>
                    ))}
                  </div>
                )}

                {/* Time */}
                <span
                  className={cn(
                    "text-lg font-bold",
                    isSelected ? "text-primary" : "text-foreground"
                  )}
                >
                  {showtime.startTime}
                </span>

                {/* End Time (optional) */}
                {showtime.endTime && (
                  <span className="text-muted-foreground text-xs">
                    fin {showtime.endTime}
                  </span>
                )}

                {/* Selection indicator */}
                {isSelected && (
                  <div
                    className="bg-primary absolute -end-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full"
                    aria-hidden="true"
                  >
                    <svg
                      className="text-primary-foreground h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                )}

                {/* Star indicator for special showtimes */}
                {showtime.formats.includes("3D") && !isSelected && (
                  <span className="text-primary absolute -end-0.5 -top-0.5 text-lg">
                    ✦
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* More Options Button */}
        {onMoreOptions && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={onMoreOptions}
            aria-label="Plus d'options"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}

VenueShowtimeCard.displayName = "VenueShowtimeCard"

"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

/**
 * Showtime format types (cinema/theater terminology)
 * - VOST: Version Originale Sous-Titrée (original with subtitles)
 * - VF: Version Française (French dubbed)
 * - VO: Version Originale (original, no subtitles)
 * - 3D/IMAX/4DX: Premium viewing formats
 */
export type ShowtimeFormat = "VOST" | "VF" | "VO" | "3D" | "IMAX" | "4DX"

/**
 * Showtime availability status
 */
export type ShowtimeStatus =
  | "available"
  | "selected"
  | "sold-out"
  | "unavailable"

/**
 * Localized labels for ShowtimeButton
 */
export interface ShowtimeButtonLabels {
  soldOut: string
  selectShowtime: string
}

const defaultLabels: ShowtimeButtonLabels = {
  soldOut: "Complet",
  selectShowtime: "Sélectionner cette séance",
}

export interface ShowtimeButtonProps {
  /** Time of the showtime (e.g., "20:30") */
  time: string
  /** Name of the venue */
  venueName: string
  /** Optional price */
  price?: number
  /** Currency symbol */
  currency?: string
  /** Format badges to display */
  formats?: ShowtimeFormat[]
  /** Current status of this showtime */
  status?: ShowtimeStatus
  /** Called when the showtime is selected */
  onSelect?: () => void
  /** Localized labels */
  labels?: ShowtimeButtonLabels
  /** Additional class names */
  className?: string
}

/**
 * State-based styling classes
 */
const stateStyles: Record<ShowtimeStatus, string> = {
  available: "bg-secondary hover:bg-accent border-transparent cursor-pointer",
  selected:
    "bg-primary/10 border-primary border-2 ring-2 ring-primary/20 cursor-pointer",
  "sold-out":
    "bg-secondary/50 border-transparent opacity-60 cursor-not-allowed",
  unavailable:
    "bg-secondary/30 border-transparent opacity-40 cursor-not-allowed",
}

/**
 * Format badge variant mapping
 */
const formatVariants: Record<
  ShowtimeFormat,
  "default" | "secondary" | "outline"
> = {
  VOST: "secondary",
  VF: "secondary",
  VO: "secondary",
  "3D": "default",
  IMAX: "default",
  "4DX": "default",
}

/**
 * ShowtimeButton - Selectable button for choosing event showtimes
 *
 * Features:
 * - Prominent time display
 * - Venue name
 * - Format badges (VOST, VF, 3D, etc.)
 * - Multiple states: available, selected, sold-out, unavailable
 * - Keyboard accessible with proper ARIA attributes
 * - RTL support
 *
 * @example
 * ```tsx
 * <ShowtimeButton
 *   time="20:30"
 *   venueName="Cinéma Le Palace"
 *   formats={["VOST", "3D"]}
 *   status="available"
 *   onSelect={() => selectShowtime(showtime.id)}
 * />
 * ```
 */
export function ShowtimeButton({
  time,
  venueName,
  price,
  currency = "TND",
  formats = [],
  status = "available",
  onSelect,
  labels = defaultLabels,
  className,
}: ShowtimeButtonProps) {
  const isDisabled = status === "sold-out" || status === "unavailable"
  const isSelected = status === "selected"

  const handleClick = () => {
    if (!isDisabled && onSelect) {
      onSelect()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isDisabled && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault()
      onSelect?.()
    }
  }

  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      aria-disabled={isDisabled}
      aria-label={`${labels.selectShowtime}: ${time} ${venueName}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={isDisabled}
      className={cn(
        // Base styles
        "relative flex w-full flex-col rounded-lg border p-3",
        // Min height for touch targets
        "min-h-[72px]",
        // Transition
        "transition-all duration-200",
        // Focus styles
        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
        // State-specific styles
        stateStyles[status],
        className
      )}
    >
      {/* Top row: Time and formats */}
      <div className="flex items-start justify-between gap-2">
        {/* Time (prominent) */}
        <span
          className={cn(
            "text-foreground text-xl font-bold",
            status === "sold-out" && "line-through"
          )}
        >
          {time}
        </span>

        {/* Format badges */}
        {formats.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {formats.map((format) => (
              <Badge
                key={format}
                variant={formatVariants[format]}
                className="text-xs"
              >
                {format}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Bottom row: Venue and price */}
      <div className="mt-1 flex items-end justify-between gap-2">
        {/* Venue name */}
        <span className="text-muted-foreground line-clamp-1 text-sm">
          {venueName}
        </span>

        {/* Price (if available and not sold out) */}
        {price !== undefined && status !== "sold-out" && (
          <span className="text-foreground shrink-0 text-sm font-medium">
            {price} {currency}
          </span>
        )}
      </div>

      {/* Sold out overlay badge */}
      {status === "sold-out" && (
        <Badge variant="destructive" className="absolute end-2 top-2 text-xs">
          {labels.soldOut}
        </Badge>
      )}

      {/* Selected indicator */}
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
    </button>
  )
}

ShowtimeButton.displayName = "ShowtimeButton"

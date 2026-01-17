"use client"

import * as React from "react"
import { useCallback, useRef, useState } from "react"

import { cn } from "@/lib/utils"

/**
 * Seat availability status
 */
export type SeatStatus = "available" | "selected" | "taken" | "wheelchair"

/**
 * Individual seat representation
 */
export interface Seat {
  /** Row letter (e.g., "A", "B", "C") */
  row: string
  /** Seat number within the row */
  number: number
  /** Current availability status */
  status: SeatStatus
}

/**
 * Venue seating layout configuration
 */
export interface SeatLayout {
  /** Row identifiers in display order */
  rows: string[]
  /** Number of seats per row (for regular grid) */
  seatsPerRow: number
  /** All seats with their statuses */
  seats: Seat[]
  /** Label for the screen/stage indicator */
  screenLabel?: string
}

/**
 * Localized labels for SeatSelector
 */
export interface SeatSelectorLabels {
  screen: string
  available: string
  selected: string
  taken: string
  wheelchair: string
  seatLabel: string // For aria-label: "Row {row} Seat {number}"
}

const defaultLabels: SeatSelectorLabels = {
  screen: "Écran",
  available: "Disponible",
  selected: "Sélectionné",
  taken: "Occupé",
  wheelchair: "Accessible PMR",
  seatLabel: "Rangée {row} Place {number}",
}

export interface SeatSelectorProps {
  /** Venue seating layout */
  layout: SeatLayout
  /** Currently selected seats (controlled) */
  selectedSeats?: Seat[]
  /** Maximum number of seats user can select */
  maxSeats?: number
  /** Callback when selection changes */
  onSelect: (seats: Seat[]) => void
  /** Localized labels */
  labels?: SeatSelectorLabels
  /** Additional class names */
  className?: string
}

/**
 * Get styling for a seat based on its status
 */
function getSeatStyles(status: SeatStatus, isSelected: boolean): string {
  if (isSelected) {
    return "bg-primary border-primary text-primary-foreground"
  }

  switch (status) {
    case "available":
      return "border-2 border-muted-foreground hover:border-primary hover:bg-accent cursor-pointer"
    case "taken":
      return "bg-muted border-muted cursor-not-allowed"
    case "wheelchair":
      return "border-2 border-blue-500 hover:border-blue-400 hover:bg-blue-500/10 cursor-pointer rotate-45"
    default:
      return "border-2 border-muted-foreground"
  }
}

/**
 * Generate aria-label for a seat
 */
function getSeatAriaLabel(
  seat: Seat,
  isSelected: boolean,
  labels: SeatSelectorLabels
): string {
  const baseLabel = labels.seatLabel
    .replace("{row}", seat.row)
    .replace("{number}", seat.number.toString())

  const statusLabel = isSelected
    ? labels.selected
    : seat.status === "taken"
      ? labels.taken
      : seat.status === "wheelchair"
        ? labels.wheelchair
        : labels.available

  return `${baseLabel} - ${statusLabel}`
}

/**
 * SeatSelector - Interactive seating chart for reserved seating
 *
 * Features:
 * - Visual grid layout with screen indicator
 * - Multiple seat states: available, selected, taken, wheelchair
 * - Keyboard navigation (arrow keys, Enter/Space to select)
 * - Maximum selection limit
 * - Full RTL support (labels flip, numbers reverse)
 * - Accessible with ARIA labels
 *
 * @example
 * ```tsx
 * <SeatSelector
 *   layout={{
 *     rows: ["A", "B", "C", "D"],
 *     seatsPerRow: 8,
 *     seats: generateSeats(),
 *     screenLabel: "Écran",
 *   }}
 *   selectedSeats={selectedSeats}
 *   maxSeats={4}
 *   onSelect={setSelectedSeats}
 * />
 * ```
 */
export function SeatSelector({
  layout,
  selectedSeats = [],
  maxSeats = 10,
  onSelect,
  labels = defaultLabels,
  className,
}: SeatSelectorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [focusedSeat, setFocusedSeat] = useState<string | null>(null)

  // Helper to get seat by position
  const getSeat = useCallback(
    (row: string, number: number): Seat | undefined => {
      return layout.seats.find((s) => s.row === row && s.number === number)
    },
    [layout.seats]
  )

  // Check if a seat is currently selected
  const isSeatSelected = useCallback(
    (seat: Seat): boolean => {
      return selectedSeats.some(
        (s) => s.row === seat.row && s.number === seat.number
      )
    },
    [selectedSeats]
  )

  // Handle seat selection toggle
  const toggleSeat = useCallback(
    (seat: Seat) => {
      // Can't select taken seats
      if (seat.status === "taken") return

      const isCurrentlySelected = isSeatSelected(seat)

      if (isCurrentlySelected) {
        // Deselect
        onSelect(
          selectedSeats.filter(
            (s) => !(s.row === seat.row && s.number === seat.number)
          )
        )
      } else {
        // Check max limit
        if (selectedSeats.length >= maxSeats) return
        // Select
        onSelect([...selectedSeats, seat])
      }
    },
    [selectedSeats, maxSeats, onSelect, isSeatSelected]
  )

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, seat: Seat) => {
      const rowIndex = layout.rows.indexOf(seat.row)
      let newRow = seat.row
      let newNumber = seat.number

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault()
          if (rowIndex > 0) {
            newRow = layout.rows[rowIndex - 1]
          }
          break
        case "ArrowDown":
          e.preventDefault()
          if (rowIndex < layout.rows.length - 1) {
            newRow = layout.rows[rowIndex + 1]
          }
          break
        case "ArrowLeft":
          e.preventDefault()
          if (seat.number > 1) {
            newNumber = seat.number - 1
          }
          break
        case "ArrowRight":
          e.preventDefault()
          if (seat.number < layout.seatsPerRow) {
            newNumber = seat.number + 1
          }
          break
        case "Enter":
        case " ":
          e.preventDefault()
          toggleSeat(seat)
          return
        default:
          return
      }

      // Find and focus the new seat
      const newSeat = getSeat(newRow, newNumber)
      if (newSeat) {
        const seatId = `seat-${newRow}-${newNumber}`
        setFocusedSeat(seatId)
        const seatElement = containerRef.current?.querySelector(
          `[data-seat-id="${seatId}"]`
        ) as HTMLButtonElement
        seatElement?.focus()
      }
    },
    [layout.rows, layout.seatsPerRow, toggleSeat, getSeat]
  )

  // Generate seat numbers for header
  const seatNumbers = Array.from(
    { length: layout.seatsPerRow },
    (_, i) => i + 1
  )

  return (
    <div
      ref={containerRef}
      className={cn("flex flex-col gap-4", className)}
      role="application"
      aria-label="Seat selection"
    >
      {/* Screen indicator */}
      <div className="flex flex-col items-center gap-2">
        <div className="bg-muted h-2 w-3/4 rounded-full" aria-hidden="true" />
        <span className="text-muted-foreground text-xs tracking-wider uppercase">
          {layout.screenLabel || labels.screen}
        </span>
      </div>

      {/* Seat grid */}
      <div className="overflow-x-auto">
        <div className="inline-flex flex-col gap-2 p-2">
          {/* Seat numbers header */}
          <div className="flex items-center gap-1">
            {/* Spacer for row label column */}
            <div className="w-6" aria-hidden="true" />
            {seatNumbers.map((num) => (
              <div
                key={num}
                className="text-muted-foreground flex h-8 w-8 items-center justify-center text-xs font-medium"
              >
                {num}
              </div>
            ))}
          </div>

          {/* Seat rows */}
          {layout.rows.map((row) => (
            <div key={row} className="flex items-center gap-1" role="row">
              {/* Row label */}
              <div className="text-muted-foreground flex h-8 w-6 items-center justify-center text-xs font-medium">
                {row}
              </div>

              {/* Seats in this row */}
              {seatNumbers.map((num) => {
                const seat = getSeat(row, num)
                if (!seat) return null

                const isSelected = isSeatSelected(seat)
                const seatId = `seat-${row}-${num}`
                const isWheelchair = seat.status === "wheelchair"
                const isTaken = seat.status === "taken"
                const canSelect =
                  !isTaken && (isSelected || selectedSeats.length < maxSeats)

                return (
                  <button
                    key={seatId}
                    type="button"
                    data-seat-id={seatId}
                    disabled={isTaken}
                    aria-label={getSeatAriaLabel(seat, isSelected, labels)}
                    aria-pressed={isSelected}
                    tabIndex={
                      focusedSeat === seatId ||
                      (!focusedSeat && row === layout.rows[0] && num === 1)
                        ? 0
                        : -1
                    }
                    onClick={() => canSelect && toggleSeat(seat)}
                    onKeyDown={(e) => handleKeyDown(e, seat)}
                    onFocus={() => setFocusedSeat(seatId)}
                    className={cn(
                      // Base styles
                      "flex h-8 w-8 items-center justify-center rounded-sm transition-all duration-150",
                      // Focus styles
                      "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                      // Status-specific styles
                      getSeatStyles(seat.status, isSelected),
                      // Wheelchair seats need special handling for rotation
                      isWheelchair && "overflow-hidden"
                    )}
                  >
                    {/* Icon based on status */}
                    {isTaken && (
                      <span
                        className="text-muted-foreground text-xs"
                        aria-hidden="true"
                      >
                        ×
                      </span>
                    )}
                    {isSelected && !isTaken && (
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                    {isWheelchair && !isSelected && (
                      <span
                        className="-rotate-45 text-blue-500"
                        aria-hidden="true"
                      >
                        ♿
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <SeatLegend labels={labels} />
    </div>
  )
}

SeatSelector.displayName = "SeatSelector"

/**
 * SeatLegend - Legend showing seat status indicators
 */
interface SeatLegendProps {
  labels: SeatSelectorLabels
}

export function SeatLegend({ labels }: SeatLegendProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
      {/* Available */}
      <div className="flex items-center gap-1.5">
        <div className="border-muted-foreground h-4 w-4 rounded-sm border-2" />
        <span className="text-muted-foreground">{labels.available}</span>
      </div>

      {/* Selected */}
      <div className="flex items-center gap-1.5">
        <div className="bg-primary flex h-4 w-4 items-center justify-center rounded-sm">
          <svg
            className="text-primary-foreground h-2.5 w-2.5"
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
        <span className="text-muted-foreground">{labels.selected}</span>
      </div>

      {/* Taken */}
      <div className="flex items-center gap-1.5">
        <div className="bg-muted flex h-4 w-4 items-center justify-center rounded-sm">
          <span className="text-muted-foreground text-[10px]">×</span>
        </div>
        <span className="text-muted-foreground">{labels.taken}</span>
      </div>

      {/* Wheelchair */}
      <div className="flex items-center gap-1.5">
        <div className="flex h-4 w-4 rotate-45 items-center justify-center rounded-sm border-2 border-blue-500">
          <span className="-rotate-45 text-[10px] text-blue-500">♿</span>
        </div>
        <span className="text-muted-foreground">{labels.wheelchair}</span>
      </div>
    </div>
  )
}

SeatLegend.displayName = "SeatLegend"

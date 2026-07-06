"use client"

import * as React from "react"
import { DateRange } from "react-day-picker"

import type { DateFilterValue } from "../../filters/filterParams"

import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface EventDateFilterLabels {
  today: string
  tomorrow: string
  weekend: string
  /** "Choisir" — the custom-range trigger label. */
  custom: string
  /** "Effacer" — clears the active date filter. */
  clear: string
  /** Accessible name for the filter group (e.g. "Filtrer par date"). */
  groupLabel: string
}

export interface EventDateFilterProps {
  /** The currently-active date selection (derived from the URL). */
  value: DateFilterValue
  /** Emitted with the new typed value whenever the selection changes. */
  onChange: (value: DateFilterValue) => void
  /** Localized labels (no hardcoded copy in the component). */
  labels: EventDateFilterLabels
  className?: string
}

/** Minimal inline calendar glyph (avoids an icon-lib dep in this control). */
function CalendarGlyph() {
  return (
    <svg
      className="size-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 2v4M16 2v4M3 10h18" />
      <rect x="3" y="4" width="18" height="18" rx="2" />
    </svg>
  )
}

/** Minimal inline close glyph. */
function CloseGlyph() {
  return (
    <svg
      className="size-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

/** Zero-padded `YYYY-MM-DD` from a local `Date`. */
function toDayToken(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** `YYYY-MM-DD` → local `Date` at midnight (calendar-day, timezone-neutral). */
function fromDayToken(token: string): Date {
  const [y, m, d] = token.split("-").map(Number) as [number, number, number]
  return new Date(y, m - 1, d)
}

/** DD/MM/YYYY with Western numerals (fr-TN) for both LTR and RTL locales. */
function formatDay(token: string): string {
  return new Intl.DateTimeFormat("fr-TN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(fromDayToken(token))
}

function valueToRange(value: DateFilterValue): DateRange | undefined {
  if (value.type === "day") {
    return { from: fromDayToken(value.date), to: fromDayToken(value.date) }
  }
  if (value.type === "range") {
    return { from: fromDayToken(value.start), to: fromDayToken(value.end) }
  }
  return undefined
}

const CHIP_BASE =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
const CHIP_ACTIVE = "bg-primary text-primary-foreground border-primary"
const CHIP_INACTIVE =
  "bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground"

/**
 * Date filter control for the events listing: three preset chips (Aujourd'hui /
 * Demain / Ce weekend) plus a custom-range chip that opens a range calendar.
 * The active option is visibly highlighted; every chip is a ≥44px touch target.
 * The component is presentational — it emits a typed {@link DateFilterValue} and
 * leaves URL writes to the parent island.
 */
export function EventDateFilter({
  value,
  onChange,
  labels,
  className,
}: EventDateFilterProps) {
  const [open, setOpen] = React.useState(false)
  const [range, setRange] = React.useState<DateRange | undefined>(() =>
    valueToRange(value)
  )

  // Keep the calendar in sync when the active value changes from the outside
  // (e.g. deep-link, back/forward navigation).
  React.useEffect(() => {
    setRange(valueToRange(value))
  }, [value])

  const customActive = value.type === "day" || value.type === "range"

  const customLabel = React.useMemo(() => {
    if (value.type === "day") return formatDay(value.date)
    if (value.type === "range") {
      return `${formatDay(value.start)} – ${formatDay(value.end)}`
    }
    return labels.custom
  }, [value, labels.custom])

  const selectPreset = (preset: "today" | "tomorrow" | "weekend") => {
    onChange({ type: preset })
  }

  const handleRangeSelect = (next: DateRange | undefined) => {
    setRange(next)
    if (next?.from && next?.to) {
      const start = toDayToken(next.from)
      const end = toDayToken(next.to)
      onChange(
        start === end
          ? { type: "day", date: start }
          : { type: "range", start, end }
      )
      setOpen(false)
    }
  }

  const clear = () => {
    setRange(undefined)
    onChange({ type: "none" })
  }

  return (
    <div
      role="group"
      aria-label={labels.groupLabel}
      className={cn("flex flex-wrap items-center gap-2", className)}
    >
      <button
        type="button"
        aria-pressed={value.type === "today"}
        onClick={() => selectPreset("today")}
        className={cn(
          CHIP_BASE,
          value.type === "today" ? CHIP_ACTIVE : CHIP_INACTIVE
        )}
      >
        {labels.today}
      </button>

      <button
        type="button"
        aria-pressed={value.type === "tomorrow"}
        onClick={() => selectPreset("tomorrow")}
        className={cn(
          CHIP_BASE,
          value.type === "tomorrow" ? CHIP_ACTIVE : CHIP_INACTIVE
        )}
      >
        {labels.tomorrow}
      </button>

      <button
        type="button"
        aria-pressed={value.type === "weekend"}
        onClick={() => selectPreset("weekend")}
        className={cn(
          CHIP_BASE,
          value.type === "weekend" ? CHIP_ACTIVE : CHIP_INACTIVE
        )}
      >
        {labels.weekend}
      </button>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-pressed={customActive}
            className={cn(
              CHIP_BASE,
              customActive ? CHIP_ACTIVE : CHIP_INACTIVE
            )}
          >
            <CalendarGlyph />
            {customLabel}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            autoFocus
            mode="range"
            defaultMonth={range?.from}
            selected={range}
            onSelect={handleRangeSelect}
            numberOfMonths={1}
          />
        </PopoverContent>
      </Popover>

      {value.type !== "none" && (
        <button
          type="button"
          onClick={clear}
          className={cn(
            CHIP_BASE,
            CHIP_INACTIVE,
            "text-muted-foreground px-3"
          )}
        >
          <CloseGlyph />
          {labels.clear}
        </button>
      )}
    </div>
  )
}

EventDateFilter.displayName = "EventDateFilter"

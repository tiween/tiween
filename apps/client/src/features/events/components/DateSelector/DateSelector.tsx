"use client"

import * as React from "react"
import { CalendarDays } from "lucide-react"

import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

/**
 * Localized labels for DateSelector
 */
export interface DateSelectorLabels {
  today: string
  tomorrow: string
  custom: string
  selectDate: string
}

const defaultLabels: DateSelectorLabels = {
  today: "Aujourd'hui",
  tomorrow: "Demain",
  custom: "Choisir",
  selectDate: "Sélectionner une date",
}

export interface DateSelectorProps {
  /** Currently selected date */
  selectedDate: Date
  /** Called when a date is selected */
  onDateChange: (date: Date) => void
  /** Locale for date formatting (e.g., "fr-TN", "ar-TN", "en-US") */
  locale?: string
  /** Localized labels */
  labels?: DateSelectorLabels
  /** Additional class names */
  className?: string
}

/**
 * Get an array of dates for the next n days starting from today
 */
function getUpcomingDates(count: number): Date[] {
  const dates: Date[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = 0; i < count; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    dates.push(date)
  }
  return dates
}

/**
 * Check if two dates are the same day
 */
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

/**
 * Check if a date is today
 */
function isToday(date: Date): boolean {
  return isSameDay(date, new Date())
}

/**
 * Check if a date is tomorrow
 */
function isTomorrow(date: Date): boolean {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return isSameDay(date, tomorrow)
}

/**
 * Format a date for display based on its relation to today
 */
function formatDateChip(
  date: Date,
  locale: string,
  labels: DateSelectorLabels
): string {
  if (isToday(date)) return labels.today
  if (isTomorrow(date)) return labels.tomorrow

  // Format as abbreviated weekday and day number (e.g., "Ven. 16")
  const weekday = date.toLocaleDateString(locale, { weekday: "short" })
  const day = date.getDate()
  return `${weekday} ${day}`
}

/**
 * Check if the selected date is within the displayed chips (today + 6 days)
 */
function isDateInChips(date: Date, chipDates: Date[]): boolean {
  return chipDates.some((chipDate) => isSameDay(chipDate, date))
}

/**
 * DateSelector - Horizontal scrolling date filter chips
 *
 * Features:
 * - Date chips for today, tomorrow, and the next 5 days
 * - Selected date highlighted with primary color
 * - "Custom" chip opens a calendar popover for arbitrary date selection
 * - Touch-friendly 44px minimum tap targets
 * - RTL support via CSS logical properties
 * - Localized date formatting
 *
 * @example
 * ```tsx
 * const [date, setDate] = useState(new Date())
 *
 * <DateSelector
 *   selectedDate={date}
 *   onDateChange={setDate}
 *   locale="fr-TN"
 * />
 * ```
 */
export function DateSelector({
  selectedDate,
  onDateChange,
  locale = "fr-TN",
  labels = defaultLabels,
  className,
}: DateSelectorProps) {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null)
  const [showLeftFade, setShowLeftFade] = React.useState(false)
  const [showRightFade, setShowRightFade] = React.useState(true)
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false)

  // Generate date chips (today + next 6 days = 7 total)
  const chipDates = React.useMemo(() => getUpcomingDates(7), [])

  // Check if selected date is a custom date (not in chips)
  const isCustomDateSelected = !isDateInChips(selectedDate, chipDates)

  // Update scroll indicators based on scroll position
  const updateScrollIndicators = React.useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const { scrollLeft, scrollWidth, clientWidth } = container
    const isRTL = getComputedStyle(container).direction === "rtl"

    const scrollStart = Math.abs(scrollLeft)
    const maxScroll = scrollWidth - clientWidth

    if (isRTL) {
      setShowRightFade(scrollStart > 10)
      setShowLeftFade(scrollStart < maxScroll - 10)
    } else {
      setShowLeftFade(scrollStart > 10)
      setShowRightFade(scrollStart < maxScroll - 10)
    }
  }, [])

  // Initialize and update scroll indicators
  React.useEffect(() => {
    updateScrollIndicators()
    const container = scrollContainerRef.current
    if (container) {
      container.addEventListener("scroll", updateScrollIndicators)
      return () =>
        container.removeEventListener("scroll", updateScrollIndicators)
    }
  }, [updateScrollIndicators])

  // Scroll to selected date chip on mount/change
  React.useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const selectedChip = container.querySelector('[data-selected="true"]')
    if (selectedChip) {
      selectedChip.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      })
    }
  }, [selectedDate])

  const handleDateSelect = (date: Date) => {
    onDateChange(date)
  }

  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      onDateChange(date)
      setIsCalendarOpen(false)
    }
  }

  return (
    <div className={cn("relative", className)}>
      {/* Left fade indicator */}
      <div
        className={cn(
          "from-secondary bg-gradient-to-e pointer-events-none absolute start-0 top-0 bottom-0 z-10 w-6 to-transparent transition-opacity",
          showLeftFade ? "opacity-100" : "opacity-0"
        )}
        aria-hidden="true"
      />

      {/* Chips container */}
      <div
        ref={scrollContainerRef}
        role="listbox"
        aria-label={labels.selectDate}
        className="no-scrollbar flex gap-2 overflow-x-auto scroll-smooth py-1"
      >
        {/* Date chips */}
        {chipDates.map((date) => {
          const isSelected = isSameDay(date, selectedDate)
          return (
            <button
              key={date.toISOString()}
              type="button"
              role="option"
              aria-selected={isSelected}
              data-selected={isSelected}
              onClick={() => handleDateSelect(date)}
              className={cn(
                // Base styles
                "shrink-0 rounded-full px-4 py-2 whitespace-nowrap",
                // Minimum touch target height (44px)
                "min-h-[44px]",
                // Typography
                "text-sm font-medium transition-colors",
                // Selected/unselected states
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                // Focus styles
                "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              )}
            >
              {formatDateChip(date, locale, labels)}
            </button>
          )
        })}

        {/* Custom date chip with calendar popover */}
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              role="option"
              aria-selected={isCustomDateSelected}
              aria-haspopup="dialog"
              data-selected={isCustomDateSelected}
              className={cn(
                // Base styles
                "flex shrink-0 items-center gap-2 rounded-full px-4 py-2 whitespace-nowrap",
                // Minimum touch target height (44px)
                "min-h-[44px]",
                // Typography
                "text-sm font-medium transition-colors",
                // Selected/unselected states
                isCustomDateSelected
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                // Focus styles
                "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              )}
            >
              <CalendarDays className="h-4 w-4" />
              {isCustomDateSelected
                ? selectedDate.toLocaleDateString(locale, {
                    month: "short",
                    day: "numeric",
                  })
                : labels.custom}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleCalendarSelect}
              initialFocus
              disabled={(date) =>
                date < new Date(new Date().setHours(0, 0, 0, 0))
              }
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Right fade indicator */}
      <div
        className={cn(
          "from-secondary bg-gradient-to-s pointer-events-none absolute end-0 top-0 bottom-0 z-10 w-6 to-transparent transition-opacity",
          showRightFade ? "opacity-100" : "opacity-0"
        )}
        aria-hidden="true"
      />
    </div>
  )
}

DateSelector.displayName = "DateSelector"

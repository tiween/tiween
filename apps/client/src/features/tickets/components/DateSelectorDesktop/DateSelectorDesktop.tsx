"use client"

import * as React from "react"

import { toNumeralSafeLocale } from "@/lib/intl-locale"
import { cn } from "@/lib/utils"

export interface DateOption {
  date: string // ISO date string (YYYY-MM-DD)
  dayName: string // e.g., "Mer.", "Jeu."
  dayNumber: number // e.g., 14, 15
  monthName: string // e.g., "Sep.", "Oct."
  isToday?: boolean
  hasShowtimes?: boolean
}

export interface DateSelectorDesktopProps {
  dates: DateOption[]
  selectedDate: string | null
  onDateSelect: (date: string) => void
  className?: string
}

/**
 * DateSelectorDesktop - Horizontal week-view date picker
 *
 * Based on the Tiween desktop ticketing design:
 * - Horizontal scrollable row of date buttons
 * - Selected date highlighted with yellow background
 * - Shows day name, day number, and month
 * - First date (today) has special styling
 */
export function DateSelectorDesktop({
  dates,
  selectedDate,
  onDateSelect,
  className,
}: DateSelectorDesktopProps) {
  return (
    <div
      className={cn("no-scrollbar flex gap-2 overflow-x-auto pb-1", className)}
      role="listbox"
      aria-label="Sélectionner une date"
    >
      {dates.map((dateOption, index) => {
        const isSelected = selectedDate === dateOption.date
        const isFirst = index === 0

        return (
          <button
            key={dateOption.date}
            onClick={() => onDateSelect(dateOption.date)}
            role="option"
            aria-selected={isSelected}
            className={cn(
              "flex min-w-[72px] flex-col items-center rounded-xl px-4 py-3 transition-all",
              "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
              isSelected
                ? "bg-primary text-primary-foreground shadow-lg"
                : isFirst
                  ? "bg-primary/20 text-foreground hover:bg-primary/30"
                  : "text-foreground hover:bg-secondary"
            )}
          >
            <span
              className={cn(
                "text-xs font-medium uppercase",
                isSelected ? "text-primary-foreground" : "text-muted-foreground"
              )}
            >
              {dateOption.dayName}
            </span>
            <span
              className={cn(
                "text-2xl leading-tight font-bold",
                isSelected ? "text-primary-foreground" : "text-foreground"
              )}
            >
              {dateOption.dayNumber}
            </span>
            <span
              className={cn(
                "text-xs",
                isSelected ? "text-primary-foreground" : "text-muted-foreground"
              )}
            >
              {dateOption.monthName}
            </span>
          </button>
        )
      })}
    </div>
  )
}

DateSelectorDesktop.displayName = "DateSelectorDesktop"

/**
 * Helper function to generate date options from a date range
 */
export function generateDateOptions(
  startDate: Date,
  days: number,
  locale: string
): DateOption[] {
  const options: DateOption[] = []
  const localeCode =
    locale === "ar" ? "ar-TN" : locale === "fr" ? "fr-TN" : "en-US"
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)

    const dateStr = date.toISOString().split("T")[0]!
    const dayName = date.toLocaleDateString(toNumeralSafeLocale(localeCode), {
      weekday: "short",
    })
    const dayNumber = date.getDate()
    const monthName = date.toLocaleDateString(toNumeralSafeLocale(localeCode), {
      month: "short",
    })

    const dateOnly = new Date(date)
    dateOnly.setHours(0, 0, 0, 0)
    const isToday = dateOnly.getTime() === today.getTime()

    options.push({
      date: dateStr,
      dayName,
      dayNumber,
      monthName,
      isToday,
    })
  }

  return options
}

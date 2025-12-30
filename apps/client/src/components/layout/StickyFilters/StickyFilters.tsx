"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

export interface StickyFiltersProps {
  /** Content for category tabs section (horizontal scrolling tabs) */
  categoryTabs?: React.ReactNode
  /** Content for date selector section */
  dateSelector?: React.ReactNode
  /** Content for additional filter buttons */
  filterButtons?: React.ReactNode
  /** Whether the component is currently stuck to the top */
  isSticky?: boolean
  /** Additional class names */
  className?: string
  /** Localized labels */
  labels?: StickyFiltersLabels
}

export interface StickyFiltersLabels {
  filters: string
}

const defaultLabels: StickyFiltersLabels = {
  filters: "Filtres",
}

export function StickyFilters({
  categoryTabs,
  dateSelector,
  filterButtons,
  isSticky = false,
  className,
  labels = defaultLabels,
}: StickyFiltersProps) {
  return (
    <div
      role="region"
      aria-label={labels.filters}
      className={cn(
        // Sticky positioning below header (48px)
        "sticky top-12 z-30",
        // Background with blur effect
        "bg-secondary/95 backdrop-blur-md",
        // Border bottom when sticky
        isSticky && "border-border border-b shadow-sm",
        // Padding
        "px-4 py-2",
        className
      )}
    >
      {/* Category Tabs Section */}
      {categoryTabs && (
        <div className="no-scrollbar -mx-4 overflow-x-auto px-4">
          {categoryTabs}
        </div>
      )}

      {/* Date Selector and Filter Buttons Row */}
      {(dateSelector || filterButtons) && (
        <div className={cn("flex items-center gap-2", categoryTabs && "mt-2")}>
          {/* Date Selector */}
          {dateSelector && (
            <div className="no-scrollbar -mx-4 flex-1 overflow-x-auto px-4">
              {dateSelector}
            </div>
          )}

          {/* Filter Buttons */}
          {filterButtons && (
            <div className="flex shrink-0 items-center gap-2">
              {filterButtons}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

StickyFilters.displayName = "StickyFilters"

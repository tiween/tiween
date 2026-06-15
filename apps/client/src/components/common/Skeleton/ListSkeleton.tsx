"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

export interface ListSkeletonProps {
  /** Number of skeleton rows to display */
  rows?: number
  /** Height of each row */
  rowHeight?: "sm" | "md" | "lg"
  /** Show avatar placeholder on left side */
  showAvatar?: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * Row height mappings
 */
const rowHeightClasses = {
  sm: "h-12",
  md: "h-16",
  lg: "h-20",
}

/**
 * ListSkeleton - Skeleton placeholder for list views
 *
 * Use this component to show loading state for list-based UI.
 * Configurable number of rows and optional avatar placeholder.
 *
 * @example
 * ```tsx
 * // Basic list
 * <ListSkeleton rows={5} />
 *
 * // With avatars
 * <ListSkeleton rows={3} showAvatar />
 *
 * // Custom height
 * <ListSkeleton rows={4} rowHeight="lg" />
 * ```
 */
export function ListSkeleton({
  rows = 3,
  rowHeight = "md",
  showAvatar = false,
  className,
}: ListSkeletonProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading list"
      className={cn("space-y-3", className)}
    >
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className={cn("flex items-center gap-3", rowHeightClasses[rowHeight])}
        >
          {showAvatar && (
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          )}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
      <span className="sr-only">Loading list items...</span>
    </div>
  )
}

ListSkeleton.displayName = "ListSkeleton"

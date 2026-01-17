"use client"

import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

export interface SearchResultsSkeletonProps {
  /** Number of skeleton cards to show */
  count?: number
  /** Additional class names */
  className?: string
}

/**
 * SearchResultsSkeleton - Loading skeleton for search results
 *
 * Shows a header skeleton and multiple card skeletons.
 */
export function SearchResultsSkeleton({
  count = 3,
  className,
}: SearchResultsSkeletonProps) {
  return (
    <div
      className={cn("space-y-4", className)}
      role="status"
      aria-label="Loading search results"
    >
      {/* Header skeleton */}
      <Skeleton className="h-6 w-48" />

      {/* Card skeletons */}
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={index}
            className="bg-card border-border flex gap-3 rounded-lg border p-3"
          >
            {/* Image skeleton */}
            <Skeleton className="h-24 w-24 shrink-0 rounded-md" />

            {/* Content skeleton */}
            <div className="flex flex-1 flex-col justify-between">
              <div>
                {/* Category badge */}
                <Skeleton className="mb-2 h-5 w-16 rounded-full" />
                {/* Title */}
                <Skeleton className="mb-2 h-5 w-3/4" />
                {/* Venue */}
                <Skeleton className="h-4 w-1/2" />
              </div>
              {/* Date/Price */}
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

SearchResultsSkeleton.displayName = "SearchResultsSkeleton"

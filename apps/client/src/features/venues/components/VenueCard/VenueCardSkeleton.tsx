"use client"

import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

export interface VenueCardSkeletonProps {
  /** Additional class names */
  className?: string
}

/**
 * VenueCardSkeleton - Loading skeleton for VenueCard
 *
 * Matches the exact dimensions and layout of VenueCard
 * to prevent layout shift when loading.
 */
export function VenueCardSkeleton({ className }: VenueCardSkeletonProps) {
  return (
    <div
      className={cn(
        // Base card styles (matching VenueCard)
        "bg-card overflow-hidden rounded-lg",
        "border-border border",
        "flex gap-3 p-3",
        className
      )}
      role="status"
      aria-label="Loading venue"
    >
      {/* Image skeleton */}
      <Skeleton className="h-20 w-20 shrink-0 rounded-md" />

      {/* Content skeleton */}
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        {/* Top: Name and location */}
        <div>
          {/* Name */}
          <Skeleton className="h-5 w-3/4" />
          {/* Location */}
          <Skeleton className="mt-1.5 h-4 w-1/2" />
        </div>

        {/* Bottom: Badge and distance */}
        <div className="mt-2 flex items-center justify-between">
          <Skeleton className="h-5 w-32 rounded-full" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
    </div>
  )
}

VenueCardSkeleton.displayName = "VenueCardSkeleton"

import * as React from "react"

import type { EventCardVariant } from "../../types/event.types"

import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

export interface EventCardSkeletonProps {
  /** Visual variant of the skeleton */
  variant?: EventCardVariant
  /** Additional class names */
  className?: string
}

// Variant-specific configurations matching EventCard
const variantConfig = {
  default: {
    imageHeight: "h-40", // 160px
    showPrice: true,
  },
  compact: {
    imageHeight: "h-[100px]",
    showPrice: false,
  },
  featured: {
    imageHeight: "h-[200px]",
    showPrice: true,
  },
} as const

export function EventCardSkeleton({
  variant = "default",
  className,
}: EventCardSkeletonProps) {
  const config = variantConfig[variant]

  return (
    <div
      role="article"
      aria-busy="true"
      aria-label="Loading event"
      className={cn(
        // Base card styles matching EventCard
        "bg-card text-card-foreground overflow-hidden rounded-xl border",
        className
      )}
    >
      {/* Image Skeleton */}
      <Skeleton className={cn("w-full rounded-none", config.imageHeight)} />

      {/* Content Skeleton */}
      <div className="p-3">
        {/* Title - 2 lines */}
        <Skeleton className="mb-1 h-5 w-3/4" />
        <Skeleton className="mb-2 h-5 w-1/2" />

        {/* Venue and Date */}
        <Skeleton className="h-4 w-2/3" />

        {/* Price */}
        {config.showPrice && <Skeleton className="mt-2 h-4 w-1/4" />}
      </div>
    </div>
  )
}

EventCardSkeleton.displayName = "EventCardSkeleton"

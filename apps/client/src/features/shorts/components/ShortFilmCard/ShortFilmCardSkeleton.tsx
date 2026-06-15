"use client"

import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

export interface ShortFilmCardSkeletonProps {
  className?: string
}

export function ShortFilmCardSkeleton({
  className,
}: ShortFilmCardSkeletonProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg",
        "aspect-[2/3] w-full",
        className
      )}
    >
      <Skeleton className="absolute inset-0" />
      {/* Duration badge skeleton */}
      <div className="absolute end-2 top-2">
        <Skeleton className="h-6 w-14 rounded-full" />
      </div>
      {/* Bottom content skeleton */}
      <div className="absolute inset-x-0 bottom-0 space-y-2 p-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  )
}

ShortFilmCardSkeleton.displayName = "ShortFilmCardSkeleton"

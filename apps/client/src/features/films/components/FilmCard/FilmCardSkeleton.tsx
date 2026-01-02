"use client"

import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

export interface FilmCardSkeletonProps {
  /** Additional class names */
  className?: string
}

export function FilmCardSkeleton({ className }: FilmCardSkeletonProps) {
  return (
    <div
      role="article"
      aria-busy="true"
      aria-label="Loading film"
      className={cn(
        // Base styles matching FilmCard
        "relative overflow-hidden rounded-lg",
        // Size - 2:3 aspect ratio
        "aspect-[2/3] w-full",
        className
      )}
    >
      <Skeleton className="absolute inset-0" />
    </div>
  )
}

FilmCardSkeleton.displayName = "FilmCardSkeleton"

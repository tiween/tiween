"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

export interface FilmHeroSkeletonProps {
  /** Aspect ratio mode: "portrait" (4:5), "landscape" (16:9), "auto" (responsive) */
  aspectMode?: "portrait" | "landscape" | "auto"
  /** Additional CSS classes */
  className?: string
}

/**
 * FilmHeroSkeleton - Skeleton placeholder for FilmHero component
 *
 * Matches the layout of FilmHero with gradient overlay and metadata placeholders.
 *
 * @example
 * ```tsx
 * <FilmHeroSkeleton aspectMode="auto" />
 * ```
 */
export function FilmHeroSkeleton({
  aspectMode = "auto",
  className,
}: FilmHeroSkeletonProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading film hero"
      className={cn(
        "relative w-full overflow-hidden",
        // Aspect ratio based on mode
        aspectMode === "portrait" && "aspect-[4/5]",
        aspectMode === "landscape" && "aspect-video",
        aspectMode === "auto" && "aspect-[4/5] sm:aspect-video",
        className
      )}
    >
      {/* Background skeleton */}
      <Skeleton className="absolute inset-0" />

      {/* Gradient overlay (matching FilmHero) */}
      <div className="from-background via-background/60 absolute inset-0 bg-gradient-to-t to-transparent" />

      {/* Content skeleton positioned at bottom */}
      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
        <div className="space-y-3">
          {/* Category badge */}
          <Skeleton className="h-6 w-20 rounded-full" />

          {/* Title (2 lines) */}
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-8 w-1/2" />

          {/* Metadata row (genres, duration, year) */}
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-12" />
          </div>

          {/* Rating and venue count */}
          <div className="flex items-center gap-4">
            <Skeleton className="h-5 w-14" />
            <Skeleton className="h-5 w-24" />
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </div>
      </div>

      <span className="sr-only">Loading film details...</span>
    </div>
  )
}

FilmHeroSkeleton.displayName = "FilmHeroSkeleton"

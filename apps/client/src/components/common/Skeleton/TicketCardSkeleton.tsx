"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

export interface TicketCardSkeletonProps {
  /** Size variant (small: compact list view, large: full card) */
  size?: "small" | "large"
  /** Additional CSS classes */
  className?: string
}

/**
 * TicketCardSkeleton - Skeleton placeholder for ticket cards
 *
 * Matches the layout of TicketQR component with QR code placeholder
 * and ticket details.
 *
 * @example
 * ```tsx
 * // Full card view
 * <TicketCardSkeleton size="large" />
 *
 * // Compact list view
 * <TicketCardSkeleton size="small" />
 * ```
 */
export function TicketCardSkeleton({
  size = "large",
  className,
}: TicketCardSkeletonProps) {
  if (size === "small") {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Loading ticket"
        className={cn(
          "bg-card flex items-center gap-4 rounded-lg border p-4",
          className
        )}
      >
        {/* Small QR placeholder */}
        <Skeleton className="h-16 w-16 shrink-0 rounded-md" />

        {/* Ticket info */}
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>

        <span className="sr-only">Loading ticket...</span>
      </div>
    )
  }

  // Large/full card view
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading ticket"
      className={cn("bg-card overflow-hidden rounded-xl border", className)}
    >
      {/* QR Code section */}
      <div className="flex justify-center bg-white p-6">
        <Skeleton className="h-40 w-40 rounded-lg" />
      </div>

      {/* Ticket details */}
      <div className="space-y-4 p-4">
        {/* Ticket ID */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>

        {/* Event title */}
        <Skeleton className="h-6 w-full" />

        {/* Date, time, venue info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>

        {/* Quantity */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-4 w-20" />
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-10 flex-1 rounded-md" />
          <Skeleton className="h-10 w-10 rounded-md" />
        </div>
      </div>

      <span className="sr-only">Loading ticket details...</span>
    </div>
  )
}

TicketCardSkeleton.displayName = "TicketCardSkeleton"

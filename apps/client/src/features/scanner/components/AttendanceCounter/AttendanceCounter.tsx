"use client"

import * as React from "react"
import { AlertTriangle, CheckCircle2, TrendingUp, Users } from "lucide-react"

import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"

/**
 * Localized labels for AttendanceCounter
 */
export interface AttendanceCounterLabels {
  scanned: string
  of: string
  remaining: string
  capacity: string
  almostFull: string
  full: string
  scanRate: string
  perMinute: string
}

const defaultLabels: AttendanceCounterLabels = {
  scanned: "Scannés",
  of: "sur",
  remaining: "Restant",
  capacity: "Capacité",
  almostFull: "Presque plein",
  full: "Complet",
  scanRate: "Taux de scan",
  perMinute: "/min",
}

/**
 * Size variants for different contexts
 */
export type AttendanceCounterSize = "sm" | "md" | "lg"

/**
 * Display variant for different contexts
 */
export type AttendanceCounterVariant = "default" | "compact" | "detailed"

export interface AttendanceCounterProps {
  /** Number of tickets scanned */
  scannedCount: number
  /** Total number of tickets for the event */
  totalTickets: number
  /** Optional: Scans per minute rate */
  scanRate?: number
  /** Size variant */
  size?: AttendanceCounterSize
  /** Display variant */
  variant?: AttendanceCounterVariant
  /** Threshold percentage for "almost full" warning (default: 90) */
  warningThreshold?: number
  /** Whether to show pulsing animation when active */
  isActive?: boolean
  /** Localized labels */
  labels?: AttendanceCounterLabels
  /** Additional class names */
  className?: string
}

/**
 * AttendanceCounter - Real-time attendance tracking display
 *
 * Features:
 * - Large, high-contrast numbers for visibility in dark venues
 * - Progress bar with color-coded status
 * - Optional scan rate indicator
 * - Pulsing animation when actively scanning
 * - Multiple size and display variants
 * - RTL-compatible with CSS logical properties
 *
 * @example
 * ```tsx
 * // Basic usage
 * <AttendanceCounter
 *   scannedCount={127}
 *   totalTickets={450}
 * />
 *
 * // With scan rate (detailed view)
 * <AttendanceCounter
 *   scannedCount={127}
 *   totalTickets={450}
 *   scanRate={12}
 *   variant="detailed"
 *   isActive
 * />
 *
 * // Compact for inline display
 * <AttendanceCounter
 *   scannedCount={45}
 *   totalTickets={50}
 *   variant="compact"
 *   size="sm"
 * />
 * ```
 */
export function AttendanceCounter({
  scannedCount,
  totalTickets,
  scanRate,
  size = "md",
  variant = "default",
  warningThreshold = 90,
  isActive = false,
  labels = defaultLabels,
  className,
}: AttendanceCounterProps) {
  // Calculate metrics
  const percentage =
    totalTickets > 0 ? Math.round((scannedCount / totalTickets) * 100) : 0
  const remaining = totalTickets - scannedCount
  const isFull = scannedCount >= totalTickets
  const isAlmostFull = percentage >= warningThreshold && !isFull

  // Determine status color
  const getStatusColor = () => {
    if (isFull) return "text-destructive"
    if (isAlmostFull) return "text-yellow-500"
    return "text-primary"
  }

  // Determine progress color class
  const getProgressColor = () => {
    if (isFull) return "bg-destructive"
    if (isAlmostFull) return "bg-yellow-500"
    return "bg-primary"
  }

  // Size-based classes
  const sizeClasses = {
    sm: {
      container: "p-2",
      icon: "h-4 w-4",
      mainCount: "text-xl",
      subText: "text-xs",
      progress: "h-1.5",
    },
    md: {
      container: "p-3",
      icon: "h-5 w-5",
      mainCount: "text-3xl",
      subText: "text-sm",
      progress: "h-2",
    },
    lg: {
      container: "p-4",
      icon: "h-6 w-6",
      mainCount: "text-5xl",
      subText: "text-base",
      progress: "h-3",
    },
  }

  const sizes = sizeClasses[size]

  // Compact variant - single line display
  if (variant === "compact") {
    return (
      <div
        className={cn(
          "flex items-center gap-2",
          isActive && "animate-pulse",
          className
        )}
      >
        <Users className={cn(sizes.icon, "text-muted-foreground")} />
        <span className={cn("font-mono font-bold", getStatusColor())}>
          {scannedCount.toLocaleString()}
        </span>
        <span className="text-muted-foreground">/</span>
        <span className="text-muted-foreground">
          {totalTickets.toLocaleString()}
        </span>
        {percentage > 0 && (
          <span className={cn("text-xs", getStatusColor())}>
            ({percentage}%)
          </span>
        )}
      </div>
    )
  }

  // Default and detailed variants
  return (
    <div className={cn("bg-card rounded-lg", sizes.container, className)}>
      {/* Header with icon and status */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className={cn(sizes.icon, "text-muted-foreground")} />
          <span className={cn(sizes.subText, "text-muted-foreground")}>
            {labels.scanned}
          </span>
        </div>

        {/* Status indicator */}
        {isFull && (
          <div className="text-destructive flex items-center gap-1">
            <CheckCircle2 className={sizes.icon} />
            <span className={cn(sizes.subText, "font-medium")}>
              {labels.full}
            </span>
          </div>
        )}
        {isAlmostFull && (
          <div className="flex items-center gap-1 text-yellow-500">
            <AlertTriangle className={sizes.icon} />
            <span className={cn(sizes.subText, "font-medium")}>
              {labels.almostFull}
            </span>
          </div>
        )}
      </div>

      {/* Main count display */}
      <div className="mb-3 flex items-baseline justify-between">
        <div
          className={cn(
            "flex items-baseline gap-1",
            isActive && "animate-pulse"
          )}
        >
          <span
            className={cn(
              "font-mono font-bold",
              sizes.mainCount,
              getStatusColor()
            )}
          >
            {scannedCount.toLocaleString()}
          </span>
          <span className={cn(sizes.subText, "text-muted-foreground")}>
            {labels.of} {totalTickets.toLocaleString()}
          </span>
        </div>
        <span
          className={cn(
            "font-mono font-bold",
            sizes.mainCount,
            getStatusColor()
          )}
        >
          {percentage}%
        </span>
      </div>

      {/* Progress bar */}
      <div
        className={cn("bg-muted overflow-hidden rounded-full", sizes.progress)}
      >
        <div
          className={cn(
            "h-full transition-all duration-300",
            getProgressColor()
          )}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>

      {/* Detailed variant: additional stats */}
      {variant === "detailed" && (
        <div className="border-border mt-3 grid grid-cols-2 gap-3 border-t pt-3">
          {/* Remaining tickets */}
          <div>
            <p className={cn(sizes.subText, "text-muted-foreground")}>
              {labels.remaining}
            </p>
            <p
              className={cn(
                "font-mono font-semibold",
                size === "lg" ? "text-2xl" : "text-lg"
              )}
            >
              {remaining.toLocaleString()}
            </p>
          </div>

          {/* Scan rate */}
          {scanRate !== undefined && (
            <div>
              <div className="flex items-center gap-1">
                <TrendingUp
                  className={cn(sizes.icon, "text-muted-foreground")}
                />
                <p className={cn(sizes.subText, "text-muted-foreground")}>
                  {labels.scanRate}
                </p>
              </div>
              <p
                className={cn(
                  "font-mono font-semibold",
                  size === "lg" ? "text-2xl" : "text-lg"
                )}
              >
                {scanRate}
                <span
                  className={cn(
                    sizes.subText,
                    "text-muted-foreground font-normal"
                  )}
                >
                  {labels.perMinute}
                </span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

AttendanceCounter.displayName = "AttendanceCounter"

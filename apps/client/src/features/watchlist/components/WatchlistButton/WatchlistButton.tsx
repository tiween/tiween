"use client"

import * as React from "react"
import { Heart, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Labels for internationalization support
 */
export interface WatchlistButtonLabels {
  add: string
  remove: string
}

const defaultLabels: WatchlistButtonLabels = {
  add: "Ajouter à la watchlist",
  remove: "Retirer de la watchlist",
}

/**
 * Size configuration for the button
 */
const sizeConfig = {
  sm: {
    button: "h-9 w-9",
    icon: "h-5 w-5",
  },
  md: {
    button: "h-11 w-11",
    icon: "h-6 w-6",
  },
  lg: {
    button: "h-12 w-12",
    icon: "h-7 w-7",
  },
} as const

export interface WatchlistButtonProps {
  /** Whether the item is currently in the watchlist */
  isWatchlisted: boolean
  /** Whether the button is in a loading state (e.g., during API call) */
  isLoading?: boolean
  /** Whether the button is disabled */
  disabled?: boolean
  /** Callback fired when the button is clicked */
  onToggle: () => void
  /** Size variant of the button */
  size?: "sm" | "md" | "lg"
  /** Visual variant: "overlay" has dark background, "ghost" is transparent */
  variant?: "overlay" | "ghost"
  /** Additional class names */
  className?: string
  /** Localized labels for accessibility */
  labels?: WatchlistButtonLabels
}

/**
 * WatchlistButton - A toggle button for adding/removing items from a watchlist
 *
 * Features:
 * - Heart icon that fills when watchlisted (Tiween Yellow)
 * - Loading state with spinner
 * - Pulse animation when adding to watchlist
 * - Fully accessible with aria-pressed and aria-label
 * - RTL-aware positioning
 * - Minimum 44x44px touch target (md size)
 *
 * @example
 * ```tsx
 * <WatchlistButton
 *   isWatchlisted={false}
 *   onToggle={() => handleToggle()}
 * />
 * ```
 */
export function WatchlistButton({
  isWatchlisted,
  isLoading = false,
  disabled = false,
  onToggle,
  size = "md",
  variant = "overlay",
  className,
  labels = defaultLabels,
}: WatchlistButtonProps) {
  const [showPulse, setShowPulse] = React.useState(false)
  const prevWatchlisted = React.useRef(isWatchlisted)

  // Trigger pulse animation when transitioning from not-watchlisted to watchlisted
  React.useEffect(() => {
    if (isWatchlisted && !prevWatchlisted.current) {
      setShowPulse(true)
      const timer = setTimeout(() => setShowPulse(false), 300)
      return () => clearTimeout(timer)
    }
    prevWatchlisted.current = isWatchlisted
  }, [isWatchlisted])

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!disabled && !isLoading) {
      onToggle()
    }
  }

  const config = sizeConfig[size]
  const ariaLabel = isWatchlisted ? labels.remove : labels.add

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isLoading}
      aria-label={ariaLabel}
      aria-pressed={isWatchlisted}
      aria-busy={isLoading}
      className={cn(
        // Base styles
        "flex items-center justify-center",
        // Size
        config.button,
        // Shape
        "rounded-full",
        // Variant-specific background
        variant === "overlay" &&
          "bg-black/50 backdrop-blur-sm hover:bg-black/70",
        variant === "ghost" && "hover:bg-muted/50 bg-transparent",
        // Transitions
        "transition-all duration-200",
        // Focus styles
        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
        // Active state
        "active:scale-95",
        // Disabled state
        (disabled || isLoading) && "cursor-not-allowed opacity-50",
        // Pulse animation
        showPulse && "animate-watchlist-pulse",
        className
      )}
    >
      {isLoading ? (
        <Loader2
          className={cn(config.icon, "animate-spin text-white")}
          aria-hidden="true"
        />
      ) : (
        <Heart
          className={cn(
            config.icon,
            "transition-all duration-200",
            isWatchlisted
              ? "fill-primary text-primary"
              : variant === "overlay"
                ? "fill-transparent text-white"
                : "text-muted-foreground hover:text-primary fill-transparent"
          )}
          aria-hidden="true"
        />
      )}
    </button>
  )
}

WatchlistButton.displayName = "WatchlistButton"

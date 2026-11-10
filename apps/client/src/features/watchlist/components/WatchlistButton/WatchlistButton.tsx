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
 * Size configuration for the button (the `ghost` variant; the `overlay`
 * variant has one fixed geometry: a 44px target around a 40px disc).
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
  /**
   * Saved state unresolved, or a toggle in flight: sets `aria-busy`, ignores
   * taps, and stays focusable (`aria-disabled`, never `disabled`). Unlike
   * `isLoading` it shows no spinner and does not dim the control.
   */
  busy?: boolean
  /** Whether the button is disabled */
  disabled?: boolean
  /** Callback fired when the button is clicked */
  onToggle: () => void
  /** Size variant of the button */
  size?: "sm" | "md" | "lg"
  /** Visual variant: "overlay" sits on a poster, "ghost" is transparent */
  variant?: "overlay" | "ghost"
  /** Additional class names */
  className?: string
  /** Localized labels for accessibility */
  labels?: WatchlistButtonLabels
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
}

/**
 * WatchlistButton - A toggle button for adding/removing items from a watchlist
 *
 * Features:
 * - Heart icon that fills when watchlisted (Gold Leaf, never colour alone:
 *   outline vs filled glyph plus `aria-pressed`)
 * - `overlay` variant for posters (UI-SPEC B1): transparent 44px target around
 *   a centered 40px disc (Aubergine Deep at 80%, 12px blur, 1px Border), 20px
 *   glyph, no shadow
 * - `busy` state: `aria-busy`, taps ignored, still focusable
 * - 300ms pulse when adding to the watchlist, skipped under reduced motion
 * - Fully accessible with aria-pressed and aria-label
 * - The click never reaches a parent link (stops propagation, prevents default)
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
  busy = false,
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
    if (isWatchlisted && !prevWatchlisted.current && !prefersReducedMotion()) {
      setShowPulse(true)
      const timer = setTimeout(() => setShowPulse(false), 300)
      prevWatchlisted.current = isWatchlisted
      return () => clearTimeout(timer)
    }
    prevWatchlisted.current = isWatchlisted
  }, [isWatchlisted])

  const handleClick = (e: React.MouseEvent) => {
    // A heart tap must never reach the card link it sits beside.
    e.stopPropagation()
    e.preventDefault()
    if (busy || disabled || isLoading) return
    onToggle()
  }

  const isOverlay = variant === "overlay"
  const config = sizeConfig[size]
  const ariaLabel = isWatchlisted ? labels.remove : labels.add
  const isInert = disabled || isLoading

  const glyph = isLoading ? (
    <Loader2
      className={cn(
        isOverlay ? "size-5" : config.icon,
        "text-foreground animate-spin motion-reduce:animate-none"
      )}
      aria-hidden="true"
    />
  ) : (
    <Heart
      className={cn(
        isOverlay ? "size-5" : config.icon,
        "transition-colors duration-200",
        isWatchlisted
          ? "fill-primary text-primary"
          : isOverlay
            ? "text-foreground fill-transparent"
            : "text-muted-foreground hover:text-primary fill-transparent"
      )}
      aria-hidden="true"
    />
  )

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isInert}
      aria-label={ariaLabel}
      aria-pressed={isWatchlisted}
      aria-busy={isLoading || busy || undefined}
      aria-disabled={busy && !isInert ? true : undefined}
      className={cn(
        "group/heart flex items-center justify-center rounded-full",
        isOverlay ? "size-11 bg-transparent" : config.button,
        !isOverlay && "hover:bg-muted/50 bg-transparent",
        "transition-transform duration-200",
        // Focus: the global 3px gold ring, 2px offset, on the 44px target
        "focus-visible:ring-ring focus-visible:ring-3 focus-visible:ring-offset-2 focus-visible:outline-none",
        // Press
        "active:scale-95 motion-reduce:active:scale-100",
        isInert && "cursor-not-allowed opacity-50",
        showPulse && "animate-watchlist-pulse",
        className
      )}
    >
      {isOverlay ? (
        <span
          aria-hidden="true"
          className={cn(
            "border-border bg-aubergine-deep/80 flex size-10 items-center justify-center rounded-full border backdrop-blur-md",
            "transition-colors duration-200",
            // Hover applies on fine pointers only (Tailwind v4 `hover`)
            "group-hover/heart:bg-aubergine-deep/[0.92]"
          )}
        >
          {glyph}
        </span>
      ) : (
        glyph
      )}
    </button>
  )
}

WatchlistButton.displayName = "WatchlistButton"

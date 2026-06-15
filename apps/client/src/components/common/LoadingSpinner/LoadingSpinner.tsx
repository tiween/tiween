"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Size variants for LoadingSpinner
 */
export type LoadingSpinnerSize = "sm" | "md" | "lg"

/**
 * Localized labels for LoadingSpinner
 */
export interface LoadingSpinnerLabels {
  loading: string
}

const defaultLabels: LoadingSpinnerLabels = {
  loading: "Chargement...",
}

export interface LoadingSpinnerProps {
  /** Size variant (sm: 16px, md: 32px, lg: 48px) */
  size?: LoadingSpinnerSize
  /** Optional label text displayed below the spinner */
  label?: string
  /** Center the spinner in its container */
  centered?: boolean
  /** Use full page centering (viewport centered) */
  fullPage?: boolean
  /** Localized labels */
  labels?: LoadingSpinnerLabels
  /** Additional CSS classes */
  className?: string
}

/**
 * Size class mappings
 */
const sizeClasses: Record<LoadingSpinnerSize, string> = {
  sm: "h-4 w-4",
  md: "h-8 w-8",
  lg: "h-12 w-12",
}

/**
 * Label text size mappings
 */
const labelSizeClasses: Record<LoadingSpinnerSize, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
}

/**
 * LoadingSpinner - Animated loading indicator
 *
 * Use this component to indicate loading states in the UI.
 * Supports multiple sizes and optional label text.
 *
 * Features:
 * - Three size variants (sm, md, lg)
 * - Optional descriptive label
 * - Centered positioning option
 * - Full page loading mode
 * - Accessible with aria-busy and sr-only text
 *
 * @example
 * ```tsx
 * // Basic usage
 * <LoadingSpinner />
 *
 * // With label
 * <LoadingSpinner size="lg" label="Loading events..." />
 *
 * // Centered in container
 * <LoadingSpinner centered />
 *
 * // Full page loading
 * <LoadingSpinner fullPage size="lg" label="Loading..." />
 * ```
 */
export function LoadingSpinner({
  size = "md",
  label,
  centered = false,
  fullPage = false,
  labels,
  className,
}: LoadingSpinnerProps) {
  const mergedLabels = { ...defaultLabels, ...labels }

  const spinner = (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center gap-2",
        centered &&
          !fullPage &&
          "flex h-full w-full items-center justify-center",
        fullPage &&
          "bg-background/80 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm",
        className
      )}
    >
      <Loader2
        className={cn("text-primary animate-spin", sizeClasses[size])}
        aria-hidden="true"
      />
      {label ? (
        <span className={cn("text-muted-foreground", labelSizeClasses[size])}>
          {label}
        </span>
      ) : (
        // Screen reader only text when no visible label
        <span className="sr-only">{mergedLabels.loading}</span>
      )}
    </div>
  )

  return spinner
}

LoadingSpinner.displayName = "LoadingSpinner"

"use client"

import * as React from "react"
import { AlertTriangle, RotateCcw } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

/**
 * Localized labels for ErrorFallback
 */
export interface ErrorFallbackLabels {
  title: string
  description: string
  tryAgain: string
}

const defaultLabels: ErrorFallbackLabels = {
  title: "Une erreur est survenue",
  description: "Quelque chose s'est mal passé. Veuillez réessayer.",
  tryAgain: "Réessayer",
}

export interface ErrorFallbackProps {
  /** The error that was caught */
  error?: Error | null
  /** Called when user clicks the retry button */
  onReset?: () => void
  /** Show the error message (default: false in production, true in development) */
  showErrorMessage?: boolean
  /** Show stack trace in development */
  showStackTrace?: boolean
  /** Localized labels */
  labels?: Partial<ErrorFallbackLabels>
  /** Additional CSS classes */
  className?: string
}

/**
 * ErrorFallback - Friendly error state UI
 *
 * Displays when an error is caught by ErrorBoundary.
 * Shows a warning icon, error message, and retry button.
 *
 * Features:
 * - Friendly user-facing message
 * - Optional error details for debugging
 * - Stack trace in development mode
 * - Retry/reset button
 * - RTL support (centered layout)
 *
 * @example
 * ```tsx
 * <ErrorFallback
 *   error={error}
 *   onReset={() => window.location.reload()}
 * />
 * ```
 */
export function ErrorFallback({
  error,
  onReset,
  showErrorMessage,
  showStackTrace,
  labels,
  className,
}: ErrorFallbackProps) {
  const isDevelopment = process.env.NODE_ENV === "development"
  const shouldShowError = showErrorMessage ?? isDevelopment
  const shouldShowStack = showStackTrace ?? isDevelopment

  const mergedLabels = {
    ...defaultLabels,
    ...labels,
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 text-center",
        className
      )}
      role="alert"
      aria-live="assertive"
    >
      {/* Icon */}
      <div className="bg-destructive/10 mb-4 rounded-full p-4">
        <AlertTriangle
          className="text-destructive h-8 w-8"
          aria-hidden="true"
        />
      </div>

      {/* Title */}
      <h3 className="text-foreground mb-2 text-lg font-medium">
        {mergedLabels.title}
      </h3>

      {/* Description */}
      <p className="text-muted-foreground mb-4 max-w-sm text-sm">
        {mergedLabels.description}
      </p>

      {/* Error details (conditional) */}
      {shouldShowError && error?.message && (
        <div className="bg-destructive/5 border-destructive/20 mb-4 max-w-md rounded-lg border px-4 py-3">
          <p className="text-destructive font-mono text-sm">{error.message}</p>
        </div>
      )}

      {/* Stack trace (development only) */}
      {shouldShowStack && error?.stack && (
        <details className="bg-muted mb-4 max-w-lg rounded-lg p-3 text-start">
          <summary className="text-muted-foreground cursor-pointer text-xs font-medium">
            Stack trace
          </summary>
          <pre className="text-muted-foreground mt-2 overflow-x-auto text-xs whitespace-pre-wrap">
            {error.stack.split("\n").slice(0, 8).join("\n")}
          </pre>
        </details>
      )}

      {/* Retry button */}
      {onReset && (
        <Button onClick={onReset} variant="outline" className="gap-2">
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          {mergedLabels.tryAgain}
        </Button>
      )}
    </div>
  )
}

ErrorFallback.displayName = "ErrorFallback"

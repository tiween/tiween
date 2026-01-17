"use client"

import * as React from "react"
import { useCallback, useEffect, useState } from "react"
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Ticket,
  XCircle,
} from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Validation status types
 */
export type ValidationStatus =
  | "valid"
  | "already-scanned"
  | "not-found"
  | "wrong-event"

/**
 * Ticket details shown for valid scans
 */
export interface TicketDetails {
  ticketId: string
  eventTitle: string
  quantity: number
  holderName?: string
}

/**
 * Localized labels for ValidationResult
 */
export interface ValidationResultLabels {
  valid: string
  alreadyScanned: string
  notFound: string
  wrongEvent: string
  ticketId: string
  quantity: string
  scannedAt: string
  holder: string
}

const defaultLabels: ValidationResultLabels = {
  valid: "Valide",
  alreadyScanned: "Déjà scanné",
  notFound: "Non trouvé",
  wrongEvent: "Mauvais événement",
  ticketId: "Billet",
  quantity: "Entrées",
  scannedAt: "Scanné à",
  holder: "Titulaire",
}

export interface ValidationResultProps {
  /** Validation status */
  status: ValidationStatus
  /** Ticket details (shown when valid) */
  ticketDetails?: TicketDetails
  /** Previous scan timestamp (for already-scanned) */
  scannedAt?: Date
  /** Auto-dismiss timeout in milliseconds (default: 2000) */
  autoDismissMs?: number
  /** Called when result is dismissed */
  onDismiss?: () => void
  /** Localized labels */
  labels?: ValidationResultLabels
  /** Additional class names */
  className?: string
}

/**
 * Status configuration for styling and icons
 */
const statusConfig: Record<
  ValidationStatus,
  {
    bg: string
    border: string
    textColor: string
    IconComponent: typeof CheckCircle
    labelKey: keyof Pick<
      ValidationResultLabels,
      "valid" | "alreadyScanned" | "notFound" | "wrongEvent"
    >
  }
> = {
  valid: {
    bg: "bg-green-500",
    border: "border-green-400",
    textColor: "text-white",
    IconComponent: CheckCircle,
    labelKey: "valid",
  },
  "already-scanned": {
    bg: "bg-red-500",
    border: "border-red-400",
    textColor: "text-white",
    IconComponent: XCircle,
    labelKey: "alreadyScanned",
  },
  "not-found": {
    bg: "bg-red-500",
    border: "border-red-400",
    textColor: "text-white",
    IconComponent: XCircle,
    labelKey: "notFound",
  },
  "wrong-event": {
    bg: "bg-yellow-500",
    border: "border-yellow-400",
    textColor: "text-black",
    IconComponent: AlertTriangle,
    labelKey: "wrongEvent",
  },
}

/**
 * Format time for display (HH:MM:SS)
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString("fr-TN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

/**
 * ValidationResult - Full-screen validation feedback for ticket scanning
 *
 * Features:
 * - Large, high-contrast status display for dark venues
 * - Color-coded feedback: green (valid), red (error), yellow (warning)
 * - Auto-dismiss after configurable timeout
 * - Visual feedback animations (pulse effect)
 * - Ticket details display for valid scans
 * - Previous scan timestamp for duplicates
 *
 * @example
 * ```tsx
 * <ValidationResult
 *   status="valid"
 *   ticketDetails={{
 *     ticketId: "TIW-2024-1234",
 *     eventTitle: "Les Misérables",
 *     quantity: 2,
 *     holderName: "Ahmed Ben Ali",
 *   }}
 *   autoDismissMs={2000}
 *   onDismiss={() => setShowResult(false)}
 * />
 * ```
 */
export function ValidationResult({
  status,
  ticketDetails,
  scannedAt,
  autoDismissMs = 2000,
  onDismiss,
  labels = defaultLabels,
  className,
}: ValidationResultProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [isPulsing, setIsPulsing] = useState(true)

  const config = statusConfig[status]
  const Icon = config.IconComponent
  const statusLabel = labels[config.labelKey]

  // Handle auto-dismiss
  useEffect(() => {
    if (autoDismissMs > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        onDismiss?.()
      }, autoDismissMs)

      return () => clearTimeout(timer)
    }
  }, [autoDismissMs, onDismiss])

  // Stop pulsing animation after initial feedback
  useEffect(() => {
    const pulseTimer = setTimeout(() => {
      setIsPulsing(false)
    }, 500)

    return () => clearTimeout(pulseTimer)
  }, [])

  const handleClick = useCallback(() => {
    setIsVisible(false)
    onDismiss?.()
  }, [onDismiss])

  if (!isVisible) return null

  return (
    <div
      role="alert"
      aria-live="assertive"
      onClick={handleClick}
      className={cn(
        // Full screen overlay
        "fixed inset-0 z-50 flex flex-col items-center justify-center p-6",
        // High contrast background
        config.bg,
        // Entrance animation
        "animate-in fade-in zoom-in-95 duration-200",
        // Pulse animation for feedback
        isPulsing && "animate-pulse",
        // Cursor for dismissal
        "cursor-pointer",
        className
      )}
    >
      {/* Large status icon */}
      <div
        className={cn(
          "mb-6 flex h-32 w-32 items-center justify-center rounded-full border-4",
          config.border,
          config.textColor
        )}
      >
        <Icon className="h-20 w-20" strokeWidth={2.5} />
      </div>

      {/* Status message */}
      <h1
        className={cn(
          "mb-4 text-center text-4xl font-bold tracking-wider uppercase",
          config.textColor
        )}
      >
        {statusLabel}
      </h1>

      {/* Ticket details (valid status) */}
      {status === "valid" && ticketDetails && (
        <div
          className={cn(
            "mt-4 w-full max-w-sm rounded-lg border-2 p-4",
            config.border,
            "bg-white/10"
          )}
        >
          <div className="space-y-2 text-center">
            {/* Ticket ID */}
            <div className="flex items-center justify-center gap-2">
              <Ticket className={cn("h-5 w-5", config.textColor)} />
              <span className={cn("font-mono text-lg", config.textColor)}>
                {ticketDetails.ticketId}
              </span>
            </div>

            {/* Event title */}
            <p className={cn("text-xl font-semibold", config.textColor)}>
              {ticketDetails.eventTitle}
            </p>

            {/* Quantity */}
            <p className={cn("text-2xl font-bold", config.textColor)}>
              {labels.quantity}: {ticketDetails.quantity}
            </p>

            {/* Holder name */}
            {ticketDetails.holderName && (
              <p className={cn("text-lg opacity-90", config.textColor)}>
                {labels.holder}: {ticketDetails.holderName}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Previous scan timestamp (already-scanned status) */}
      {status === "already-scanned" && scannedAt && (
        <div
          className={cn(
            "mt-4 flex items-center gap-2 rounded-lg px-4 py-2",
            "bg-white/10"
          )}
        >
          <Clock className={cn("h-5 w-5", config.textColor)} />
          <span className={cn("font-mono text-lg", config.textColor)}>
            {labels.scannedAt}: {formatTime(scannedAt)}
          </span>
        </div>
      )}

      {/* Tap to dismiss hint */}
      <p
        className={cn("absolute bottom-8 text-sm opacity-70", config.textColor)}
      >
        Tap to dismiss
      </p>
    </div>
  )
}

ValidationResult.displayName = "ValidationResult"

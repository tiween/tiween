"use client"

import * as React from "react"
import { Calendar, Heart, Search, Ticket, WifiOff } from "lucide-react"

import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

/**
 * Preset variant names for common empty states
 */
export type EmptyStateVariant =
  | "noResults"
  | "emptyWatchlist"
  | "noTickets"
  | "noEvents"
  | "offline"
  | "custom"

/**
 * Action button configuration
 */
export interface EmptyStateAction {
  label: string
  onClick: () => void
}

/**
 * Localized labels for preset variants
 */
export interface EmptyStateLabels {
  noResults?: {
    title: string
    description: string
  }
  emptyWatchlist?: {
    title: string
    description: string
  }
  noTickets?: {
    title: string
    description: string
  }
  noEvents?: {
    title: string
    description: string
  }
  offline?: {
    title: string
    description: string
  }
}

export interface EmptyStateProps {
  /** Preset variant for common empty states */
  variant?: EmptyStateVariant
  /** Custom title (overrides preset) */
  title?: string
  /** Custom description (overrides preset) */
  description?: string
  /** Custom illustration element (overrides preset icon) */
  illustration?: React.ReactNode
  /** Primary call-to-action button */
  primaryAction?: EmptyStateAction
  /** Secondary/alternate action button */
  secondaryAction?: EmptyStateAction
  /** Localized labels for preset variants */
  labels?: EmptyStateLabels
  /** Additional CSS classes */
  className?: string
}

/**
 * Default French labels for preset variants
 */
const defaultLabels: Required<EmptyStateLabels> = {
  noResults: {
    title: "Aucun résultat",
    description: "Essayez une autre recherche",
  },
  emptyWatchlist: {
    title: "Votre watchlist est vide",
    description: "Ajoutez des événements pour les retrouver ici",
  },
  noTickets: {
    title: "Pas de billets",
    description: "Vos billets apparaîtront ici après achat",
  },
  noEvents: {
    title: "Aucun événement",
    description: "Aucun événement dans cette catégorie",
  },
  offline: {
    title: "Vous êtes hors ligne",
    description: "Vérifiez votre connexion internet",
  },
}

/**
 * Icon mapping for preset variants
 */
const variantIcons: Record<Exclude<EmptyStateVariant, "custom">, LucideIcon> = {
  noResults: Search,
  emptyWatchlist: Heart,
  noTickets: Ticket,
  noEvents: Calendar,
  offline: WifiOff,
}

/**
 * EmptyState - Reusable component for displaying empty/zero states
 *
 * Use this component when:
 * - Search returns no results
 * - User's watchlist is empty
 * - User has no tickets
 * - A category has no events
 * - User is offline
 *
 * Features:
 * - Preset variants with icons and French text
 * - Custom illustration slot
 * - Primary and secondary action buttons
 * - i18n support via labels prop
 * - RTL support (centered layout)
 *
 * @example
 * ```tsx
 * // Using preset variant
 * <EmptyState variant="noResults" />
 *
 * // With action button
 * <EmptyState
 *   variant="emptyWatchlist"
 *   primaryAction={{
 *     label: "Découvrir des événements",
 *     onClick: () => router.push("/"),
 *   }}
 * />
 *
 * // Fully custom
 * <EmptyState
 *   variant="custom"
 *   title="Custom Title"
 *   description="Custom description"
 *   illustration={<MyCustomIcon />}
 * />
 * ```
 */
export function EmptyState({
  variant = "custom",
  title,
  description,
  illustration,
  primaryAction,
  secondaryAction,
  labels,
  className,
}: EmptyStateProps) {
  // Merge provided labels with defaults
  const mergedLabels = {
    ...defaultLabels,
    ...labels,
  }

  // Determine title and description from props or preset
  const displayTitle =
    title || (variant !== "custom" ? mergedLabels[variant]?.title : "") || ""
  const displayDescription =
    description ||
    (variant !== "custom" ? mergedLabels[variant]?.description : "") ||
    ""

  // Determine icon from preset or use custom illustration
  const Icon = variant !== "custom" ? variantIcons[variant] : null

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 text-center",
        className
      )}
      role="status"
      aria-live="polite"
    >
      {/* Illustration or Icon */}
      {illustration ? (
        <div className="mb-4">{illustration}</div>
      ) : Icon ? (
        <div className="bg-muted mb-4 rounded-full p-4">
          <Icon className="text-muted-foreground h-8 w-8" aria-hidden="true" />
        </div>
      ) : null}

      {/* Title */}
      {displayTitle && (
        <h3 className="text-foreground mb-2 text-lg font-medium">
          {displayTitle}
        </h3>
      )}

      {/* Description */}
      {displayDescription && (
        <p className="text-muted-foreground mb-6 max-w-sm text-sm">
          {displayDescription}
        </p>
      )}

      {/* Actions */}
      {(primaryAction || secondaryAction) && (
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
          {primaryAction && (
            <Button onClick={primaryAction.onClick}>
              {primaryAction.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

EmptyState.displayName = "EmptyState"

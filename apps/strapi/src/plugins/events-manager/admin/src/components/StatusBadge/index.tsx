/**
 * StatusBadge Component
 *
 * Colored badge for displaying venue status (pending, approved, suspended).
 * Uses Strapi DS color tokens for consistent styling.
 */

import { Badge } from "@strapi/design-system"

import type { VenueStatus } from "../../hooks/useVenuesEnhanced"

interface StatusBadgeProps {
  status: VenueStatus | undefined
  size?: "S" | "M"
}

const STATUS_CONFIG: Record<
  VenueStatus,
  { label: string; backgroundColor: string; textColor: string }
> = {
  pending: {
    label: "En attente",
    backgroundColor: "warning100",
    textColor: "warning700",
  },
  approved: {
    label: "Approuvé",
    backgroundColor: "success100",
    textColor: "success700",
  },
  suspended: {
    label: "Suspendu",
    backgroundColor: "danger100",
    textColor: "danger700",
  },
}

export function StatusBadge({ status, size = "S" }: StatusBadgeProps) {
  if (!status || !(status in STATUS_CONFIG)) {
    return (
      <Badge size={size} backgroundColor="neutral100" textColor="neutral600">
        Non défini
      </Badge>
    )
  }

  const config = STATUS_CONFIG[status]

  return (
    <Badge
      size={size}
      backgroundColor={config.backgroundColor}
      textColor={config.textColor}
    >
      {config.label}
    </Badge>
  )
}

/** Get status options for dropdowns */
export const STATUS_OPTIONS: { value: VenueStatus | ""; label: string }[] = [
  { value: "", label: "Tous les statuts" },
  { value: "pending", label: "En attente" },
  { value: "approved", label: "Approuvé" },
  { value: "suspended", label: "Suspendu" },
]

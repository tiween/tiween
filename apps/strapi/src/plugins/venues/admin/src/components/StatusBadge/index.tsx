/**
 * Status pill for a venue (`pending` / `approved` / `suspended`).
 *
 * A venues-plugin copy of the events-manager badge rather than a cross-plugin
 * import: the two plugins are separate admin bundles, and an import across the
 * boundary would tie this plugin's build to a component the OTHER plugin is
 * free to change or delete. The colours are DS tokens (see `venueOptions.ts`)
 * and the labels are translated, which the events-manager copy's hardcoded
 * French strings are not.
 */
import { Badge } from "@strapi/design-system"
import { useIntl } from "react-intl"

import type { VenueStatus } from "../../hooks/useVenuesAdmin"

import { getTranslation } from "../../utils/getTranslation"
import { STATUS_BADGE_COLORS, statusLabelKey } from "../../utils/venueOptions"

interface StatusBadgeProps {
  status: VenueStatus | undefined
  size?: "S" | "M"
}

export function StatusBadge({ status, size = "S" }: StatusBadgeProps) {
  const { formatMessage } = useIntl()

  const colors =
    status && STATUS_BADGE_COLORS[status]
      ? STATUS_BADGE_COLORS[status]
      : { backgroundColor: "neutral150", textColor: "neutral600" }

  return (
    <Badge size={size} {...colors}>
      {formatMessage({
        id: getTranslation(status ? statusLabelKey(status) : "status.unknown"),
      })}
    </Badge>
  )
}

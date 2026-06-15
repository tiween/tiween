/**
 * Catalog i18n helper
 *
 * Centralizes the translation key prefix for the catalog screens
 * (works and people) so labels stay consistent across components.
 */

import { useCallback } from "react"
import { useIntl } from "react-intl"

export function useCatalogT() {
  const { formatMessage } = useIntl()

  return useCallback(
    (id: string, defaultMessage: string) =>
      formatMessage({ id: `events-manager.catalog.${id}`, defaultMessage }),
    [formatMessage]
  )
}

/** Fallback label for enum values: "set-designer" → "Set designer" */
export function humanize(value: string): string {
  const spaced = value.replace(/[-_]/g, " ").toLowerCase()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

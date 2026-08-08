/**
 * Planning i18n helper.
 *
 * Mirrors `components/Catalog/i18n.ts`: one prefix for every string the
 * planning surface renders, with the English default inlined at the call site
 * so a missing translation key degrades to readable text rather than to the key
 * itself.
 */

import { useCallback } from "react"
import { useIntl } from "react-intl"

export function usePlanningT() {
  const { formatMessage } = useIntl()

  return useCallback(
    (id: string, defaultMessage: string) =>
      formatMessage({ id: `events-manager.planning.${id}`, defaultMessage }),
    [formatMessage]
  )
}

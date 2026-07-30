/**
 * Locale guard for the DW-24 venue-picker truncation hint.
 *
 * `EventVenueFilterLabels.truncatedHint` is OPTIONAL, and the hint renders only
 * when both `truncated` and the label are set
 * (`EventVenueFilter.tsx` — `{truncated && labels.truncatedHint ? … : null}`).
 * So a key missing from one locale file, or a `tEvents("listing.venuesTruncated")`
 * wiring dropped from the events route, type-checks, keeps every component test
 * green (they pass their own label literal), and simply ships the truncation
 * affordance silently disabled — the user sees a capped venue list presented as
 * complete, which is the DW-24 dead-end this change exists to remove.
 *
 * This resolves the key with next-intl's REAL ICU engine for each locale, so
 * such a regression fails here instead.
 */
import { createTranslator } from "next-intl"
import { describe, expect, it } from "vitest"

import ar from "../../../../../locales/ar.json"
import en from "../../../../../locales/en.json"
import fr from "../../../../../locales/fr.json"

const LOCALES = [
  ["fr", fr],
  ["ar", ar],
  ["en", en],
] as const

describe("venue-picker truncation hint i18n (real ICU formatter)", () => {
  it.each(LOCALES)(
    "resolves `events.listing.venuesTruncated` to a non-empty string (%s)",
    (locale, messages) => {
      const t = createTranslator({ locale, namespace: "events", messages })

      const value = t("listing.venuesTruncated")

      expect(typeof value).toBe("string")
      expect(value.length).toBeGreaterThan(0)
      // next-intl echoes the fully-qualified key when a message is missing.
      expect(value).not.toContain("events.listing.venuesTruncated")
    }
  )
})

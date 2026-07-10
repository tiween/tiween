/**
 * ICU-format guard for the Story 5.5 `watchlist` sync-status i18n keys.
 *
 * The `WatchlistSyncStatus` component tests mock next-intl to echo keys, and the
 * `watchlist` key-parity guard (WatchlistPageClient.test.tsx) only compares the
 * key *sets* across fr/ar/en — neither actually runs the message strings through
 * an ICU formatter. So a broken plural/placeholder in `pendingChanges` (a
 * mangled `{count, plural, ...}`, a dropped `{display}`, an unbalanced brace)
 * would keep the key present in all three files and keep the echo-mock component
 * tests green, yet throw or render garbled text at runtime.
 *
 * This test formats the new keys with next-intl's REAL `createTranslator` (the
 * same ICU engine used at runtime) for each locale, so such a regression fails
 * here instead of shipping.
 */
import { createTranslator } from "next-intl"
import { describe, expect, it } from "vitest"

import ar from "../../../../../../locales/ar.json"
import en from "../../../../../../locales/en.json"
import fr from "../../../../../../locales/fr.json"

const LOCALES = [
  ["fr", fr],
  ["ar", ar],
  ["en", en],
] as const

describe("watchlist sync-status i18n (real ICU formatter)", () => {
  it.each(LOCALES)(
    "resolves the new sync-status keys without throwing (%s)",
    (locale, messages) => {
      const t = createTranslator({ locale, namespace: "watchlist", messages })

      for (const key of [
        "syncStatusTitle",
        "syncStatusOnline",
        "neverSynced",
      ] as const) {
        const value = t(key)
        expect(typeof value).toBe("string")
        expect(value.length).toBeGreaterThan(0)
      }

      // Reused keys the section also renders (added in earlier stories).
      expect(t("offlineIndicator").length).toBeGreaterThan(0)
      expect(t("lastSynced", { time: "5 min" })).toContain("5 min")
    }
  )

  it.each(LOCALES)(
    "formats the `pendingChanges` ICU plural with a substituted, Western-numeral count (%s)",
    (locale, messages) => {
      const t = createTranslator({ locale, namespace: "watchlist", messages })

      for (const count of [1, 2, 5]) {
        const out = t("pendingChanges", { count, display: String(count) })
        // `{display}` (the Western-numeral count) is substituted…
        expect(out).toContain(String(count))
        // …and no Arabic-Indic digits (from an accidental ICU `#`) leak through.
        expect(/[٠-٩]/.test(out)).toBe(false)
      }
    }
  )
})

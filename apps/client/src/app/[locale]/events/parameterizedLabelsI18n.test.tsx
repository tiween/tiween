/**
 * ICU-format guard for the three PARAMETERIZED labels that moved from the
 * server label bundles to client-side `useTranslations` (mirrors
 * `tickets/ticketingI18n.test.tsx` and `auth/notifications/notificationsI18n.test.tsx`).
 *
 * Those three lookups are now the only thing standing between the catalog and
 * the rendered badge/price text, and every component test that covers them
 * mocks next-intl to echo keys back. A wrong namespace (`events` vs
 * `home.bottomNav`), a renamed key, or a broken `{price}`/`{count}` placeholder
 * therefore ships green and only breaks in the browser — the exact failure mode
 * this change exists to close. This resolves each key against the REAL imported
 * `fr`/`ar`/`en` catalogs with next-intl's `createTranslator`.
 *
 * Lives under `app/[locale]/events/` so the existing `src/app/**\/events/*.test.tsx`
 * vitest glob already reaches it; it covers both the `events` and
 * `home.bottomNav` namespaces because the two crash sites share one root cause.
 */
import { createTranslator } from "next-intl"
import { describe, expect, it } from "vitest"

import ar from "../../../../locales/ar.json"
import en from "../../../../locales/en.json"
import fr from "../../../../locales/fr.json"

const LOCALES = [
  ["fr", fr],
  ["ar", ar],
  ["en", en],
] as const

/** Arabic-Indic digits — banned everywhere (Tunisian convention, Story 1.12). */
const ARABIC_INDIC_DIGITS = /[٠-٩]/

/** Read `a.b.c` out of a catalog, or `undefined` if any segment is absent. */
function lookup(messages: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((node, segment) => {
    if (!node || typeof node !== "object") return undefined
    return (node as Record<string, unknown>)[segment]
  }, messages)
}

/**
 * The namespace + key each client component actually calls. Drift here is the
 * whole point: change `useTranslations("events")` to a wrong namespace and the
 * catalog lookup below stops resolving.
 */
const COUNT_LABELS = [
  // `BottomNav` — `useTranslations("home.bottomNav")`
  ["home.bottomNav", "unscannedTickets"],
  ["home.bottomNav", "notifications"],
] as const

describe("parameterized RSC label i18n (real ICU formatter)", () => {
  it.each(LOCALES)(
    "resolves `events.priceFrom` with a substituted {price} (%s)",
    (locale, messages) => {
      // `createTranslator` ECHOES THE KEY PATH for a missing message rather than
      // throwing, so a non-empty result proves nothing on its own — assert the
      // message EXISTS in the catalog first.
      const raw = lookup(messages, "events.priceFrom")
      expect(
        typeof raw === "string" && raw.length > 0,
        `events.priceFrom is missing from ${locale}.json`
      ).toBe(true)
      expect(raw as string).toContain("{price}")

      // `EventCard` / `EventDetailPage` — `useTranslations("events")`
      const t = createTranslator({ locale, namespace: "events", messages })
      const out = t("priceFrom", { price: "25,000 TND" })

      expect(out).toContain("25,000 TND")
      // No raw key, and no unsubstituted placeholder left behind.
      expect(out).not.toBe("events.priceFrom")
      expect(out).not.toContain("{price}")
      expect(ARABIC_INDIC_DIGITS.test(out)).toBe(false)
    }
  )

  it.each(
    LOCALES.flatMap(([locale, messages]) =>
      COUNT_LABELS.map(
        ([namespace, key]) => [locale, messages, namespace, key] as const
      )
    )
  )(
    "resolves `%s` → `%s.%s` with a substituted {count}",
    (locale, messages, namespace, key) => {
      const raw = lookup(messages, `${namespace}.${key}`)
      expect(
        typeof raw === "string" && raw.length > 0,
        `${namespace}.${key} is missing from ${locale}.json`
      ).toBe(true)
      expect(raw as string).toContain("{count}")

      const t = createTranslator({ locale, namespace, messages })

      for (const count of [0, 1, 5, 150]) {
        const out = t(key, { count })

        expect(out).toContain(String(count))
        expect(out).not.toBe(`${namespace}.${key}`)
        expect(out).not.toContain("{count}")
        // Western (Latin) numerals only, even in Arabic.
        expect(ARABIC_INDIC_DIGITS.test(out)).toBe(false)
      }
    }
  )
})

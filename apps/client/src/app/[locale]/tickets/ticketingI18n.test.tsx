/**
 * ICU-format guard for the Story 6.4 `ticketing` keys (mirrors
 * `auth/notifications/notificationsI18n.test.tsx`).
 *
 * Every component test mocks next-intl to echo keys back, so a key that is
 * missing from a locale file — or whose `{count}` placeholder is broken — stays
 * invisible there and only breaks at runtime. This resolves each new key
 * against the REAL imported catalogs with next-intl's `createTranslator`.
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

/** Static keys the "Mes Billets" page and the ticket cards render. */
const STATIC_KEYS = [
  "viewMyTickets",
  "myTickets.title",
  "myTickets.description",
  "myTickets.loading",
  "myTickets.emptyTitle",
  "myTickets.emptyDescription",
  "myTickets.errorTitle",
  "myTickets.errorDescription",
  "myTickets.signInPrompt",
  "ticketCard.addToWallet",
  "ticketCard.share",
  "ticketCard.scanned",
  "ticketCard.scannedAt",
  "ticketCard.expired",
  "ticketCard.offlineAvailable",
  "ticketCard.qrPending",
  // Ticket-read error CODES the backend returns (Story 6.4).
  "errors.UNAUTHORIZED",
  "errors.FORBIDDEN",
  "errors.UNKNOWN_ERROR",
] as const

/** Read `a.b.c` out of a catalog, or `undefined` if any segment is absent. */
function lookup(messages: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((node, segment) => {
    if (!node || typeof node !== "object") return undefined
    return (node as Record<string, unknown>)[segment]
  }, messages)
}

describe("ticketing i18n (real ICU formatter)", () => {
  it.each(LOCALES)(
    "resolves every Story 6.4 `ticketing` key (%s)",
    (locale, messages) => {
      const t = createTranslator({ locale, namespace: "ticketing", messages })

      for (const key of STATIC_KEYS) {
        // `createTranslator` ECHOES THE KEY PATH for a missing message rather
        // than throwing, so a non-empty result proves nothing on its own. Assert
        // the message EXISTS in the catalog, then that it renders — otherwise a
        // key absent from `ar.json` would sail through this suite and surface as
        // "ticketing.myTickets.title" on the live page.
        const raw = lookup(messages, `ticketing.${key}`)
        expect(
          typeof raw === "string" && raw.length > 0,
          `ticketing.${key} is missing from ${locale}.json`
        ).toBe(true)

        const rendered = t(key)
        expect(rendered.length).toBeGreaterThan(0)
        expect(rendered).not.toBe(`ticketing.${key}`)
      }
    }
  )

  it("keeps the `ticketing` key set identical across fr/ar/en", () => {
    const flatten = (node: unknown, prefix = ""): string[] => {
      if (typeof node !== "object" || node === null) return [prefix]
      return Object.entries(node as Record<string, unknown>).flatMap(
        ([key, value]) => flatten(value, prefix ? `${prefix}.${key}` : key)
      )
    }

    const [reference, ...others] = LOCALES.map(
      ([locale, messages]) =>
        [locale, flatten(lookup(messages, "ticketing")).sort()] as const
    )

    for (const [locale, keys] of others) {
      // A key present in one catalog and missing from another renders the raw
      // key path to that locale's users. Compared as sets so the failure names
      // the offending key rather than just "not equal".
      expect(
        keys,
        `ticketing keys differ between ${reference[0]} and ${locale}`
      ).toEqual(reference[1])
    }
  })

  it.each(LOCALES)(
    "formats `ticketCard.tickets` with a substituted {count} (%s)",
    (locale, messages) => {
      const t = createTranslator({ locale, namespace: "ticketing", messages })

      for (const count of [1, 2, 11]) {
        const out = t("ticketCard.tickets", { count })
        expect(out).toContain(String(count))
        // Western (Latin) numerals only, even in Arabic (Tunisian convention).
        expect(/[٠-٩]/.test(out)).toBe(false)
      }
    }
  )
})

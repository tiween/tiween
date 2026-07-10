/**
 * ICU-format guard for the Story 5.6 notification i18n keys (mirrors
 * `watchlistSyncI18n.test.tsx`).
 *
 * The component tests mock next-intl to echo keys, and the key-parity guards only
 * compare key *sets* across fr/ar/en — neither runs the message strings through
 * the real ICU engine. So a broken `{title}` / `{time}` / `{count}` placeholder
 * (a typo, an unbalanced brace) would stay present in all three files and keep
 * the echo-mock tests green, yet throw or render garbled text at runtime.
 *
 * This formats the new keys with next-intl's REAL `createTranslator` for each
 * locale, so such a regression fails here instead of shipping.
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

const CHANGE_TYPES = [
  "showtime_changed",
  "cancelled",
  "postponed",
  "rescheduled",
] as const

describe("notifications i18n (real ICU formatter)", () => {
  it.each(LOCALES)(
    "resolves the `notifications` namespace keys + {title}/{time} placeholders (%s)",
    (locale, messages) => {
      const t = createTranslator({
        locale,
        namespace: "notifications",
        messages,
      })

      // Static keys the page renders.
      for (const key of [
        "title",
        "back",
        "unread",
        "emptyTitle",
        "emptyDescription",
        "emptyAction",
        "error",
        "newTimeToBeConfirmed",
      ] as const) {
        expect(t(key).length).toBeGreaterThan(0)
      }

      // `{title}` substitution in every change-type headline.
      for (const changeType of CHANGE_TYPES) {
        const out = t(`changeType.${changeType}`, { title: "Dune" })
        expect(out).toContain("Dune")
      }

      // `{time}` substitution in the cancellation line.
      expect(t("wasScheduledFor", { time: "13/07/2026 18:00" })).toContain(
        "13/07/2026 18:00"
      )
    }
  )

  it.each(LOCALES)(
    "resolves the `profile.notifications` toggle keys (%s)",
    (locale, messages) => {
      const t = createTranslator({
        locale,
        namespace: "profile",
        messages,
      })

      for (const key of [
        "notifications.title",
        "notifications.viewAll",
        "notifications.emailLabel",
        "notifications.emailDescription",
      ] as const) {
        expect(t(key).length).toBeGreaterThan(0)
      }
    }
  )

  it.each(LOCALES)(
    "formats `home.bottomNav.notifications` with a substituted {count} (%s)",
    (locale, messages) => {
      const t = createTranslator({ locale, namespace: "home", messages })

      for (const count of [1, 5, 99]) {
        const out = t("bottomNav.notifications", { count })
        expect(out).toContain(String(count))
        // Western (Latin) numerals only, even in Arabic (Tunisian convention).
        expect(/[٠-٩]/.test(out)).toBe(false)
      }
    }
  )
})

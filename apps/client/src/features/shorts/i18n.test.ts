import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * Locale parity and completeness guard for the Phase 2 shorts copy.
 *
 * - D-09: crew role labels come from the client locale files, keyed by the
 *   `creditRole.slug`, so every seeded slug needs a label in all three locales
 *   (an unlabelled role falls back to a humanized slug, which is a visible
 *   regression on /ar and /en).
 * - D-19: `languageNames.ber` sits beside `languageNames.aeb` so a Berber film
 *   is labelled instead of falling through to a raw language code.
 *
 * The catalogs are read from disk (not imported through next-intl) so a missing
 * English or Arabic key fails here instead of shipping a raw key path to /en or
 * /ar.
 */

type Messages = { [key: string]: string | Messages }

const LOCALES = ["fr", "ar", "en"] as const
type Locale = (typeof LOCALES)[number]

const catalogs = Object.fromEntries(
  LOCALES.map((locale) => [
    locale,
    JSON.parse(
      readFileSync(join(process.cwd(), "locales", `${locale}.json`), "utf8")
    ) as Messages,
  ])
) as Record<Locale, Messages>

function resolve(locale: Locale, path: string): string | Messages | undefined {
  let node: string | Messages | undefined = catalogs[locale]
  for (const segment of path.split(".")) {
    if (node === undefined || typeof node === "string") return undefined
    node = node[segment]
  }
  return node
}

function keysOf(locale: Locale, path: string): string[] {
  const node = resolve(locale, path)
  if (node === undefined || typeof node === "string") return []
  return Object.keys(node)
}

/** Distinct top-level `{name}` ICU arguments (plural/select bodies excluded). */
function placeholders(message: string): string[] {
  const names = new Set<string>()
  const top = message.replace(/\{[^{}]*,\s*(?:plural|select)[^]*$/u, "")
  for (const match of top.matchAll(/\{(\w+)\}/gu)) names.add(match[1])
  for (const match of message.matchAll(/\{(\w+)\s*,\s*(?:plural|select)/gu)) {
    names.add(match[1])
  }
  return [...names].sort()
}

const DEPARTMENTS = [
  "directing",
  "writing",
  "production",
  "camera",
  "editing",
  "sound",
  "music",
  "art",
  "costume-makeup",
  "lighting",
  "stage",
  "other",
]

const ROLES = [
  "director",
  "assistant-director",
  "choreographer",
  "screenwriter",
  "playwright",
  "adaptor",
  "translator",
  "producer",
  "director-of-photography",
  "editor",
  "sound-engineer",
  "sound-designer",
  "composer",
  "musical-director",
  "art-director",
  "set-designer",
  "costume-designer",
  "lighting-designer",
  "projection-designer",
  "stage-manager",
  "other",
]

const LEAF_KEYS = [
  "shorts.directory.title",
  "shorts.directory.catalogEmptyTitle",
  "shorts.directory.catalogEmptyBody",
  "shorts.detail.browseAll",
  "shorts.detail.loading",
  "shorts.detail.errorTitle",
  "shorts.detail.notFoundTitle",
  "shorts.watchlistAdd",
  "shorts.watchlistRemove",
  "shorts.card.watchlistAdd",
  "shorts.card.watchlistRemove",
  "shorts.crew.title",
  "shorts.originalTitle",
  "shorts.countryLabel",
  "shorts.languageLabel",
  "shorts.languageNames.aeb",
  "shorts.languageNames.ber",
  "shorts.access.free",
  "shorts.access.included",
  "shorts.access.subscription",
  "shorts.access.rental",
  "watchlist.loginRequiredShort",
  "watchlist.undoRemove",
  "errors.INTERNAL_ERROR",
  "errors.NETWORK_ERROR",
  "errors.SHORT_FILM_NOT_FOUND",
  ...DEPARTMENTS.map((slug) => `shorts.crew.departments.${slug}`),
  ...ROLES.map((slug) => `shorts.crew.roles.${slug}`),
]

describe("Phase 2 shorts copy", () => {
  describe.each(LOCALES)("%s", (locale) => {
    it("resolves every required key to a non-empty string", () => {
      const missing = LEAF_KEYS.filter((path) => {
        const value = resolve(locale, path)
        return typeof value !== "string" || value.trim() === ""
      })
      expect(missing).toEqual([])
    })

    it("has exactly the 12 crew departments", () => {
      expect(keysOf(locale, "shorts.crew.departments").sort()).toEqual(
        [...DEPARTMENTS].sort()
      )
    })

    it("has exactly the 21 seeded crew roles", () => {
      expect(keysOf(locale, "shorts.crew.roles").sort()).toEqual(
        [...ROLES].sort()
      )
    })

    it("has exactly the four access types", () => {
      expect(keysOf(locale, "shorts.access").sort()).toEqual(
        ["free", "included", "rental", "subscription"].sort()
      )
    })

    it("has the aeb and ber language names", () => {
      expect(keysOf(locale, "shorts.languageNames").sort()).toEqual([
        "aeb",
        "ber",
      ])
    })

    it("has the three new user-visible error codes", () => {
      const errors = keysOf(locale, "errors")
      for (const code of [
        "INTERNAL_ERROR",
        "NETWORK_ERROR",
        "SHORT_FILM_NOT_FOUND",
      ]) {
        expect(errors).toContain(code)
      }
      // VALIDATION_FAILED and UNSUPPORTED_LOCALE resolve to INTERNAL_ERROR.
      expect(errors).not.toContain("VALIDATION_FAILED")
      expect(errors).not.toContain("UNSUPPORTED_LOCALE")
    })

    it("has the two new watchlist keys", () => {
      const watchlist = keysOf(locale, "watchlist")
      expect(watchlist).toContain("loginRequiredShort")
      expect(watchlist).toContain("undoRemove")
    })

    it("keeps the legacy keys until the plans that stop using them remove them", () => {
      for (const path of [
        "shorts.watchlist",
        "shorts.removeFromWatchlist",
        "shorts.hero",
        "shorts.directory.emptyTitle",
        "shorts.directory.retry",
      ]) {
        expect(resolve(locale, path), path).toBeDefined()
      }
    })
  })

  it("keeps identical ICU placeholders across fr, ar and en", () => {
    const mismatches = LEAF_KEYS.filter((path) => {
      const [fr, ar, en] = LOCALES.map((locale) => {
        const value = resolve(locale, path)
        return typeof value === "string" ? placeholders(value) : []
      })
      return (
        JSON.stringify(fr) !== JSON.stringify(ar) ||
        JSON.stringify(fr) !== JSON.stringify(en)
      )
    })
    expect(mismatches).toEqual([])
  })

  it("takes a {title} argument on the card heart labels and original title", () => {
    for (const locale of LOCALES) {
      for (const path of [
        "shorts.card.watchlistAdd",
        "shorts.card.watchlistRemove",
        "shorts.originalTitle",
      ]) {
        expect(placeholders(resolve(locale, path) as string)).toEqual(["title"])
      }
    }
  })

  it("selects the count labels with an ICU plural and renders no number", () => {
    for (const locale of LOCALES) {
      for (const path of ["shorts.countryLabel", "shorts.languageLabel"]) {
        const message = resolve(locale, path) as string
        expect(message).toMatch(/\{count,\s*plural/u)
        // A hash placeholder would format with the message locale and could
        // render Arabic-Indic digits (RESEARCH Pitfall 13).
        expect(message).not.toContain("#")
      }
    }
  })
})

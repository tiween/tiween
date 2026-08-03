import { readFileSync } from "node:fs"
import { join } from "node:path"

import { createTranslator } from "next-intl"
import { describe, expect, it } from "vitest"

import { toNumeralSafeLocale } from "./intl-locale"

/**
 * Catalog-wide Western-numeral gate for the Arabic message file.
 *
 * The AST rule `@tiween/western-numerals` covers every `Intl` / `toLocale*String`
 * call site, but ICU messages are a second, AST-invisible surface: an ICU `#`
 * inside a plural is formatted by `intl-messageformat` using the *message*
 * locale, so it renders Arabic-Indic digits wherever `ar` resolves to the `arab`
 * numbering system. That is exactly the story-5.5 defect.
 *
 * The gate is deliberately measured at **`ar-u-nu-arab`**, not `ar`. On this
 * toolchain (Node 22 / ICU 77) `ar` already defaults to `latn`, so rendering the
 * catalog at plain `ar` reports zero violations even when the bug is present —
 * a guard measured there proves nothing. Forcing the worst case reproduces what
 * an ICU/CLDR build with an `arab` default for `ar` would show.
 *
 * Fix pattern when this fails: replace the `#` with a pre-formatted `{display}`
 * argument fed by `toNumeralSafeLocale` at the call site, keeping `{count}` for
 * plural selection (see `watchlist.pendingChanges`, `search.resultsFor`).
 */

/**
 * Arabic-Indic (U+0660–0669) and Extended Arabic-Indic (U+06F0–06F9) digits,
 * plus the Arabic decimal (U+066B) and thousands (U+066C) separators — an
 * `arab`-formatted `1234` is `١٬٢٣٤`, so the separator is part of the tell.
 */
const ARABIC_INDIC_DIGITS = /[٠-٩۰-۹٫٬]/

/**
 * Counts that between them select every ICU plural category Arabic defines
 * (`zero`, `one`, `two`, `few`, `many`, `other`) plus the `=0` / `=1` exact
 * forms. Rendering each message at a single count would leave most branches of
 * every plural unmeasured — a `#` added to a `one` branch would ship silently.
 */
const PLURAL_PROBE_COUNTS = [0, 1, 2, 3, 11, 100]

/** The worst-case locale: Arabic with the `arab` numbering system forced on. */
const FORCED_ARAB_LOCALE = "ar-u-nu-arab"

// `import.meta.url` is not a file URL under the jsdom environment, so resolve
// from the vitest root (apps/client) instead.
const messagesPath = join(process.cwd(), "locales", "ar.json")

type MessageTree = { [key: string]: string | MessageTree }

const messages = JSON.parse(
  readFileSync(messagesPath, "utf-8")
) as unknown as MessageTree

/** Flatten the catalog into `[dotted.key, icuMessage]` pairs. */
function flatten(tree: MessageTree, prefix = ""): [string, string][] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return typeof value === "string"
      ? ([[path, value]] as [string, string][])
      : flatten(value, path)
  })
}

const entries = flatten(messages)

/**
 * Every ICU argument name in a message (`{name}`, `{name, plural, …}`, …). The
 * gate feeds each of them a number, which is what makes the *typed* positions
 * — `{n, number}`, `{n, plural}` / `#`, `{d, date}` / `{d, time}` — actually
 * format under the forced `arab` numbering system.
 *
 * Two limits, deliberate: a bare `{name}` is stringified rather than
 * number-formatted (its digits come from the caller, not the catalog, so the
 * catalog gate is the wrong place to measure it), and since every argument gets
 * the same numeric probe, a `{kind, select, …}` message is only ever exercised
 * through its `other` branch. Tracked as deferred work.
 */
function argumentNames(message: string): string[] {
  return [...message.matchAll(/\{\s*([A-Za-z0-9_]+)\s*[,}]/g)].map(
    (match) => match[1]!
  )
}

/** Rich-text tag names (`<b>…</b>`), which next-intl requires handlers for. */
function tagNames(message: string): string[] {
  return [...message.matchAll(/<([A-Za-z][A-Za-z0-9]*)>/g)].map(
    (match) => match[1]!
  )
}

describe("ar.json renders Western numerals under a forced arab numbering system", () => {
  it("has messages to check", () => {
    expect(entries.length).toBeGreaterThan(100)
  })

  it("renders no Arabic-Indic digit in any message", () => {
    const t = createTranslator({
      locale: FORCED_ARAB_LOCALE,
      messages: messages as never,
      // Surface nothing to the console; formatting problems are asserted below.
      onError: () => {},
      getMessageFallback: ({ key }) => `__FALLBACK__${key}`,
    })

    const offenders: string[] = []
    const unrenderable: string[] = []

    for (const [key, message] of entries) {
      for (const count of PLURAL_PROBE_COUNTS) {
        const values: Record<string, unknown> = {}
        for (const name of argumentNames(message)) values[name] = count
        for (const tag of tagNames(message)) {
          values[tag] = (chunks: unknown) => chunks
        }

        let rendered: string
        try {
          rendered = String(
            (t as (k: string, v: Record<string, unknown>) => unknown)(
              key,
              values
            )
          )
        } catch (error) {
          unrenderable.push(`${key}@${count}: ${(error as Error).message}`)
          continue
        }

        if (rendered.startsWith("__FALLBACK__")) {
          unrenderable.push(`${key}@${count}: message failed to format`)
          continue
        }
        if (ARABIC_INDIC_DIGITS.test(rendered)) {
          offenders.push(`${key}@${count} → ${rendered}`)
        }
      }
    }

    expect(unrenderable).toEqual([])
    expect(offenders).toEqual([])
  })

  it("substitutes `search.resultsFor` from the arguments its call site passes", () => {
    // The `#` → `{display}` rewrite made `display` a *required* argument in all
    // three catalogs. Omitting it does not throw — next-intl reports a
    // formatting error and renders the raw message key — so without this
    // assertion a caller that drops `display` would ship a header reading
    // "search.resultsFor". These are exactly the arguments SearchPageClient
    // supplies (`src/app/[locale]/search/SearchPageClient.tsx`).
    for (const locale of ["ar", "fr", "en"] as const) {
      const catalog = JSON.parse(
        readFileSync(join(process.cwd(), "locales", `${locale}.json`), "utf-8")
      ) as MessageTree
      const t = createTranslator({
        locale,
        messages: catalog as never,
        onError: () => {},
        getMessageFallback: ({ key }) => `__FALLBACK__${key}`,
      })
      for (const count of [1, 3]) {
        const rendered = String(
          (t as (k: string, v: Record<string, unknown>) => unknown)(
            "search.resultsFor",
            {
              count,
              display: new Intl.NumberFormat(
                toNumeralSafeLocale(locale)
              ).format(count),
              query: "tiween",
            }
          )
        )
        expect(rendered).not.toContain("__FALLBACK__")
        expect(rendered).toContain(String(count))
        expect(rendered).toContain("tiween")
      }
    }
  })

  it("would catch a raw ICU `#` — control", () => {
    // Proves the assertion above has teeth on this host: the same shape that
    // `search.resultsFor` used to have does render Arabic-Indic digits here.
    const t = createTranslator({
      locale: FORCED_ARAB_LOCALE,
      messages: {
        probe: "{count, plural, one {# نتيجة} other {# نتائج}}",
      } as never,
    })
    expect(String(t("probe" as never, { count: 3 } as never))).toMatch(
      ARABIC_INDIC_DIGITS
    )
  })
})

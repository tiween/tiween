/**
 * Country and language names in the page locale.
 *
 * D-19: the page never prints a raw code. Codes are shape-checked BEFORE
 * `Intl.DisplayNames` sees them (`of("none")` throws a RangeError on Node 22 /
 * ICU 77), the call is wrapped in try/catch, and a result that merely echoes
 * the code is dropped. Project language codes the runtime ICU cannot name
 * (`aeb`, `ber`) come from caller-supplied overrides, so this module stays
 * catalog-free. Every formatter takes the numeral-safe locale.
 */

import { toNumeralSafeLocale } from "@/lib/intl-locale"

/** ISO 3166 alpha-2 or UN M.49 three-digit region. */
const REGION_CODE = /^(?:[A-Za-z]{2}|\d{3})$/
/** ISO 639 two or three ASCII letters. */
const LANGUAGE_CODE = /^[A-Za-z]{2,3}$/

type PlaceNameType = "region" | "language"

function namesFor(
  codes: readonly string[] | null | undefined,
  locale: string,
  type: PlaceNameType,
  overrides: Readonly<Record<string, string>>
): string[] {
  if (!codes || codes.length === 0) return []

  const shape = type === "region" ? REGION_CODE : LANGUAGE_CODE
  const lowerOverrides = new Map<string, string>()
  for (const [code, name] of Object.entries(overrides)) {
    if (name.trim()) lowerOverrides.set(code.toLowerCase(), name.trim())
  }

  let displayNames: Intl.DisplayNames | null | undefined
  const lookup = (code: string): string | undefined => {
    if (displayNames === undefined) {
      try {
        displayNames = new Intl.DisplayNames([toNumeralSafeLocale(locale)], {
          type,
          fallback: "none",
        })
      } catch {
        displayNames = null
      }
    }
    return displayNames?.of(code)
  }

  const seen = new Set<string>()
  const names: string[] = []
  for (const raw of codes) {
    if (typeof raw !== "string") continue
    const code = raw.trim()
    if (!shape.test(code)) continue

    const normalized =
      type === "region" ? code.toUpperCase() : code.toLowerCase()
    let name: string | undefined
    try {
      name =
        type === "language"
          ? lowerOverrides.get(normalized) ?? lookup(normalized)
          : lookup(normalized)
    } catch {
      continue
    }

    const trimmed = name?.trim()
    if (!trimmed || trimmed.toLowerCase() === normalized.toLowerCase()) continue
    if (seen.has(trimmed)) continue
    seen.add(trimmed)
    names.push(trimmed)
  }
  return names
}

/** Region codes to names in `locale`, invalid or unnameable codes dropped. */
export function countryNames(
  codes: readonly string[] | null | undefined,
  locale: string
): string[] {
  return namesFor(codes, locale, "region", {})
}

/**
 * Language codes to names in `locale`. `overrides` (code to name) win over the
 * runtime ICU and are matched case-insensitively.
 */
export function languageNames(
  codes: readonly string[] | null | undefined,
  locale: string,
  overrides: Readonly<Record<string, string>> = {}
): string[] {
  return namesFor(codes, locale, "language", overrides)
}

/**
 * Join names with a locale-aware list. `short` rather than `narrow`: the
 * narrow unit style separates Latin-script names with a bare space in fr and
 * en ("Tunisie France"), which reads as one name.
 */
export function joinNames(names: readonly string[], locale: string): string {
  if (names.length === 0) return ""
  return new Intl.ListFormat(toNumeralSafeLocale(locale), {
    type: "unit",
    style: "short",
  }).format(names)
}

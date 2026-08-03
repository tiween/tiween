/**
 * The single place the "Arabic renders Western numerals" invariant is expressed
 * for `Intl` / `toLocale*String` call sites (`project-context.md:110`, `:173`).
 *
 * Why it exists: a locale tag's numbering system is a CLDR- and host-dependent
 * default. On Node 22 / ICU 77 both `ar` and `ar-TN` happen to resolve to
 * `latn`, but on an ICU build where `ar` defaults to `arab` the very same code
 * renders `٣`. Only an explicit `-u-nu-latn` Unicode extension is a guarantee,
 * so every formatter locale is routed through here — and the local ESLint rule
 * `@tiween/western-numerals` treats a call to this helper as the proof it needs.
 *
 * The helper is deliberately *word-preserving*: it never changes the language or
 * region subtags, only the numbering system. A site that resolves `ar` to a
 * French locale keeps doing so; a site that keeps Arabic words keeps them.
 */

const DEFAULT_FALLBACK = "fr-TN"

/**
 * Return `locale` with a guaranteed Latin (Western) numbering system.
 *
 * Built on `Intl.Locale` rather than string concatenation, because a tag may
 * already carry a Unicode extension: naively appending would yield
 * `"ar-u-ca-islamic-u-nu-latn"` — two `-u-` singletons, an invalid BCP-47 tag
 * that makes every `Intl` constructor throw `RangeError` mid-render.
 *
 * - `undefined` / `""` falls back to `fallback` (default `"fr-TN"`, the app's
 *   default locale) rather than the ambient runtime default.
 * - An existing numbering system is **overridden**, never honored. The whole
 *   point of the helper is that `latn` is not negotiable; an `-u-nu-arab` tag
 *   arriving from a URL segment or a stored preference must not defeat it.
 * - An unparseable tag degrades to the fallback instead of throwing, so a bad
 *   locale can never take down a render.
 *
 * @example
 * toNumeralSafeLocale("ar")             // "ar-u-nu-latn"
 * toNumeralSafeLocale("fr-TN")          // "fr-TN-u-nu-latn"
 * toNumeralSafeLocale("ar-u-nu-arab")   // "ar-u-nu-latn" (overridden)
 * toNumeralSafeLocale("ar-u-ca-islamic")// "ar-u-ca-islamic-nu-latn" (valid)
 * toNumeralSafeLocale("en_US")          // "fr-TN-u-nu-latn" (unparseable)
 * toNumeralSafeLocale(undefined)        // "fr-TN-u-nu-latn"
 */
export function toNumeralSafeLocale(
  locale?: string | null,
  fallback = DEFAULT_FALLBACK
): string {
  // `typeof` rather than `?.trim()`: the helper guards a whole app's rendering,
  // and a non-string arriving from an `any`-typed boundary must degrade to the
  // fallback, not throw a TypeError outside the `try` below.
  const requested =
    typeof locale === "string" && locale.trim() ? locale.trim() : fallback
  const withLatn = (tag: string): string =>
    new Intl.Locale(tag, { numberingSystem: "latn" }).toString()

  try {
    return withLatn(requested)
  } catch {
    // The requested tag is not valid BCP-47. Try the caller's fallback, then the
    // module default, so this helper is total for every input.
    try {
      return withLatn(fallback)
    } catch {
      return withLatn(DEFAULT_FALLBACK)
    }
  }
}

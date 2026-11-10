/**
 * Silent French-fallback tagging.
 *
 * FR56 / D-11: when a translation is missing the API serves French. The page
 * never says so; the fallback text node is only tagged `lang="fr"` (and
 * `dir="ltr"` on an Arabic page) so assistive tech and fonts switch correctly.
 *
 * The API reports ONE served locale per item while title and synopsis can fall
 * back independently, so on an Arabic page the served locale is not enough: any
 * text with no Arabic script is French. An English page cannot be detected by
 * script; the rare mis-tag is accepted (RESEARCH Pitfall 11, Open Question 2:
 * a future `fallbackFields` array on the API would make this exact).
 */

import { isArabic } from "@/lib/utils/isArabic"

export interface FallbackTextAttrs {
  lang?: "fr"
  dir?: "ltr"
}

function primarySubtag(locale: string | undefined | null): string {
  return (locale ?? "").toLowerCase().split(/[-_]/)[0] ?? ""
}

/**
 * Attributes to spread on the node that renders `text`. Empty when the text
 * is in the page language (or when nothing can be said about it).
 */
export function fallbackTextAttrs(
  text: string | undefined | null,
  pageLocale: string,
  servedLocale: string | undefined | null
): FallbackTextAttrs {
  if (!text || !text.trim()) return {}

  const page = primarySubtag(pageLocale)
  // French is the fallback language: on a French page nothing needs a tag.
  if (page === "fr") return {}

  // Arabic text on an Arabic page is in the page language whatever the API
  // says (a French row can hold an Arabic-script string).
  const hasArabic = isArabic(text)
  if (page === "ar" && hasArabic) return {}

  const served = primarySubtag(servedLocale)
  const servedDiffers = served !== "" && served !== page
  const arabicPageWithoutArabic = page === "ar" && !hasArabic

  if (!servedDiffers && !arabicPageWithoutArabic) return {}
  return page === "ar" ? { lang: "fr", dir: "ltr" } : { lang: "fr" }
}

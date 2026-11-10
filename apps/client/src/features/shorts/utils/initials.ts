/**
 * Initials for the plain disc avatar.
 *
 * D-12: the API exposes no person photos, so a person is a disc with letters.
 * D-21: no avatar library. Letters are taken on grapheme clusters, never UTF-16
 * units, so a combining mark or an emoji is never cut in half.
 */

import { isArabic } from "@/lib/utils/isArabic"

/** Zero-width non-joiner: keeps two Arabic letters from fusing into one glyph. */
const ZWNJ = "‌"

function firstGrapheme(word: string): string {
  if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
    const first = new Intl.Segmenter(undefined, {
      granularity: "grapheme",
    })
      .segment(word)
      [Symbol.iterator]()
      .next()
    return first.done ? "" : first.value.segment
  }
  // Older engines without Intl.Segmenter: code points are the next best unit.
  return Array.from(word)[0] ?? ""
}

/**
 * First letter of the first and the last word, uppercased, at most two. A
 * one-word name gives one letter; a blank name gives "".
 */
export function getInitials(name: string | null | undefined): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return ""

  const letters = [words[0]!, ...(words.length > 1 ? [words.at(-1)!] : [])]
    .map((word) => firstGrapheme(word).toUpperCase())
    .filter(Boolean)

  if (letters.length === 2 && isArabic(letters[0]!) && isArabic(letters[1]!)) {
    return `${letters[0]}${ZWNJ}${letters[1]}`
  }
  return letters.join("")
}

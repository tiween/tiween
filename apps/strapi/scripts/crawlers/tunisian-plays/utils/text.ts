/**
 * Text normalization and processing utilities
 */

/**
 * Arabic to Latin transliteration map
 */
const ARABIC_TRANSLITERATION: Record<string, string> = {
  ا: "a",
  أ: "a",
  إ: "i",
  آ: "a",
  ب: "b",
  ت: "t",
  ث: "th",
  ج: "j",
  ح: "h",
  خ: "kh",
  د: "d",
  ذ: "dh",
  ر: "r",
  ز: "z",
  س: "s",
  ش: "sh",
  ص: "s",
  ض: "d",
  ط: "t",
  ظ: "z",
  ع: "a",
  غ: "gh",
  ف: "f",
  ق: "q",
  ك: "k",
  ل: "l",
  م: "m",
  ن: "n",
  ه: "h",
  و: "w",
  ي: "y",
  ى: "a",
  ة: "a",
  ء: "",
  ئ: "i",
  ؤ: "o",
  // Common diacritics
  "ً": "",
  "ٌ": "",
  "ٍ": "",
  "َ": "",
  "ُ": "",
  "ِ": "",
  "ّ": "",
  "ْ": "",
}

/**
 * French diacritics to ASCII map
 */
const FRENCH_DIACRITICS: Record<string, string> = {
  à: "a",
  â: "a",
  ä: "a",
  æ: "ae",
  ç: "c",
  é: "e",
  è: "e",
  ê: "e",
  ë: "e",
  î: "i",
  ï: "i",
  ô: "o",
  ö: "o",
  œ: "oe",
  ù: "u",
  û: "u",
  ü: "u",
  ÿ: "y",
  À: "A",
  Â: "A",
  Ä: "A",
  Æ: "AE",
  Ç: "C",
  É: "E",
  È: "E",
  Ê: "E",
  Ë: "E",
  Î: "I",
  Ï: "I",
  Ô: "O",
  Ö: "O",
  Œ: "OE",
  Ù: "U",
  Û: "U",
  Ü: "U",
  Ÿ: "Y",
}

/**
 * Check if a string contains Arabic characters
 */
export function isArabic(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text)
}

/**
 * Check if a string contains primarily Arabic text
 */
export function isPrimarilyArabic(text: string): boolean {
  const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length
  const latinChars = (text.match(/[a-zA-Z]/g) || []).length
  return arabicChars > latinChars
}

/**
 * Transliterate Arabic text to Latin characters
 */
export function transliterateArabic(text: string): string {
  let result = ""
  for (const char of text) {
    result += ARABIC_TRANSLITERATION[char] ?? char
  }
  return result
}

/**
 * Remove French diacritics
 */
export function removeDiacritics(text: string): string {
  let result = ""
  for (const char of text) {
    result += FRENCH_DIACRITICS[char] ?? char
  }
  return result
}

/**
 * Normalize text for comparison (lowercase, no diacritics, trimmed)
 */
export function normalizeForComparison(text: string): string {
  let normalized = text.toLowerCase().trim()

  // Remove Arabic diacritics
  normalized = normalized.replace(/[\u064B-\u065F]/g, "")

  // Remove French diacritics
  normalized = removeDiacritics(normalized)

  // Normalize whitespace
  normalized = normalized.replace(/\s+/g, " ")

  return normalized
}

/**
 * Generate a URL-safe slug from text
 * Handles both Arabic and Latin text
 */
export function generateSlug(text: string): string {
  let slug = text.trim().toLowerCase()

  // Transliterate Arabic if present
  if (isArabic(slug)) {
    slug = transliterateArabic(slug)
  }

  // Remove diacritics
  slug = removeDiacritics(slug)

  // Replace non-alphanumeric with hyphens
  slug = slug.replace(/[^a-z0-9]+/g, "-")

  // Remove leading/trailing hyphens
  slug = slug.replace(/^-+|-+$/g, "")

  // Collapse multiple hyphens
  slug = slug.replace(/-+/g, "-")

  return slug || "untitled"
}

/**
 * Extract year from various date formats
 */
export function extractYear(text: string): number | undefined {
  // Match 4-digit year
  const match = text.match(/\b(19|20)\d{2}\b/)
  if (match) {
    return parseInt(match[0], 10)
  }
  return undefined
}

/**
 * Parse duration from text (e.g., "1h30", "90 min", "1 heure 30 minutes")
 */
export function parseDuration(text: string): number | undefined {
  // Match "1h30" or "1h 30" format
  let match = text.match(/(\d+)\s*h\s*(\d+)?/i)
  if (match) {
    const hours = parseInt(match[1], 10)
    const minutes = match[2] ? parseInt(match[2], 10) : 0
    return hours * 60 + minutes
  }

  // Match "90 min" or "90 minutes" format
  match = text.match(/(\d+)\s*min/i)
  if (match) {
    return parseInt(match[1], 10)
  }

  // Match plain number (assume minutes)
  match = text.match(/^(\d+)$/)
  if (match) {
    const num = parseInt(match[1], 10)
    // If less than 10, probably hours
    return num < 10 ? num * 60 : num
  }

  return undefined
}

/**
 * Clean HTML entities and extra whitespace
 */
export function cleanText(text: string): string {
  return (
    text
      // Decode common HTML entities
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ")
      // Remove HTML tags
      .replace(/<[^>]*>/g, "")
      // Normalize whitespace
      .replace(/\s+/g, " ")
      .trim()
  )
}

/**
 * Split a name into potential first/last name parts
 */
export function splitName(fullName: string): { first: string; last: string } {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) {
    return { first: parts[0], last: "" }
  }
  return {
    first: parts[0],
    last: parts.slice(1).join(" "),
  }
}

/**
 * Detect the primary language of text
 */
export function detectLanguage(text: string): "ar" | "fr" | "unknown" {
  if (isPrimarilyArabic(text)) {
    return "ar"
  }
  // Check for French-specific patterns
  if (/[àâäæçéèêëîïôöœùûüÿ]/i.test(text)) {
    return "fr"
  }
  // Default to French for Latin text in Tunisian context
  if (/[a-zA-Z]/.test(text)) {
    return "fr"
  }
  return "unknown"
}

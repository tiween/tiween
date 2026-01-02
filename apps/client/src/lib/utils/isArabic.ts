/**
 * Checks if a string contains Arabic characters
 * @param text - The text to check
 * @returns true if the text contains Arabic characters
 */
export function isArabic(text: string): boolean {
  const arabicPattern = /[\u0600-\u06FF]/
  return arabicPattern.test(text)
}

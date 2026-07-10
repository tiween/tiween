/**
 * Format a ticket price for display with French/Tunisian conventions
 * (Story 6.1).
 *
 * Two decimals, a comma decimal separator, and the display symbol. The backend
 * returns the ISO-ish config currency code (e.g. "TND"); this maps `TND` -> the
 * Tunisian dinar symbol "DT" for display, keeping the backend config-driven per
 * Epic-6 rules. Any other code is shown verbatim.
 *
 * `Number.prototype.toFixed` always emits Latin (Western) numerals, so this is
 * correct for the Arabic locale (which must use Western numerals) with no extra
 * work.
 *
 * @example
 * formatPrice(15) // "15,00 DT"
 * formatPrice(12.5, "TND") // "12,50 DT"
 * formatPrice(15, "EUR") // "15,00 EUR"
 */
export function formatPrice(amount: number, currency = "TND"): string {
  const symbol = currency === "TND" ? "DT" : currency
  return `${amount.toFixed(2).replace(".", ",")} ${symbol}`
}

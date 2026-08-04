/**
 * Local store of the buyer's own order access tokens (Story 6.4).
 *
 * A guest has no account, so the only thing that authorizes them to read their
 * tickets is the per-order `accessToken` returned by `POST /ticketing/orders`.
 * It is kept in the buyer's own `localStorage` and sent as the
 * `x-order-access-token` REQUEST HEADER on
 * `GET /ticketing/order-tickets/:orderNumber` — never in a URL: not in the
 * Konnect redirect (where it would leak through the gateway and the referrer)
 * and not in a query string (where it would land in every access log).
 *
 * Cleared on sign-out (`signOutAndClearCache`) so the next person on a shared
 * device cannot open "Mes Billets" and see the previous buyer's QR codes.
 *
 * Every accessor is SSR-safe (no-ops without `window`) and tolerant of a
 * corrupt/blocked storage, so a private-mode browser degrades to "no stored
 * orders" instead of crashing the page.
 */

const STORAGE_KEY = "tiween.order-access"

/** Cap the list so the store cannot grow without bound on a shared device. */
export const ORDER_ACCESS_LIMIT = 20

export interface OrderAccess {
  orderNumber: string
  accessToken: string
  /** Epoch ms the entry was stored, used for newest-first ordering. */
  savedAt: number
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && !!window.localStorage
}

function isOrderAccess(value: unknown): value is OrderAccess {
  if (!value || typeof value !== "object") return false
  const entry = value as Record<string, unknown>
  return (
    typeof entry.orderNumber === "string" &&
    !!entry.orderNumber &&
    typeof entry.accessToken === "string" &&
    !!entry.accessToken
  )
}

/**
 * `savedAt` only ever feeds the newest-first comparator, and a hand-edited or
 * legacy entry can carry a string / `NaN` / nothing at all. A non-finite number
 * makes `b.savedAt - a.savedAt` return `NaN`, which leaves the sort order
 * arbitrary — and `slice(0, ORDER_ACCESS_LIMIT)` could then evict the buyer's
 * NEWEST order. Coerce anything that is not a finite number to 0 (sorts last)
 * rather than dropping an otherwise-usable token.
 */
function normalizeSavedAt(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

/** Read the whole store, newest-first. Returns `[]` on SSR or a bad payload. */
export function listOrderAccess(): OrderAccess[] {
  if (!isBrowser()) return []

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(isOrderAccess)
      .map((entry) => ({ ...entry, savedAt: normalizeSavedAt(entry.savedAt) }))
      .sort((a, b) => b.savedAt - a.savedAt)
      .slice(0, ORDER_ACCESS_LIMIT)
  } catch {
    return []
  }
}

/** Look up one order's stored access token, or `null`. */
export function readOrderAccess(orderNumber: string): OrderAccess | null {
  if (!orderNumber) return null
  return listOrderAccess().find((e) => e.orderNumber === orderNumber) ?? null
}

/**
 * Persist (or refresh) an order's access token. Re-saving the same order
 * replaces its entry rather than duplicating it.
 */
export function saveOrderAccess(
  orderNumber: string,
  accessToken: string
): void {
  if (!isBrowser() || !orderNumber || !accessToken) return

  const entry: OrderAccess = { orderNumber, accessToken, savedAt: Date.now() }
  const next = [
    entry,
    ...listOrderAccess().filter((e) => e.orderNumber !== orderNumber),
  ].slice(0, ORDER_ACCESS_LIMIT)

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Quota exceeded / storage blocked — the buyer can still reach their
    // tickets by signing in; never break the checkout redirect over this.
  }
}

/** Drop every stored token (e.g. on an explicit "forget my orders"). */
export function clearOrderAccess(): void {
  if (!isBrowser()) return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore — nothing to do if storage is unavailable.
  }
}

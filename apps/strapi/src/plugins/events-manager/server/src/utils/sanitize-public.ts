/**
 * Public HTTP-boundary sanitizers for the events-manager read endpoints
 * (DW-18, DW-112).
 *
 * WHY sanitize here (at the controller boundary) and NOT in the services: the
 * `events` / `ticket-tiers` / `public-api` services return the FULL truth
 * because internal cross-plugin callers reuse them — the checkout path
 * (`public-api.getSubEventContext` → ticketing `order.ts`) reads `tier.price`
 * off the complete `TicketTierOut`, and relies on the raw inventory counts to
 * validate a purchase. Stripping those fields in the service would break
 * checkout. So the rule is: services return truth, HTTP responses are
 * sanitized. These transforms run only in the public controllers.
 *
 * All functions are pure and dependency-free: no `strapi`, no side effects, and
 * they never mutate their input (they clone). Every one is null/partial-data
 * safe — a non-object or nullish input passes through unchanged.
 */

/**
 * Coerce a possibly-string numeric to a finite number (0 fallback). The
 * Postgres `pg` driver returns `decimal`/`int` columns as strings, so a plain
 * `typeof === "number"` guard would collapse real counts to 0 in production.
 */
function toNum(v: unknown): number {
  const n = typeof v === "string" ? Number(v) : v
  return typeof n === "number" && Number.isFinite(n) ? n : 0
}

/**
 * Strip the raw inventory counts (`ticketsSold` / `ticketsAvailable`) from a
 * single object, returning a clone. Non-object / nullish input passes through.
 * Shared by the embedded `ticketTiers` component and the tiers HTTP result.
 */
function stripInventoryCounts<T>(row: T): T {
  if (row === null || typeof row !== "object") return row
  const clone: Record<string, unknown> = { ...(row as Record<string, unknown>) }
  delete clone.ticketsSold
  delete clone.ticketsAvailable
  return clone as T
}

/**
 * Reduce one public sub-event (screening OR performance — both carry the same
 * inventory fields and embedded `ticketTiers`): drop the internal per-showtime
 * sell-through (`ticketsSold` / `ticketsAvailable`) and expose only a derived
 * `soldOut`.
 *
 * `soldOut = ticketsAvailable > 0 && ticketsSold >= ticketsAvailable`. An
 * unconfigured capacity (`ticketsAvailable === 0`) is NOT sold-out. A
 * non-object / nullish screening passes through unchanged.
 *
 * If the sub-event carries an embedded `ticketTiers` array (each tier component
 * itself holds `ticketsSold`/`ticketsAvailable`), those raw counts are stripped
 * too — so the sanitizer is fail-closed: it follows the schema, not whatever the
 * current controller populate happens to include. `ticketTiers` is not populated
 * on today's browse/detail reads, but adding it to a populate must not re-leak.
 */
export function sanitizeScreening<T>(screening: T): T {
  if (screening === null || typeof screening !== "object") return screening

  const raw = screening as Record<string, unknown>
  const clone: Record<string, unknown> = { ...raw }
  delete clone.ticketsSold
  delete clone.ticketsAvailable

  if (Array.isArray(raw.ticketTiers)) {
    clone.ticketTiers = raw.ticketTiers.map(stripInventoryCounts)
  }

  const avail = toNum(raw.ticketsAvailable)
  const sold = toNum(raw.ticketsSold)
  clone.soldOut = avail > 0 && sold >= avail

  return clone as T
}

/**
 * Public venue allowlist. Everything not listed (email, website, description,
 * status, capacity, type, manager, properties, timestamps, locale, images,
 * logo, events, …) is dropped. `cityRef` is kept whole — it is public geography
 * (city/region name + slug), already the only venue relation populated for
 * browse.
 */
const VENUE_PUBLIC_KEYS = [
  "id",
  "documentId",
  "name",
  "slug",
  "address",
  "phone",
  "cityRef",
  "geo",
] as const

/**
 * Return a NEW venue object containing ONLY the allowlisted public keys that
 * are present on the input. A null/undefined venue passes through unchanged.
 */
export function sanitizeVenue<T>(venue: T): T {
  if (venue === null || typeof venue !== "object") return venue

  const raw = venue as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const key of VENUE_PUBLIC_KEYS) {
    if (key in raw) out[key] = raw[key]
  }
  return out as T
}

/**
 * Sanitize a single public event doc: reduce its `venue` to the allowlist and
 * map each ticketed sub-event (`screenings` AND `performances` — both carry raw
 * inventory) through {@link sanitizeScreening}. Everything else (the movie /
 * cast graph, images, cityRef, etc.) is left untouched. A non-object / nullish
 * event passes through unchanged.
 */
export function sanitizePublicEvent<T>(event: T): T {
  if (event === null || typeof event !== "object") return event

  const raw = event as Record<string, unknown>
  const clone: Record<string, unknown> = { ...raw }

  if (raw.venue !== null && typeof raw.venue === "object") {
    clone.venue = sanitizeVenue(raw.venue)
  }

  if (Array.isArray(raw.screenings)) {
    clone.screenings = raw.screenings.map(sanitizeScreening)
  }

  if (Array.isArray(raw.performances)) {
    clone.performances = raw.performances.map(sanitizeScreening)
  }

  return clone as T
}

/**
 * Sanitize a Strapi v5 list result (`{ data: Event[], meta }`): map each event
 * in `data` through {@link sanitizePublicEvent}, leaving `meta` untouched.
 */
export function sanitizeEventsListResult<
  T extends { data?: unknown; meta?: unknown },
>(result: T): T {
  if (result === null || typeof result !== "object") return result
  return {
    ...result,
    data: Array.isArray(result.data)
      ? result.data.map(sanitizePublicEvent)
      : result.data,
  }
}

/**
 * Sanitize a ticket-tiers result: strip the raw inventory counts
 * (`ticketsSold` / `ticketsAvailable`) from every tier while keeping the
 * already-computed `remaining` / `soldOut` (and `price`, `type`, …). Does NOT
 * recompute anything — those derived fields are produced by the service's
 * `mapTier`; the controller only omits the two raw fields it also carries.
 */
export function sanitizeTicketTiersResult<T extends { tiers?: unknown }>(
  result: T
): T {
  if (result === null || typeof result !== "object") return result
  return {
    ...result,
    tiers: Array.isArray(result.tiers)
      ? result.tiers.map(stripInventoryCounts)
      : result.tiers,
  }
}

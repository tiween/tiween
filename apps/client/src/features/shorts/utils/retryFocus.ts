/**
 * Focus hand-off for a retry from `app/[locale]/shorts/error.tsx` (UI-SPEC C3
 * "Recovery": a successful retry keeps scroll at the top and moves focus to the
 * page heading).
 *
 * The error boundary unmounts on success, so it cannot focus the heading
 * itself. It marks the retry here instead; the heading that mounts next
 * (directory h1 in Plan 08, detail h1 in Plan 09) consumes the mark once. The
 * mark lives in module state because the boundary and the page share one
 * browser bundle, and it expires so an unrelated heading that mounts much later
 * is never pulled focus.
 */

/** How long a retry stays claimable. */
export const RETRY_FOCUS_TTL_MS = 15_000

let pendingSince: number | null = null

/** Called by the error boundary when the visitor presses Réessayer. */
export function markRetryPending(now: number = Date.now()): void {
  pendingSince = now
}

/**
 * Focuses `element` when a retry is pending and fresh, then clears the mark.
 * Returns whether focus moved. Safe to call on every mount: with no mark, or
 * an expired one, it does nothing.
 */
export function consumeRetryFocus(
  element: HTMLElement | null,
  now: number = Date.now()
): boolean {
  // No element yet (ref not attached): keep the mark for the real caller.
  if (pendingSince === null || !element) return false

  const fresh = now - pendingSince <= RETRY_FOCUS_TTL_MS
  pendingSince = null
  if (!fresh) return false

  element.focus()
  return true
}

/** Test seam: drops any pending mark. */
export function resetRetryFocus(): void {
  pendingSince = null
}

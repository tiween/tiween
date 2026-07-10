/**
 * Per-user, bounded, persisted pending-op queue for the watchlist.
 *
 * Story 5.1 introduced this as an add-only queue; Story 5.2 generalizes each op
 * to carry a `kind` (`"add" | "remove"`) so an offline remove can be captured
 * and replayed symmetrically. The localStorage **key literal is unchanged**
 * (`tiween:watchlist:pending-add:<userId>`) so any add queued by a 5.1 client
 * still drains after this change — a legacy op that lacks a `kind` field is
 * normalized to `kind:"add"` on read.
 *
 * WHY per-user: the key is namespaced by the authenticated user id. A queued op
 * MUST only ever replay under the exact user who created it — a single global
 * key on a shared browser would let User A's offline op land in User B's
 * watchlist. The drain (`useWatchlistSync`) is auth-gated and reads only the
 * current user's key, so a stale key from a signed-out user never matches the
 * drain scope.
 *
 * WHY last-write-wins: enqueuing any op for a `creativeWorkId` REPLACES any
 * existing pending op for that same id (add↔remove cancel to the user's latest
 * intent) and resets its `attempts` — the queue never holds two contradictory
 * ops for one id.
 *
 * WHY bounded + self-healing: each op carries an `attempts` counter. A failed
 * replay bumps it and, at `MAX_DRAIN_ATTEMPTS`, the op is dropped so a
 * permanently-failing entry (deleted/unpublished creative-work) cannot poison
 * the queue with forever-retries. The queue is capped at `MAX_QUEUE_SIZE`;
 * enqueue drops the oldest entry on overflow.
 *
 * All access is SSR-guarded (`typeof window`) and try/catch-wrapped: a read
 * failure yields `[]`, a write failure yields `false` (never a throw, never a
 * silent success).
 */

// NOTE: the `pending-add` literal is retained for 5.1 backward-compat even
// though the queue now carries removes too. Renaming it would strand any add a
// 5.1 client already queued. The key is a storage detail, not a contract.
const KEY_PREFIX = "tiween:watchlist:pending-add:"

/** Give up replaying an op after this many failed drains (then drop it). */
export const MAX_DRAIN_ATTEMPTS = 5

/** Hard cap on queued ops; enqueue drops the oldest when full. */
export const MAX_QUEUE_SIZE = 100

/** The intent an op replays: add to, or remove from, the watchlist. */
export type WatchlistOpKind = "add" | "remove"

/** A single queued watchlist operation. */
export interface PendingOp {
  kind: WatchlistOpKind
  creativeWorkId: string
  /** @deprecated ISO timestamp of when the op was queued (kept for ordering). */
  addedAt: string
  attempts: number
}

/**
 * @deprecated Use {@link PendingOp}. Retained as an alias so 5.1 imports keep
 * type-checking.
 */
export type PendingAddOp = PendingOp

/** The localStorage key for a given user's pending-op queue. */
export function pendingAddKey(userId: string | number): string {
  return `${KEY_PREFIX}${userId}`
}

/** Access localStorage defensively (absent in SSR, throws in private mode). */
function safeStorage(): Storage | null {
  if (typeof window === "undefined") return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

/** Validate the raw shape; `kind` is optional here (legacy ops lack it). */
function isValidOp(
  value: unknown
): value is { creativeWorkId: string; addedAt: string; attempts: number; kind?: unknown } {
  if (typeof value !== "object" || value === null) return false
  const op = value as Record<string, unknown>
  return (
    typeof op.creativeWorkId === "string" &&
    typeof op.addedAt === "string" &&
    // A present `kind` MUST be one of the two known values. `undefined` is a
    // legacy 5.1 op (normalized to "add"). A corrupt/unknown kind is REJECTED
    // (dropped), never silently coerced to "add" — coercion would replay a
    // corrupted remove as an add and invert the user's intent.
    (op.kind === undefined || op.kind === "add" || op.kind === "remove") &&
    // `Number.isFinite` rejects NaN/Infinity (both `typeof "number"`): a corrupt
    // `attempts` must not slip past `MAX_DRAIN_ATTEMPTS` and retry forever.
    typeof op.attempts === "number" &&
    Number.isFinite(op.attempts)
  )
}

/** Normalize a validated raw op — a legacy op with no `kind` becomes `"add"`. */
function normalizeOp(op: {
  creativeWorkId: string
  addedAt: string
  attempts: number
  kind?: unknown
}): PendingOp {
  return {
    kind: op.kind === "remove" ? "remove" : "add",
    creativeWorkId: op.creativeWorkId,
    addedAt: op.addedAt,
    attempts: op.attempts,
  }
}

/** Read + validate the queue; any failure (missing/malformed) yields `[]`. */
function readQueue(userId: string | number): PendingOp[] {
  const storage = safeStorage()
  if (!storage) return []
  try {
    const raw = storage.getItem(pendingAddKey(userId))
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isValidOp).map(normalizeOp)
  } catch {
    return []
  }
}

/** Persist the queue; a write failure (quota/private-mode) yields `false`. */
function writeQueue(userId: string | number, ops: PendingOp[]): boolean {
  const storage = safeStorage()
  if (!storage) return false
  try {
    storage.setItem(pendingAddKey(userId), JSON.stringify(ops))
    return true
  } catch {
    return false
  }
}

/** The current user's pending ops (empty when none / unreadable). */
export function getPendingOps(userId: string | number): PendingOp[] {
  return readQueue(userId)
}

/**
 * Enqueue an op of `kind` for `creativeWorkId` under `userId` with last-write-
 * wins reconciliation: any existing op for that id is REMOVED first, then the
 * fresh op is appended with `attempts` reset to 0. Enforces `MAX_QUEUE_SIZE`
 * (drops oldest on overflow). Returns `false` on any write failure / no storage
 * so the caller can surface an error instead of a false success.
 */
export function enqueueOp(
  userId: string | number,
  kind: WatchlistOpKind,
  creativeWorkId: string
): boolean {
  const storage = safeStorage()
  if (!storage) return false

  // Last-write-wins: drop any existing op for this id, then append the latest
  // intent (a fresh op with a reset retry budget). This is what makes an
  // offline add-then-remove (or remove-then-add) collapse to one op.
  const next: PendingOp[] = readQueue(userId).filter(
    (op) => op.creativeWorkId !== creativeWorkId
  )
  next.push({
    kind,
    creativeWorkId,
    addedAt: new Date().toISOString(),
    attempts: 0,
  })
  // Drop oldest entries until within the cap.
  while (next.length > MAX_QUEUE_SIZE) next.shift()

  return writeQueue(userId, next)
}

/**
 * Increment the attempt counter for a failed replay; drop the op once it
 * reaches `MAX_DRAIN_ATTEMPTS` (give up on a poison entry). Kind-agnostic.
 */
export function bumpAttempt(
  userId: string | number,
  creativeWorkId: string
): void {
  const ops = readQueue(userId)
  const next: PendingOp[] = []
  for (const op of ops) {
    if (op.creativeWorkId !== creativeWorkId) {
      next.push(op)
      continue
    }
    const attempts = op.attempts + 1
    if (attempts >= MAX_DRAIN_ATTEMPTS) continue // drop — give up
    next.push({ ...op, attempts })
  }
  writeQueue(userId, next)
}

/** Remove a single op after a successful replay. */
export function removePendingOp(
  userId: string | number,
  creativeWorkId: string
): void {
  const ops = readQueue(userId)
  writeQueue(
    userId,
    ops.filter((op) => op.creativeWorkId !== creativeWorkId)
  )
}

/** Clear the entire pending-op queue for a user. */
export function clearPendingOps(userId: string | number): void {
  const storage = safeStorage()
  if (!storage) return
  try {
    storage.removeItem(pendingAddKey(userId))
  } catch {
    // ignore — best-effort clear
  }
}

/* ------------------------------------------------------------------------- *
 * Story 5.1 compatibility wrappers
 *
 * These keep the add-named API 5.1 (`useAddToWatchlist.ts` + tests) imports
 * working unchanged. Each delegates to the generalized implementation above.
 * ------------------------------------------------------------------------- */

/** @see enqueueOp — 5.1 compat wrapper for the add path. */
export function enqueueAdd(
  userId: string | number,
  creativeWorkId: string
): boolean {
  return enqueueOp(userId, "add", creativeWorkId)
}

/** @deprecated Use {@link getPendingOps}. */
export function getPendingAdds(userId: string | number): PendingOp[] {
  return getPendingOps(userId)
}

/** @deprecated Use {@link removePendingOp}. */
export function removePendingAdd(
  userId: string | number,
  creativeWorkId: string
): void {
  removePendingOp(userId, creativeWorkId)
}

/** @deprecated Use {@link clearPendingOps}. */
export function clearPendingAdds(userId: string | number): void {
  clearPendingOps(userId)
}

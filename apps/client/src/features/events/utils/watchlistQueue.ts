/**
 * Per-user, bounded, persisted pending-**add** queue for the watchlist (Story
 * 5.1 offline capture).
 *
 * WHY per-user: the localStorage key is namespaced by the authenticated user id
 * (`tiween:watchlist:pending-add:<userId>`). A queued add MUST only ever replay
 * under the exact user who created it — a single global key on a shared browser
 * would let User A's offline add land in User B's watchlist. The drain
 * (`useWatchlistSync`) is auth-gated and reads only the current user's key, so a
 * stale key from a signed-out user simply never matches the drain scope.
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

const KEY_PREFIX = "tiween:watchlist:pending-add:"

/** Give up replaying an op after this many failed drains (then drop it). */
export const MAX_DRAIN_ATTEMPTS = 5

/** Hard cap on queued ops; enqueue drops the oldest when full. */
export const MAX_QUEUE_SIZE = 100

/** A single queued add operation. */
export interface PendingAddOp {
  creativeWorkId: string
  addedAt: string
  attempts: number
}

/** The localStorage key for a given user's pending-add queue. */
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

function isValidOp(value: unknown): value is PendingAddOp {
  if (typeof value !== "object" || value === null) return false
  const op = value as Record<string, unknown>
  return (
    typeof op.creativeWorkId === "string" &&
    typeof op.addedAt === "string" &&
    // `Number.isFinite` rejects NaN/Infinity (both `typeof "number"`): a corrupt
    // `attempts` must not slip past `MAX_DRAIN_ATTEMPTS` and retry forever.
    typeof op.attempts === "number" &&
    Number.isFinite(op.attempts)
  )
}

/** Read + validate the queue; any failure (missing/malformed) yields `[]`. */
function readQueue(userId: string | number): PendingAddOp[] {
  const storage = safeStorage()
  if (!storage) return []
  try {
    const raw = storage.getItem(pendingAddKey(userId))
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isValidOp)
  } catch {
    return []
  }
}

/** Persist the queue; a write failure (quota/private-mode) yields `false`. */
function writeQueue(userId: string | number, ops: PendingAddOp[]): boolean {
  const storage = safeStorage()
  if (!storage) return false
  try {
    storage.setItem(pendingAddKey(userId), JSON.stringify(ops))
    return true
  } catch {
    return false
  }
}

/** The current user's pending adds (empty when none / unreadable). */
export function getPendingAdds(userId: string | number): PendingAddOp[] {
  return readQueue(userId)
}

/**
 * Enqueue an add for `creativeWorkId` under `userId`. Dedupes by id, enforces
 * `MAX_QUEUE_SIZE` (drops oldest on overflow). Returns `true` on success (or
 * when the id is already queued — an idempotent no-op) and `false` when the
 * write fails, so the caller can surface an error instead of a false "queued".
 */
export function enqueueAdd(
  userId: string | number,
  creativeWorkId: string
): boolean {
  const storage = safeStorage()
  if (!storage) return false

  const ops = readQueue(userId)
  const existingIndex = ops.findIndex(
    (op) => op.creativeWorkId === creativeWorkId
  )
  if (existingIndex !== -1) {
    // Already queued — idempotent, but a fresh user tap resets the retry budget
    // so a re-add is not immediately dropped by an inherited near-poison count.
    if (ops[existingIndex].attempts === 0) return true
    const reset = [...ops]
    reset[existingIndex] = { ...reset[existingIndex], attempts: 0 }
    return writeQueue(userId, reset)
  }

  const next: PendingAddOp[] = [
    ...ops,
    { creativeWorkId, addedAt: new Date().toISOString(), attempts: 0 },
  ]
  // Drop oldest entries until within the cap.
  while (next.length > MAX_QUEUE_SIZE) next.shift()

  return writeQueue(userId, next)
}

/**
 * Increment the attempt counter for a failed replay; drop the op once it
 * reaches `MAX_DRAIN_ATTEMPTS` (give up on a poison entry).
 */
export function bumpAttempt(
  userId: string | number,
  creativeWorkId: string
): void {
  const ops = readQueue(userId)
  const next: PendingAddOp[] = []
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
export function removePendingAdd(
  userId: string | number,
  creativeWorkId: string
): void {
  const ops = readQueue(userId)
  writeQueue(
    userId,
    ops.filter((op) => op.creativeWorkId !== creativeWorkId)
  )
}

/** Clear the entire pending-add queue for a user. */
export function clearPendingAdds(userId: string | number): void {
  const storage = safeStorage()
  if (!storage) return
  try {
    storage.removeItem(pendingAddKey(userId))
  } catch {
    // ignore — best-effort clear
  }
}

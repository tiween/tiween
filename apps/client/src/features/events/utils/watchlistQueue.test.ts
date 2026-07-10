/**
 * Tests for the per-user, bounded pending-add queue (Story 5.1).
 *
 * These lock the hardened contract from the pass-1 review: per-user key
 * isolation (no cross-user leak), enqueue dedupe, the `MAX_QUEUE_SIZE` drop-
 * oldest cap, `bumpAttempt` self-drop at `MAX_DRAIN_ATTEMPTS`, `enqueueAdd`
 * returning `false` on a throwing/absent storage, and malformed-payload → [].
 */
import { afterEach, describe, expect, it, vi } from "vitest"

import {
  bumpAttempt,
  clearPendingAdds,
  enqueueAdd,
  enqueueOp,
  getPendingAdds,
  getPendingOps,
  MAX_DRAIN_ATTEMPTS,
  MAX_QUEUE_SIZE,
  pendingAddKey,
  removePendingAdd,
  removePendingOp,
} from "./watchlistQueue"

afterEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
})

describe("watchlistQueue — per-user isolation", () => {
  it("keeps user A's queue invisible to user B", () => {
    enqueueAdd("user-A", "cw-1")
    enqueueAdd("user-B", "cw-2")

    expect(getPendingAdds("user-A").map((o) => o.creativeWorkId)).toEqual([
      "cw-1",
    ])
    expect(getPendingAdds("user-B").map((o) => o.creativeWorkId)).toEqual([
      "cw-2",
    ])
  })

  it("namespaces the storage key by user id", () => {
    expect(pendingAddKey("user-A")).toBe(
      "tiween:watchlist:pending-add:user-A"
    )
    expect(pendingAddKey(42)).toBe("tiween:watchlist:pending-add:42")
  })
})

describe("watchlistQueue — enqueue", () => {
  it("dedupes by creativeWorkId", () => {
    expect(enqueueAdd("u", "cw-1")).toBe(true)
    expect(enqueueAdd("u", "cw-1")).toBe(true)

    expect(getPendingAdds("u")).toHaveLength(1)
  })

  it("stores op shape { creativeWorkId, addedAt, attempts:0 }", () => {
    enqueueAdd("u", "cw-1")
    const [op] = getPendingAdds("u")
    expect(op).toMatchObject({ creativeWorkId: "cw-1", attempts: 0 })
    expect(typeof op!.addedAt).toBe("string")
  })

  it("drops the oldest entry when exceeding MAX_QUEUE_SIZE", () => {
    for (let i = 0; i < MAX_QUEUE_SIZE + 5; i++) {
      enqueueAdd("u", `cw-${i}`)
    }
    const ops = getPendingAdds("u")
    expect(ops).toHaveLength(MAX_QUEUE_SIZE)
    // The first 5 (oldest) were dropped.
    expect(ops[0]!.creativeWorkId).toBe("cw-5")
    expect(ops[ops.length - 1]!.creativeWorkId).toBe(
      `cw-${MAX_QUEUE_SIZE + 4}`
    )
  })

  it("returns false when the storage write throws (no silent success)", () => {
    const spy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new DOMException("QuotaExceededError")
      })

    expect(enqueueAdd("u", "cw-1")).toBe(false)
    spy.mockRestore()
    // Nothing persisted.
    expect(getPendingAdds("u")).toEqual([])
  })
})

describe("watchlistQueue — bumpAttempt", () => {
  it("increments attempts and self-drops at MAX_DRAIN_ATTEMPTS", () => {
    enqueueAdd("u", "cw-1")

    for (let i = 1; i < MAX_DRAIN_ATTEMPTS; i++) {
      bumpAttempt("u", "cw-1")
      const [op] = getPendingAdds("u")
      expect(op!.attempts).toBe(i)
    }

    // The MAX_DRAIN_ATTEMPTS-th bump drops the op.
    bumpAttempt("u", "cw-1")
    expect(getPendingAdds("u")).toEqual([])
  })

  it("only touches the targeted op", () => {
    enqueueAdd("u", "cw-1")
    enqueueAdd("u", "cw-2")
    bumpAttempt("u", "cw-1")

    const byId = Object.fromEntries(
      getPendingAdds("u").map((o) => [o.creativeWorkId, o.attempts])
    )
    expect(byId).toEqual({ "cw-1": 1, "cw-2": 0 })
  })
})

describe("watchlistQueue — remove & clear", () => {
  it("removes a single op", () => {
    enqueueAdd("u", "cw-1")
    enqueueAdd("u", "cw-2")
    removePendingAdd("u", "cw-1")

    expect(getPendingAdds("u").map((o) => o.creativeWorkId)).toEqual(["cw-2"])
  })

  it("clears the whole queue for a user", () => {
    enqueueAdd("u", "cw-1")
    clearPendingAdds("u")
    expect(getPendingAdds("u")).toEqual([])
  })
})

describe("watchlistQueue — resilience", () => {
  it("returns [] for a malformed payload", () => {
    window.localStorage.setItem(pendingAddKey("u"), "not-json{{")
    expect(getPendingAdds("u")).toEqual([])
  })

  it("filters out non-conforming entries", () => {
    window.localStorage.setItem(
      pendingAddKey("u"),
      JSON.stringify([
        { creativeWorkId: "cw-1", addedAt: "2026-07-10", attempts: 0 },
        { nope: true },
        42,
      ])
    )
    expect(getPendingAdds("u").map((o) => o.creativeWorkId)).toEqual(["cw-1"])
  })

  it("returns [] when the stored value is not an array", () => {
    window.localStorage.setItem(pendingAddKey("u"), JSON.stringify({ a: 1 }))
    expect(getPendingAdds("u")).toEqual([])
  })

  it("drops an op whose attempts is non-finite (NaN can't dodge the self-drop)", () => {
    window.localStorage.setItem(
      pendingAddKey("u"),
      JSON.stringify([
        { creativeWorkId: "cw-good", addedAt: "2026-07-10", attempts: 0 },
        { creativeWorkId: "cw-nan", addedAt: "2026-07-10", attempts: null },
      ])
    )
    // A corrupt `attempts` (serializes NaN as null) would otherwise never reach
    // MAX_DRAIN_ATTEMPTS and retry forever — it must be treated as invalid.
    expect(getPendingAdds("u").map((o) => o.creativeWorkId)).toEqual([
      "cw-good",
    ])
  })
})

describe("watchlistQueue — re-enqueue resets the retry budget", () => {
  it("resets attempts to 0 when a queued (near-poison) id is re-added", () => {
    enqueueAdd("u", "cw-1")
    // Push it up to the brink of the self-drop.
    for (let i = 1; i < MAX_DRAIN_ATTEMPTS - 1; i++) bumpAttempt("u", "cw-1")
    expect(getPendingAdds("u")[0]!.attempts).toBe(MAX_DRAIN_ATTEMPTS - 2)

    // A fresh user tap re-enqueues the same id → retry budget restored.
    expect(enqueueAdd("u", "cw-1")).toBe(true)
    expect(getPendingAdds("u")).toHaveLength(1)
    expect(getPendingAdds("u")[0]!.attempts).toBe(0)
  })
})

/* --------------------------------------------------------------------------
 * Story 5.2 — generalized `kind`-carrying ops + last-write-wins reconciliation.
 * ------------------------------------------------------------------------ */

describe("watchlistQueue — enqueueOp (Story 5.2 kind)", () => {
  it("round-trips a remove op with kind:'remove'", () => {
    expect(enqueueOp("u", "remove", "cw-1")).toBe(true)
    const [op] = getPendingOps("u")
    expect(op).toMatchObject({ creativeWorkId: "cw-1", kind: "remove", attempts: 0 })
    expect(typeof op!.addedAt).toBe("string")
  })

  it("round-trips an add op with kind:'add'", () => {
    enqueueOp("u", "add", "cw-1")
    expect(getPendingOps("u")[0]!.kind).toBe("add")
  })

  it("returns false when the storage write throws (no silent success)", () => {
    const spy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new DOMException("QuotaExceededError")
      })
    expect(enqueueOp("u", "remove", "cw-1")).toBe(false)
    spy.mockRestore()
    expect(getPendingOps("u")).toEqual([])
  })

  it("removes a single op via removePendingOp", () => {
    enqueueOp("u", "remove", "cw-1")
    enqueueOp("u", "add", "cw-2")
    removePendingOp("u", "cw-1")
    expect(getPendingOps("u").map((o) => o.creativeWorkId)).toEqual(["cw-2"])
  })
})

describe("watchlistQueue — last-write-wins reconciliation", () => {
  it("replaces an existing op for the same id with the opposite kind (one op)", () => {
    enqueueOp("u", "add", "cw-1")
    enqueueOp("u", "remove", "cw-1")

    const ops = getPendingOps("u")
    expect(ops).toHaveLength(1)
    expect(ops[0]).toMatchObject({ creativeWorkId: "cw-1", kind: "remove" })
  })

  it("resets attempts to 0 when reconciling the same id", () => {
    enqueueOp("u", "remove", "cw-1")
    for (let i = 1; i < MAX_DRAIN_ATTEMPTS - 1; i++) bumpAttempt("u", "cw-1")
    expect(getPendingOps("u")[0]!.attempts).toBe(MAX_DRAIN_ATTEMPTS - 2)

    // The opposite intent replaces it with a fresh retry budget.
    expect(enqueueOp("u", "add", "cw-1")).toBe(true)
    const ops = getPendingOps("u")
    expect(ops).toHaveLength(1)
    expect(ops[0]).toMatchObject({ kind: "add", attempts: 0 })
  })
})

describe("watchlistQueue — 5.1 backward compat", () => {
  it("normalizes a legacy op with no `kind` to kind:'add'", () => {
    window.localStorage.setItem(
      pendingAddKey("u"),
      JSON.stringify([
        { creativeWorkId: "cw-legacy", addedAt: "2026-07-10", attempts: 0 },
      ])
    )
    const [op] = getPendingOps("u")
    expect(op).toMatchObject({ creativeWorkId: "cw-legacy", kind: "add" })
  })

  it("drops an op with an unknown/corrupt `kind` (no silent coercion to add)", () => {
    window.localStorage.setItem(
      pendingAddKey("u"),
      JSON.stringify([
        // A corrupted remove (case variant) must NOT replay as an add.
        { kind: "Remove", creativeWorkId: "cw-bad", addedAt: "2026-07-10", attempts: 0 },
        { kind: "remove", creativeWorkId: "cw-ok", addedAt: "2026-07-10", attempts: 0 },
      ])
    )
    const ops = getPendingOps("u")
    expect(ops).toHaveLength(1)
    expect(ops[0]).toMatchObject({ creativeWorkId: "cw-ok", kind: "remove" })
  })

  it("enqueueAdd compat wrapper still enqueues an add op", () => {
    expect(enqueueAdd("u", "cw-1")).toBe(true)
    const [op] = getPendingOps("u")
    expect(op).toMatchObject({ creativeWorkId: "cw-1", kind: "add" })
    // ...and it is visible through the legacy read alias too.
    expect(getPendingAdds("u").map((o) => o.creativeWorkId)).toEqual(["cw-1"])
  })
})

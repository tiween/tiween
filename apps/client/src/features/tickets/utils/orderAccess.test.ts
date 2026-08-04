import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  clearOrderAccess,
  listOrderAccess,
  ORDER_ACCESS_LIMIT,
  readOrderAccess,
  saveOrderAccess,
} from "./orderAccess"

const STORAGE_KEY = "tiween.order-access"

describe("orderAccess", () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it("saves and reads back an order's access token", () => {
    saveOrderAccess("TW-1", "token-1")

    expect(readOrderAccess("TW-1")).toMatchObject({
      orderNumber: "TW-1",
      accessToken: "token-1",
    })
  })

  it("returns null for an order it never stored", () => {
    saveOrderAccess("TW-1", "token-1")

    expect(readOrderAccess("TW-2")).toBeNull()
    expect(readOrderAccess("")).toBeNull()
  })

  it("lists newest-first and never duplicates an order", () => {
    saveOrderAccess("TW-1", "token-1")
    saveOrderAccess("TW-2", "token-2")
    saveOrderAccess("TW-1", "token-1b")

    const list = listOrderAccess()
    expect(list.map((e) => e.orderNumber)).toEqual(["TW-1", "TW-2"])
    expect(list[0].accessToken).toBe("token-1b")
  })

  it(`caps the store at ${ORDER_ACCESS_LIMIT} entries`, () => {
    for (let i = 0; i < ORDER_ACCESS_LIMIT + 5; i++) {
      saveOrderAccess(`TW-${i}`, `token-${i}`)
    }

    expect(listOrderAccess()).toHaveLength(ORDER_ACCESS_LIMIT)
  })

  it("ignores an empty order number or token", () => {
    saveOrderAccess("", "token")
    saveOrderAccess("TW-1", "")

    expect(listOrderAccess()).toEqual([])
  })

  it("degrades to an empty list on a corrupt payload", () => {
    window.localStorage.setItem(STORAGE_KEY, "{not json")
    expect(listOrderAccess()).toEqual([])

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ nope: true }))
    expect(listOrderAccess()).toEqual([])

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([{ nope: true }]))
    expect(listOrderAccess()).toEqual([])
  })

  it("keeps an entry whose savedAt is not a finite number, sorting it last", () => {
    // Hand-edited / legacy rows: a string or NaN savedAt makes the comparator
    // return NaN, leaving the order arbitrary — and the cap could then evict
    // the NEWEST order.
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { orderNumber: "TW-STR", accessToken: "t1", savedAt: "yesterday" },
        { orderNumber: "TW-NAN", accessToken: "t2", savedAt: Number.NaN },
        { orderNumber: "TW-NONE", accessToken: "t3" },
        { orderNumber: "TW-NEW", accessToken: "t4", savedAt: 1_000 },
      ])
    )

    const list = listOrderAccess()
    // Nothing is dropped: every one of these tokens still works.
    expect(list).toHaveLength(4)
    expect(list[0].orderNumber).toBe("TW-NEW")
    for (const entry of list.slice(1)) {
      expect(entry.savedAt).toBe(0)
    }
    expect(readOrderAccess("TW-STR")?.accessToken).toBe("t1")
  })

  it("keeps the newest order when the cap is reached and older entries have a bad savedAt", () => {
    const legacy = Array.from({ length: ORDER_ACCESS_LIMIT }, (_, i) => ({
      orderNumber: `OLD-${i}`,
      accessToken: `tok-${i}`,
      savedAt: "not-a-number",
    }))
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy))

    saveOrderAccess("TW-NEW", "tok-new")

    expect(readOrderAccess("TW-NEW")?.accessToken).toBe("tok-new")
    expect(listOrderAccess()[0].orderNumber).toBe("TW-NEW")
  })

  it("never throws when storage writes are blocked", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError")
    })

    expect(() => saveOrderAccess("TW-1", "token-1")).not.toThrow()
  })

  it("clears the store", () => {
    saveOrderAccess("TW-1", "token-1")
    clearOrderAccess()

    expect(listOrderAccess()).toEqual([])
  })
})

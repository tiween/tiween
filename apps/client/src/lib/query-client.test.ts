/**
 * Tests for the SERVER branch of `getQueryClient()` (Story 5.8).
 *
 * `query-client.ts` deliberately has no module-scope singleton on the server:
 * `ClientProviders` is a client component, but client components still render
 * on the server, so one shared instance would be a single cache serving every
 * concurrent SSR request — the cross-user bleed this story exists to close.
 *
 * That branch is invisible to every other test in the repo: they all run under
 * jsdom, where `isServer` is `false`, so they only ever exercise the browser
 * singleton (pinned in `sign-out.test.ts` and `ClientProviders.test.tsx`).
 * Without this file, collapsing `getQueryClient()` back to a plain module-level
 * `new QueryClient()` passes the whole suite, lint and typecheck.
 */
import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it, vi } from "vitest"

import { getQueryClient } from "./query-client"

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>()
  return { ...actual, isServer: true }
})

describe("getQueryClient on the server", () => {
  it("hands out a FRESH client per call, so concurrent SSR renders never share a cache", () => {
    const first = getQueryClient()
    const second = getQueryClient()

    expect(first).toBeInstanceOf(QueryClient)
    expect(second).toBeInstanceOf(QueryClient)
    expect(second).not.toBe(first)
  })

  it("keeps one server render's cached data out of the next render's client", () => {
    const first = getQueryClient()
    first.setQueryData(["watchlist", "list", 7], [{ id: 1 }])

    expect(
      getQueryClient().getQueryData(["watchlist", "list", 7])
    ).toBeUndefined()
  })
})

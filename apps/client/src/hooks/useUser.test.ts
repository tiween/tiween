/**
 * Unit tests for `extractRegionDocumentId` and the `useCurrentUser` read-back
 * mapping (Story 4.5).
 *
 * `extractRegionDocumentId` normalizes the `/users/me` `defaultRegion` (a
 * `manyToOne` relation) to its Strapi `documentId` string — the identifier the
 * profile region select and the events `region` URL param both use — or
 * `undefined` when unset. `useCurrentUser` must both request `defaultRegion` in
 * `populate` and route the response through that helper, so a populated relation
 * object resolves to a plain `documentId` on `UserProfile.defaultRegion`.
 *
 * `@/lib/strapi-api` is mocked so the module never pulls the server Strapi
 * client / env into the test environment.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import * as React from "react"
import { describe, expect, it, vi } from "vitest"

const { fetchAPIMock } = vi.hoisted(() => ({ fetchAPIMock: vi.fn() }))

vi.mock("@/lib/strapi-api", () => ({
  PrivateStrapiClient: { fetchAPI: fetchAPIMock },
  PublicStrapiClient: { fetchAPI: vi.fn() },
}))

import { extractRegionDocumentId, useCurrentUser } from "./useUser"

describe("extractRegionDocumentId", () => {
  it("returns the documentId of a populated region relation object", () => {
    expect(
      extractRegionDocumentId({ id: 3, documentId: "grand-tunis-1", name: "Grand Tunis" })
    ).toBe("grand-tunis-1")
  })

  it("passes a plain documentId string through unchanged", () => {
    expect(extractRegionDocumentId("sfax-1")).toBe("sfax-1")
  })

  it("returns undefined for null", () => {
    expect(extractRegionDocumentId(null)).toBeUndefined()
  })

  it("returns undefined for undefined", () => {
    expect(extractRegionDocumentId(undefined)).toBeUndefined()
  })

  it("returns undefined for an empty string", () => {
    expect(extractRegionDocumentId("")).toBeUndefined()
  })

  it("returns undefined for a relation object missing documentId", () => {
    expect(extractRegionDocumentId({ id: 3, name: "Grand Tunis" })).toBeUndefined()
  })

  it("returns undefined when documentId is not a string", () => {
    expect(extractRegionDocumentId({ documentId: 42 })).toBeUndefined()
  })
})

describe("useCurrentUser", () => {
  function wrapper({ children }: { children: React.ReactNode }) {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    return React.createElement(QueryClientProvider, { client }, children)
  }

  it("requests defaultRegion in populate and flattens the relation to its documentId", async () => {
    fetchAPIMock.mockResolvedValueOnce({
      id: 7,
      documentId: "user-7",
      username: "Grace",
      email: "grace@example.com",
      defaultRegion: { id: 2, documentId: "sfax-1", name: "Sfax" },
    })

    const { result } = renderHook(() => useCurrentUser(true), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // The relation is populated…
    expect(fetchAPIMock).toHaveBeenCalledWith(
      "/users/me",
      { populate: ["avatar", "defaultRegion"] },
      { method: "GET" },
      { useProxy: true }
    )
    // …and flattened to the documentId string (not the raw relation object).
    expect(result.current.data?.defaultRegion).toBe("sfax-1")
  })

  it("resolves defaultRegion to undefined when the relation is absent", async () => {
    fetchAPIMock.mockResolvedValueOnce({
      id: 7,
      documentId: "user-7",
      username: "Grace",
      email: "grace@example.com",
      defaultRegion: null,
    })

    const { result } = renderHook(() => useCurrentUser(true), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.defaultRegion).toBeUndefined()
  })
})

/**
 * Tests for the venue-profile data layer (Story 7.2).
 *
 * The load-bearing property here is CACHE SCOPING: `["venue-profile", userId]`.
 * A bare `["venue-profile"]` key survives a sign-out/sign-in pair on a shared
 * device and hands the next manager the previous one's venue — which is exactly
 * the class of leak the project's query-key rule exists to prevent. The tests
 * therefore assert the key CONTAINS the user id and that two different users
 * produce two different keys.
 *
 * Also pinned: the endpoint paths (they must match the entries added to
 * `isStrapiEndpointAllowed`, or the proxy rejects them before Strapi sees
 * them), the proxy flag, and the invalidation target after a save.
 */
import { renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  useMyVenue,
  useVenueProfileMutations,
  useVenuePropertyCatalog,
  venueProfileKeys,
} from "./useVenueProfile"

const { fetchAPIMock } = vi.hoisted(() => ({ fetchAPIMock: vi.fn() }))

vi.mock("@/lib/strapi-api", () => ({
  PrivateStrapiClient: { fetchAPI: fetchAPIMock },
  PublicStrapiClient: { fetchAPI: vi.fn() },
}))

const { useQuerySpy, useMutationSpy, invalidateSpy } = vi.hoisted(() => ({
  useQuerySpy: vi.fn(() => ({ data: undefined, isLoading: false })),
  useMutationSpy: vi.fn((options: unknown) => ({ options, mutate: vi.fn() })),
  invalidateSpy: vi.fn(),
}))

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => useQuerySpy(options),
  useMutation: (options: unknown) => useMutationSpy(options),
  useQueryClient: () => ({ invalidateQueries: invalidateSpy }),
}))

const { sessionMock } = vi.hoisted(() => ({
  sessionMock: vi.fn(() => ({
    data: { user: { userId: 42 } },
    status: "authenticated",
  })),
}))

vi.mock("next-auth/react", () => ({
  useSession: () => sessionMock(),
}))

interface QueryOptions {
  queryKey: readonly unknown[]
  queryFn: () => Promise<unknown>
  enabled: boolean
  retry: boolean | number
}

interface MutationOptions {
  mutationFn: (input: never) => Promise<unknown>
  onSuccess?: () => void
}

beforeEach(() => {
  sessionMock.mockReturnValue({
    data: { user: { userId: 42 } },
    status: "authenticated",
  })
})

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe("venueProfileKeys", () => {
  it("scopes the venue key to the user id", () => {
    expect(venueProfileKeys.detail(42)).toEqual(["venue-profile", 42])
  })

  it("produces DIFFERENT keys for different users", () => {
    expect(venueProfileKeys.detail(42)).not.toEqual(venueProfileKeys.detail(7))
  })

  it("never collides a signed-out render with a real user's cache", () => {
    expect(venueProfileKeys.detail(undefined)).toEqual([
      "venue-profile",
      "anonymous",
    ])
    expect(venueProfileKeys.detail(undefined)).not.toEqual(
      venueProfileKeys.detail(42)
    )
  })

  it("scopes the amenity catalog by user AND locale", () => {
    expect(venueProfileKeys.propertyCatalog(42, "fr")).toEqual([
      "venue-profile",
      42,
      "property-definitions",
      "fr",
    ])
    expect(venueProfileKeys.propertyCatalog(42, "fr")).not.toEqual(
      venueProfileKeys.propertyCatalog(42, "ar")
    )
  })
})

describe("useMyVenue", () => {
  it("reads GET /venues/venues/me through the proxy under the user-scoped key", async () => {
    fetchAPIMock.mockResolvedValue({ data: { documentId: "venue-1" } })
    renderHook(() => useMyVenue())

    const options = useQuerySpy.mock.calls[0][0] as unknown as QueryOptions
    expect(options.queryKey).toEqual(["venue-profile", 42])
    expect(options.enabled).toBe(true)
    // A 403/404 is a terminal answer; retrying only delays the empty state.
    expect(options.retry).toBe(false)

    await expect(options.queryFn()).resolves.toEqual({ documentId: "venue-1" })
    expect(fetchAPIMock).toHaveBeenCalledWith(
      "/venues/venues/me",
      undefined,
      { method: "GET" },
      { useProxy: true }
    )
  })

  it("returns null when the envelope carries no data", async () => {
    fetchAPIMock.mockResolvedValue({})
    renderHook(() => useMyVenue())

    const options = useQuerySpy.mock.calls[0][0] as unknown as QueryOptions
    await expect(options.queryFn()).resolves.toBeNull()
  })

  it("stays DISABLED while the session is unauthenticated", () => {
    sessionMock.mockReturnValue({
      data: null as unknown as { user: { userId: number } },
      status: "unauthenticated",
    })
    renderHook(() => useMyVenue())

    const options = useQuerySpy.mock.calls[0][0] as unknown as QueryOptions
    expect(options.enabled).toBe(false)
    expect(options.queryKey).toEqual(["venue-profile", "anonymous"])
  })
})

describe("useVenuePropertyCatalog", () => {
  it("reads the amenity catalog for the active locale", async () => {
    fetchAPIMock.mockResolvedValue({ data: [{ documentId: "cat-1" }] })
    renderHook(() => useVenuePropertyCatalog("fr"))

    const options = useQuerySpy.mock.calls[0][0] as unknown as QueryOptions
    expect(options.queryKey).toEqual([
      "venue-profile",
      42,
      "property-definitions",
      "fr",
    ])

    await expect(options.queryFn()).resolves.toEqual([{ documentId: "cat-1" }])
    expect(fetchAPIMock).toHaveBeenCalledWith(
      "/venues/venues/property-definitions",
      { locale: "fr" },
      { method: "GET" },
      { useProxy: true }
    )
  })

  it("degrades a non-array payload to an empty catalog rather than throwing", async () => {
    fetchAPIMock.mockResolvedValue({ data: null })
    renderHook(() => useVenuePropertyCatalog("en"))

    const options = useQuerySpy.mock.calls[0][0] as unknown as QueryOptions
    await expect(options.queryFn()).resolves.toEqual([])
  })

  it("honours the caller's `enabled` gate (no venue, no catalog read)", () => {
    renderHook(() => useVenuePropertyCatalog("fr", false))

    const options = useQuerySpy.mock.calls[0][0] as unknown as QueryOptions
    expect(options.enabled).toBe(false)
  })
})

describe("useVenueProfileMutations", () => {
  it("PUTs the partial payload to /venues/venues/me and passes NO id", async () => {
    fetchAPIMock.mockResolvedValue({ data: { documentId: "venue-1" } })
    renderHook(() => useVenueProfileMutations())

    const update = useMutationSpy.mock.calls[0][0] as unknown as MutationOptions
    await update.mutationFn({ name: "Le Rio" } as never)

    expect(fetchAPIMock).toHaveBeenCalledWith(
      "/venues/venues/me",
      undefined,
      { body: JSON.stringify({ name: "Le Rio" }), method: "PUT" },
      { useProxy: true }
    )
  })

  it("invalidates the USER-SCOPED venue key after a successful save", () => {
    renderHook(() => useVenueProfileMutations())

    const update = useMutationSpy.mock.calls[0][0] as unknown as MutationOptions
    update.onSuccess?.()

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["venue-profile", 42],
    })
  })

  it("uploads a file with no ref/refId and returns its id", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => [{ id: 12, url: "/uploads/a.png" }],
    }))
    vi.stubGlobal("fetch", fetchMock)
    renderHook(() => useVenueProfileMutations())

    const upload = useMutationSpy.mock.calls[1][0] as unknown as MutationOptions
    const file = new File(["x"], "a.png", { type: "image/png" })

    await expect(upload.mutationFn({ file } as never)).resolves.toBe(12)

    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      { method: string; body: FormData },
    ]
    expect(url).toBe("/api/private-proxy/upload")
    expect(init.method).toBe("POST")
    // Linking happens through the self-scoped PUT, never through the upload —
    // a `ref`/`refId` here would let a manager attach media to another entry.
    expect(init.body.get("ref")).toBeNull()
    expect(init.body.get("refId")).toBeNull()
    expect(init.body.get("files")).toBe(file)
  })

  it("throws UPLOAD_FAILED (a CODE, not prose) when the upload is rejected", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, json: async () => ({}) }))
    )
    renderHook(() => useVenueProfileMutations())

    const upload = useMutationSpy.mock.calls[1][0] as unknown as MutationOptions
    const file = new File(["x"], "a.png", { type: "image/png" })

    await expect(upload.mutationFn({ file } as never)).rejects.toThrow(
      "UPLOAD_FAILED"
    )
  })
})

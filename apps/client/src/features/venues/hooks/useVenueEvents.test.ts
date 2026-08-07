/**
 * Tests for the venue-events data layer (Story 7.3).
 *
 * The load-bearing property is CACHE SCOPING: every key starts
 * `["venue-events", userId]` — a bare singleton would hand the next manager
 * the previous one's events on a shared device. Also pinned: the endpoint
 * paths (they must match the `isStrapiEndpointAllowed` entries or the proxy
 * rejects them), the proxy flag, and the invalidation targets.
 */
import { renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { isStrapiEndpointAllowed } from "@/lib/strapi-api/request-auth"

import {
  useCreativeWorkSearch,
  useMyEvent,
  useMyEvents,
  useVenueEventMutations,
  venueEventKeys,
} from "./useVenueEvents"

const { fetchAPIMock } = vi.hoisted(() => ({ fetchAPIMock: vi.fn() }))

vi.mock("@/lib/strapi-api", () => ({
  PrivateStrapiClient: { fetchAPI: fetchAPIMock },
  PublicStrapiClient: { fetchAPI: vi.fn() },
}))

// request-auth pulls next-auth + env; stub the bits it imports.
vi.mock("@/env.mjs", () => ({
  env: {
    STRAPI_REST_READONLY_API_KEY: "readonly",
    STRAPI_REST_CUSTOM_API_KEY: "custom",
  },
}))
vi.mock("@/lib/auth", () => ({ getAuth: vi.fn() }))

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
  getSession: vi.fn(),
}))

interface QueryOptions {
  queryKey: readonly unknown[]
  queryFn: () => Promise<unknown>
  enabled: boolean
}

interface MutationOptions {
  mutationFn: (input: never) => Promise<unknown>
  onSuccess?: (data: unknown, variables: never) => void
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

describe("venueEventKeys", () => {
  it("scopes every key to the user id", () => {
    expect(venueEventKeys.list(42)).toEqual(["venue-events", 42, "list"])
    expect(venueEventKeys.detail(42, "e1")).toEqual([
      "venue-events",
      42,
      "detail",
      "e1",
    ])
    expect(venueEventKeys.workSearch(42, "dune")).toEqual([
      "venue-events",
      42,
      "work-search",
      "dune",
    ])
  })

  it("produces DIFFERENT keys for different users", () => {
    expect(venueEventKeys.list(42)).not.toEqual(venueEventKeys.list(7))
  })

  it("never collides a signed-out render with a real user's cache", () => {
    expect(venueEventKeys.list(undefined)).toEqual([
      "venue-events",
      "anonymous",
      "list",
    ])
  })
})

describe("useMyEvents", () => {
  it("queries the allow-listed path through the proxy with a user-scoped key", async () => {
    fetchAPIMock.mockResolvedValue({ data: [{ documentId: "e1" }] })

    renderHook(() => useMyEvents())

    const options = useQuerySpy.mock.calls[0]![0] as unknown as QueryOptions
    expect(options.queryKey).toEqual(["venue-events", 42, "list"])
    expect(options.enabled).toBe(true)

    await options.queryFn()
    expect(fetchAPIMock).toHaveBeenCalledWith(
      "/events-manager/venue/events",
      undefined,
      { method: "GET" },
      { useProxy: true }
    )
  })

  it("is disabled while signed out", () => {
    sessionMock.mockReturnValue({
      data: undefined as never,
      status: "unauthenticated",
    })

    renderHook(() => useMyEvents())

    const options = useQuerySpy.mock.calls[0]![0] as unknown as QueryOptions
    expect(options.enabled).toBe(false)
  })
})

describe("useMyEvent", () => {
  it("queries the detail path with a user + document scoped key", async () => {
    fetchAPIMock.mockResolvedValue({ data: { documentId: "e1" } })

    renderHook(() => useMyEvent("e1"))

    const options = useQuerySpy.mock.calls[0]![0] as unknown as QueryOptions
    expect(options.queryKey).toEqual(["venue-events", 42, "detail", "e1"])

    await options.queryFn()
    expect(fetchAPIMock).toHaveBeenCalledWith(
      "/events-manager/venue/events/e1",
      undefined,
      { method: "GET" },
      { useProxy: true }
    )
  })
})

describe("useCreativeWorkSearch", () => {
  it("stays disabled below the minimum query length", () => {
    renderHook(() => useCreativeWorkSearch("d"))

    const options = useQuerySpy.mock.calls[0]![0] as unknown as QueryOptions
    expect(options.enabled).toBe(false)
  })

  it("queries the search path with the term in the key", async () => {
    fetchAPIMock.mockResolvedValue({ data: [] })

    renderHook(() => useCreativeWorkSearch("dune"))

    const options = useQuerySpy.mock.calls.at(-1)![0] as unknown as QueryOptions
    expect(options.queryKey).toEqual([
      "venue-events",
      42,
      "work-search",
      "dune",
    ])

    await options.queryFn()
    expect(fetchAPIMock).toHaveBeenCalledWith(
      "/events-manager/venue/creative-works/search",
      { query: "dune" },
      { method: "GET" },
      { useProxy: true }
    )
  })
})

describe("useVenueEventMutations", () => {
  it("POSTs the create payload through the proxy and invalidates the list", async () => {
    fetchAPIMock.mockResolvedValue({ data: { documentId: "e1" } })

    renderHook(() => useVenueEventMutations())

    const createOptions = useMutationSpy.mock
      .calls[0]![0] as unknown as MutationOptions
    await createOptions.mutationFn({ title: "Dune" } as never)
    expect(fetchAPIMock).toHaveBeenCalledWith(
      "/events-manager/venue/events",
      undefined,
      { body: JSON.stringify({ title: "Dune" }), method: "POST" },
      { useProxy: true }
    )

    createOptions.onSuccess?.(undefined, undefined as never)
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["venue-events", 42, "list"],
    })
  })

  it("POSTs the work-create payload to the creative-works path", async () => {
    fetchAPIMock.mockResolvedValue({ data: { documentId: "w1" } })

    renderHook(() => useVenueEventMutations())

    const workOptions = useMutationSpy.mock
      .calls[1]![0] as unknown as MutationOptions
    await workOptions.mutationFn({ title: "Dune", type: "film" } as never)
    expect(fetchAPIMock).toHaveBeenCalledWith(
      "/events-manager/venue/creative-works",
      undefined,
      {
        body: JSON.stringify({ title: "Dune", type: "film" }),
        method: "POST",
      },
      { useProxy: true }
    )
  })

  it("POSTs the publish and invalidates both the list and the detail", async () => {
    fetchAPIMock.mockResolvedValue({ data: { documentId: "e1" } })

    renderHook(() => useVenueEventMutations())

    const publishOptions = useMutationSpy.mock
      .calls[2]![0] as unknown as MutationOptions
    await publishOptions.mutationFn({ documentId: "e1" } as never)
    expect(fetchAPIMock).toHaveBeenCalledWith(
      "/events-manager/venue/events/e1/publish",
      undefined,
      { method: "POST" },
      { useProxy: true }
    )

    publishOptions.onSuccess?.(undefined, { documentId: "e1" } as never)
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["venue-events", 42, "list"],
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["venue-events", 42, "detail", "e1"],
    })
  })

  it("uploads the FILE ONLY (no ref/refId/field) and returns the id", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => [{ id: 55, url: "/uploads/x.png" }],
    }))
    vi.stubGlobal("fetch", fetchMock)

    renderHook(() => useVenueEventMutations())

    const uploadOptions = useMutationSpy.mock
      .calls[3]![0] as unknown as MutationOptions
    const id = await uploadOptions.mutationFn({
      file: new File(["x"], "x.png", { type: "image/png" }),
    } as never)

    expect(id).toBe(55)
    const [url, init] = fetchMock.mock.calls[0]! as unknown as [
      string,
      { body: FormData },
    ]
    expect(url).toBe("/api/private-proxy/upload")
    const keys = [...init.body.keys()]
    expect(keys).toEqual(["files"])
  })
})

describe("proxy allow-list", () => {
  it("admits exactly the venue-events endpoints the hooks call", () => {
    expect(
      isStrapiEndpointAllowed("api/events-manager/venue/events", "GET")
    ).toBe(true)
    expect(
      isStrapiEndpointAllowed("api/events-manager/venue/events/e1", "GET")
    ).toBe(true)
    expect(
      isStrapiEndpointAllowed("api/events-manager/venue/events", "POST")
    ).toBe(true)
    expect(
      isStrapiEndpointAllowed(
        "api/events-manager/venue/events/e1/publish",
        "POST"
      )
    ).toBe(true)
    expect(
      isStrapiEndpointAllowed(
        "api/events-manager/venue/creative-works/search",
        "GET"
      )
    ).toBe(true)
    expect(
      isStrapiEndpointAllowed("api/events-manager/venue/creative-works", "POST")
    ).toBe(true)
  })

  it("does not open unrelated events-manager surface", () => {
    expect(isStrapiEndpointAllowed("api/events-manager/events", "GET")).toBe(
      false
    )
    expect(
      isStrapiEndpointAllowed("api/events-manager/venue/creative-works", "GET")
    ).toBe(false)
    expect(
      isStrapiEndpointAllowed("api/events-manager/venue/events", "DELETE")
    ).toBe(false)
  })
})

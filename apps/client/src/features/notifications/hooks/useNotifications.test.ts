/**
 * Tests for the notification data layer (Story 5.6).
 *
 * Layers:
 *  - the pure `notificationRefetchInterval` poll gate (badge freshness core),
 *  - the `useUnreadNotificationCount` poll-option WIRING into `useQuery`
 *    (a dropped/flipped option is caught), and the list/unread `queryFn` proxy
 *    paths,
 *  - the `useMarkAllNotificationsRead` mutation (PUT path + list/unread
 *    invalidation).
 */
import { afterEach, describe, expect, it, vi } from "vitest"
import { renderHook } from "@testing-library/react"

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

vi.mock("next-auth/react", () => ({
  useSession: () => ({ status: "authenticated" }),
}))

import {
  NOTIFICATION_POLL_MS,
  notificationKeys,
  notificationRefetchInterval,
  useMarkAllNotificationsRead,
  useNotifications,
  useUnreadNotificationCount,
} from "./useNotifications"

afterEach(() => {
  vi.clearAllMocks()
})

describe("notificationRefetchInterval (poll gate)", () => {
  it("exposes a 60-second cadence", () => {
    expect(NOTIFICATION_POLL_MS).toBe(60000)
  })

  it("polls every NOTIFICATION_POLL_MS when online", () => {
    expect(notificationRefetchInterval(true)).toBe(60000)
  })

  it("does not poll when offline", () => {
    expect(notificationRefetchInterval(false)).toBe(false)
  })
})

describe("useUnreadNotificationCount", () => {
  const onLineDescriptor = Object.getOwnPropertyDescriptor(
    window.navigator,
    "onLine"
  )

  afterEach(() => {
    if (onLineDescriptor) {
      Object.defineProperty(window.navigator, "onLine", onLineDescriptor)
    }
  })

  function setOnLine(value: boolean) {
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value,
    })
  }

  it("wires the gated poll options into useQuery", () => {
    renderHook(() => useUnreadNotificationCount())

    const options = useQuerySpy.mock.calls[0][0] as {
      queryKey: unknown
      refetchInterval: () => number | false
      refetchIntervalInBackground: boolean
      refetchOnReconnect: boolean
    }

    expect(options.queryKey).toEqual(notificationKeys.unreadCount())
    expect(options.refetchIntervalInBackground).toBe(false)
    expect(options.refetchOnReconnect).toBe(true)

    setOnLine(true)
    expect(options.refetchInterval()).toBe(NOTIFICATION_POLL_MS)
    setOnLine(false)
    expect(options.refetchInterval()).toBe(false)
  })

  it("queryFn GETs the unread-count endpoint through the proxy and returns count", async () => {
    fetchAPIMock.mockResolvedValue({ count: 3 })
    renderHook(() => useUnreadNotificationCount())

    const options = useQuerySpy.mock.calls[0][0] as {
      queryFn: () => Promise<number>
    }
    const result = await options.queryFn()

    expect(result).toBe(3)
    expect(fetchAPIMock).toHaveBeenCalledWith(
      "/user-engagement/notifications/unread-count",
      undefined,
      { method: "GET" },
      { useProxy: true }
    )
  })
})

describe("useNotifications", () => {
  it("queryFn GETs the list endpoint through the proxy and returns data", async () => {
    fetchAPIMock.mockResolvedValue({ data: [{ documentId: "n1" }] })
    renderHook(() => useNotifications())

    const options = useQuerySpy.mock.calls[0][0] as {
      queryKey: unknown
      queryFn: () => Promise<unknown[]>
    }
    expect(options.queryKey).toEqual(notificationKeys.list())

    const result = await options.queryFn()
    expect(result).toEqual([{ documentId: "n1" }])
    expect(fetchAPIMock).toHaveBeenCalledWith(
      "/user-engagement/notifications",
      undefined,
      { method: "GET" },
      { useProxy: true }
    )
  })
})

describe("useMarkAllNotificationsRead", () => {
  it("PUTs read-all and invalidates the list + unread-count on success", async () => {
    fetchAPIMock.mockResolvedValue({ updated: 2 })
    renderHook(() => useMarkAllNotificationsRead())

    const options = useMutationSpy.mock.calls[0][0] as {
      mutationFn: () => Promise<{ updated: number }>
      onSuccess: () => void
    }

    const result = await options.mutationFn()
    expect(result).toEqual({ updated: 2 })
    expect(fetchAPIMock).toHaveBeenCalledWith(
      "/user-engagement/notifications/read-all",
      undefined,
      { method: "PUT" },
      { useProxy: true }
    )

    options.onSuccess()
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: notificationKeys.list(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: notificationKeys.unreadCount(),
    })
  })
})

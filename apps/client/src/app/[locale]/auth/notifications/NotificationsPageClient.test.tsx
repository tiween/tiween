/**
 * Tests for `NotificationsPageClient` (Story 5.6) — the four async surfaces
 * (loading / error / empty / list) plus the mark-all-read-on-mount side effect
 * that clears the Account-tab badge.
 *
 * `useNotifications` + `useMarkAllNotificationsRead` are mocked so each state is
 * driven directly; `NotificationItem` is a sentinel; next-intl echoes keys.
 */
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { useNotificationsMock, markAllMock, pushMock, backMock } = vi.hoisted(
  () => ({
    useNotificationsMock: vi.fn(),
    markAllMock: vi.fn(),
    pushMock: vi.fn(),
    backMock: vi.fn(),
  })
)

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, back: backMock }),
}))

vi.mock("@/features/notifications/hooks/useNotifications", () => ({
  useNotifications: useNotificationsMock,
  useMarkAllNotificationsRead: () => ({ mutate: markAllMock }),
}))

vi.mock("./_components/NotificationItem", () => ({
  NotificationItem: ({ notification }: { notification: { documentId: string } }) => (
    <div data-testid="notification-item">{notification.documentId}</div>
  ),
}))

import { NotificationsPageClient } from "./NotificationsPageClient"

beforeEach(() => {
  vi.clearAllMocks()
  useNotificationsMock.mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
  })
})

describe("NotificationsPageClient", () => {
  it("fires mark-all-read once on mount when there are unread notifications", () => {
    useNotificationsMock.mockReturnValue({
      data: [
        { documentId: "n1", read: false },
        { documentId: "n2", read: true },
      ],
      isLoading: false,
      isError: false,
    })
    render(<NotificationsPageClient locale="fr" />)
    expect(markAllMock).toHaveBeenCalledTimes(1)
  })

  it("does NOT fire mark-all-read when everything is already read", () => {
    useNotificationsMock.mockReturnValue({
      data: [
        { documentId: "n1", read: true },
        { documentId: "n2", read: true },
      ],
      isLoading: false,
      isError: false,
    })
    render(<NotificationsPageClient locale="fr" />)
    expect(markAllMock).not.toHaveBeenCalled()
  })

  it("does NOT fire mark-all-read on an empty list", () => {
    render(<NotificationsPageClient locale="fr" />)
    expect(markAllMock).not.toHaveBeenCalled()
  })

  it("shows a skeleton while loading", () => {
    useNotificationsMock.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    })
    const { container } = render(<NotificationsPageClient locale="fr" />)
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument()
  })

  it("shows an inline error on error", () => {
    useNotificationsMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    })
    render(<NotificationsPageClient locale="fr" />)
    expect(screen.getByRole("alert")).toHaveTextContent("error")
  })

  it("shows the empty state with a discovery CTA when there are no notifications", () => {
    useNotificationsMock.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    })
    render(<NotificationsPageClient locale="fr" />)
    expect(screen.getByText("emptyTitle")).toBeInTheDocument()
    expect(screen.getByText("emptyAction")).toBeInTheDocument()
    expect(screen.queryByTestId("notification-item")).not.toBeInTheDocument()
  })

  it("renders the list when notifications exist", () => {
    useNotificationsMock.mockReturnValue({
      data: [
        { documentId: "n1" },
        { documentId: "n2" },
      ],
      isLoading: false,
      isError: false,
    })
    render(<NotificationsPageClient locale="fr" />)
    expect(screen.getAllByTestId("notification-item")).toHaveLength(2)
  })
})

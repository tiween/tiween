/**
 * Tests for the VenueEventPreview (Story 7.3): the draft banner, the
 * confirmed publish call, the `VENUE_NOT_APPROVED` toast path, and the
 * published-state display. `EventDetailPage` (the production renderer) is
 * stubbed — its own suites cover it; here only the mapping hand-off matters.
 */
import * as React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import type { ManagerEventDetail } from "@/features/venues/schemas/venue-events"

import { VenueEventPreview } from "./VenueEventPreview"

const { toastMock, publishMutateAsync, myEventMock } = vi.hoisted(() => ({
  toastMock: vi.fn(),
  publishMutateAsync: vi.fn(),
  myEventMock: vi.fn(),
}))

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "fr",
}))

vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}))

vi.mock("@/lib/navigation", () => ({
  Link: ({
    href,
    children,
    ...rest
  }: React.PropsWithChildren<{ href: unknown }>) => (
    <a href={String(href)} {...rest}>
      {children}
    </a>
  ),
}))

vi.mock("@/features/events/components/EventDetailPage", () => ({
  EventDetailPage: ({
    event,
  }: {
    event: { documentId: string; title: string }
  }) => (
    <div data-testid="event-detail-page">
      {event.documentId}:{event.title}
    </div>
  ),
}))

vi.mock("@/features/venues/hooks/useVenueEvents", () => ({
  useMyEvent: (documentId: string) => myEventMock(documentId),
  useVenueEventMutations: () => ({
    createEventMutation: { mutateAsync: vi.fn() },
    createWorkMutation: { mutateAsync: vi.fn() },
    publishEventMutation: {
      mutateAsync: publishMutateAsync,
      isPending: false,
    },
    uploadImageMutation: { mutateAsync: vi.fn() },
  }),
}))

// Radix Dialog needs pointer-capture APIs jsdom does not implement.
beforeAll(() => {
  Element.prototype.hasPointerCapture = vi.fn(() => false)
  Element.prototype.setPointerCapture = vi.fn()
  Element.prototype.releasePointerCapture = vi.fn()
  Element.prototype.scrollIntoView = vi.fn()
  // @ts-expect-error - jsdom lacks ResizeObserver.
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

const EVENT: ManagerEventDetail = {
  documentId: "event-1",
  title: "Dune",
  startDateTime: "2026-09-01T18:00:00.000Z",
  screenings: [],
  isPublished: false,
}

function mockEvent(
  event: ManagerEventDetail | null,
  state: Partial<{ isLoading: boolean; isError: boolean; error: unknown }> = {}
) {
  myEventMock.mockReturnValue({
    data: event,
    isLoading: false,
    isError: false,
    error: undefined,
    ...state,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockEvent(EVENT)
  publishMutateAsync.mockResolvedValue({ documentId: "event-1" })
})

describe("VenueEventPreview", () => {
  it("renders the DRAFT banner and hands the mapped event to the real renderer", () => {
    render(<VenueEventPreview documentId="event-1" />)

    expect(screen.getByTestId("preview-banner")).toHaveTextContent(
      "preview.draftBanner"
    )
    expect(screen.getByTestId("event-detail-page")).toHaveTextContent(
      "event-1:Dune"
    )
  })

  it("publishes after confirmation and toasts success", async () => {
    const user = userEvent.setup()
    render(<VenueEventPreview documentId="event-1" />)

    await user.click(screen.getByTestId("publish-button"))
    await user.click(await screen.findByTestId("confirm-publish-button"))

    await waitFor(() =>
      expect(publishMutateAsync).toHaveBeenCalledWith({
        documentId: "event-1",
      })
    )
    expect(toastMock).toHaveBeenCalledWith({
      description: "success.published",
    })
  })

  it("surfaces a refused publish as the translated VENUE_NOT_APPROVED toast", async () => {
    publishMutateAsync.mockRejectedValue(
      new Error(JSON.stringify({ details: { code: "VENUE_NOT_APPROVED" } }))
    )
    const user = userEvent.setup()
    render(<VenueEventPreview documentId="event-1" />)

    await user.click(screen.getByTestId("publish-button"))
    await user.click(await screen.findByTestId("confirm-publish-button"))

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith({
        variant: "destructive",
        description: "errors.VENUE_NOT_APPROVED",
      })
    )
  })

  it("shows the published state without a publish button", () => {
    mockEvent({ ...EVENT, isPublished: true })
    render(<VenueEventPreview documentId="event-1" />)

    expect(screen.getByTestId("preview-banner")).toHaveTextContent(
      "preview.publishedBanner"
    )
    expect(screen.queryByTestId("publish-button")).not.toBeInTheDocument()
  })

  it("renders the translated code when the read is refused", () => {
    mockEvent(null, {
      isError: true,
      error: new Error(
        JSON.stringify({ details: { code: "EVENT_NOT_FOUND" } })
      ),
    })
    render(<VenueEventPreview documentId="event-1" />)

    expect(screen.getByText("errors.EVENT_NOT_FOUND")).toBeInTheDocument()
  })
})

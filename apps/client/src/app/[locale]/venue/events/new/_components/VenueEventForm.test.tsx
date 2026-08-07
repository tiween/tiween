/**
 * Tests for the VenueEventForm (Story 7.3).
 *
 * The real schema and resolver run; the boundaries are mocked — `next-intl`
 * (echoes keys so labels are queryable), the toast hook, the navigation
 * router, and the data-layer hooks. Each "blocks submit" test asserts the
 * POSITIVE observable first (the rendered validation message), then that no
 * create call went out (the 7.1 review's lesson).
 */
import * as React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { VenueEventForm } from "./VenueEventForm"

const {
  toastMock,
  routerPushMock,
  createEventMutateAsync,
  createWorkMutateAsync,
  uploadMutateAsync,
  searchResultsMock,
} = vi.hoisted(() => ({
  toastMock: vi.fn(),
  routerPushMock: vi.fn(),
  createEventMutateAsync: vi.fn(),
  createWorkMutateAsync: vi.fn(),
  uploadMutateAsync: vi.fn(),
  searchResultsMock: vi.fn(() => [] as unknown[]),
}))

// AppField/AppForm import general-helpers, which eagerly validates env.mjs.
vi.mock("@/lib/general-helpers", () => ({
  removeThisWhenYouNeedMe: () => {},
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
  useRouter: () => ({ push: routerPushMock }),
}))

vi.mock("@/features/venues/hooks/useVenueEvents", () => ({
  WORK_SEARCH_MIN_CHARS: 2,
  useCreativeWorkSearch: () => ({
    data: searchResultsMock(),
    isFetching: false,
  }),
  useVenueEventMutations: () => ({
    createEventMutation: { mutateAsync: createEventMutateAsync },
    createWorkMutation: { mutateAsync: createWorkMutateAsync },
    publishEventMutation: { mutateAsync: vi.fn(), isPending: false },
    uploadImageMutation: { mutateAsync: uploadMutateAsync },
  }),
}))

// Radix Popover/Dialog + cmdk rely on pointer-capture, scroll and
// ResizeObserver APIs jsdom does not implement (EventVenueFilter's shims).
beforeAll(() => {
  Element.prototype.hasPointerCapture = vi.fn(() => false)
  Element.prototype.setPointerCapture = vi.fn()
  Element.prototype.releasePointerCapture = vi.fn()
  Element.prototype.scrollIntoView = vi.fn()
  // @ts-expect-error - jsdom lacks ResizeObserver; cmdk/Radix need it.
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

const FILM = {
  documentId: "work-1",
  title: "Dune",
  type: "film",
  releaseYear: 2021,
}
const PLAY = { documentId: "work-2", title: "Hamlet", type: "play" }

beforeEach(() => {
  vi.clearAllMocks()
  searchResultsMock.mockReturnValue([FILM, PLAY])
  createEventMutateAsync.mockResolvedValue({ documentId: "event-1" })
})

async function selectWork(title: string) {
  const user = userEvent.setup()
  await user.click(screen.getByRole("combobox", { name: "picker.label" }))
  const item = await screen.findByText(title)
  await user.click(item)
}

/**
 * `AppField` points the label's `for` at the wrapper div (not the input), so
 * label-text queries cannot associate. Resolve the input through the wrapper.
 */
function inputForLabel(labelText: RegExp): HTMLInputElement {
  const label = screen.getByText(labelText, { selector: "label" })
  const wrapper = document.getElementById(label.getAttribute("for") ?? "")
  const input = wrapper?.querySelector("input")
  if (!input) throw new Error(`No input associated with ${labelText}`)
  return input as HTMLInputElement
}

describe("VenueEventForm", () => {
  it("blocks submit on validation errors BEFORE any create call", async () => {
    const user = userEvent.setup()
    render(<VenueEventForm />)

    await user.click(screen.getByRole("button", { name: /buttons.save/ }))

    // Positive observable first: the resolver rendered the translated CODE.
    expect(
      await screen.findByText("errors.EVENT_TITLE_REQUIRED")
    ).toBeInTheDocument()
    expect(createEventMutateAsync).not.toHaveBeenCalled()
  })

  it("selecting a film prefills the title and shows SCREENING fields", async () => {
    render(<VenueEventForm />)

    await selectWork("Dune")

    expect(screen.getByTestId("selected-work")).toHaveTextContent("Dune")
    expect(inputForLabel(/fields.title/)).toHaveValue("Dune")
    // Screening-only field present, performance-only field absent.
    expect(screen.getByText("fields.videoFormat")).toBeInTheDocument()
    expect(
      screen.queryByText("fields.surtitleLanguage")
    ).not.toBeInTheDocument()
    expect(screen.getByText("fields.subtitleLanguage")).toBeInTheDocument()
  })

  it("selecting a play switches the showtime rows to PERFORMANCE fields", async () => {
    render(<VenueEventForm />)

    await selectWork("Hamlet")

    expect(screen.getByTestId("selected-work")).toHaveTextContent("Hamlet")
    expect(screen.getByText("fields.surtitleLanguage")).toBeInTheDocument()
    expect(screen.queryByText("fields.videoFormat")).not.toBeInTheDocument()
    expect(
      screen.queryByText("fields.subtitleLanguage")
    ).not.toBeInTheDocument()
  })

  it("submits the wire payload and navigates to the preview", async () => {
    const user = userEvent.setup()
    render(<VenueEventForm />)

    await selectWork("Dune")

    fireEvent.change(inputForLabel(/fields.startDate/), {
      target: { value: "2026-09-01" },
    })
    fireEvent.change(inputForLabel(/fields.showtimeDate/), {
      target: { value: "2026-09-01" },
    })
    fireEvent.change(inputForLabel(/fields.showtimeTime/), {
      target: { value: "20:00" },
    })

    await user.click(screen.getByRole("button", { name: /buttons.save/ }))

    await waitFor(() => expect(createEventMutateAsync).toHaveBeenCalled())
    const payload = createEventMutateAsync.mock.calls[0]![0]
    expect(payload.creativeWorkId).toBe("work-1")
    expect(payload.title).toBe("Dune")
    expect(payload.showtimes).toHaveLength(1)
    expect(payload.showtimes[0].startDateTime).toBeTruthy()
    expect(payload.showtimes[0]).not.toHaveProperty("surtitleLanguage")
    // NO ticketing surface on the wire, ever.
    expect(JSON.stringify(payload)).not.toMatch(/price|ticket/i)

    await waitFor(() =>
      expect(routerPushMock).toHaveBeenCalledWith("/venue/events/event-1")
    )
    expect(toastMock).toHaveBeenCalledWith({ description: "success.created" })
  })

  it("rejects an out-of-range showtime with the translated code, sending nothing", async () => {
    const user = userEvent.setup()
    render(<VenueEventForm />)

    await selectWork("Dune")

    fireEvent.change(inputForLabel(/fields.startDate/), {
      target: { value: "2026-09-01" },
    })
    fireEvent.change(inputForLabel(/fields.showtimeDate/), {
      target: { value: "2026-09-10" },
    })
    fireEvent.change(inputForLabel(/fields.showtimeTime/), {
      target: { value: "20:00" },
    })

    await user.click(screen.getByRole("button", { name: /buttons.save/ }))

    expect(
      await screen.findByText("errors.SHOWTIME_OUTSIDE_EVENT_RANGE")
    ).toBeInTheDocument()
    expect(createEventMutateAsync).not.toHaveBeenCalled()
  })

  it("adds and removes showtime rows", async () => {
    const user = userEvent.setup()
    render(<VenueEventForm />)

    expect(screen.getByTestId("showtime-row-0")).toBeInTheDocument()
    expect(screen.queryByTestId("showtime-row-1")).not.toBeInTheDocument()

    await user.click(
      screen.getByRole("button", { name: /buttons.addShowtime/ })
    )
    expect(screen.getByTestId("showtime-row-1")).toBeInTheDocument()

    await user.click(
      screen.getAllByRole("button", { name: /buttons.removeShowtime/ })[0]!
    )
    expect(screen.queryByTestId("showtime-row-1")).not.toBeInTheDocument()
  })
})

import React from "react"
import { DesignSystemProvider, lightTheme } from "@strapi/design-system"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"

import { EventCreationModal } from "../EventCreationModal"

// Mock fetch client. `@strapi/strapi/admin` is already mapped to
// `tests/__mocks__/strapi-admin.ts` by the jest `admin` project (the real admin
// bundle cannot be loaded under jest), so spread it to keep the other hooks it
// provides available — otherwise a hook this component starts using later
// resolves to `undefined` instead of a working stand-in.
jest.mock("@strapi/strapi/admin", () => ({
  ...jest.requireActual("@strapi/strapi/admin"),
  useFetchClient: () => ({
    get: jest.fn(),
    post: jest.fn(),
  }),
}))

// Mock debounce to execute immediately
jest.mock("use-debounce", () => ({
  useDebounce: (value: any) => [value],
}))

// Mock complex design system components that cause issues in jsdom
jest.mock("@strapi/design-system", () => ({
  ...jest.requireActual("@strapi/design-system"),
  DatePicker: () => <div data-testid="date-picker" />,
  TimePicker: () => <div data-testid="time-picker" />,
}))

// Stub the content search panel. The root `resolutions` pin React to 19 while
// `@strapi/ui-primitives` still ships `@radix-ui/react-compose-refs@1.0.1`,
// whose ref-reattach behaviour loops under React 19 and blows the maximum
// update-depth limit in jsdom. Stubbing this one child keeps the modal shell
// under test; the underlying design-system mismatch is pre-existing.
jest.mock("../ContentSearchPanel", () => ({
  ContentSearchPanel: () => <div data-testid="content-search-panel" />,
}))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
})

function renderWithProvider(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={queryClient}>
      <DesignSystemProvider theme={lightTheme}>{ui}</DesignSystemProvider>
    </QueryClientProvider>
  )
}

describe("EventCreationModal", () => {
  const mockOnClose = jest.fn()
  const mockOnSuccess = jest.fn()
  const prefilledDate = new Date("2026-07-01T20:00:00Z")

  it("renders correctly when open", () => {
    renderWithProvider(
      <EventCreationModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        venueId="v1"
        prefilledDate={prefilledDate}
      />
    )

    // "Create Event" is both the modal title and the submit button label, so
    // scope the title assertion by role to keep it unambiguous.
    expect(
      screen.getByRole("heading", { name: "Create Event" })
    ).toBeInTheDocument()
    expect(
      screen.getByText("Search and select a movie to configure the showtime")
    ).toBeInTheDocument()

    // Button should be disabled initially (no movie selected)
    const createBtn = screen.getByRole("button", { name: "Create Event" })
    expect(createBtn).toBeDisabled()
  })

  it("renders nothing when isOpen is false", () => {
    renderWithProvider(
      <EventCreationModal
        isOpen={false}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        venueId="v1"
        prefilledDate={prefilledDate}
      />
    )
    // `DesignSystemProvider` always renders its own aria-live regions into the
    // render container, so the container is never empty. Assert instead that
    // no part of the modal made it into the document — the dialog shell first
    // (which also catches a leaked backdrop or focus trap), then its content.
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(
      screen.queryByRole("heading", { name: "Create Event" })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText("Search and select a movie to configure the showtime")
    ).not.toBeInTheDocument()
  })
})

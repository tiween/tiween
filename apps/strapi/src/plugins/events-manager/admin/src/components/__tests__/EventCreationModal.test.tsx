import React from "react"
import { DesignSystemProvider, lightTheme } from "@strapi/design-system"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"

import { EventCreationModal } from "../EventCreationModal"

// Mock fetch client
jest.mock("@strapi/strapi/admin", () => ({
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

    expect(screen.getByText("Create Event")).toBeInTheDocument()
    expect(
      screen.getByText("Search and select a movie to configure the showtime")
    ).toBeInTheDocument()

    // Button should be disabled initially (no movie selected)
    const createBtn = screen.getByRole("button", { name: "Create Event" })
    expect(createBtn).toBeDisabled()
  })

  it("renders nothing when isOpen is false", () => {
    const { container } = renderWithProvider(
      <EventCreationModal
        isOpen={false}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        venueId="v1"
        prefilledDate={prefilledDate}
      />
    )
    expect(container).toBeEmptyDOMElement()
  })
})

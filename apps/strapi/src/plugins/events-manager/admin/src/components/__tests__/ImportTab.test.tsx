import { DesignSystemProvider } from "@strapi/design-system"
import { useFetchClient } from "@strapi/strapi/admin"
import { render, screen } from "@testing-library/react"

import { ImportTab } from "../ImportTab"

// Mock the hook
jest.mock("@strapi/strapi/admin", () => ({
  ...jest.requireActual("@strapi/strapi/admin"),
  useFetchClient: jest.fn(),
}))

const mockEvents = [
  {
    id: 1,
    title: "Event 1",
    startDate: "2026-07-01",
    publishedAt: "2026-07-01T10:00:00Z",
    venue: { id: 1, name: "Venue 1" },
  },
  {
    id: 2,
    title: "Event 2",
    startDate: "2026-07-02",
    publishedAt: null,
    venue: { id: 2, name: "Venue 2" },
  },
]

describe("ImportTab", () => {
  const mockGet = jest.fn()

  beforeEach(() => {
    ;(useFetchClient as jest.Mock).mockReturnValue({
      get: mockGet,
    })
    mockGet.mockResolvedValue({
      data: {
        results: mockEvents,
        pagination: { page: 1, pageSize: 10, pageCount: 1, total: 2 },
      },
    })
  })

  it("renders the table with events", async () => {
    render(
      <DesignSystemProvider>
        <ImportTab />
      </DesignSystemProvider>
    )

    expect(await screen.findByText("Event 1")).toBeInTheDocument()
    expect(screen.getByText("Event 2")).toBeInTheDocument()
    expect(screen.getByText("Venue 1")).toBeInTheDocument()
    expect(screen.getByText("Published")).toBeInTheDocument()
    expect(screen.getByText("Draft")).toBeInTheDocument()
  })

  it("renders empty state when no events found", async () => {
    mockGet.mockResolvedValue({
      data: {
        results: [],
        pagination: { page: 1, pageSize: 10, pageCount: 0, total: 0 },
      },
    })

    render(
      <DesignSystemProvider>
        <ImportTab />
      </DesignSystemProvider>
    )

    expect(await screen.findByText("No events found")).toBeInTheDocument()
  })

  it("renders loading state", () => {
    // Return a promise that doesn't resolve immediately
    mockGet.mockReturnValue(new Promise(() => {}))

    render(
      <DesignSystemProvider>
        <ImportTab />
      </DesignSystemProvider>
    )

    expect(screen.getByText("Loading...")).toBeInTheDocument()
  })
})

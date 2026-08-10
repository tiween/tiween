/**
 * Venues list component tests (Story 2D.2, AC 11: filter / sort / bulk / empty).
 *
 * The table is the surface where a silent regression is most expensive: a lost
 * filter param widens what an editor sees, a lost `documentId` deletes the
 * wrong row, and a bulk confirm that stops naming its count is how a forgotten
 * selection gets destroyed. All four are pinned against the REQUEST the page
 * makes, not against markup.
 *
 * NOT driven here: the `SingleSelect` filters. The DS v2 selects are Radix
 * based and their ref handling loops under the React 19 pin in jsdom (the same
 * limitation `events-manager/components/__tests__/SubEventModal.test.tsx`
 * documents). The filter → query-param mapping those selects feed is pinned one
 * level down, on `buildListFilters` in
 * `server/src/services/__tests__/venue-admin.unit.test.ts`.
 */
import React from "react"
import { DesignSystemProvider, lightTheme } from "@strapi/design-system"
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import { IntlProvider } from "react-intl"

import messages from "../../translations/en.json"
import { VenuesPage } from "./index"

/* --------------------------------------------------------------- fixtures */

const VENUES = [
  {
    documentId: "venue-1",
    name: "Le Rio",
    slug: "le-rio",
    type: "cinema",
    status: "approved",
    capacity: 250,
    cityRef: { documentId: "city-1", name: "Tunis" },
    updatedAt: "2026-08-09T12:00:00.000Z",
  },
  {
    documentId: "venue-2",
    name: "Théâtre Municipal",
    type: "theater",
    status: "pending",
    capacity: null,
    updatedAt: "2026-01-02T09:00:00.000Z",
  },
]

let listResponse: { data: unknown[]; meta: { pagination: unknown } } = {
  data: VENUES,
  meta: { pagination: { page: 1, pageSize: 20, pageCount: 1, total: 2 } },
}

const defaultGet = async (url: string) =>
  url.includes("geography.city")
    ? { data: { results: [{ id: 1, documentId: "city-1", name: "Tunis" }] } }
    : { data: listResponse }

const get = jest.fn(defaultGet)
const post = jest.fn(async () => ({
  data: { data: { deleted: ["venue-1"], failed: [] } },
}))
const put = jest.fn(async () => ({ data: { data: {} } }))
const del = jest.fn(async () => ({ data: { data: {} } }))
const toggleNotification = jest.fn()

/** Every admin-RBAC action granted (an Admin/Editor). */
let allowedActions: Record<string, boolean> = {
  canRead: true,
  canCreate: true,
  canUpdate: true,
  canDelete: true,
  canManageAll: true,
}

jest.mock("@strapi/strapi/admin", () => ({
  ...jest.requireActual("@strapi/strapi/admin"),
  useFetchClient: () => ({ get, post, put, del }),
  useNotification: () => ({ toggleNotification }),
  useRBAC: () => ({ isLoading: false, allowedActions }),
}))

// Search feeds the request immediately instead of after 300ms.
jest.mock("use-debounce", () => ({
  useDebounce: (value: unknown) => [value],
}))

/**
 * Jest's `clearMocks` clears CALLS but keeps implementations, so a test that
 * installs a failing `get` would silently poison every test after it.
 */
beforeEach(() => {
  listResponse = {
    data: VENUES,
    meta: { pagination: { page: 1, pageSize: 20, pageCount: 1, total: 2 } },
  }
  allowedActions = {
    canRead: true,
    canCreate: true,
    canUpdate: true,
    canDelete: true,
    canManageAll: true,
  }
  get.mockImplementation(defaultGet)
  post.mockImplementation(async () => ({
    data: { data: { deleted: ["venue-1"], failed: [] } },
  }))
  del.mockImplementation(async () => ({ data: { data: {} } }))
})

function renderPage() {
  return render(
    <IntlProvider locale="en" messages={messages as Record<string, string>}>
      <DesignSystemProvider theme={lightTheme}>
        <VenuesPage />
      </DesignSystemProvider>
    </IntlProvider>
  )
}

/** The params of the last venues-list request. */
function lastListParams(): Record<string, unknown> {
  const calls = get.mock.calls.filter((call) =>
    String(call[0]).includes("/venues/admin/venues")
  )
  return (calls[calls.length - 1]?.[1] as { params: Record<string, unknown> })
    .params
}

/** Click the confirm inside the open `Dialog` (the row, bulk and confirm
 *  actions all read "Delete", so the query has to be scoped, not indexed). */
async function confirmInDialog() {
  const dialog = await screen.findByRole("alertdialog")
  fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }))
}

/* ------------------------------------------------------------------ tests */

describe("VenuesPage — list", () => {
  it("renders one row per venue with city, type, status and capacity", async () => {
    renderPage()

    expect(await screen.findByText("Le Rio")).toBeInTheDocument()
    expect(screen.getByText("Théâtre Municipal")).toBeInTheDocument()
    expect(screen.getByText("Tunis")).toBeInTheDocument()
    expect(screen.getByText("Cinema")).toBeInTheDocument()
    expect(screen.getByText("Approved")).toBeInTheDocument()
    expect(screen.getByText("250")).toBeInTheDocument()
  })

  it("renders dates as DD/MM/YYYY in Western numerals", async () => {
    renderPage()

    expect(await screen.findByText(/09\/08\/2026/)).toBeInTheDocument()
  })

  it("calls the plugin's own admin route, not the content-manager API", async () => {
    renderPage()

    await waitFor(() =>
      expect(
        get.mock.calls.some((call) =>
          String(call[0]).includes("/venues/admin/venues")
        )
      ).toBe(true)
    )
    expect(
      get.mock.calls.some((call) =>
        String(call[0]).includes(
          "content-manager/collection-types/plugin::venues"
        )
      )
    ).toBe(false)
  })

  it("sends the search term as a query param", async () => {
    renderPage()
    await screen.findByText("Le Rio")

    fireEvent.change(screen.getByPlaceholderText("Search a venue…"), {
      target: { value: "rio" },
    })

    await waitFor(() => expect(lastListParams().search).toBe("rio"))
  })

  it("toggles the sort order on a repeated click of the same column", async () => {
    renderPage()
    await screen.findByText("Le Rio")

    // Re-queried per click: the header re-renders after each sort, and a click
    // dispatched on the detached previous node is silently a no-op.
    const nameHeader = () =>
      screen.getByRole("button", { name: /Sort by Name/i })

    fireEvent.click(nameHeader())
    await waitFor(() => expect(lastListParams().sortOrder).toBe("desc"))

    // The sort refetches, which swaps the table for the Loader; the header only
    // exists again once the rows are back.
    await screen.findByText("Le Rio")
    fireEvent.click(nameHeader())
    await waitFor(() => expect(lastListParams().sortOrder).toBe("asc"))
    expect(lastListParams().sortField).toBe("name")
  })

  it("shows the plain empty state with a CTA, and the filtered one without", async () => {
    listResponse = {
      data: [],
      meta: { pagination: { page: 1, pageSize: 20, pageCount: 0, total: 0 } },
    }
    renderPage()

    expect(await screen.findByText("No venue yet.")).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText("Search a venue…"), {
      target: { value: "zzz" },
    })

    expect(
      await screen.findByText("No venue matches your search.")
    ).toBeInTheDocument()
  })
})

describe("VenuesPage — selection and delete", () => {
  it("selects every row from the header checkbox and names the count in the confirm", async () => {
    renderPage()
    await screen.findByText("Le Rio")

    fireEvent.click(screen.getByRole("checkbox", { name: "Select all" }))

    expect(await screen.findByText("2 selected")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Delete selection" }))

    // The confirm NAMES the scope — a generic "are you sure?" is what lets a
    // forgotten selection be destroyed.
    expect(
      await screen.findByText("Delete 2 venues? This action cannot be undone.")
    ).toBeInTheDocument()
  })

  it("bulk-deletes through the bulk route and refetches (never optimistic)", async () => {
    renderPage()
    await screen.findByText("Le Rio")

    fireEvent.click(screen.getByRole("checkbox", { name: "Select all" }))
    fireEvent.click(screen.getByRole("button", { name: "Delete selection" }))

    const listCallsBefore = get.mock.calls.length
    await confirmInDialog()

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith("/venues/admin/venues/bulk-delete", {
        documentIds: ["venue-1", "venue-2"],
      })
    )
    await waitFor(() =>
      expect(get.mock.calls.length).toBeGreaterThan(listCallsBefore)
    )
    expect(toggleNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: "success" })
    )
  })

  it("deletes a single venue by documentId after the confirm", async () => {
    renderPage()
    await screen.findByText("Le Rio")

    fireEvent.click(screen.getAllByRole("button", { name: "Delete" })[0])
    await confirmInDialog()

    await waitFor(() =>
      expect(del).toHaveBeenCalledWith("/venues/admin/venues/venue-1")
    )
  })
})

describe("VenuesPage — mutation failures", () => {
  it("reports a PARTIALLY failed bulk delete instead of a plain success", async () => {
    // The rows that survived reappear on the refetch; reporting plain success
    // makes that look like the list is broken.
    post.mockImplementation(async () => ({
      data: { data: { deleted: ["venue-1"], failed: ["venue-2"] } },
    }))
    renderPage()
    await screen.findByText("Le Rio")

    fireEvent.click(screen.getByRole("checkbox", { name: "Select all" }))
    fireEvent.click(screen.getByRole("button", { name: "Delete selection" }))
    await confirmInDialog()

    await waitFor(() =>
      expect(toggleNotification).toHaveBeenCalledWith({
        type: "warning",
        message: "1 venues could not be deleted.",
      })
    )
  })

  it("surfaces a REFUSED bulk delete as a danger toast, translated", async () => {
    post.mockImplementation(async () => {
      throw {
        response: { data: { error: { details: { code: "VENUE_FORBIDDEN" } } } },
      }
    })
    renderPage()
    await screen.findByText("Le Rio")

    fireEvent.click(screen.getByRole("checkbox", { name: "Select all" }))
    fireEvent.click(screen.getByRole("button", { name: "Delete selection" }))
    await confirmInDialog()

    await waitFor(() =>
      expect(toggleNotification).toHaveBeenCalledWith({
        type: "danger",
        message: "You are not allowed to do this.",
      })
    )
  })

  it("surfaces a refused single delete (a venue with séances) and refetches anyway", async () => {
    del.mockImplementation(async () => {
      throw {
        response: {
          data: { error: { details: { code: "VENUE_HAS_EVENTS" } } },
        },
      }
    })
    renderPage()
    await screen.findByText("Le Rio")

    const listCallsBefore = get.mock.calls.length
    fireEvent.click(screen.getAllByRole("button", { name: "Delete" })[0])
    await confirmInDialog()

    await waitFor(() =>
      expect(toggleNotification).toHaveBeenCalledWith({
        type: "danger",
        message:
          "This venue has scheduled showings (or the check failed). Delete the showings first.",
      })
    )
    // The table must not diverge from the server even when the delete failed.
    await waitFor(() =>
      expect(get.mock.calls.length).toBeGreaterThan(listCallsBefore)
    )
  })

  it("names the venue in the single-delete confirmation", async () => {
    renderPage()
    await screen.findByText("Le Rio")

    fireEvent.click(screen.getAllByRole("button", { name: "Delete" })[0])

    expect(
      await screen.findByText(
        /Delete .Le Rio.\? This action cannot be undone\./
      )
    ).toBeInTheDocument()
  })
})

describe("VenuesPage — RBAC", () => {
  it("offers 'New venue' to a caller with manage-all", async () => {
    renderPage()

    expect(
      await screen.findByRole("button", { name: /New venue/i })
    ).toBeInTheDocument()
  })

  it("renders the standard no-permissions page and fires NO request without read", async () => {
    allowedActions = {
      canRead: false,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
      canManageAll: false,
    }
    renderPage()

    expect(
      await screen.findByText(/do not have the permissions/i)
    ).toBeInTheDocument()
    // A 403-driven empty table would read as "there are no venues".
    expect(
      get.mock.calls.filter((call) =>
        String(call[0]).includes("/venues/admin/venues")
      )
    ).toHaveLength(0)
  })

  it("hides 'New venue' and the delete actions from a scoped Venue Manager", async () => {
    allowedActions = {
      canRead: true,
      canCreate: false,
      canUpdate: true,
      canDelete: false,
      canManageAll: false,
    }
    renderPage()

    await screen.findByText("Le Rio")

    expect(screen.queryByRole("button", { name: /New venue/i })).toBeNull()
    expect(screen.queryAllByRole("button", { name: "Delete" })).toHaveLength(0)
    // The subtitle switches to the single-venue wording. Asserted on the
    // landmark's text: `Layouts.Header` is stubbed in the jest admin project
    // and projects its props as bare text nodes, which `getByText` (which needs
    // an ELEMENT) cannot match.
    expect(screen.getByRole("main")).toHaveTextContent("Your venue")
  })
})

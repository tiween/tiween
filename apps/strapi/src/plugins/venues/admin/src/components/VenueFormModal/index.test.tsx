/**
 * Venue form component tests (Story 2D.2, AC 11).
 *
 * Three properties are pinned here because nothing else observes them:
 *  - AUTO-SLUG stops the moment the editor touches the slug, and never runs at
 *    all on an existing venue (rewriting a live slug breaks every URL to it)
 *  - the STATUS field is locked without `manage-all` (AC 7's visible half)
 *  - a server error CODE is rendered as a TRANSLATED message, never as the raw
 *    `VENUE_NAME_REQUIRED`, and lands on the field it names
 *
 * The rules themselves (required fields, website/capacity/email) live on the
 * node gate in `./validate.unit.test.ts` — the DS `SingleSelect` is Radix based
 * and cannot be driven reliably in jsdom under the React 19 pin, so a
 * type-selection cannot be scripted here.
 */
import React from "react"
import { DesignSystemProvider, lightTheme } from "@strapi/design-system"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { IntlProvider } from "react-intl"

import type { Venue } from "../../hooks/useVenuesAdmin"

import messages from "../../translations/en.json"
import { VenueFormModal } from "./index"

const get = jest.fn(async () => ({ data: { results: [] } }))
const post = jest.fn(async () => ({
  data: { data: { documentId: "venue-9" } },
}))
const put = jest.fn(async () => ({ data: { data: { documentId: "venue-1" } } }))
const del = jest.fn(async () => ({ data: { data: {} } }))
const toggleNotification = jest.fn()

jest.mock("@strapi/strapi/admin", () => ({
  ...jest.requireActual("@strapi/strapi/admin"),
  useFetchClient: () => ({ get, post, put, del }),
  useNotification: () => ({ toggleNotification }),
}))

// The map picker geocodes over the network and paints OSM tiles; neither
// belongs in a form test. Its own contract is pinned in `MapPicker/geocode.unit.test.ts`.
jest.mock("../MapPicker", () => ({
  MapPicker: ({
    address,
    onAddressChange,
  }: {
    address: string
    onAddressChange: (value: string) => void
  }) => (
    <input
      aria-label="Address"
      value={address}
      onChange={(e) => onAddressChange(e.target.value)}
    />
  ),
}))

const VENUE: Venue = {
  documentId: "venue-1",
  name: "Le Rio",
  slug: "le-rio",
  type: "cinema",
  status: "approved",
  capacity: 250,
  address: "12 rue de Rome",
}

beforeEach(() => {
  post.mockImplementation(async () => ({
    data: { data: { documentId: "venue-9" } },
  }))
  put.mockImplementation(async () => ({
    data: { data: { documentId: "venue-1" } },
  }))
})

function renderForm(
  props: Partial<React.ComponentProps<typeof VenueFormModal>> = {}
) {
  return render(
    <IntlProvider locale="en" messages={messages as Record<string, string>}>
      <DesignSystemProvider theme={lightTheme}>
        <VenueFormModal
          venue={null}
          isOpen
          canManageAll
          onClose={jest.fn()}
          onSuccess={jest.fn()}
          {...props}
        />
      </DesignSystemProvider>
    </IntlProvider>
  )
}

const nameInput = () => screen.getByLabelText(/Venue name/i)
const slugInput = () => screen.getByLabelText(/Slug/i)

describe("VenueFormModal — auto-slug", () => {
  it("derives the slug from the name until the editor edits it", () => {
    renderForm()

    fireEvent.change(nameInput(), { target: { value: "Cinéma Le Colisée" } })
    expect(slugInput()).toHaveValue("cinema-le-colisee")

    fireEvent.change(slugInput(), { target: { value: "colisee" } })
    fireEvent.change(nameInput(), { target: { value: "Cinéma Le Colisée 2" } })

    // Touched: the editor's slug survives a later name change.
    expect(slugInput()).toHaveValue("colisee")
  })

  it("never rewrites an existing venue's slug", () => {
    renderForm({ venue: VENUE })

    expect(slugInput()).toHaveValue("le-rio")
    fireEvent.change(nameInput(), { target: { value: "Le Rio Renamed" } })

    expect(slugInput()).toHaveValue("le-rio")
  })
})

describe("VenueFormModal — RBAC", () => {
  it("locks the status field without manage-all and explains why", () => {
    renderForm({ venue: VENUE, canManageAll: false })

    expect(
      screen.getByText("Only administrators can change the status")
    ).toBeInTheDocument()
  })

  it("omits `status` from the payload a scoped caller submits", async () => {
    renderForm({ venue: VENUE, canManageAll: false })

    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    await waitFor(() => expect(put).toHaveBeenCalled())
    const payload = put.mock.calls[0][1] as Record<string, unknown>
    expect(payload.status).toBeUndefined()
    expect(payload.name).toBe("Le Rio")
  })
})

describe("VenueFormModal — submit", () => {
  it("writes to the plugin admin route keyed by documentId, and toasts on success", async () => {
    const onSuccess = jest.fn()
    renderForm({ venue: VENUE, onSuccess })

    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    await waitFor(() =>
      expect(put).toHaveBeenCalledWith(
        "/venues/admin/venues/venue-1",
        expect.objectContaining({ name: "Le Rio", status: "approved" })
      )
    )
    expect(toggleNotification).toHaveBeenCalledWith({
      type: "success",
      message: "Venue updated.",
    })
    expect(onSuccess).toHaveBeenCalledWith("edit")
  })

  it("blocks the submit on a client-side rule and shows the TRANSLATED code", async () => {
    renderForm({ venue: { ...VENUE, name: "" } })

    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    expect(await screen.findByText("The name is required.")).toBeInTheDocument()
    expect(put).not.toHaveBeenCalled()
  })

  it("renders a server field CODE as a translated Field.Error, never raw", async () => {
    put.mockImplementation(async () => {
      throw {
        response: {
          data: {
            error: {
              details: {
                code: "VALIDATION_FAILED",
                issues: [{ path: "website", message: "VENUE_WEBSITE_INVALID" }],
              },
            },
          },
        },
      }
    })
    renderForm({ venue: VENUE })

    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    expect(
      await screen.findByText("Invalid URL (e.g. https://www.venue.tn).")
    ).toBeInTheDocument()
    expect(screen.queryByText("VENUE_WEBSITE_INVALID")).toBeNull()
    expect(toggleNotification).toHaveBeenCalledWith({
      type: "danger",
      message: "The form contains errors.",
    })
  })

  it("degrades an UNKNOWN server code to the generic message", async () => {
    put.mockImplementation(async () => {
      throw {
        response: {
          data: { error: { details: { code: "SOMETHING_NEW" } } },
        },
      }
    })
    renderForm({ venue: VENUE })

    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    await waitFor(() =>
      expect(toggleNotification).toHaveBeenCalledWith({
        type: "danger",
        message: "An unexpected error occurred.",
      })
    )
  })
})

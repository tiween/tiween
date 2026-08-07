/**
 * Tests for the venue-manager VenueProfileForm (Story 7.2).
 *
 * The real schema, the real resolver and the real TanStack hooks run; only the
 * boundaries are mocked — `next-intl` (echoes keys so labels are queryable),
 * the toast hook, the Leaflet map island (it needs `window` APIs jsdom lacks),
 * the Strapi client and `fetch` (the upload path).
 *
 * NOTE on the "blocks submit" tests: asserting only that nothing was PUT is
 * worthless on its own — that expectation resolves on the first tick and stays
 * green even if the submit handler were deleted outright. Each of them
 * therefore asserts the POSITIVE observable FIRST: the field-level validation
 * message the resolver rendered (a translated CODE, since next-intl echoes keys
 * here).
 */
import * as React from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import type { ManagerVenue } from "@/features/venues/schemas/venue-profile"

import { VenueProfileForm } from "./VenueProfileForm"

const { toastMock, fetchAPIMock } = vi.hoisted(() => ({
  toastMock: vi.fn(),
  fetchAPIMock: vi.fn(),
}))

// AppField/AppForm import general-helpers, which eagerly validates env.mjs and
// rejects NODE_ENV=test. Stub the one helper they use so env is never imported.
vi.mock("@/lib/general-helpers", () => ({
  removeThisWhenYouNeedMe: () => {},
}))

// `@/lib/navigation` also imports env.mjs eagerly; the form only uses `Link`
// (the Story 7.3 cross-link to /venue/events).
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

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "fr",
}))

vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}))

vi.mock("@/lib/strapi-api", () => ({
  PrivateStrapiClient: { fetchAPI: fetchAPIMock },
  PublicStrapiClient: { fetchAPI: vi.fn() },
}))

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { user: { userId: 42 } },
    status: "authenticated",
  }),
}))

// The map island is a Leaflet component behind `dynamic(..., { ssr: false })`;
// it touches `window` APIs jsdom does not implement. The picker's CONTRACT (it
// writes coordinates back into the form) is exercised through this stub's
// button, which is exactly what the real drag/click handlers call.
vi.mock("@/features/venues/components/VenueLocationPicker", () => ({
  VenueLocationPicker: ({
    value,
    onChange,
    onClear,
  }: {
    value: { latitude: number; longitude: number } | null
    onChange: (v: { latitude: number; longitude: number }) => void
    onClear?: () => void
  }) => (
    <div>
      <span data-testid="geo-value">
        {value ? `${value.latitude},${value.longitude}` : "none"}
      </span>
      <button
        type="button"
        onClick={() => onChange({ latitude: 35.5, longitude: 11.25 })}
      >
        move-pin
      </button>
      {/* Leaflet keeps counting past the date line, so the real picker can and
          does emit a longitude outside ±180. */}
      <button
        type="button"
        onClick={() => onChange({ latitude: 35.5, longitude: 190.25 })}
      >
        move-pin-past-dateline
      </button>
      <button type="button" onClick={() => onClear?.()}>
        clear-pin
      </button>
    </div>
  ),
}))

const VENUE: ManagerVenue = {
  documentId: "venue-1",
  name: "Le Rio",
  slug: "le-rio",
  description: "Une salle historique",
  address: "12 rue de Rome",
  type: "cinema",
  status: "pending",
  phone: "+21671000000",
  email: "contact@rio.test",
  website: "https://rio.test",
  capacity: 300,
  geo: { latitude: 36.8, longitude: 10.18 },
  logo: { id: 5, url: "/uploads/logo.png", name: "logo.png" },
  images: [{ id: 6, url: "/uploads/hall.png", name: "hall.png" }],
  city: { documentId: "city-1", name: "Tunis", slug: "tunis" },
  properties: [],
}

const CATALOG = [
  {
    documentId: "cat-1",
    name: "Accessibility",
    slug: "accessibility",
    sortOrder: 1,
    parent: null,
    definitions: [
      {
        documentId: "def-1",
        name: "Wheelchair accessible",
        slug: "wheelchair",
        type: "boolean",
        sortOrder: 1,
      },
      {
        documentId: "def-2",
        name: "Screens",
        slug: "screens",
        type: "integer",
        sortOrder: 2,
      },
    ],
  },
]

/** Route the mocked Strapi client by path, so each test states only its deltas. */
function mockApi(
  overrides: {
    venue?: ManagerVenue | null
    venueError?: Error
    updateError?: Error
  } = {}
) {
  fetchAPIMock.mockImplementation(
    async (path: string, _params: unknown, init?: { method?: string }) => {
      if (path === "/venues/venues/property-definitions") {
        return { data: CATALOG }
      }
      if (path === "/venues/venues/me" && init?.method === "PUT") {
        if (overrides.updateError) throw overrides.updateError
        return { data: { ...VENUE, ...overrides.venue } }
      }
      if (path === "/venues/venues/me") {
        if (overrides.venueError) throw overrides.venueError
        return {
          data:
            overrides.venue === undefined
              ? VENUE
              : overrides.venue ?? undefined,
        }
      }
      throw new Error(`unexpected path ${path}`)
    }
  )
}

function renderForm() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return render(
    <QueryClientProvider client={client}>
      <VenueProfileForm />
    </QueryClientProvider>
  )
}

function getInput(name: string): HTMLInputElement {
  const el = document.querySelector<HTMLInputElement>(`input[name="${name}"]`)
  if (!el) throw new Error(`input[name="${name}"] not found`)
  return el
}

async function submit(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "buttons.save" }))
}

/** The PUT calls made against `/venues/me`, if any. */
function putCalls() {
  return fetchAPIMock.mock.calls.filter(
    (call) =>
      call[0] === "/venues/venues/me" &&
      (call[2] as { method?: string } | undefined)?.method === "PUT"
  )
}

// The venue-type field is a Radix Select, which relies on pointer-capture,
// scroll and ResizeObserver APIs jsdom does not implement.
beforeAll(() => {
  Element.prototype.hasPointerCapture = vi.fn(() => false)
  Element.prototype.setPointerCapture = vi.fn()
  Element.prototype.releasePointerCapture = vi.fn()
  Element.prototype.scrollIntoView = vi.fn()
  // @ts-expect-error - jsdom lacks ResizeObserver; Radix needs it.
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

beforeEach(() => {
  toastMock.mockReset()
  fetchAPIMock.mockReset()
  vi.unstubAllGlobals()
})

describe("VenueProfileForm", () => {
  it("renders the manager's own venue, its media and a READ-ONLY status", async () => {
    mockApi()
    renderForm()

    expect(await screen.findByDisplayValue("Le Rio")).toBeTruthy()
    expect(getInput("address").value).toBe("12 rue de Rome")
    expect(getInput("email").value).toBe("contact@rio.test")
    expect(getInput("capacity").value).toBe("300")

    // `status` is displayed, never edited — Epic 9 owns the transitions.
    expect(screen.getByTestId("venue-status").textContent).toContain(
      "status.pending"
    )
    expect(document.querySelector('input[name="status"]')).toBeNull()
    expect(document.querySelector('input[name="slug"]')).toBeNull()

    // The current media are previewed so the manager knows what they are replacing.
    expect(document.querySelector('img[src="/uploads/logo.png"]')).toBeTruthy()
    expect(document.querySelector('img[src="/uploads/hall.png"]')).toBeTruthy()
  })

  it("renders the amenity catalog grouped by category, typed by definition", async () => {
    mockApi()
    renderForm()

    await screen.findByDisplayValue("Le Rio")

    await waitFor(() => {
      expect(document.querySelector("#amenity-def-1")).toBeTruthy()
    })
    expect(
      document.querySelector<HTMLInputElement>("#amenity-def-1")?.type
    ).toBe("checkbox")
    expect(
      document.querySelector<HTMLInputElement>("#amenity-def-2")?.inputMode
    ).toBe("numeric")
  })

  it("shows the empty state (not a form) when the manager has no venue", async () => {
    mockApi({
      venueError: new Error(
        JSON.stringify({ details: { code: "VENUE_NOT_FOUND" }, status: 404 })
      ),
    })
    renderForm()

    expect(await screen.findByText("empty.title")).toBeTruthy()
    expect(screen.getByText("errors.VENUE_NOT_FOUND")).toBeTruthy()
    expect(document.querySelector('input[name="name"]')).toBeNull()
  })

  it("shows the policy refusal to a signed-in NON-manager", async () => {
    mockApi({
      venueError: new Error(
        JSON.stringify({ details: { code: "NOT_VENUE_MANAGER" }, status: 403 })
      ),
    })
    renderForm()

    expect(await screen.findByText("errors.NOT_VENUE_MANAGER")).toBeTruthy()
  })

  it("blocks submit and PUTs nothing when the name is cleared", async () => {
    const user = userEvent.setup()
    mockApi()
    renderForm()
    await screen.findByDisplayValue("Le Rio")

    await user.clear(getInput("name"))
    await submit(user)

    // Positive observable FIRST: validation actually ran and rendered.
    expect(await screen.findByText("errors.VENUE_NAME_REQUIRED")).toBeTruthy()
    expect(putCalls()).toHaveLength(0)
  })

  it("blocks submit and PUTs nothing on an invalid website", async () => {
    const user = userEvent.setup()
    mockApi()
    renderForm()
    await screen.findByDisplayValue("Le Rio")

    await user.clear(getInput("website"))
    await user.type(getInput("website"), "javascript:alert(1)")
    await submit(user)

    expect(await screen.findByText("errors.VENUE_WEBSITE_INVALID")).toBeTruthy()
    expect(putCalls()).toHaveLength(0)
  })

  it("blocks submit and PUTs nothing on a non-numeric capacity", async () => {
    const user = userEvent.setup()
    mockApi()
    renderForm()
    await screen.findByDisplayValue("Le Rio")

    await user.clear(getInput("capacity"))
    await user.type(getInput("capacity"), "lots")
    await submit(user)

    expect(
      await screen.findByText("errors.VENUE_CAPACITY_INVALID")
    ).toBeTruthy()
    expect(putCalls()).toHaveLength(0)
  })

  it("PUTs only the fields that actually changed", async () => {
    const user = userEvent.setup()
    mockApi()
    renderForm()
    await screen.findByDisplayValue("Le Rio")

    await user.clear(getInput("name"))
    await user.type(getInput("name"), "Le Rio Palace")
    await submit(user)

    await waitFor(() => {
      expect(putCalls()).toHaveLength(1)
    })

    const body = JSON.parse(
      (putCalls()[0][2] as { body: string }).body
    ) as Record<string, unknown>
    expect(body).toEqual({ name: "Le Rio Palace" })
    // Tenant-scoping keys are never even offered to the server.
    expect(body).not.toHaveProperty("documentId")
    expect(body).not.toHaveProperty("slug")
    expect(body).not.toHaveProperty("status")
    expect(body).not.toHaveProperty("manager")
  })

  it("writes the dragged pin's coordinates into the payload", async () => {
    const user = userEvent.setup()
    mockApi()
    renderForm()
    await screen.findByDisplayValue("Le Rio")

    expect(screen.getByTestId("geo-value").textContent).toBe("36.8,10.18")
    await user.click(screen.getByRole("button", { name: "move-pin" }))
    expect(screen.getByTestId("geo-value").textContent).toBe("35.5,11.25")

    await submit(user)

    await waitFor(() => {
      expect(putCalls()).toHaveLength(1)
    })
    const body = JSON.parse((putCalls()[0][2] as { body: string }).body)
    expect(body.geo).toEqual({ latitude: 35.5, longitude: 11.25 })
  })

  it("NORMALIZES a longitude the picker panned past the date line", async () => {
    // Without this the resolver rejects `geo` with VENUE_GEO_INVALID — on a
    // field that has no input to render the message under, so Save just looks
    // dead. 190.25 is the same physical place as -169.75.
    const user = userEvent.setup()
    mockApi()
    renderForm()
    await screen.findByDisplayValue("Le Rio")

    await user.click(
      screen.getByRole("button", { name: "move-pin-past-dateline" })
    )
    await submit(user)

    await waitFor(() => {
      expect(putCalls()).toHaveLength(1)
    })
    const body = JSON.parse((putCalls()[0][2] as { body: string }).body)
    expect(body.geo).toEqual({ latitude: 35.5, longitude: -169.75 })
  })

  it("sends geo: null when the pin is removed", async () => {
    const user = userEvent.setup()
    mockApi()
    renderForm()
    await screen.findByDisplayValue("Le Rio")

    await user.click(screen.getByRole("button", { name: "clear-pin" }))
    await submit(user)

    await waitFor(() => {
      expect(putCalls()).toHaveLength(1)
    })
    const body = JSON.parse((putCalls()[0][2] as { body: string }).body)
    expect(body.geo).toBeNull()
  })

  it("sends a toggled amenity as a typed property entry", async () => {
    const user = userEvent.setup()
    mockApi()
    renderForm()
    await screen.findByDisplayValue("Le Rio")
    await waitFor(() => {
      expect(document.querySelector("#amenity-def-1")).toBeTruthy()
    })

    await user.click(document.querySelector("#amenity-def-1")!)
    await submit(user)

    await waitFor(() => {
      expect(putCalls()).toHaveLength(1)
    })
    const body = JSON.parse((putCalls()[0][2] as { body: string }).body)
    expect(body.properties).toEqual([
      { definition: "def-1", booleanValue: true },
    ])
  })

  it("PRESERVES a stored amenity whose definition the catalog does not reach", async () => {
    // `properties` is a FULL REPLACEMENT on the wire. `property-definition
    // .category` is nullable and the catalog route omits categories with no
    // definitions, so building the outgoing list from the catalog alone DELETED
    // every stored amenity it could not see — on the first toggle of any other
    // amenity, silently.
    const user = userEvent.setup()
    mockApi({
      venue: {
        ...VENUE,
        properties: [
          {
            definition: {
              documentId: "def-uncategorized",
              name: "Legacy amenity",
              type: "string",
            },
            stringValue: "keep me",
          },
        ],
      },
    })
    renderForm()
    await screen.findByDisplayValue("Le Rio")
    await waitFor(() => {
      expect(document.querySelector("#amenity-def-1")).toBeTruthy()
    })
    // The stored definition really is absent from the rendered catalog.
    expect(document.querySelector("#amenity-def-uncategorized")).toBeNull()

    await user.click(document.querySelector("#amenity-def-1")!)
    await submit(user)

    await waitFor(() => {
      expect(putCalls()).toHaveLength(1)
    })
    const body = JSON.parse((putCalls()[0][2] as { body: string }).body)
    expect(body.properties).toEqual([
      { definition: "def-uncategorized", stringValue: "keep me" },
      { definition: "def-1", booleanValue: true },
    ])
  })

  it("CLEARS an amenity the manager blanked, rather than rewriting the old value", async () => {
    const user = userEvent.setup()
    mockApi({
      venue: {
        ...VENUE,
        properties: [
          {
            definition: {
              documentId: "def-2",
              name: "Screens",
              type: "integer",
            },
            integerValue: 4,
          },
        ],
      },
    })
    renderForm()
    await screen.findByDisplayValue("Le Rio")
    await waitFor(() => {
      expect(document.querySelector("#amenity-def-2")).toBeTruthy()
    })

    await user.clear(document.querySelector("#amenity-def-2")!)
    await submit(user)

    await waitFor(() => {
      expect(putCalls()).toHaveLength(1)
    })
    const body = JSON.parse((putCalls()[0][2] as { body: string }).body)
    expect(body.properties).toEqual([])
  })

  it("refuses a non-integer amenity value with a translated code, PUTting nothing", async () => {
    const user = userEvent.setup()
    mockApi()
    renderForm()
    await screen.findByDisplayValue("Le Rio")
    await waitFor(() => {
      expect(document.querySelector("#amenity-def-2")).toBeTruthy()
    })

    await user.type(document.querySelector("#amenity-def-2")!, "many")
    await submit(user)

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: "destructive",
          description: "errors.PROPERTY_VALUE_TYPE_MISMATCH",
        })
      )
    })
    expect(putCalls()).toHaveLength(0)
  })

  it("says NO_FIELDS_TO_UPDATE instead of PUTting an empty body", async () => {
    const user = userEvent.setup()
    mockApi()
    renderForm()
    await screen.findByDisplayValue("Le Rio")

    await submit(user)

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: "destructive",
          description: "errors.NO_FIELDS_TO_UPDATE",
        })
      )
    })
    expect(putCalls()).toHaveLength(0)
  })

  describe("media pre-flight", () => {
    function attach(name: string, files: File[]) {
      const input = document.querySelector<HTMLInputElement>(
        `input[name="${name}"]`
      )!
      Object.defineProperty(input, "files", {
        value: files,
        configurable: true,
      })
      fireEvent.change(input)
    }

    function fakeImage(name: string, type: string, bytes: number): File {
      const file = new File(["x"], name, { type })
      Object.defineProperty(file, "size", { value: bytes })
      return file
    }

    it("refuses an oversized logo before uploading anything", async () => {
      const user = userEvent.setup()
      const uploadMock = vi.fn()
      vi.stubGlobal("fetch", uploadMock)
      mockApi()
      renderForm()
      await screen.findByDisplayValue("Le Rio")

      attach("logo", [fakeImage("big.png", "image/png", 6 * 1024 * 1024)])
      await submit(user)

      await waitFor(() => {
        expect(toastMock).toHaveBeenCalledWith(
          expect.objectContaining({
            variant: "destructive",
            description: "errors.IMAGE_TOO_LARGE",
          })
        )
      })
      expect(uploadMock).not.toHaveBeenCalled()
      expect(putCalls()).toHaveLength(0)
    })

    it("refuses a photo whose mime type is not in the allowlist", async () => {
      const user = userEvent.setup()
      const uploadMock = vi.fn()
      vi.stubGlobal("fetch", uploadMock)
      mockApi()
      renderForm()
      await screen.findByDisplayValue("Le Rio")

      attach("images", [fakeImage("doc.pdf", "application/pdf", 1024)])
      await submit(user)

      await waitFor(() => {
        expect(toastMock).toHaveBeenCalledWith(
          expect.objectContaining({ description: "errors.IMAGE_TYPE_INVALID" })
        )
      })
      expect(uploadMock).not.toHaveBeenCalled()
      expect(putCalls()).toHaveLength(0)
    })

    it("refuses more than MAX_IMAGES photos instead of trimming them", async () => {
      const user = userEvent.setup()
      const uploadMock = vi.fn()
      vi.stubGlobal("fetch", uploadMock)
      mockApi()
      renderForm()
      await screen.findByDisplayValue("Le Rio")

      attach(
        "images",
        Array.from({ length: 11 }, (_, i) =>
          fakeImage(`p${i}.png`, "image/png", 1024)
        )
      )
      await submit(user)

      await waitFor(() => {
        expect(toastMock).toHaveBeenCalledWith(
          expect.objectContaining({ description: "errors.IMAGES_TOO_MANY" })
        )
      })
      expect(uploadMock).not.toHaveBeenCalled()
      expect(putCalls()).toHaveLength(0)
    })

    it("uploads an accepted logo and sends the returned id", async () => {
      const user = userEvent.setup()
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => ({
          ok: true,
          json: async () => [{ id: 77, url: "/uploads/new.png" }],
        }))
      )
      mockApi()
      renderForm()
      await screen.findByDisplayValue("Le Rio")

      attach("logo", [fakeImage("new.png", "image/png", 1024)])
      await submit(user)

      await waitFor(() => {
        expect(putCalls()).toHaveLength(1)
      })
      const body = JSON.parse((putCalls()[0][2] as { body: string }).body)
      expect(body.logo).toBe(77)
    })

    /**
     * Make the input's `value` observable. A file input only accepts `""` from
     * script, so the tracked accessor is the only way to assert that the form
     * actually clears the displayed filename after a successful save.
     */
    function trackValue(name: string) {
      const input = document.querySelector<HTMLInputElement>(
        `input[name="${name}"]`
      )!
      const store = { value: `C:\\fakepath\\${name}.png` }
      Object.defineProperty(input, "value", {
        configurable: true,
        get: () => store.value,
        set: (next: string) => {
          store.value = next
        },
      })
      return store
    }

    it("clears the React state AND the native inputs after a SUCCESSFUL save", async () => {
      // Leaving the filenames on screen advertises a pending upload that will
      // never be sent again — the manager thinks the files are still queued.
      const user = userEvent.setup()
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => ({
          ok: true,
          json: async () => [{ id: 77, url: "/uploads/new.png" }],
        }))
      )
      mockApi()
      renderForm()
      await screen.findByDisplayValue("Le Rio")

      attach("logo", [fakeImage("new.png", "image/png", 1024)])
      attach("images", [fakeImage("hall2.png", "image/png", 1024)])
      const logoValue = trackValue("logo")
      const imagesValue = trackValue("images")

      await submit(user)

      await waitFor(() => {
        expect(putCalls()).toHaveLength(1)
      })
      await waitFor(() => {
        expect(logoValue.value).toBe("")
      })
      expect(imagesValue.value).toBe("")
    })

    it("REUSES the already-uploaded ids on a retry instead of re-uploading", async () => {
      // Uploads happen before the PUT, so a rejected save leaves them orphaned.
      // Re-uploading on retry would orphan a second copy of every file.
      const user = userEvent.setup()
      const uploadMock = vi.fn(async () => ({
        ok: true,
        json: async () => [{ id: 77, url: "/uploads/new.png" }],
      }))
      vi.stubGlobal("fetch", uploadMock)

      let attempts = 0
      fetchAPIMock.mockImplementation(
        async (path: string, _params: unknown, init?: { method?: string }) => {
          if (path === "/venues/venues/property-definitions") {
            return { data: CATALOG }
          }
          if (path === "/venues/venues/me" && init?.method === "PUT") {
            attempts += 1
            if (attempts === 1) {
              throw new Error(
                JSON.stringify({
                  details: { code: "VALIDATION_FAILED" },
                  status: 400,
                })
              )
            }
            return { data: VENUE }
          }
          if (path === "/venues/venues/me") return { data: VENUE }
          throw new Error(`unexpected path ${path}`)
        }
      )

      renderForm()
      await screen.findByDisplayValue("Le Rio")

      attach("logo", [fakeImage("new.png", "image/png", 1024)])
      await submit(user)

      await waitFor(() => {
        expect(toastMock).toHaveBeenCalledWith(
          expect.objectContaining({
            variant: "destructive",
            description: "errors.VALIDATION_FAILED",
          })
        )
      })
      expect(uploadMock).toHaveBeenCalledTimes(1)

      // Retry: same file, same id, no second upload.
      await submit(user)

      await waitFor(() => {
        expect(putCalls()).toHaveLength(2)
      })
      expect(uploadMock).toHaveBeenCalledTimes(1)
      const retryBody = JSON.parse((putCalls()[1][2] as { body: string }).body)
      expect(retryBody.logo).toBe(77)
    })

    it("sends logo: null when the manager removes the logo", async () => {
      // Media could be replaced but never removed: a wrong logo would have
      // stayed published, because this is the only editing surface there is.
      const user = userEvent.setup()
      const uploadMock = vi.fn()
      vi.stubGlobal("fetch", uploadMock)
      mockApi()
      renderForm()
      await screen.findByDisplayValue("Le Rio")

      await user.click(
        screen.getByRole("button", { name: "buttons.removeLogo" })
      )
      await submit(user)

      await waitFor(() => {
        expect(putCalls()).toHaveLength(1)
      })
      const body = JSON.parse((putCalls()[0][2] as { body: string }).body)
      expect(body.logo).toBeNull()
      expect(uploadMock).not.toHaveBeenCalled()
    })

    it("sends images: [] when the manager removes every photo", async () => {
      const user = userEvent.setup()
      const uploadMock = vi.fn()
      vi.stubGlobal("fetch", uploadMock)
      mockApi()
      renderForm()
      await screen.findByDisplayValue("Le Rio")

      await user.click(
        screen.getByRole("button", { name: "buttons.removePhotos" })
      )
      await submit(user)

      await waitFor(() => {
        expect(putCalls()).toHaveLength(1)
      })
      const body = JSON.parse((putCalls()[0][2] as { body: string }).body)
      expect(body.images).toEqual([])
      expect(uploadMock).not.toHaveBeenCalled()
    })

    it("offers no removal control for media the venue does not have", async () => {
      mockApi({ venue: { ...VENUE, logo: null, images: [] } })
      renderForm()
      await screen.findByDisplayValue("Le Rio")

      expect(
        screen.queryByRole("button", { name: "buttons.removeLogo" })
      ).toBeNull()
      expect(
        screen.queryByRole("button", { name: "buttons.removePhotos" })
      ).toBeNull()
    })
  })

  it("toasts the TRANSLATED code (never the raw code) when the API rejects", async () => {
    const user = userEvent.setup()
    mockApi({
      updateError: new Error(
        JSON.stringify({
          details: { code: "PROPERTY_DEFINITION_UNKNOWN" },
          status: 400,
        })
      ),
    })
    renderForm()
    await screen.findByDisplayValue("Le Rio")

    await user.clear(getInput("name"))
    await user.type(getInput("name"), "Le Rio Palace")
    await submit(user)

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: "destructive",
          description: "errors.PROPERTY_DEFINITION_UNKNOWN",
        })
      )
    })
    // The form stays mounted so the manager can correct and retry.
    expect(getInput("name")).toBeTruthy()
  })

  it("falls back to the generic message for an UNKNOWN error code", async () => {
    const user = userEvent.setup()
    mockApi({
      updateError: new Error(
        JSON.stringify({ details: { code: "WAT_IS_THIS" }, status: 500 })
      ),
    })
    renderForm()
    await screen.findByDisplayValue("Le Rio")

    await user.clear(getInput("name"))
    await user.type(getInput("name"), "Le Rio Palace")
    await submit(user)

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ description: "errors.INTERNAL_ERROR" })
      )
    })
  })

  it("blocks submit and PUTs nothing when a REQUIRED email is blanked", async () => {
    // The payload is a changed-fields-only diff and the wire has no `null` for
    // `email`, so a blanked one used to be omitted — success toast, old value
    // still published.
    const user = userEvent.setup()
    mockApi()
    renderForm()
    await screen.findByDisplayValue("Le Rio")

    await user.clear(getInput("email"))
    await submit(user)

    expect(await screen.findByText("errors.VENUE_EMAIL_REQUIRED")).toBeTruthy()
    expect(putCalls()).toHaveLength(0)
  })

  it("shows a success state after a save", async () => {
    const user = userEvent.setup()
    mockApi()
    renderForm()
    await screen.findByDisplayValue("Le Rio")

    await user.clear(getInput("name"))
    await user.type(getInput("name"), "Le Rio Palace")
    await submit(user)

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ description: "success.saved" })
      )
    })
    expect(await screen.findByText("success.saved")).toBeTruthy()
  })

  it("RETRACTS the success state as soon as the manager edits again", async () => {
    // "Your changes have been saved" describes the last save; leaving it under
    // the button reassures the manager about work they have since changed.
    const user = userEvent.setup()
    mockApi()
    renderForm()
    await screen.findByDisplayValue("Le Rio")

    await user.clear(getInput("name"))
    await user.type(getInput("name"), "Le Rio Palace")
    await submit(user)

    expect(await screen.findByText("success.saved")).toBeTruthy()

    await user.type(getInput("name"), " II")

    await waitFor(() => {
      expect(screen.queryByText("success.saved")).toBeNull()
    })
  })
})

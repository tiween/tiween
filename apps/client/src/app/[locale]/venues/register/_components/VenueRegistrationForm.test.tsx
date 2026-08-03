/**
 * Tests for the public VenueRegistrationForm (Story 7.1).
 *
 * Covers the three things the form alone owns:
 *  - client-side validation blocks the submit (nothing is POSTed),
 *  - a valid submit posts multipart FormData to `/api/venues/register` with the
 *    flat field names the route handler reads, then REPLACES the form with the
 *    "under review" panel (a second submission would only earn an
 *    EMAIL_ALREADY_REGISTERED), and
 *  - an error CODE from the API becomes a translated destructive toast — the
 *    raw code is never rendered.
 *
 * next-intl and the toast hook are mocked so the form renders standalone; the
 * real zodResolver schema runs.
 *
 * NOTE on the "blocks submit" tests: asserting only `fetch` was NOT called is
 * worthless on its own — that expectation resolves on the first tick and stays
 * green even if the submit handler were deleted outright. Each of them therefore
 * also asserts the POSITIVE observable: the field-level validation message the
 * resolver produced (a translated CODE, since next-intl echoes keys here).
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { VenueRegistrationForm } from "./VenueRegistrationForm"

const { toastMock } = vi.hoisted(() => ({ toastMock: vi.fn() }))

// AppField/AppForm import general-helpers, which eagerly validates env.mjs and
// rejects NODE_ENV=test. Stub the one helper they use so env is never imported.
vi.mock("@/lib/general-helpers", () => ({
  removeThisWhenYouNeedMe: () => {},
}))

vi.mock("next-intl", () => ({
  // Return the key so labels are stable and queryable in tests.
  useTranslations: () => (key: string) => key,
  useLocale: () => "fr",
}))

vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}))

vi.mock("next/script", () => ({
  default: () => null,
}))

/** AppField wraps its <input>, so query by the `name` attribute. */
function getInput(name: string): HTMLInputElement {
  const el = document.querySelector<HTMLInputElement>(`input[name="${name}"]`)
  if (!el) throw new Error(`input[name="${name}"] not found`)
  return el
}

async function fillField(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
  value: string
) {
  await user.clear(getInput(name))
  await user.type(getInput(name), value)
}

/**
 * `type` is a Radix Select (no native <select>), which does not open reliably in
 * jsdom. Set it through the form's own resolver path by typing into the other
 * fields and setting the select value via the hidden trigger is unreliable, so
 * the suite drives `type` through a direct change on the underlying form state:
 * the tests that need a *valid* submit set it, the validation tests do not.
 */
async function fillValid(
  user: ReturnType<typeof userEvent.setup>,
  overrides: Partial<Record<string, string>> = {}
) {
  await fillField(user, "name", overrides.name ?? "Le Rio")
  await fillField(user, "address", overrides.address ?? "12 rue de Rome")
  await fillField(user, "phone", overrides.phone ?? "+21671000000")
  await fillField(
    user,
    "venueEmail",
    overrides.venueEmail ?? "contact@rio.test"
  )
  await fillField(user, "firstName", overrides.firstName ?? "Alice")
  await fillField(user, "lastName", overrides.lastName ?? "Dupont")
  await fillField(
    user,
    "managerEmail",
    overrides.managerEmail ?? "alice@example.test"
  )
  await fillField(user, "password", overrides.password ?? "Password1")
  await fillField(
    user,
    "passwordConfirmation",
    overrides.passwordConfirmation ?? overrides.password ?? "Password1"
  )
}

/** Pick the venue type through the Radix select trigger. */
async function selectType(user: ReturnType<typeof userEvent.setup>) {
  const trigger = screen.getByRole("combobox")
  await user.click(trigger)
  // Radix also renders a hidden native <select> mirror, so the label text
  // matches twice; the listbox item is the last match.
  const matches = await screen.findAllByText("types.cinema")
  await user.click(matches[matches.length - 1])
}

async function submit(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "buttons.submit" }))
}

function mockFetchOk() {
  const fetchMock = vi.fn(async () => ({
    ok: true,
    status: 201,
    json: async () => ({
      success: true,
      data: { venueDocumentId: "venue-doc-1", status: "pending" },
    }),
  }))
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

function mockFetchError(status: number, error: string) {
  const fetchMock = vi.fn(async () => ({
    ok: false,
    status,
    json: async () => ({ success: false, error }),
  }))
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

// The venue-type field is a Radix Select, which relies on pointer-capture,
// scroll, and ResizeObserver APIs jsdom does not implement (same polyfill block
// as EventVenueFilter.test.tsx).
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

describe("VenueRegistrationForm", () => {
  beforeEach(() => {
    toastMock.mockReset()
    vi.unstubAllGlobals()
  })

  it("renders both sections of the application form", () => {
    render(<VenueRegistrationForm />)

    expect(screen.getByText("sections.venue")).toBeTruthy()
    expect(screen.getByText("sections.manager")).toBeTruthy()
    expect(getInput("name")).toBeTruthy()
    expect(getInput("managerEmail")).toBeTruthy()
  })

  it("offers a logo and a photos picker restricted to images", () => {
    render(<VenueRegistrationForm />)

    const logo = document.querySelector<HTMLInputElement>('input[name="logo"]')
    const images = document.querySelector<HTMLInputElement>(
      'input[name="images"]'
    )

    expect(logo?.type).toBe("file")
    expect(logo?.accept).toContain("image/")
    expect(images?.multiple).toBe(true)
  })

  it("blocks submit and posts nothing when required fields are empty", async () => {
    const user = userEvent.setup()
    const fetchMock = mockFetchOk()
    render(<VenueRegistrationForm />)

    await submit(user)

    // Positive observable first: validation actually ran and rendered.
    expect(await screen.findByText("errors.VENUE_NAME_REQUIRED")).toBeTruthy()
    expect(screen.getByText("errors.VENUE_ADDRESS_REQUIRED")).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("blocks submit when the venue type was never chosen", async () => {
    const user = userEvent.setup()
    const fetchMock = mockFetchOk()
    render(<VenueRegistrationForm />)

    await fillValid(user)
    await submit(user)

    expect(await screen.findByText("errors.VENUE_TYPE_INVALID")).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("blocks submit when the password confirmation does not match", async () => {
    const user = userEvent.setup()
    const fetchMock = mockFetchOk()
    render(<VenueRegistrationForm />)

    await fillValid(user, { passwordConfirmation: "Different1" })
    await selectType(user)
    await submit(user)

    expect(await screen.findByText("errors.PASSWORD_MISMATCH")).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("blocks submit on a weak manager password", async () => {
    const user = userEvent.setup()
    const fetchMock = mockFetchOk()
    render(<VenueRegistrationForm />)

    await fillValid(user, { password: "password" })
    await selectType(user)
    await submit(user)

    expect(await screen.findByText("errors.MANAGER_PASSWORD_WEAK")).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  /**
   * An oversized / wrong-type / over-count attachment used to be dropped
   * silently — the route skipped it and still answered 201, so a one-shot form
   * lost the applicant's media behind a success message. Both sides now reject;
   * this pins the client half.
   */
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

    /** A File whose reported size is `bytes` (jsdom keeps it cheap). */
    function fakeImage(name: string, type: string, bytes: number): File {
      const file = new File(["x"], name, { type })
      Object.defineProperty(file, "size", { value: bytes })
      return file
    }

    it("refuses to submit an oversized logo and says so", async () => {
      const user = userEvent.setup()
      const fetchMock = mockFetchOk()
      render(<VenueRegistrationForm />)

      attach("logo", [fakeImage("big.png", "image/png", 6 * 1024 * 1024)])
      await fillValid(user)
      await selectType(user)
      await submit(user)

      await waitFor(() => {
        expect(toastMock).toHaveBeenCalledWith(
          expect.objectContaining({
            variant: "destructive",
            description: "errors.IMAGE_TOO_LARGE",
          })
        )
      })
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it("refuses a photo whose mime type is not in the allowlist", async () => {
      const user = userEvent.setup()
      const fetchMock = mockFetchOk()
      render(<VenueRegistrationForm />)

      attach("images", [fakeImage("doc.pdf", "application/pdf", 1024)])
      await fillValid(user)
      await selectType(user)
      await submit(user)

      await waitFor(() => {
        expect(toastMock).toHaveBeenCalledWith(
          expect.objectContaining({ description: "errors.IMAGE_TYPE_INVALID" })
        )
      })
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it("refuses more than MAX_IMAGES photos instead of trimming them", async () => {
      const user = userEvent.setup()
      const fetchMock = mockFetchOk()
      render(<VenueRegistrationForm />)

      attach(
        "images",
        Array.from({ length: 11 }, (_, i) =>
          fakeImage(`p${i}.png`, "image/png", 1024)
        )
      )
      await fillValid(user)
      await selectType(user)
      await submit(user)

      await waitFor(() => {
        expect(toastMock).toHaveBeenCalledWith(
          expect.objectContaining({ description: "errors.IMAGES_TOO_MANY" })
        )
      })
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })

  it("posts multipart FormData to /api/venues/register on a valid submit", async () => {
    const user = userEvent.setup()
    const fetchMock = mockFetchOk()
    render(<VenueRegistrationForm />)

    await fillValid(user)
    await selectType(user)
    await submit(user)

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      { method: string; body: FormData },
    ]
    expect(url).toBe("/api/venues/register")
    expect(init.method).toBe("POST")
    expect(init.body).toBeInstanceOf(FormData)
    expect(init.body.get("name")).toBe("Le Rio")
    expect(init.body.get("type")).toBe("cinema")
    expect(init.body.get("venueEmail")).toBe("contact@rio.test")
    expect(init.body.get("managerEmail")).toBe("alice@example.test")
    expect(init.body.get("password")).toBe("Password1")
    // The active locale drives the applicant confirmation email's language.
    expect(init.body.get("preferredLanguage")).toBe("fr")
    // The confirmation field is a client-only check; it never crosses the wire.
    expect(init.body.get("passwordConfirmation")).toBeNull()
  })

  it("replaces the form with the under-review panel on success", async () => {
    const user = userEvent.setup()
    mockFetchOk()
    render(<VenueRegistrationForm />)

    await fillValid(user)
    await selectType(user)
    await submit(user)

    await waitFor(() => {
      expect(screen.getByText("success.title")).toBeTruthy()
    })
    expect(screen.getByText("success.description")).toBeTruthy()
    // The form is gone, so the application cannot be submitted twice.
    expect(document.querySelector('input[name="name"]')).toBeNull()
    expect(screen.queryByRole("button", { name: "buttons.submit" })).toBeNull()
  })

  it("toasts the TRANSLATED code (not the raw code) when the API rejects", async () => {
    const user = userEvent.setup()
    mockFetchError(409, "EMAIL_ALREADY_REGISTERED")
    render(<VenueRegistrationForm />)

    await fillValid(user)
    await selectType(user)
    await submit(user)

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledTimes(1)
    })
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: "destructive",
        // Translated through `venues.register.errors.<CODE>` — with next-intl
        // mocked to echo the key, that is the namespaced key, not a bare code.
        description: "errors.EMAIL_ALREADY_REGISTERED",
      })
    )
    // The form stays mounted so the applicant can correct and retry.
    expect(screen.queryByText("success.title")).toBeNull()
  })

  it("falls back to the generic message for an UNKNOWN error code", async () => {
    const user = userEvent.setup()
    mockFetchError(500, "SOMETHING_WE_NEVER_HEARD_OF")
    render(<VenueRegistrationForm />)

    await fillValid(user)
    await selectType(user)
    await submit(user)

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledTimes(1)
    })
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        description: "errors.VENUE_REGISTRATION_FAILED",
      })
    )
  })

  it("toasts instead of crashing when the request itself throws", async () => {
    const user = userEvent.setup()
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down")
      })
    )
    render(<VenueRegistrationForm />)

    await fillValid(user)
    await selectType(user)
    await submit(user)

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: "destructive",
          description: "errors.VENUE_REGISTRATION_FAILED",
        })
      )
    })
    expect(screen.queryByText("success.title")).toBeNull()
  })
})

/**
 * Publish bar and slug generation on the Works form (plan 01-09, Task 1).
 *
 * Drives the real `WorkFormPage` at `/works/abc/edit` against a controllable
 * `useFetchClient`, so what is asserted is the request the content-manager
 * would receive (flat bodies, `params.locale`) and the toast the admin sees.
 *
 * The danger toast text is asserted through `toggleNotification`, the stand-in
 * `tests/__mocks__/strapi-admin.ts` exposes.
 */
import React from "react"
import { DesignSystemProvider, lightTheme } from "@strapi/design-system"
import { toggleNotification } from "@strapi/strapi/admin"
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import { IntlProvider } from "react-intl"
import { MemoryRouter, Route, Routes } from "react-router-dom"

import { WorkFormPage } from "../../pages/Works/WorkFormPage"
import en from "../../translations/en.json"
import { DEFAULT_WORK_VALUES, workToApiPayload } from "../WorkForm/schema"

// Each test mounts the whole form (Design System selects, comboboxes, editors).
jest.setTimeout(30000)

jest.mock("use-debounce", () => ({
  useDebounce: (value: unknown) => [value],
}))

const WORK_URL =
  "/content-manager/collection-types/plugin::creative-works.creative-work/abc"
// The edit page reads a work from the creative-works editor route (G-01-1);
// every write still goes through the content-manager `WORK_URL`.
const WORK_READ_URL = "/creative-works/admin/works/abc"

const emptyList = {
  data: {
    results: [],
    data: null,
    pagination: { page: 1, pageSize: 20, pageCount: 0, total: 0 },
  },
}

const LOCALES_FR_DEFAULT = [
  { code: "fr", name: "French (fr)", isDefault: true },
  { code: "ar", name: "Arabic (ar)", isDefault: false },
  { code: "en", name: "English (en)", isDefault: false },
]

const get = jest.fn(
  async (_url: string, _config?: unknown): Promise<any> => emptyList
)
const post = jest.fn(
  async (_url: string, _body?: unknown, _config?: unknown): Promise<any> => ({
    data: { data: {} },
  })
)
const put = jest.fn(
  async (_url: string, _body?: unknown, _config?: unknown): Promise<any> => ({
    data: { data: {} },
  })
)
const del = jest.fn(async () => ({ data: { data: {} } }))

jest.mock("@strapi/strapi/admin", () => ({
  ...jest.requireActual("@strapi/strapi/admin"),
  useFetchClient: () => ({ get, post, put, del }),
}))

const completeDraft = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  documentId: "abc",
  status: "draft",
  title: "Le Silence",
  slug: "le-silence",
  type: "short-film",
  duration: 12,
  releaseYear: 2024,
  poster: { id: 5, name: "p.jpg", url: "/uploads/p.jpg", mime: "image/jpeg" },
  credits: [
    {
      id: 1,
      person: { id: 1, documentId: "p1", name: "Ines" },
      creditRole: {
        id: 1,
        documentId: "r1",
        name: "Director",
        slug: "director",
      },
      customRole: null,
      billing: 1,
    },
  ],
  streamingLinks: [
    {
      id: 1,
      platform: "youtube",
      url: "https://youtu.be/abc",
      accessType: "free",
      label: null,
    },
  ],
  genres: [],
  cast: [],
  videos: [],
  // The editor route answers every round-tripped key, never a missing one.
  originalTitle: null,
  synopsis: null,
  rating: null,
  ageRating: null,
  distinctions: [],
  theatreDetails: null,
  externalIds: null,
  links: [],
  country: null,
  language: null,
  featured: false,
  featuredRank: null,
  backdrop: null,
  photos: [],
  ...overrides,
})

/** Route every read by URL: locales, the work, and empty lists for the rest. */
function serve(
  work: Record<string, unknown>,
  locales: unknown = LOCALES_FR_DEFAULT
) {
  get.mockImplementation(async (url: string) => {
    if (url === "/i18n/locales") return { data: locales }
    if (url === WORK_READ_URL) {
      return { data: { data: work, meta: { availableLocales: [] } } }
    }
    return emptyList
  })
}

async function renderEdit() {
  await act(async () => {
    render(
      <IntlProvider locale="en" messages={en}>
        <DesignSystemProvider theme={lightTheme}>
          <MemoryRouter initialEntries={["/works/abc/edit"]}>
            <Routes>
              <Route
                path="/works/:documentId/edit"
                element={<WorkFormPage />}
              />
              <Route path="*" element={<div data-testid="after-save" />} />
            </Routes>
          </MemoryRouter>
        </DesignSystemProvider>
      </IntlProvider>
    )
  })
  await screen.findByTestId("publish-bar")
}

const publishBar = () => screen.getByTestId("publish-bar")

const publishButton = () => screen.getByRole("button", { name: "Publish" })

const rejection = (error: Record<string, unknown>) => ({
  response: { data: { error } },
})

const lastNotification = () => {
  const calls = (toggleNotification as jest.Mock).mock.calls
  return calls[calls.length - 1]?.[0] as { type: string; message: string }
}

beforeEach(() => {
  ;(toggleNotification as jest.Mock).mockClear()
})

describe("work fixtures", () => {
  it("work fixtures carry every round-tripped key", () => {
    // The keys the form sends back on a save. The editor route answers all of
    // them (null or [] when unset), so a guard that reads a missing key as
    // "not loaded" must never see a fixture without one.
    const ROUND_TRIP_KEYS = Object.keys(
      workToApiPayload({ ...DEFAULT_WORK_VALUES, type: "short-film" })
    )

    expect(Object.keys(completeDraft())).toEqual(
      expect.arrayContaining(ROUND_TRIP_KEYS)
    )
  })
})

describe("WorkFormPage — publish bar", () => {
  it("shows the draft status and enables Publish for a complete short film", async () => {
    serve(completeDraft())

    await renderEdit()

    expect(within(publishBar()).getByText("Draft")).toBeInTheDocument()
    expect(publishButton()).not.toHaveAttribute("aria-disabled", "true")
    expect(screen.queryByTestId("publish-issues")).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Unpublish" })
    ).not.toBeInTheDocument()
  })

  it("publishes the default locale: posts to the publish action with params.locale and confirms", async () => {
    serve(completeDraft())
    await renderEdit()

    await act(async () => {
      fireEvent.click(publishButton())
    })

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1))
    const [url, , config] = post.mock.calls[0]
    expect(url).toBe(`${WORK_URL}/actions/publish`)
    expect(config).toEqual({ params: { locale: "fr" } })
    await waitFor(() => expect(lastNotification().type).toBe("success"))
  })

  it("reads the default locale from /i18n/locales, never a literal", async () => {
    serve(completeDraft(), [
      { code: "fr", name: "French (fr)", isDefault: false },
      { code: "ar", name: "Arabic (ar)", isDefault: true },
    ])
    await renderEdit()

    const workRead = get.mock.calls.find(([url]) => url === WORK_READ_URL)
    expect((workRead?.[1] as any).params.locale).toBe("ar")

    await act(async () => {
      fireEvent.click(publishButton())
    })
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1))
    expect(post.mock.calls[0][2]).toEqual({ params: { locale: "ar" } })
  })

  it("shows translated sentences when the server refuses the publish", async () => {
    serve(completeDraft())
    post.mockRejectedValueOnce(
      rejection({
        message: "Short film cannot be published",
        details: {
          code: "SHORT_FILM_PUBLISH_BLOCKED",
          issues: [{ code: "POSTER_REQUIRED", path: "poster" }],
        },
      })
    )
    await renderEdit()

    await act(async () => {
      fireEvent.click(publishButton())
    })

    await waitFor(() => expect(lastNotification()?.type).toBe("danger"))
    expect(lastNotification().message).toContain(
      "Add a poster before publishing"
    )
    expect(lastNotification().message).not.toContain("cannot be published")
  })

  it("maps a refusal that has only a code, never raw server text", async () => {
    serve(completeDraft())
    post.mockRejectedValueOnce(
      rejection({
        message: "Some raw server prose",
        details: { code: "INVALID_STREAMING_URL" },
      })
    )
    await renderEdit()

    await act(async () => {
      fireEvent.click(publishButton())
    })

    await waitFor(() => expect(lastNotification()?.type).toBe("danger"))
    expect(lastNotification().message).toBe(
      "A streaming link must start with https://"
    )
  })

  it("disables Publish and lists what is missing for an incomplete short film", async () => {
    serve(completeDraft({ poster: null, credits: [] }))

    await renderEdit()

    expect(publishButton()).toHaveAttribute("aria-disabled", "true")
    const issues = screen.getByTestId("publish-issues")
    expect(issues).toHaveTextContent("Add a poster before publishing")
    expect(issues).toHaveTextContent("Add at least one director credit")

    await act(async () => {
      fireEvent.click(publishButton())
    })
    expect(post).not.toHaveBeenCalled()
  })

  it("warns about a duration over 40 minutes without blocking", async () => {
    serve(completeDraft({ duration: 55 }))

    await renderEdit()

    expect(screen.getByTestId("publish-warnings")).toHaveTextContent(
      "Longer than 40 minutes: check this is a short film"
    )
    expect(publishButton()).not.toHaveAttribute("aria-disabled", "true")
  })

  it("applies no short-film rules to a film", async () => {
    serve(
      completeDraft({
        type: "film",
        poster: null,
        credits: [],
        streamingLinks: [],
      })
    )

    await renderEdit()

    expect(screen.queryByTestId("publish-issues")).not.toBeInTheDocument()
    expect(publishButton()).not.toHaveAttribute("aria-disabled", "true")
  })

  it("offers Unpublish for a published work and posts the unpublish action with the locale", async () => {
    serve(completeDraft({ status: "published" }))
    await renderEdit()

    expect(within(publishBar()).getByText("Published")).toBeInTheDocument()
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Unpublish" }))
    })

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1))
    const [url, , config] = post.mock.calls[0]
    expect(url).toBe(`${WORK_URL}/actions/unpublish`)
    expect(config).toEqual({ params: { locale: "fr" } })
  })

  it("shows Modified for a published work edited since", async () => {
    serve(completeDraft({ status: "modified" }))

    await renderEdit()

    expect(within(publishBar()).getByText("Modified")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Unpublish" })
    ).toBeInTheDocument()
  })
})

describe("WorkFormPage — save", () => {
  const save = async () => {
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save" }))
    })
  }

  it("asks the uid generator for a slug when it is blank, and sends it in a flat body", async () => {
    serve(completeDraft({ slug: null }))
    post.mockImplementation(async (url: string) =>
      url === "/content-manager/uid/generate"
        ? { data: { data: "le-silence-generated" } }
        : { data: { data: {} } }
    )
    await renderEdit()

    await save()

    await waitFor(() => expect(put).toHaveBeenCalledTimes(1))
    const generate = post.mock.calls.find(
      ([url]) => url === "/content-manager/uid/generate"
    )
    expect(generate?.[1]).toEqual({
      contentTypeUID: "plugin::creative-works.creative-work",
      field: "slug",
      data: { title: "Le Silence" },
    })
    const [url, body, config] = put.mock.calls[0]
    expect(url).toBe(WORK_URL)
    expect(body).not.toHaveProperty("data")
    expect((body as any).slug).toBe("le-silence-generated")
    expect(config).toEqual({ params: { locale: "fr" } })
  })

  it("does not generate a second slug when a work whose slug was blank is saved again (WR-04)", async () => {
    // Stand-in for the content-manager: the stored work follows each save, and
    // the uid generator answers `-1` once the work's own slug exists, exactly
    // as the real one does (it counts the work itself as a collision).
    const stored: Record<string, unknown> = completeDraft({ slug: null })
    get.mockImplementation(async (url: string) => {
      if (url === "/i18n/locales") return { data: LOCALES_FR_DEFAULT }
      if (url === WORK_READ_URL) {
        return {
          data: { data: { ...stored }, meta: { availableLocales: [] } },
        }
      }
      return emptyList
    })
    put.mockImplementation(async (_url: string, body: any) => {
      stored.slug = body.slug
      return { data: { data: {} } }
    })
    post.mockImplementation(async (url: string) =>
      url === "/content-manager/uid/generate"
        ? { data: { data: stored.slug ? `${stored.slug}-1` : "le-silence" } }
        : { data: { data: {} } }
    )
    // navigate() after a save lands on the same page in the real router.
    await act(async () => {
      render(
        <IntlProvider locale="en" messages={en}>
          <DesignSystemProvider theme={lightTheme}>
            <MemoryRouter
              initialEntries={["/plugins/events-manager/works/abc"]}
            >
              <Routes>
                <Route
                  path="/plugins/events-manager/works/:documentId"
                  element={<WorkFormPage />}
                />
              </Routes>
            </MemoryRouter>
          </DesignSystemProvider>
        </IntlProvider>
      )
    })
    await screen.findByTestId("publish-bar")

    await save()
    await waitFor(() => expect(put).toHaveBeenCalledTimes(1))
    expect((put.mock.calls[0][1] as any).slug).toBe("le-silence")
    await waitFor(() =>
      expect(lastNotification()).toMatchObject({ type: "success" })
    )

    await save()
    await waitFor(() => expect(put).toHaveBeenCalledTimes(2))
    expect((put.mock.calls[1][1] as any).slug).toBe("le-silence")
    expect(
      post.mock.calls.filter(([url]) => url === "/content-manager/uid/generate")
    ).toHaveLength(1)

    post.mockImplementation(async () => ({ data: { data: {} } }))
    put.mockImplementation(async () => ({ data: { data: {} } }))
  })

  it("keeps an existing slug and does not call the generator", async () => {
    serve(completeDraft())
    await renderEdit()

    await save()

    await waitFor(() => expect(put).toHaveBeenCalledTimes(1))
    expect(
      post.mock.calls.some(([url]) => url === "/content-manager/uid/generate")
    ).toBe(false)
    expect((put.mock.calls[0][1] as any).slug).toBe("le-silence")
  })

  it("still saves the draft when slug generation fails", async () => {
    serve(completeDraft({ slug: null }))
    post.mockRejectedValueOnce(new Error("uid unavailable"))
    await renderEdit()

    await save()

    await waitFor(() => expect(put).toHaveBeenCalledTimes(1))
    expect((put.mock.calls[0][1] as any).slug).toBeNull()
  })

  it("maps a coded write refusal to a sentence", async () => {
    serve(completeDraft())
    put.mockRejectedValueOnce(
      rejection({
        message: "Invalid creative work data",
        details: {
          code: "INVALID_COUNTRY_CODES",
          issues: [{ code: "INVALID_COUNTRY_CODES", path: "country" }],
        },
      })
    )
    await renderEdit()

    await save()

    await waitFor(() => expect(lastNotification()?.type).toBe("danger"))
    expect(lastNotification().message).toBe(
      "One of the countries is not a valid ISO code"
    )
  })

  it("falls back to the generic message for an uncoded failure", async () => {
    serve(completeDraft())
    put.mockRejectedValueOnce(new Error("boom"))
    await renderEdit()

    await save()

    await waitFor(() => expect(lastNotification()?.type).toBe("danger"))
    expect(lastNotification().message).toBe("Something went wrong")
  })
})

describe("WorkFormPage — a failed or partial load", () => {
  const LOAD_FAILED =
    "This work could not be loaded. Go back to the list and open it again."

  /** Mount the edit route without waiting for the publish bar (it never renders). */
  async function renderEditWithoutForm() {
    await act(async () => {
      render(
        <IntlProvider locale="en" messages={en}>
          <DesignSystemProvider theme={lightTheme}>
            <MemoryRouter initialEntries={["/works/abc/edit"]}>
              <Routes>
                <Route
                  path="/works/:documentId/edit"
                  element={<WorkFormPage />}
                />
                <Route path="*" element={<div data-testid="after-back" />} />
              </Routes>
            </MemoryRouter>
          </DesignSystemProvider>
        </IntlProvider>
      )
    })
    await screen.findByText(LOAD_FAILED)
  }

  const dangerNotifications = () =>
    (toggleNotification as jest.Mock).mock.calls
      .map(
        ([notification]) => notification as { type: string; message: string }
      )
      .filter((notification) => notification.type === "danger")

  function expectNoForm() {
    expect(
      screen.queryByRole("button", { name: "Save" })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("textbox", { name: /^Title/ })
    ).not.toBeInTheDocument()
    expect(screen.queryByTestId("publish-bar")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Back to list" })).toBeVisible()
  }

  it("shows an error state, not the form, when the work read rejects", async () => {
    get.mockImplementation(async (url: string) => {
      if (url === "/i18n/locales") return { data: LOCALES_FR_DEFAULT }
      if (url === WORK_READ_URL) throw new Error("boom")
      return emptyList
    })

    await renderEditWithoutForm()

    expectNoForm()
    await waitFor(() => expect(dangerNotifications()).toHaveLength(1))
    expect(dangerNotifications()[0].message).toBe(LOAD_FAILED)
  })

  it("shows the same error state when the loaded row has an unresolved relation", async () => {
    serve(completeDraft({ genres: { count: 1 } }))

    await renderEditWithoutForm()

    expectNoForm()
    await waitFor(() => expect(dangerNotifications()).toHaveLength(1))
    expect(dangerNotifications()[0].message).toBe(LOAD_FAILED)
    // Nothing could have been saved over the stored genres.
    expect(put).not.toHaveBeenCalled()
  })
})

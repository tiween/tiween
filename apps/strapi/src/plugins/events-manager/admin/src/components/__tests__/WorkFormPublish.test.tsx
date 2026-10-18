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
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { IntlProvider } from "react-intl"
import { MemoryRouter, Route, Routes } from "react-router-dom"

import { WorkFormPage } from "../../pages/Works/WorkFormPage"
import en from "../../translations/en.json"

// Each test mounts the whole form (Design System selects, comboboxes, editors).
jest.setTimeout(30000)

jest.mock("use-debounce", () => ({
  useDebounce: (value: unknown) => [value],
}))

const WORK_URL =
  "/content-manager/collection-types/plugin::creative-works.creative-work/abc"

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
  ...overrides,
})

/** Route every read by URL: locales, the work, and empty lists for the rest. */
function serve(
  work: Record<string, unknown>,
  locales: unknown = LOCALES_FR_DEFAULT
) {
  get.mockImplementation(async (url: string) => {
    if (url === "/i18n/locales") return { data: locales }
    if (url === WORK_URL) {
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

describe("WorkFormPage — publish bar", () => {
  it("shows the draft status and enables Publish for a complete short film", async () => {
    serve(completeDraft())

    await renderEdit()

    expect(screen.getByText("Draft")).toBeInTheDocument()
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

    const workRead = get.mock.calls.find(([url]) => url === WORK_URL)
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

    expect(screen.getByText("Published")).toBeInTheDocument()
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

    expect(screen.getByText("Modified")).toBeInTheDocument()
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

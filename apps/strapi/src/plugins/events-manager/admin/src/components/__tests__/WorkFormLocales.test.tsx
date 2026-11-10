/**
 * Locale tabs on the Works form (plan 01-09, Task 2, D-22).
 *
 * Branch shipped: LOCALE TABS CREATE ROWS. Spike A3 (01-01) confirmed that a
 * content-manager `PUT ?locale=<code>` creates a missing locale row, so the
 * native Content Manager fallback is not implemented. A work with credits or a
 * cast needs its credited persons, roles and characters to have a row in the
 * target locale first (01-03 finding); the form creates them (this suite) and
 * the boot suite `short-film-locale-save.service.test.ts` proves the sequence
 * against a real Strapi.
 *
 * Drives the real `WorkFormPage` at `/works/abc/edit` against a controllable
 * `useFetchClient`: what is asserted is the request the content-manager would
 * receive (flat bodies, `params.locale`) and the toast the admin sees.
 */
import React from "react"
import { DesignSystemProvider, lightTheme } from "@strapi/design-system"
import { toggleNotification } from "@strapi/strapi/admin"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { IntlProvider } from "react-intl"
import { MemoryRouter, Route, Routes } from "react-router-dom"

import { WorkFormPage } from "../../pages/Works/WorkFormPage"
import en from "../../translations/en.json"
import { textDirection } from "../WorkForm/LocalizedFieldsForm"
import { DEFAULT_WORK_VALUES, workToApiPayload } from "../WorkForm/schema"

// Each test mounts the whole form (Design System selects, comboboxes, editors).
jest.setTimeout(30000)

jest.mock("use-debounce", () => ({
  useDebounce: (value: unknown) => [value],
}))

const CM = "/content-manager/collection-types"
const WORK_URL = `${CM}/plugin::creative-works.creative-work/abc`
// The edit page reads a work from the creative-works editor route (G-01-1);
// every write still goes through the content-manager `WORK_URL`.
const WORK_READ_URL = "/creative-works/admin/works/abc"
const PERSON_URL = `${CM}/plugin::creative-works.person`
const ROLE_URL = `${CM}/plugin::creative-works.credit-role`
const CHARACTER_URL = `${CM}/plugin::creative-works.character`

const emptyList = {
  data: {
    results: [],
    data: null,
    pagination: { page: 1, pageSize: 20, pageCount: 0, total: 0 },
  },
}

const LOCALES = [
  { code: "fr", name: "French (fr)", isDefault: true },
  { code: "ar", name: "Arabic (ar)", isDefault: false },
  { code: "en", name: "English (en)", isDefault: false },
]

const get = jest.fn(
  async (_url: string, _config?: any): Promise<any> => emptyList
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

const FR_POSTER = {
  id: 5,
  name: "fr-poster.jpg",
  url: "/uploads/fr-poster.jpg",
  mime: "image/jpeg",
}
const AR_POSTER = {
  id: 9,
  name: "ar-poster.jpg",
  url: "/uploads/ar-poster.jpg",
  mime: "image/jpeg",
}

const frWork = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  documentId: "abc",
  status: "draft",
  locale: "fr",
  title: "Le Silence",
  slug: "le-silence",
  type: "short-film",
  synopsis: "Un film",
  duration: 12,
  releaseYear: 2024,
  poster: FR_POSTER,
  credits: [],
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

const withCredits = {
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
  cast: [
    {
      id: 2,
      person: { id: 2, documentId: "p2", name: "Sami" },
      character: { id: 3, documentId: "c1", name: "Hero" },
      billing: 1,
    },
  ],
}

const arWork = (overrides: Record<string, unknown> = {}) => ({
  id: 2,
  documentId: "abc",
  status: "draft",
  locale: "ar",
  title: "الصمت",
  synopsis: "فيلم",
  poster: AR_POSTER,
  type: "short-film",
  // The editor route answers every round-tripped key, never a missing one.
  originalTitle: null,
  slug: null,
  duration: null,
  releaseYear: null,
  rating: null,
  ageRating: null,
  genres: [],
  credits: [],
  cast: [],
  distinctions: [],
  theatreDetails: null,
  externalIds: null,
  links: [],
  videos: [],
  streamingLinks: [],
  country: null,
  language: null,
  featured: false,
  featuredRank: null,
  backdrop: null,
  photos: [],
  ...overrides,
})

/**
 * Serve reads by URL. `rows` maps a locale to its work row (absent = no row,
 * which the content-manager answers with `data: {}`); `existingTargets` maps a
 * locale to the documentIds that already have a row there.
 */
function serve(
  rows: Record<string, Record<string, unknown> | undefined>,
  existingTargets: Record<string, string[]> = {}
) {
  get.mockImplementation(async (url: string, config?: any) => {
    const locale = config?.params?.locale as string | undefined
    if (url === "/i18n/locales") return { data: LOCALES }
    if (url === WORK_READ_URL) {
      const current = locale ? rows[locale] : rows.fr
      return {
        data: {
          data: current ?? {},
          meta: {
            availableLocales: Object.entries(rows)
              .filter(([code, row]) => row && code !== (locale ?? "fr"))
              .map(([code, row]) => ({
                locale: code,
                documentId: "abc",
                status: (row as any).status,
              })),
          },
        },
      }
    }
    if ([PERSON_URL, ROLE_URL, CHARACTER_URL].includes(url) && locale) {
      const ids: string[] = config?.params?.filters?.documentId?.$in ?? []
      const have = existingTargets[locale] ?? []
      return {
        data: {
          results: ids
            .filter((id) => have.includes(id))
            .map((documentId) => ({ documentId })),
          pagination: { page: 1, pageSize: 50, pageCount: 1, total: 0 },
        },
      }
    }
    return emptyList
  })
}

async function renderAt(path: string) {
  await act(async () => {
    render(
      <IntlProvider locale="en" messages={en}>
        <DesignSystemProvider theme={lightTheme}>
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route path="/works/new" element={<WorkFormPage />} />
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
}

async function renderEdit() {
  await renderAt("/works/abc/edit")
  await screen.findAllByRole("tab")
}

const tab = (name: RegExp) => screen.getByRole("tab", { name })

async function openTab(name: RegExp) {
  await act(async () => {
    fireEvent.mouseDown(tab(name), { button: 0, ctrlKey: false })
  })
}

const titleInput = () => screen.getByRole("textbox", { name: /^Title/ })

const lastNotification = () => {
  const calls = (toggleNotification as jest.Mock).mock.calls
  return calls[calls.length - 1]?.[0] as { type: string; message: string }
}

const localeOf = (call: unknown[]) => (call[2] as any)?.params?.locale

beforeEach(() => {
  ;(toggleNotification as jest.Mock).mockClear()
  // Implementations set by one test (mockImplementation, mockRejectedValueOnce)
  // must not leak into the next.
  for (const fn of [get, post, put]) {
    fn.mockReset()
  }
  get.mockImplementation(async () => emptyList)
  post.mockImplementation(async () => ({ data: { data: {} } }))
  put.mockImplementation(async () => ({ data: { data: {} } }))
})

describe("work fixtures", () => {
  it("work fixtures carry every round-tripped key", () => {
    // The keys the form sends back on a save. The editor route answers all of
    // them (null or [] when unset), so a guard that reads a missing key as
    // "not loaded" must never see a fixture without one.
    const ROUND_TRIP_KEYS = Object.keys(
      workToApiPayload({ ...DEFAULT_WORK_VALUES, type: "short-film" })
    )

    for (const fixture of [frWork(), arWork(), frWork(withCredits)]) {
      expect(Object.keys(fixture)).toEqual(
        expect.arrayContaining(ROUND_TRIP_KEYS)
      )
    }
  })
})

describe("textDirection", () => {
  it("is rtl for Arabic and the other right-to-left primary subtags", () => {
    for (const locale of ["ar", "ar-TN", "ar_TN", "AR", "fa", "he", "ur"]) {
      expect(textDirection(locale)).toBe("rtl")
    }
  })

  it("is ltr for French, English and an empty locale", () => {
    for (const locale of ["fr", "en", "en-GB", ""]) {
      expect(textDirection(locale)).toBe("ltr")
    }
  })
})

describe("WorkFormPage — text direction", () => {
  it("renders the Arabic title and synopsis right-to-left", async () => {
    serve({ fr: frWork(), ar: arWork() })
    await renderEdit()

    await openTab(/Arabic/)
    await waitFor(() => expect(titleInput()).toHaveValue("الصمت"))

    expect(titleInput()).toHaveAttribute("dir", "rtl")
    expect(titleInput()).toHaveAttribute("lang", "ar")
    expect(screen.getByRole("textbox", { name: "Synopsis" })).toHaveAttribute(
      "dir",
      "rtl"
    )
    expect(screen.getByRole("textbox", { name: "Synopsis" })).toHaveAttribute(
      "lang",
      "ar"
    )
  })

  it("keeps the English title left-to-right", async () => {
    serve({ fr: frWork(), ar: arWork() })
    await renderEdit()

    await openTab(/English/)
    await screen.findByRole("heading", { name: "Translation" })

    expect(titleInput()).toHaveAttribute("dir", "ltr")
    expect(titleInput()).toHaveAttribute("lang", "en")
  })

  it("lets the original title of the default tab pick its own direction", async () => {
    serve({ fr: frWork() })
    await renderEdit()

    expect(
      screen.getByRole("textbox", { name: "Original title" })
    ).toHaveAttribute("dir", "auto")
  })
})

describe("WorkFormPage — locale tabs", () => {
  it("lists the configured locales default-first with a per-locale status", async () => {
    serve({
      fr: frWork({ status: "modified" }),
      ar: arWork({ status: "published" }),
    })

    await renderEdit()

    const tabs = screen.getAllByRole("tab")
    expect(tabs).toHaveLength(3)
    expect(tabs[0]).toHaveTextContent("French (fr)")
    expect(tabs[0]).toHaveTextContent("Modified")
    expect(tabs[1]).toHaveTextContent("Arabic (ar)")
    expect(tabs[1]).toHaveTextContent("Published")
    expect(tabs[2]).toHaveTextContent("English (en)")
    expect(tabs[2]).toHaveTextContent("Missing")
  })

  it("shows the full form on the default tab", async () => {
    serve({ fr: frWork() })

    await renderEdit()

    expect(
      screen.getByRole("textbox", { name: "Original title" })
    ).toBeInTheDocument()
    expect(screen.getByRole("textbox", { name: "Slug" })).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Short film" })
    ).toBeInTheDocument()
  })

  it("shows only title, synopsis and poster on a translation tab", async () => {
    serve({ fr: frWork(), ar: arWork() })
    await renderEdit()

    await openTab(/Arabic/)

    await waitFor(() => expect(titleInput()).toHaveValue("الصمت"))
    expect(screen.getByRole("textbox", { name: "Synopsis" })).toHaveValue(
      "فيلم"
    )
    expect(screen.getByAltText("ar-poster.jpg")).toBeInTheDocument()
    expect(
      screen.queryByRole("textbox", { name: "Original title" })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("textbox", { name: "Slug" })
    ).not.toBeInTheDocument()
    expect(screen.queryByText("Duration (min)")).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Short film" })
    ).not.toBeInTheDocument()
  })

  it("saves a translation with params.locale and only title, synopsis and poster", async () => {
    serve({ fr: frWork(), ar: arWork() })
    await renderEdit()
    await openTab(/Arabic/)
    await waitFor(() => expect(titleInput()).toHaveValue("الصمت"))

    fireEvent.change(titleInput(), { target: { value: "الصمت الجديد" } })
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save" }))
    })

    await waitFor(() => expect(put).toHaveBeenCalledTimes(1))
    const [url, body, config] = put.mock.calls[0]
    expect(url).toBe(WORK_URL)
    expect(Object.keys(body as object).sort()).toEqual([
      "poster",
      "synopsis",
      "title",
    ])
    expect(body).toEqual({ title: "الصمت الجديد", synopsis: "فيلم", poster: 9 })
    expect(config).toEqual({ params: { locale: "ar" } })
    // The row exists: no person, role or character is created.
    expect(put.mock.calls.every(([u]) => u === WORK_URL)).toBe(true)
  })

  it("starts a new translation with no poster, shows the default title as a hint only, and does not copy the default poster", async () => {
    serve({ fr: frWork() })
    await renderEdit()

    await openTab(/Arabic/)

    await waitFor(() =>
      expect(screen.getByText(/Le Silence/)).toBeInTheDocument()
    )
    // WR-02: the default poster is not copied into the translation form.
    expect(screen.queryByAltText("fr-poster.jpg")).not.toBeInTheDocument()
    expect(titleInput()).toHaveValue("")
    expect(screen.getByRole("textbox", { name: "Synopsis" })).toHaveValue("")
  })

  it("requires a title before creating the translation", async () => {
    serve({ fr: frWork() })
    await renderEdit()
    await openTab(/English/)
    await waitFor(() =>
      expect(screen.getByText(/Le Silence/)).toBeInTheDocument()
    )

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save" }))
    })

    expect(put).not.toHaveBeenCalled()
    expect(await screen.findByText("Title is required")).toBeInTheDocument()
  })

  it("creates a missing translation and shows its new status", async () => {
    const rows: Record<string, Record<string, unknown> | undefined> = {
      fr: frWork(),
    }
    serve(rows)
    put.mockImplementation(async (url: string, body: any, config: any) => {
      if (url === WORK_URL) {
        rows[config.params.locale] = arWork({
          locale: config.params.locale,
          title: body.title,
          synopsis: body.synopsis,
        })
      }
      return { data: { data: {} } }
    })
    await renderEdit()
    await openTab(/Arabic/)
    await waitFor(() =>
      expect(screen.getByText(/Le Silence/)).toBeInTheDocument()
    )

    fireEvent.change(titleInput(), { target: { value: "الصمت" } })
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save" }))
    })

    await waitFor(() => expect(put).toHaveBeenCalledTimes(1))
    expect(put.mock.calls[0][1]).toEqual({
      title: "الصمت",
      synopsis: null,
      // WR-02: no poster of its own, so the public API serves the default one.
      poster: null,
    })
    await waitFor(() => expect(tab(/Arabic/)).toHaveTextContent("Draft"))
    expect(lastNotification().type).toBe("success")
  })

  it("gives the credited persons, roles and characters a row in the locale before the first save", async () => {
    serve({ fr: frWork(withCredits) }, { ar: ["p2"] })
    await renderEdit()
    await openTab(/Arabic/)
    await waitFor(() =>
      expect(screen.getByText(/Le Silence/)).toBeInTheDocument()
    )

    fireEvent.change(titleInput(), { target: { value: "الصمت" } })
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save" }))
    })

    await waitFor(() => expect(put).toHaveBeenCalledTimes(4))
    const calls = put.mock.calls
    // p2 already has an ar row, so only p1 is created; then role, character, work.
    expect(calls.map(([url]) => url)).toEqual([
      `${PERSON_URL}/p1`,
      `${ROLE_URL}/r1`,
      `${CHARACTER_URL}/c1`,
      WORK_URL,
    ])
    expect(calls.map((call) => localeOf(call))).toEqual([
      "ar",
      "ar",
      "ar",
      "ar",
    ])
    expect(calls[0][1]).toEqual({})
    expect(calls[1][1]).toEqual({ name: "Director", slug: "director" })
    expect(calls[2][1]).toEqual({ name: "Hero" })
    expect(Object.keys(calls[3][1] as object).sort()).toEqual([
      "poster",
      "synopsis",
      "title",
    ])
  })

  it("explains a locale-not-found refusal instead of showing the raw text", async () => {
    serve({ fr: frWork() })
    put.mockRejectedValueOnce({
      response: {
        data: {
          error: {
            message: 'Document with id "abc", locale "ar" not found',
            details: {},
          },
        },
      },
    })
    await renderEdit()
    await openTab(/Arabic/)
    await waitFor(() =>
      expect(screen.getByText(/Le Silence/)).toBeInTheDocument()
    )

    fireEvent.change(titleInput(), { target: { value: "الصمت" } })
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save" }))
    })

    await waitFor(() => expect(lastNotification()?.type).toBe("danger"))
    expect(lastNotification().message).toContain("no entry in this language")
    expect(lastNotification().message).not.toContain("not found")
  })

  it("publishes the translation with params.locale", async () => {
    // A complete default-language draft (director credit) so the rules pass.
    serve({ fr: frWork(withCredits), ar: arWork() })
    await renderEdit()
    await openTab(/Arabic/)
    await waitFor(() => expect(titleInput()).toHaveValue("الصمت"))

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Publish" }))
    })

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1))
    const [url, , config] = post.mock.calls[0]
    expect(url).toBe(`${WORK_URL}/actions/publish`)
    expect(config).toEqual({ params: { locale: "ar" } })
  })

  it("checks the publish rules on the default-language draft, not on the translation", async () => {
    serve({ fr: frWork({ poster: null }), ar: arWork() })
    await renderEdit()
    await openTab(/Arabic/)
    await waitFor(() => expect(titleInput()).toHaveValue("الصمت"))

    expect(screen.getByRole("button", { name: "Publish" })).toHaveAttribute(
      "aria-disabled",
      "true"
    )
    expect(screen.getByTestId("publish-issues")).toHaveTextContent(
      "Add a poster before publishing"
    )
  })

  it("offers no publish bar for a locale that has no row yet", async () => {
    serve({ fr: frWork() })
    await renderEdit()

    await openTab(/English/)

    await waitFor(() =>
      expect(screen.getByText(/Le Silence/)).toBeInTheDocument()
    )
    expect(screen.queryByTestId("publish-bar")).not.toBeInTheDocument()
  })

  it("returns to the full form on the default tab", async () => {
    serve({ fr: frWork(), ar: arWork() })
    await renderEdit()
    await openTab(/Arabic/)
    await waitFor(() => expect(titleInput()).toHaveValue("الصمت"))

    await openTab(/French/)

    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "Slug" })).toBeInTheDocument()
    )
    expect(titleInput()).toHaveValue("Le Silence")
  })

  it("enables only the default tab for a work that is not saved yet", async () => {
    serve({})

    await renderAt("/works/new")
    await screen.findAllByRole("tab")

    const tabs = screen.getAllByRole("tab")
    expect(tabs).toHaveLength(3)
    expect(tabs[0]).toBeEnabled()
    expect(tabs[1]).toBeDisabled()
    expect(tabs[2]).toBeDisabled()
  })
})

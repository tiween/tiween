/**
 * WorkForm short-film fields (plan 01-08, SDATA-02).
 *
 * Drives the real `WorkFormPage` at `/works/new` against a controllable
 * `useFetchClient`, so what is asserted is the request the content-manager
 * would actually receive, not an intermediate form value.
 *
 * Not driven here: opening a Design System `SingleSelect` / `MultiSelect`
 * (Radix-based; its ref handling loops under the React 19 pin, see
 * `SubEventModal.test.tsx`). The platform and access selects are therefore
 * left on their defaults (youtube / free), and the type is chosen with the
 * type buttons, which are plain buttons.
 */
import React from "react"
import { DesignSystemProvider, lightTheme } from "@strapi/design-system"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { IntlProvider } from "react-intl"
import { MemoryRouter, Route, Routes } from "react-router-dom"

import { WorkFormPage } from "../../pages/Works/WorkFormPage"
import en from "../../translations/en.json"

jest.mock("use-debounce", () => ({
  useDebounce: (value: unknown) => [value],
}))

const emptyList = {
  data: {
    results: [],
    data: null,
    pagination: { page: 1, pageSize: 20, pageCount: 0, total: 0 },
  },
}
const get = jest.fn(async (_url: string, _config?: unknown) => emptyList)
const post = jest.fn(async (_url: string, _body?: unknown) => ({
  data: { data: { documentId: "created-doc" } },
}))
const put = jest.fn(async () => ({ data: { data: {} } }))
const del = jest.fn(async () => ({ data: { data: {} } }))

jest.mock("@strapi/strapi/admin", () => ({
  ...jest.requireActual("@strapi/strapi/admin"),
  useFetchClient: () => ({ get, post, put, del }),
}))

const CREATE_URL =
  "/content-manager/collection-types/plugin::creative-works.creative-work"

async function renderForm(locale = "en") {
  await act(async () => {
    render(
      <IntlProvider locale={locale} messages={en}>
        <DesignSystemProvider theme={lightTheme}>
          <MemoryRouter initialEntries={["/works/new"]}>
            <Routes>
              <Route path="/works/new" element={<WorkFormPage />} />
              <Route path="*" element={<div data-testid="after-save" />} />
            </Routes>
          </MemoryRouter>
        </DesignSystemProvider>
      </IntlProvider>
    )
  })
}

function typeTitle(title: string) {
  fireEvent.change(screen.getByRole("textbox", { name: /^Title/ }), {
    target: { value: title },
  })
}

async function pickOption(field: string, term: string, optionName: string) {
  const input = screen.getByRole("combobox", { name: field })
  await act(async () => {
    fireEvent.change(input, { target: { value: term } })
  })
  const option = await screen.findByRole("option", { name: optionName })
  await act(async () => {
    fireEvent.click(option)
  })
}

function chooseType(label: string) {
  fireEvent.click(screen.getByRole("button", { name: label }))
}

async function save() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Save" }))
  })
}

function createdBody(): { data: Record<string, unknown> } {
  expect(post).toHaveBeenCalledTimes(1)
  const [url, body] = post.mock.calls[0]
  expect(url).toBe(CREATE_URL)
  return body as { data: Record<string, unknown> }
}

describe("WorkForm — streaming links (Task 1)", () => {
  it("creates a short film with its streaming link in the content-manager payload", async () => {
    await renderForm()

    typeTitle("Le Silence")
    chooseType("Short film")

    fireEvent.click(
      screen.getByRole("button", { name: "Add a streaming link" })
    )
    fireEvent.change(screen.getByRole("textbox", { name: "Watch URL" }), {
      target: { value: "https://youtu.be/abc123" },
    })

    await save()
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1))

    const { data } = createdBody()
    expect(data.type).toBe("short-film")
    expect(data.streamingLinks).toEqual([
      {
        platform: "youtube",
        url: "https://youtu.be/abc123",
        accessType: "free",
        label: null,
      },
    ])
  })

  it("removes a streaming link row", async () => {
    await renderForm()

    chooseType("Short film")
    fireEvent.click(
      screen.getByRole("button", { name: "Add a streaming link" })
    )
    expect(screen.getAllByRole("textbox", { name: "Watch URL" })).toHaveLength(
      1
    )

    fireEvent.click(
      screen.getByRole("button", { name: "Remove streaming link" })
    )
    expect(screen.queryByRole("textbox", { name: "Watch URL" })).toBeNull()
  })

  it("does not send a request when the streaming url is not https", async () => {
    await renderForm()

    typeTitle("Le Silence")
    chooseType("Short film")
    fireEvent.click(
      screen.getByRole("button", { name: "Add a streaming link" })
    )
    fireEvent.change(screen.getByRole("textbox", { name: "Watch URL" }), {
      target: { value: "javascript:void(0)" },
    })

    await save()

    expect(post).not.toHaveBeenCalled()
  })

  it("shows the streaming section for a short film only", async () => {
    await renderForm()

    // default type is film
    expect(screen.queryByText("Where to watch")).toBeNull()

    chooseType("Short film")
    expect(screen.getByText("Where to watch")).toBeInTheDocument()

    chooseType("Film")
    expect(screen.queryByText("Where to watch")).toBeNull()

    chooseType("Play")
    expect(screen.queryByText("Where to watch")).toBeNull()
  })
})

describe("WorkForm — country, language and placement (Task 2)", () => {
  it.each([["Film"], ["Play"], ["Short film"]])(
    "shows the country and language pickers for type %s",
    async (type) => {
      await renderForm()

      chooseType(type)

      expect(
        screen.getByRole("combobox", { name: "Countries" })
      ).toBeInTheDocument()
      expect(
        screen.getByRole("combobox", { name: "Languages" })
      ).toBeInTheDocument()
    }
  )

  it("shows the directory placement section for a short film only", async () => {
    await renderForm()

    expect(screen.queryByText("Directory placement")).toBeNull()
    expect(screen.queryByRole("checkbox", { name: "Featured" })).toBeNull()

    chooseType("Short film")
    expect(screen.getByText("Directory placement")).toBeInTheDocument()
    expect(
      screen.getByRole("checkbox", { name: "Featured" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("spinbutton", { name: "Featured rank" })
    ).toBeInTheDocument()

    chooseType("Play")
    expect(screen.queryByText("Directory placement")).toBeNull()
  })

  it("keeps the featured rank disabled until the work is featured", async () => {
    await renderForm()
    chooseType("Short film")

    expect(
      screen.getByRole("spinbutton", { name: "Featured rank" })
    ).toBeDisabled()

    fireEvent.click(screen.getByRole("checkbox", { name: "Featured" }))

    expect(
      screen.getByRole("spinbutton", { name: "Featured rank" })
    ).not.toBeDisabled()
  })

  it("sends country, language, featured and featuredRank for a short film", async () => {
    await renderForm()
    typeTitle("Le Silence")
    chooseType("Short film")

    await pickOption("Countries", "tuni", "Tunisia")
    await pickOption("Languages", "tunisian", "Tunisian Arabic (Derja)")
    fireEvent.click(screen.getByRole("checkbox", { name: "Featured" }))
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Featured rank" }),
      {
        target: { value: "1" },
      }
    )

    await save()
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1))

    const { data } = createdBody()
    expect(data.country).toEqual(["TN"])
    expect(data.language).toEqual(["aeb"])
    expect(data.featured).toBe(true)
    expect(data.featuredRank).toBe(1)
  })

  it("sends featuredRank null when the work is not featured", async () => {
    await renderForm()
    typeTitle("Le Silence")
    chooseType("Short film")

    await save()
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1))

    const { data } = createdBody()
    expect(data.featured).toBe(false)
    expect(data.featuredRank).toBeNull()
    expect(data.country).toEqual([])
    expect(data.language).toEqual([])
  })
})

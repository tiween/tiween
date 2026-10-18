/**
 * Works routing tests (plan 01-07, research Pitfall 1).
 *
 * `WorksListPage` and `WorkFormPage` existed but were routed nowhere, so the
 * catalog could not be reached from the admin. These tests pin the contract the
 * list page already relies on: the four `works*` routes resolve to the right
 * page, the side navigation links to the section, and the catch-all still sends
 * unknown paths to the dashboard.
 */
import React from "react"
import { DesignSystemProvider, lightTheme } from "@strapi/design-system"
import { act, render, screen } from "@testing-library/react"
import { IntlProvider } from "react-intl"
import { MemoryRouter } from "react-router-dom"

import { App } from "../../pages/App"
import ar from "../../translations/ar.json"
import en from "../../translations/en.json"
import fr from "../../translations/fr.json"
import { SideNav } from "../SideNav"

// Sections this test does not exercise pull in the calendar and import
// machinery, which jsdom cannot host. Stand-ins keep the routing assertion
// about routing.
jest.mock("../../pages/Dashboard", () => ({
  DashboardPage: () => <div data-testid="dashboard-page" />,
}))
jest.mock("../../pages/Planning", () => ({
  PlanningPage: () => <div data-testid="planning-page" />,
}))
jest.mock("../../pages/Import", () => ({
  ImportPage: () => <div data-testid="import-page" />,
}))

// The work form is covered by its own suites; here only "which page rendered"
// matters, and the real form drags in the person and genre pickers.
jest.mock("../WorkForm", () => ({
  WorkForm: ({ title }: { title: string }) => (
    <div data-testid="work-form">{title}</div>
  ),
}))

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
const post = jest.fn(async () => ({ data: { data: {} } }))
const put = jest.fn(async () => ({ data: { data: {} } }))
const del = jest.fn(async () => ({ data: { data: {} } }))

jest.mock("@strapi/strapi/admin", () => ({
  ...jest.requireActual("@strapi/strapi/admin"),
  useFetchClient: () => ({ get, post, put, del }),
}))

async function renderAt(path: string, ui?: React.ReactElement) {
  await act(async () => {
    render(
      <IntlProvider locale="en" messages={en}>
        <DesignSystemProvider theme={lightTheme}>
          <MemoryRouter initialEntries={[path]}>{ui ?? <App />}</MemoryRouter>
        </DesignSystemProvider>
      </IntlProvider>
    )
  })
}

describe("events-manager Works routing", () => {
  it("renders the works list at /works", async () => {
    await renderAt("/works")

    // The jest `Layouts.Header` stand-in projects title, subtitle and action
    // as siblings, so the title is asserted on the page text (capitalised
    // "Works" appears nowhere else on the list page) and the action by role
    // (the empty state repeats it, hence "at least one").
    expect(document.body).toHaveTextContent("Works")
    expect(
      screen.getAllByRole("button", { name: "Add a work" }).length
    ).toBeGreaterThanOrEqual(1)
    expect(screen.queryByTestId("dashboard-page")).not.toBeInTheDocument()
  })

  it("renders the work form at /works/new", async () => {
    await renderAt("/works/new")

    expect(screen.getByTestId("work-form")).toHaveTextContent("New work")
    expect(screen.queryByTestId("dashboard-page")).not.toBeInTheDocument()
  })

  it("renders the work form at /works/abc/edit without redirecting", async () => {
    await renderAt("/works/abc/edit")

    expect(screen.getByTestId("work-form")).toBeInTheDocument()
    expect(screen.queryByTestId("dashboard-page")).not.toBeInTheDocument()
  })

  it("renders the work form at /works/:documentId (view target after save)", async () => {
    await renderAt("/works/abc")

    expect(screen.getByTestId("work-form")).toBeInTheDocument()
    expect(screen.queryByTestId("dashboard-page")).not.toBeInTheDocument()
  })

  it("still redirects unknown paths to the dashboard", async () => {
    await renderAt("/unknown")

    expect(screen.getByTestId("dashboard-page")).toBeInTheDocument()
  })
})

describe("events-manager side navigation", () => {
  it("lists Works", async () => {
    await renderAt("/works", <SideNav />)

    // The jest SubNav stand-in projects each link's label into the <nav>.
    expect(screen.getByRole("navigation")).toHaveTextContent("Works")
  })

  it.each([
    ["en", en],
    ["fr", fr],
    ["ar", ar],
  ])("defines events-manager.sidenav.works in %s", (_locale, messages) => {
    const value = (messages as Record<string, string>)[
      "events-manager.sidenav.works"
    ]

    expect(typeof value).toBe("string")
    expect(value.length).toBeGreaterThan(0)
  })
})

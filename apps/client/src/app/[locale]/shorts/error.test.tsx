/**
 * shorts/error.tsx: the single retryable error boundary for the directory and
 * the detail page (SPAGE-05, D-07, D-20; RESEARCH Pattern 3, Pitfalls 4 and 5).
 *
 * Copy comes from the REAL fr / ar / en catalogs through a genuine
 * `NextIntlClientProvider`. Only the navigation edges are faked.
 */
import * as React from "react"
import { resetRetryFocus } from "@/features/shorts/utils/retryFocus"
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import ar from "../../../../locales/ar.json"
import en from "../../../../locales/en.json"
import fr from "../../../../locales/fr.json"
import { expectNoA11yViolations } from "../../../../test/helpers/axe"
import ShortsError from "./error"

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  pathname: "/shorts",
  // `null` runs the real hook; a boolean pins `isPending` for the test.
  forcePending: null as boolean | null,
}))

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>()
  return {
    ...actual,
    useTransition: () => {
      const real = actual.useTransition()
      return mocks.forcePending === null
        ? real
        : ([mocks.forcePending, real[1]] as const)
    },
  }
})

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))

vi.mock("@/lib/navigation", () => ({
  usePathname: () => mocks.pathname,
  Link: ({
    href,
    children,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}))

const catalogs = { fr, ar, en } as const
type Locale = keyof typeof catalogs

const LEAKY_ERROR = Object.assign(
  new Error("STRAPI 503 SHORT_FILM_UPSTREAM secret-token-4242"),
  { digest: "digest-9f3a1c" }
)

function renderBoundary(
  locale: Locale = "fr",
  { reset = vi.fn() }: { reset?: () => void } = {}
) {
  const view = render(
    <NextIntlClientProvider locale={locale} messages={catalogs[locale]}>
      <ShortsError error={LEAKY_ERROR} reset={reset} />
    </NextIntlClientProvider>
  )
  return { ...view, reset }
}

function setOnLine(value: boolean) {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    get: () => value,
  })
}

beforeEach(() => {
  mocks.pathname = "/shorts"
  mocks.forcePending = null
  mocks.refresh.mockReset()
  resetRetryFocus()
  setOnLine(true)
  vi.spyOn(console, "error").mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe("shorts error boundary: directory", () => {
  it("keeps the page intro above an alert block with the directory headline", () => {
    renderBoundary("fr")

    expect(
      screen.getByRole("heading", { level: 1, name: "Courts métrages" })
    ).toBeInTheDocument()
    expect(
      screen.getByText(fr.shorts.directory.description)
    ).toBeInTheDocument()

    const alert = screen.getByRole("alert")
    expect(
      within(alert).getByRole("heading", {
        level: 2,
        name: "Le catalogue ne répond pas",
      })
    ).toBeInTheDocument()
    expect(
      within(alert).getByRole("button", { name: "Réessayer" })
    ).toBeInTheDocument()

    // Intro first, block second.
    const h1 = screen.getByRole("heading", { level: 1 })
    expect(
      h1.compareDocumentPosition(alert) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })

  it("has no wordmark header and no browse-all link (it is already the directory)", () => {
    renderBoundary("fr")

    expect(screen.queryByAltText("tiween")).not.toBeInTheDocument()
    expect(
      screen.queryByRole("link", { name: "Voir tous les courts métrages" })
    ).not.toBeInTheDocument()
  })

  it("is never presented as an empty catalogue or an empty grid", () => {
    renderBoundary("fr")

    expect(screen.queryByText("Le catalogue ouvre bientôt")).toBeNull()
    expect(screen.queryByText(/Aucun court métrage/)).toBeNull()
  })
})

describe("shorts error boundary: detail", () => {
  beforeEach(() => {
    mocks.pathname = "/shorts/le-masseur"
  })

  it("renders the wordmark header, detail headline and a browse-all link to /shorts", () => {
    renderBoundary("fr")

    expect(screen.getByAltText("tiween")).toBeInTheDocument()
    const alert = screen.getByRole("alert")
    expect(
      within(alert).getByRole("heading", {
        level: 1,
        name: "Ce court métrage ne se charge pas",
      })
    ).toBeInTheDocument()
    expect(
      within(alert).getByRole("button", { name: "Réessayer" })
    ).toBeInTheDocument()

    const browseAll = screen.getByRole("link", {
      name: "Voir tous les courts métrages",
    })
    expect(browseAll).toHaveAttribute("href", "/shorts")
  })

  it("does not render the directory intro", () => {
    renderBoundary("fr")

    expect(screen.queryByText(fr.shorts.directory.description)).toBeNull()
  })

  it("treats a trailing-slash directory path as the directory", () => {
    mocks.pathname = "/shorts/"
    renderBoundary("fr")

    expect(
      screen.getByRole("heading", { level: 1, name: "Courts métrages" })
    ).toBeInTheDocument()
  })
})

describe("shorts error boundary: copy and leakage (T-02-14)", () => {
  it("shows the INTERNAL_ERROR body when online", () => {
    setOnLine(true)
    renderBoundary("fr")

    expect(screen.getByText(fr.errors.INTERNAL_ERROR)).toBeInTheDocument()
    expect(screen.queryByText(fr.errors.NETWORK_ERROR)).toBeNull()
  })

  it("shows the NETWORK_ERROR body when the browser is offline", () => {
    setOnLine(false)
    renderBoundary("fr")

    expect(screen.getByText(fr.errors.NETWORK_ERROR)).toBeInTheDocument()
    expect(screen.queryByText(fr.errors.INTERNAL_ERROR)).toBeNull()
  })

  it("follows the connection live: going offline swaps the body", () => {
    setOnLine(true)
    renderBoundary("fr")

    act(() => {
      setOnLine(false)
      window.dispatchEvent(new Event("offline"))
    })

    expect(screen.getByText(fr.errors.NETWORK_ERROR)).toBeInTheDocument()
  })

  it.each(["/shorts", "/shorts/le-masseur"])(
    "never prints the message, digest, a status number or an API code on %s",
    (pathname) => {
      mocks.pathname = pathname
      const { container } = renderBoundary("fr")
      const text = container.textContent ?? ""

      expect(text).not.toContain("secret-token-4242")
      expect(text).not.toContain("digest-9f3a1c")
      expect(text).not.toContain("SHORT_FILM_UPSTREAM")
      expect(text).not.toMatch(/\b(4\d\d|5\d\d)\b/)
      expect(text).not.toMatch(/\b[A-Z]+(?:_[A-Z]+)+\b/)
      expect(container.innerHTML).not.toContain("secret-token-4242")
    }
  )

  it("logs the error to the console instead of rendering it", () => {
    renderBoundary("fr")

    expect(console.error).toHaveBeenCalledWith(expect.any(String), LEAKY_ERROR)
  })
})

describe("shorts error boundary: retry", () => {
  it("calls router.refresh() before reset(), together, on one click", () => {
    const { reset } = renderBoundary("fr")

    fireEvent.click(screen.getByRole("button", { name: "Réessayer" }))

    expect(mocks.refresh).toHaveBeenCalledTimes(1)
    expect(reset).toHaveBeenCalledTimes(1)
    expect(mocks.refresh.mock.invocationCallOrder[0]).toBeLessThan(
      reset.mock.invocationCallOrder[0]
    )
  })

  it("does not call reset() alone: a click without refresh never happens", () => {
    const { reset } = renderBoundary("fr")
    expect(reset).not.toHaveBeenCalled()
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  it("is aria-busy and aria-disabled while pending, and ignores a second click", () => {
    mocks.forcePending = true
    const { reset } = renderBoundary("fr")

    const button = screen.getByRole("button", { name: "Réessayer" })
    expect(button).toHaveAttribute("aria-busy", "true")
    expect(button).toHaveAttribute("aria-disabled", "true")
    // Not `disabled`: a disabled button would drop keyboard focus.
    expect(button).not.toBeDisabled()

    fireEvent.click(button)
    expect(mocks.refresh).not.toHaveBeenCalled()
    expect(reset).not.toHaveBeenCalled()
  })

  it("is not aria-busy when idle", () => {
    renderBoundary("fr")

    expect(
      screen.getByRole("button", { name: "Réessayer" })
    ).not.toHaveAttribute("aria-busy", "true")
  })

  it("shows the spinner only after 200ms of pending", () => {
    vi.useFakeTimers()
    mocks.forcePending = true
    const { container } = renderBoundary("fr")

    expect(container.querySelector("[data-retry-spinner]")).toBeNull()

    act(() => {
      vi.advanceTimersByTime(199)
    })
    expect(container.querySelector("[data-retry-spinner]")).toBeNull()

    act(() => {
      vi.advanceTimersByTime(2)
    })
    expect(container.querySelector("[data-retry-spinner]")).not.toBeNull()
  })

  it("keeps focus on the retry button when the boundary shows again after a failed retry", () => {
    const first = renderBoundary("fr")
    fireEvent.click(screen.getByRole("button", { name: "Réessayer" }))
    first.unmount()

    // The failed retry re-mounts the boundary; the pending mark returns focus.
    renderBoundary("fr")
    expect(screen.getByRole("button", { name: "Réessayer" })).toHaveFocus()
  })

  it("does not steal focus on a first render (no retry pending)", () => {
    renderBoundary("fr")

    expect(screen.getByRole("button", { name: "Réessayer" })).not.toHaveFocus()
  })
})

describe.each(["fr", "ar", "en"] as const)(
  "shorts error boundary in %s",
  (locale) => {
    it("renders the catalog copy and no raw key", () => {
      const { container } = renderBoundary(locale)
      const catalog = catalogs[locale]

      expect(
        screen.getByText(catalog.shorts.directory.errorTitle)
      ).toBeInTheDocument()
      expect(
        screen.getByText(catalog.errors.INTERNAL_ERROR)
      ).toBeInTheDocument()
      expect(
        screen.getByRole("button", { name: catalog.shorts.directory.retry })
      ).toBeInTheDocument()
      expect(container.textContent).not.toMatch(/shorts\.|errors\./)
    })

    it("passes axe: directory variant", async () => {
      const { container } = renderBoundary(locale)
      await expectNoA11yViolations(container)
    })

    it("passes axe: detail variant", async () => {
      mocks.pathname = "/shorts/le-masseur"
      const { container } = renderBoundary(locale)
      await expectNoA11yViolations(container)
    })
  }
)

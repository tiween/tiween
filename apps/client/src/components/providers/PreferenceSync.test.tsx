/**
 * Tests for PreferenceSync (Story 4.5).
 *
 * Verifies the once-per-authenticated-mount locale application: an authenticated
 * user whose stored `preferredLanguage` differs from the active locale is
 * switched exactly once via the next-intl router; an equal locale, an
 * unauthenticated session, an errored session, an unset preference, and an
 * unsupported locale are all no-ops; query params survive the switch; and once
 * applied the user can browse to another locale without being forced back.
 *
 * `next-auth/react`, `next-intl`, `@/lib/navigation`, and `next/navigation` are
 * mocked so the component renders standalone (and `@/lib/navigation` never
 * imports env).
 */
import { cleanup, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const {
  useSessionMock,
  useLocaleMock,
  replaceMock,
  usePathnameMock,
  useSearchParamsMock,
} = vi.hoisted(() => ({
  useSessionMock: vi.fn(),
  useLocaleMock: vi.fn(),
  replaceMock: vi.fn(),
  usePathnameMock: vi.fn(),
  useSearchParamsMock: vi.fn(),
}))

vi.mock("next-auth/react", () => ({ useSession: useSessionMock }))
vi.mock("next-intl", () => ({ useLocale: useLocaleMock }))
vi.mock("next/navigation", () => ({ useSearchParams: useSearchParamsMock }))
vi.mock("@/lib/navigation", () => ({
  routing: { locales: ["ar", "fr", "en"] },
  usePathname: usePathnameMock,
  useRouter: () => ({ replace: replaceMock }),
}))

import { PreferenceSync } from "./PreferenceSync"

beforeEach(() => {
  usePathnameMock.mockReturnValue("/events")
  useLocaleMock.mockReturnValue("fr")
  useSearchParamsMock.mockReturnValue(new URLSearchParams(""))
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("PreferenceSync", () => {
  it("switches to the stored language once when it differs from the active locale", () => {
    useSessionMock.mockReturnValue({
      status: "authenticated",
      data: { user: { userId: 1, preferredLanguage: "ar" } },
    })

    render(<PreferenceSync />)

    expect(replaceMock).toHaveBeenCalledTimes(1)
    expect(replaceMock).toHaveBeenCalledWith("/events", { locale: "ar" })
  })

  it("preserves active query params on the switch", () => {
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams("date=2026-07-10&region=sfax-1")
    )
    useSessionMock.mockReturnValue({
      status: "authenticated",
      data: { user: { userId: 1, preferredLanguage: "ar" } },
    })

    render(<PreferenceSync />)

    expect(replaceMock).toHaveBeenCalledWith(
      "/events?date=2026-07-10&region=sfax-1",
      { locale: "ar" }
    )
  })

  it("does not switch when the stored language equals the active locale", () => {
    useSessionMock.mockReturnValue({
      status: "authenticated",
      data: { user: { userId: 1, preferredLanguage: "fr" } },
    })

    render(<PreferenceSync />)

    expect(replaceMock).not.toHaveBeenCalled()
  })

  it("is a no-op for an unauthenticated session", () => {
    useSessionMock.mockReturnValue({
      status: "unauthenticated",
      data: null,
    })

    render(<PreferenceSync />)

    expect(replaceMock).not.toHaveBeenCalled()
  })

  it("is a no-op for an errored (about-to-sign-out) session", () => {
    useSessionMock.mockReturnValue({
      status: "authenticated",
      data: {
        error: "invalid_strapi_token",
        user: { userId: 1, preferredLanguage: "ar" },
      },
    })

    render(<PreferenceSync />)

    expect(replaceMock).not.toHaveBeenCalled()
  })

  it("is a no-op when the user has no stored language preference", () => {
    useSessionMock.mockReturnValue({
      status: "authenticated",
      data: { user: { userId: 1 } },
    })

    render(<PreferenceSync />)

    expect(replaceMock).not.toHaveBeenCalled()
  })

  it("is a no-op when the stored language is not a supported locale", () => {
    useSessionMock.mockReturnValue({
      status: "authenticated",
      data: { user: { userId: 1, preferredLanguage: "de" } },
    })

    render(<PreferenceSync />)

    expect(replaceMock).not.toHaveBeenCalled()
  })

  it("does not re-switch on a subsequent render", () => {
    useSessionMock.mockReturnValue({
      status: "authenticated",
      data: { user: { userId: 1, preferredLanguage: "ar" } },
    })

    const { rerender } = render(<PreferenceSync />)
    rerender(<PreferenceSync />)

    expect(replaceMock).toHaveBeenCalledTimes(1)
  })

  it("lets the user browse to another locale after the one-time switch (no force-back)", () => {
    // First mount: apply the stored `ar` from the active `fr`.
    useSessionMock.mockReturnValue({
      status: "authenticated",
      data: { user: { userId: 1, preferredLanguage: "ar" } },
    })
    const { rerender } = render(<PreferenceSync />)
    expect(replaceMock).toHaveBeenCalledTimes(1)

    // The user then navigates to a THIRD locale (`en`) within the same session,
    // same userId, preference still `ar`. The once-per-user guard must NOT drag
    // them back to `ar`.
    useLocaleMock.mockReturnValue("en")
    rerender(<PreferenceSync />)

    expect(replaceMock).toHaveBeenCalledTimes(1)
  })
})

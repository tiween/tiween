/**
 * Tests for `NotificationPreferences` (Story 5.6) — the email-notifications
 * toggle on the profile page.
 *
 * `useCurrentUser` + `useUserMutations` are mocked so the switch's reflected
 * value and the flipped-boolean mutation are asserted directly; next-intl
 * echoes keys.
 */
import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { useCurrentUserMock, mutateMock } = vi.hoisted(() => ({
  useCurrentUserMock: vi.fn(),
  mutateMock: vi.fn(),
}))

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}))

vi.mock("@/hooks/useUser", () => ({
  useCurrentUser: useCurrentUserMock,
  useUserMutations: () => ({
    updateProfileMutation: { mutate: mutateMock, isPending: false },
  }),
}))

import { NotificationPreferences } from "./NotificationPreferences"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("NotificationPreferences", () => {
  it("reflects an enabled preference (checked) and flips it off on click", () => {
    useCurrentUserMock.mockReturnValue({
      data: { emailNotificationsEnabled: true },
    })
    render(<NotificationPreferences />)

    const toggle = screen.getByRole("switch")
    expect(toggle).toHaveAttribute("aria-checked", "true")

    fireEvent.click(toggle)
    expect(mutateMock).toHaveBeenCalledWith({
      emailNotificationsEnabled: false,
    })
  })

  it("reflects a disabled preference (unchecked) and flips it on on click", () => {
    useCurrentUserMock.mockReturnValue({
      data: { emailNotificationsEnabled: false },
    })
    render(<NotificationPreferences />)

    const toggle = screen.getByRole("switch")
    expect(toggle).toHaveAttribute("aria-checked", "false")

    fireEvent.click(toggle)
    expect(mutateMock).toHaveBeenCalledWith({
      emailNotificationsEnabled: true,
    })
  })

  it("defaults to enabled when the preference is unset", () => {
    useCurrentUserMock.mockReturnValue({ data: {} })
    render(<NotificationPreferences />)

    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true")
  })

  it("disables the toggle while the profile is loading and ignores clicks", () => {
    useCurrentUserMock.mockReturnValue({ data: undefined, isLoading: true })
    render(<NotificationPreferences />)

    const toggle = screen.getByRole("switch")
    expect(toggle).toBeDisabled()

    fireEvent.click(toggle)
    expect(mutateMock).not.toHaveBeenCalled()
  })
})

/**
 * Tests for the ConfirmEmailChange landing page (Story 4.4).
 *
 * Verifies the auto-submit of the `?code=` token on mount, the missing-code
 * invalid-link guard (no submit), the success branch (confirmation + sign-in
 * nudge), and the mapped error branches (EMAIL_CHANGE_TOKEN_EXPIRED /
 * EMAIL_CHANGE_TOKEN_INVALID).
 *
 * next-intl / navigation and the confirm mutation are mocked so the component
 * renders standalone; mutation state is driven per-test via `confirmState`.
 */
import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ConfirmEmailChange } from "./ConfirmEmailChange"

const { mutateMock, confirmState } = vi.hoisted(() => ({
  mutateMock: vi.fn(),
  confirmState: {
    isPending: true,
    isSuccess: false,
    isError: false,
    error: undefined as unknown,
  },
}))

vi.mock("@/lib/general-helpers", () => ({
  removeThisWhenYouNeedMe: () => {},
}))

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "fr",
}))

vi.mock("@/lib/navigation", () => ({
  Link: ({
    children,
    ...props
  }: {
    children: React.ReactNode
    href: string
  }) => <a {...props}>{children}</a>,
}))

vi.mock("@/hooks/useUser", () => ({
  useUserMutations: () => ({
    confirmEmailChangeMutation: {
      mutate: mutateMock,
      isPending: confirmState.isPending,
      isSuccess: confirmState.isSuccess,
      isError: confirmState.isError,
      error: confirmState.error,
    },
  }),
}))

describe("ConfirmEmailChange", () => {
  beforeEach(() => {
    mutateMock.mockReset()
    confirmState.isPending = true
    confirmState.isSuccess = false
    confirmState.isError = false
    confirmState.error = undefined
  })

  it("auto-submits the code once on mount", async () => {
    render(<ConfirmEmailChange code="tok-1" />)

    await waitFor(() => expect(mutateMock).toHaveBeenCalledTimes(1))
    expect(mutateMock).toHaveBeenCalledWith({ code: "tok-1" })
  })

  it("shows the invalid-link message and does not submit when the code is missing", () => {
    render(<ConfirmEmailChange code="" />)

    expect(screen.getByText("changeEmail.confirm.invalidLink")).toBeTruthy()
    expect(mutateMock).not.toHaveBeenCalled()
  })

  it("renders the success state with a sign-in nudge", () => {
    confirmState.isPending = false
    confirmState.isSuccess = true
    render(<ConfirmEmailChange code="tok-1" />)

    expect(screen.getByText("changeEmail.confirm.successTitle")).toBeTruthy()
    expect(screen.getByText("changeEmail.confirm.signIn")).toBeTruthy()
  })

  it("maps an expired token to its translated error message", () => {
    confirmState.isPending = false
    confirmState.isError = true
    confirmState.error = new Error("EMAIL_CHANGE_TOKEN_EXPIRED")
    render(<ConfirmEmailChange code="tok-1" />)

    expect(
      screen.getByText("errors.EMAIL_CHANGE_TOKEN_EXPIRED")
    ).toBeTruthy()
  })

  it("maps an invalid/used token to its translated error message", () => {
    confirmState.isPending = false
    confirmState.isError = true
    confirmState.error = new Error(
      JSON.stringify({
        name: "ValidationError",
        message: "EMAIL_CHANGE_TOKEN_INVALID",
        details: { code: "EMAIL_CHANGE_TOKEN_INVALID" },
        status: 400,
      })
    )
    render(<ConfirmEmailChange code="tok-1" />)

    expect(
      screen.getByText("errors.EMAIL_CHANGE_TOKEN_INVALID")
    ).toBeTruthy()
  })

  it("maps EMAIL_TAKEN (pending address claimed meanwhile) to its translated message", () => {
    confirmState.isPending = false
    confirmState.isError = true
    confirmState.error = new Error(
      JSON.stringify({
        name: "ValidationError",
        message: "EMAIL_TAKEN",
        details: { code: "EMAIL_TAKEN" },
        status: 400,
      })
    )
    render(<ConfirmEmailChange code="tok-1" />)

    expect(screen.getByText("errors.EMAIL_TAKEN")).toBeTruthy()
  })
})

/**
 * Tests for the routed ResetPasswordForm (Story 4.3).
 *
 * Verifies client-side policy validation blocks submit, the reset payload shape
 * ({ code, password, passwordConfirmation }), backend error-code mapping, the
 * invalid-link guard, and BOTH auto-login branches: `signIn` `{ ok: true }` →
 * redirect to a sanitized callbackUrl (default "/", same-origin honored,
 * off-origin rejected) and `{ ok: false }` → manual-signin fallback.
 *
 * next-intl / next-auth / next-navigation and the reset mutation are mocked so
 * the form renders standalone; the real zodResolver schema runs.
 */
import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ResetPasswordForm } from "./ResetPasswordForm"

const mutateMock = vi.fn()
const { signInMock, toastMock, searchParamsState } = vi.hoisted(() => ({
  signInMock: vi.fn(),
  toastMock: vi.fn(),
  searchParamsState: { callbackUrl: null as string | null },
}))

// AppField/AppForm import general-helpers, which eagerly validates env.mjs and
// rejects NODE_ENV=test. Stub the one helper they use so env is never imported.
vi.mock("@/lib/general-helpers", () => ({
  removeThisWhenYouNeedMe: () => {},
}))

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "ar",
}))

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: (key: string) =>
      key === "callbackUrl" ? searchParamsState.callbackUrl : null,
  }),
}))

vi.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => signInMock(...args),
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

vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}))

vi.mock("@/hooks/useUser", () => ({
  useUserMutations: () => ({
    resetPasswordMutation: {
      mutate: mutateMock,
      isPending: false,
      isSuccess: false,
    },
  }),
}))

function getInput(name: string): HTMLInputElement {
  const el = document.querySelector<HTMLInputElement>(`input[name="${name}"]`)
  if (!el) {
    throw new Error(`input[name="${name}"] not found`)
  }
  return el
}

async function fillValid(
  user: ReturnType<typeof userEvent.setup>,
  password = "Password1"
) {
  await user.type(getInput("password"), password)
  await user.type(getInput("passwordConfirmation"), password)
}

async function submit(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /submit/i }))
}

/** Options object handed to `resetPasswordMutation.mutate(vars, options)`. */
function mutateOptions(): {
  onSuccess: () => Promise<void>
  onError: (e: unknown) => void
} {
  return mutateMock.mock.calls[0][1]
}

describe("routed ResetPasswordForm", () => {
  beforeEach(() => {
    mutateMock.mockReset()
    signInMock.mockReset()
    toastMock.mockReset()
    searchParamsState.callbackUrl = null
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: { href: "" },
    })
  })

  it("renders the password fields when a code is present", () => {
    render(<ResetPasswordForm code="tok-1" email="u@example.com" />)
    expect(getInput("password")).toBeTruthy()
    expect(getInput("passwordConfirmation")).toBeTruthy()
  })

  it("shows the invalid-link card and no form when the code is missing", () => {
    render(<ResetPasswordForm code="" email="u@example.com" />)
    expect(screen.getByText("invalidLink")).toBeTruthy()
    expect(
      document.querySelector('input[name="password"]')
    ).toBeNull()
  })

  it("blocks submit when the password is too short", async () => {
    const user = userEvent.setup()
    render(<ResetPasswordForm code="tok-1" email="u@example.com" />)

    await fillValid(user, "Pass1")
    await submit(user)

    await waitFor(() => expect(mutateMock).not.toHaveBeenCalled())
  })

  it("blocks submit when the password has no digit", async () => {
    const user = userEvent.setup()
    render(<ResetPasswordForm code="tok-1" email="u@example.com" />)

    await fillValid(user, "Passwords")
    await submit(user)

    await waitFor(() => expect(mutateMock).not.toHaveBeenCalled())
  })

  it("blocks submit when the confirmation does not match", async () => {
    const user = userEvent.setup()
    render(<ResetPasswordForm code="tok-1" email="u@example.com" />)

    await user.type(getInput("password"), "Password1")
    await user.type(getInput("passwordConfirmation"), "Password2")
    await submit(user)

    await waitFor(() => expect(mutateMock).not.toHaveBeenCalled())
  })

  it("forwards { code, password, passwordConfirmation } on a valid submit", async () => {
    const user = userEvent.setup()
    render(<ResetPasswordForm code="tok-1" email="u@example.com" />)

    await fillValid(user)
    await submit(user)

    await waitFor(() => expect(mutateMock).toHaveBeenCalledTimes(1))
    expect(mutateMock.mock.calls[0][0]).toEqual({
      code: "tok-1",
      password: "Password1",
      passwordConfirmation: "Password1",
    })
  })

  it("auto-logs-in and redirects to '/' by default on success", async () => {
    signInMock.mockResolvedValue({ ok: true })
    const user = userEvent.setup()
    render(<ResetPasswordForm code="tok-1" email="u@example.com" />)

    await fillValid(user)
    await submit(user)
    await waitFor(() => expect(mutateMock).toHaveBeenCalledTimes(1))

    await act(async () => {
      await mutateOptions().onSuccess()
    })

    expect(signInMock).toHaveBeenCalledWith("credentials", {
      email: "u@example.com",
      password: "Password1",
      redirect: false,
    })
    expect(window.location.href).toBe("/")
  })

  it("honors a same-origin relative callbackUrl on success", async () => {
    signInMock.mockResolvedValue({ ok: true })
    searchParamsState.callbackUrl = "/dashboard"
    const user = userEvent.setup()
    render(<ResetPasswordForm code="tok-1" email="u@example.com" />)

    await fillValid(user)
    await submit(user)
    await waitFor(() => expect(mutateMock).toHaveBeenCalledTimes(1))

    await act(async () => {
      await mutateOptions().onSuccess()
    })

    expect(window.location.href).toBe("/dashboard")
  })

  it("rejects an off-origin callbackUrl and falls back to '/'", async () => {
    signInMock.mockResolvedValue({ ok: true })
    const user = userEvent.setup()

    // Includes backslash vectors the browser normalizes to "//host", and
    // control-char (tab/newline/CR) vectors the browser strips, collapsing
    // "/\n/evil.com" to "//evil.com".
    for (const evil of [
      "https://evil.com",
      "//evil.com",
      "/\\evil.com",
      "/\\/evil.com",
      "/\t/evil.com",
      "/\n/evil.com",
      "/\r/evil.com",
    ]) {
      mutateMock.mockReset()
      searchParamsState.callbackUrl = evil
      const { unmount } = render(
        <ResetPasswordForm code="tok-1" email="u@example.com" />
      )
      await fillValid(user)
      await submit(user)
      await waitFor(() => expect(mutateMock).toHaveBeenCalledTimes(1))
      await act(async () => {
      await mutateOptions().onSuccess()
    })
      expect(window.location.href).toBe("/")
      unmount()
    }
  })

  it("falls back to manual sign-in when auto-login fails ({ ok: false })", async () => {
    signInMock.mockResolvedValue({ ok: false })
    const user = userEvent.setup()
    render(<ResetPasswordForm code="tok-1" email="u@example.com" />)

    await fillValid(user)
    await submit(user)
    await waitFor(() => expect(mutateMock).toHaveBeenCalledTimes(1))

    await act(async () => {
      await mutateOptions().onSuccess()
    })

    expect(signInMock).toHaveBeenCalledTimes(1)
    expect(toastMock).toHaveBeenCalled()
    // No redirect on a failed auto-login.
    expect(window.location.href).toBe("")
  })

  it("maps RESET_TOKEN_EXPIRED to its translated error key", async () => {
    const user = userEvent.setup()
    render(<ResetPasswordForm code="tok-1" email="u@example.com" />)

    await fillValid(user)
    await submit(user)
    await waitFor(() => expect(mutateMock).toHaveBeenCalledTimes(1))

    // Feed the REAL error shape `fetchAPI` throws — `new Error(JSON.stringify(
    // appError))` — not the bare code, so the mapping is verified against the
    // envelope it actually receives in production (guards against a future
    // tighten-to-equality regression that a bare-code fixture would miss).
    mutateOptions().onError(
      new Error(
        JSON.stringify({
          name: "ValidationError",
          message: "RESET_TOKEN_EXPIRED",
          details: { code: "RESET_TOKEN_EXPIRED" },
          status: 400,
        })
      )
    )

    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: "destructive",
        description: "errors.RESET_TOKEN_EXPIRED",
      })
    )
  })

  it("maps RESET_TOKEN_INVALID to its translated error key", async () => {
    const user = userEvent.setup()
    render(<ResetPasswordForm code="tok-1" email="u@example.com" />)

    await fillValid(user)
    await submit(user)
    await waitFor(() => expect(mutateMock).toHaveBeenCalledTimes(1))

    mutateOptions().onError(new Error("RESET_TOKEN_INVALID"))

    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        description: "errors.RESET_TOKEN_INVALID",
      })
    )
  })

  it("maps a server password-policy code to the weak-password key", async () => {
    const user = userEvent.setup()
    render(<ResetPasswordForm code="tok-1" email="u@example.com" />)

    await fillValid(user)
    await submit(user)
    await waitFor(() => expect(mutateMock).toHaveBeenCalledTimes(1))

    mutateOptions().onError(new Error("PASSWORD_NO_UPPERCASE"))

    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ description: "errors.weakPassword" })
    )
  })

  it("maps an unrecognized error to the generic unexpected-error key", async () => {
    const user = userEvent.setup()
    render(<ResetPasswordForm code="tok-1" email="u@example.com" />)

    await fillValid(user)
    await submit(user)
    await waitFor(() => expect(mutateMock).toHaveBeenCalledTimes(1))

    mutateOptions().onError(new Error("RESET_FAILED"))

    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ description: "errors.unexpectedError" })
    )
  })
})

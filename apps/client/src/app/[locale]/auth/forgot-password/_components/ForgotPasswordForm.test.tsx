/**
 * Tests for the routed ForgotPasswordForm (Story 4.3).
 *
 * Verifies the { email } payload shape, that email validation blocks submit,
 * and that the SAME neutral "if an account exists…" confirmation copy is shown
 * regardless of the backend result (onSuccess AND onError) — no account leak.
 *
 * next-intl / navigation and the forgot mutation are mocked so the form renders
 * standalone; the real zodResolver schema runs.
 */
import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ForgotPasswordForm } from "./ForgotPasswordForm"

const mutateMock = vi.fn()
const { pushMock, toastMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  toastMock: vi.fn(),
}))

vi.mock("@/lib/general-helpers", () => ({
  removeThisWhenYouNeedMe: () => {},
}))

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "ar",
}))

vi.mock("@/lib/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}))

vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}))

vi.mock("@/hooks/useUser", () => ({
  useUserMutations: () => ({
    forgotPasswordMutation: {
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

async function submit(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /submit/i }))
}

function mutateOptions(): {
  onSuccess: () => void
  onError: (e: unknown) => void
} {
  return mutateMock.mock.calls[0][1]
}

describe("routed ForgotPasswordForm", () => {
  beforeEach(() => {
    mutateMock.mockReset()
    pushMock.mockReset()
    toastMock.mockReset()
  })

  it("blocks submit for an invalid email", async () => {
    const user = userEvent.setup()
    render(<ForgotPasswordForm />)

    await user.type(getInput("email"), "not-an-email")
    await submit(user)

    await waitFor(() => expect(mutateMock).not.toHaveBeenCalled())
  })

  it("forwards { email } on a valid submit", async () => {
    const user = userEvent.setup()
    render(<ForgotPasswordForm />)

    await user.type(getInput("email"), "grace@example.com")
    await submit(user)

    await waitFor(() => expect(mutateMock).toHaveBeenCalledTimes(1))
    expect(mutateMock.mock.calls[0][0]).toEqual({ email: "grace@example.com" })
  })

  it("shows the neutral confirmation copy on success", async () => {
    const user = userEvent.setup()
    render(<ForgotPasswordForm />)

    await user.type(getInput("email"), "grace@example.com")
    await submit(user)
    await waitFor(() => expect(mutateMock).toHaveBeenCalledTimes(1))

    act(() => mutateOptions().onSuccess())

    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ description: "passwordChangeEmailSent" })
    )
    expect(pushMock).toHaveBeenCalledWith("/auth/signin")
  })

  it("shows the SAME neutral copy on error (no account-existence leak)", async () => {
    const user = userEvent.setup()
    render(<ForgotPasswordForm />)

    await user.type(getInput("email"), "grace@example.com")
    await submit(user)
    await waitFor(() => expect(mutateMock).toHaveBeenCalledTimes(1))

    act(() => mutateOptions().onError(new Error("boom")))

    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ description: "passwordChangeEmailSent" })
    )
    expect(pushMock).toHaveBeenCalledWith("/auth/signin")
  })
})

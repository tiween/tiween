/**
 * Tests for the routed RegisterForm (Story 4.1).
 *
 * Verifies client-side validation (name required, strong-password rules, and
 * confirm-password matching) blocks submit, and that a valid submit forwards
 * the entered `name` (as `firstName`) to the register mutation.
 *
 * next-intl / next-auth / next-navigation and the register mutation are mocked
 * so the form can render standalone; the real zodResolver schema runs.
 */
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { RegisterForm } from "./RegisterForm"

const mutateMock = vi.fn()
const { signInMock, toastMock, sessionState } = vi.hoisted(() => ({
  signInMock: vi.fn(),
  toastMock: vi.fn(),
  sessionState: { data: null as { error?: string } | null },
}))

// AppField/AppForm import general-helpers, which eagerly validates env.mjs and
// rejects NODE_ENV=test. Stub the one helper they use so env is never imported.
vi.mock("@/lib/general-helpers", () => ({
  removeThisWhenYouNeedMe: () => {},
}))

vi.mock("next-intl", () => ({
  // Return the key so labels are stable and queryable in tests.
  useTranslations: () => (key: string) => key,
  // Active locale under the `[locale]` segment — forwarded in the register
  // payload so the welcome email is localized to the registrant (Story 4.1 P2).
  useLocale: () => "ar",
}))

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: () => null }),
}))

vi.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => signInMock(...args),
  useSession: () => sessionState,
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
    registerMutation: {
      mutate: mutateMock,
      isPending: false,
      isSuccess: false,
    },
  }),
}))

// AppField wraps its <input> in a <div>, so FormControl's id lands on the
// wrapper (not the input) and getByLabelText can't associate them. Query the
// inputs by their `name` attribute instead.
function getInput(name: string): HTMLInputElement {
  const el = document.querySelector<HTMLInputElement>(`input[name="${name}"]`)
  if (!el) {
    throw new Error(`input[name="${name}"] not found`)
  }
  return el
}

async function fillField(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
  value: string
) {
  await user.type(getInput(name), value)
}

async function fillValidExcept(
  user: ReturnType<typeof userEvent.setup>,
  overrides: Partial<Record<"name" | "email" | "password" | "confirm", string>>
) {
  await fillField(user, "name", overrides.name ?? "Alice")
  await fillField(user, "email", overrides.email ?? "alice@example.com")
  await fillField(user, "password", overrides.password ?? "Password1")
  await fillField(
    user,
    "passwordConfirmation",
    overrides.confirm ?? overrides.password ?? "Password1"
  )
}

async function submit(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /submit/i }))
}

describe("routed RegisterForm", () => {
  beforeEach(() => {
    mutateMock.mockReset()
    signInMock.mockReset()
    toastMock.mockReset()
    sessionState.data = null
  })

  it("renders the name field", () => {
    render(<RegisterForm />)
    expect(getInput("name")).toBeTruthy()
  })

  it("hides social buttons by default (no providers enabled)", () => {
    render(<RegisterForm />)
    expect(screen.queryByRole("button", { name: /google/i })).toBeNull()
    expect(screen.queryByRole("button", { name: /facebook/i })).toBeNull()
  })

  it("renders both social buttons when enabled", () => {
    render(<RegisterForm enableGoogle enableFacebook />)
    expect(screen.getByRole("button", { name: /google/i })).toBeTruthy()
    expect(screen.getByRole("button", { name: /facebook/i })).toBeTruthy()
  })

  it("wires the Google button to signIn('google', { callbackUrl })", async () => {
    const user = userEvent.setup()
    render(<RegisterForm enableGoogle enableFacebook />)

    await user.click(screen.getByRole("button", { name: /google/i }))
    expect(signInMock).toHaveBeenCalledWith("google", { callbackUrl: "/" })
  })

  it("wires the Facebook button to signIn('facebook', { callbackUrl })", async () => {
    const user = userEvent.setup()
    render(<RegisterForm enableGoogle enableFacebook />)

    await user.click(screen.getByRole("button", { name: /facebook/i }))
    expect(signInMock).toHaveBeenCalledWith("facebook", { callbackUrl: "/" })
  })

  it("toasts the mapped message when session.error is a social OAuth error", () => {
    sessionState.data = { error: "different_provider" }
    render(<RegisterForm enableGoogle enableFacebook />)

    expect(toastMock).toHaveBeenCalledTimes(1)
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: "destructive",
        description: "errors.different_provider",
      })
    )
  })

  it("does not toast when there is no session error", () => {
    sessionState.data = null
    render(<RegisterForm enableGoogle enableFacebook />)
    expect(toastMock).not.toHaveBeenCalled()
  })

  it("ignores unrelated session errors (e.g. invalid_strapi_token)", () => {
    sessionState.data = { error: "invalid_strapi_token" }
    render(<RegisterForm enableGoogle enableFacebook />)
    expect(toastMock).not.toHaveBeenCalled()
  })

  it("blocks submit when the name is empty", async () => {
    const user = userEvent.setup()
    render(<RegisterForm />)

    await fillValidExcept(user, { name: " " })
    await submit(user)

    await waitFor(() => {
      expect(mutateMock).not.toHaveBeenCalled()
    })
  })

  it("blocks submit when the password is too short", async () => {
    const user = userEvent.setup()
    render(<RegisterForm />)

    await fillValidExcept(user, { password: "Pass1" })
    await submit(user)

    await waitFor(() => {
      expect(mutateMock).not.toHaveBeenCalled()
    })
  })

  it("blocks submit when the password has no uppercase letter", async () => {
    const user = userEvent.setup()
    render(<RegisterForm />)

    await fillValidExcept(user, { password: "password1" })
    await submit(user)

    await waitFor(() => {
      expect(mutateMock).not.toHaveBeenCalled()
    })
  })

  it("blocks submit when the password has no lowercase letter", async () => {
    const user = userEvent.setup()
    render(<RegisterForm />)

    await fillValidExcept(user, { password: "PASSWORD1" })
    await submit(user)

    await waitFor(() => {
      expect(mutateMock).not.toHaveBeenCalled()
    })
  })

  it("blocks submit when the password has no digit", async () => {
    const user = userEvent.setup()
    render(<RegisterForm />)

    await fillValidExcept(user, { password: "Passwords" })
    await submit(user)

    await waitFor(() => {
      expect(mutateMock).not.toHaveBeenCalled()
    })
  })

  it("blocks submit below the min-length boundary (6 chars is too short)", async () => {
    const user = userEvent.setup()
    render(<RegisterForm />)

    // 6 chars, has upper + lower + digit — pins the minimum length at 8.
    await fillValidExcept(user, { password: "Passw1" })
    await submit(user)

    await waitFor(() => {
      expect(mutateMock).not.toHaveBeenCalled()
    })
  })

  it("blocks submit when the password exceeds the max length (72 bytes)", async () => {
    const user = userEvent.setup()
    render(<RegisterForm />)

    // 73 chars, otherwise valid (upper + lower + digit) — over the bcrypt cap.
    const tooLong = "A" + "a".repeat(70) + "1x"
    expect(tooLong.length).toBe(73)
    await fillValidExcept(user, { password: tooLong })
    await submit(user)

    await waitFor(() => {
      expect(mutateMock).not.toHaveBeenCalled()
    })
  })

  it("blocks submit when the confirmation does not match", async () => {
    const user = userEvent.setup()
    render(<RegisterForm />)

    await fillValidExcept(user, { password: "Password1", confirm: "Password2" })
    await submit(user)

    await waitFor(() => {
      expect(mutateMock).not.toHaveBeenCalled()
    })
  })

  it("forwards the name (as firstName) and active locale on a valid submit", async () => {
    const user = userEvent.setup()
    render(<RegisterForm />)

    await fillValidExcept(user, {})
    await submit(user)

    await waitFor(() => {
      expect(mutateMock).toHaveBeenCalledTimes(1)
    })
    expect(mutateMock.mock.calls[0][0]).toEqual({
      username: "alice@example.com",
      email: "alice@example.com",
      password: "Password1",
      firstName: "Alice",
      // The active locale (mocked useLocale → "ar") drives the welcome email.
      locale: "ar",
    })
  })

  it("clamps the strength meter below 'strong' when the password breaks the hard policy (over max length)", async () => {
    const user = userEvent.setup()
    render(<RegisterForm />)

    // 73 chars with upper + lower + digit: getPasswordStrength scores this
    // "strong", but the form rejects it (over the 72-char max). The meter must
    // be clamped to "medium" so it never contradicts the validation.
    // With next-intl mocked to echo the key, labels render as the raw keys.
    const overMax = "A" + "a".repeat(70) + "1x"
    expect(overMax.length).toBe(73)
    await fillField(user, "password", overMax)

    await waitFor(() => {
      expect(screen.getByText("passwordStrength.medium")).toBeTruthy()
    })
    expect(screen.queryByText("passwordStrength.strong")).toBeNull()
  })
})

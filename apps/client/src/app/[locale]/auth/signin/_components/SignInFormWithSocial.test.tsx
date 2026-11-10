/**
 * Tests for SignInFormWithSocial (Story 4.2 social login).
 *
 * Verifies the social buttons render only when their provider is enabled, and
 * that clicking one calls `signIn(provider, { callbackUrl })`. next-intl /
 * next-auth / navigation / toast are mocked so the form renders standalone.
 */
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { SignInFormWithSocial } from "./SignInFormWithSocial"

const { signInMock, toastMock, pushMock, sessionState } = vi.hoisted(() => ({
  signInMock: vi.fn(),
  toastMock: vi.fn(),
  pushMock: vi.fn(),
  sessionState: { data: null as { error?: string } | null },
}))

// AppField/AppForm import general-helpers, which eagerly validates env.mjs and
// rejects NODE_ENV=test. Stub the helpers the component/forms use so env is
// never imported.
vi.mock("@/lib/general-helpers", () => ({
  removeThisWhenYouNeedMe: () => {},
  safeJSONParse: (value: string) => {
    try {
      return JSON.parse(value)
    } catch {
      return {}
    }
  },
}))

vi.mock("next-intl", () => ({
  // Echo the key so labels are stable and queryable.
  useTranslations: () => (key: string) => key,
}))

let searchParamValue: string | null = null
vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: () => searchParamValue }),
}))

vi.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => signInMock(...args),
  useSession: () => sessionState,
}))

vi.mock("@/lib/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: pushMock }),
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

// AppField wraps its <input> in a <div>, so query the inputs by `name`.
function getInput(name: string): HTMLInputElement {
  const el = document.querySelector<HTMLInputElement>(`input[name="${name}"]`)
  if (!el) {
    throw new Error(`input[name="${name}"] not found`)
  }
  return el
}

describe("SignInFormWithSocial", () => {
  beforeEach(() => {
    signInMock.mockReset()
    toastMock.mockReset()
    pushMock.mockReset()
    sessionState.data = null
    searchParamValue = null
  })

  it("renders both social buttons when both providers are enabled", () => {
    render(<SignInFormWithSocial enableGoogle enableFacebook />)
    expect(screen.getByRole("button", { name: /google/i })).toBeTruthy()
    expect(screen.getByRole("button", { name: /facebook/i })).toBeTruthy()
  })

  it("hides social buttons when both providers are disabled", () => {
    render(<SignInFormWithSocial enableGoogle={false} enableFacebook={false} />)
    expect(screen.queryByRole("button", { name: /google/i })).toBeNull()
    expect(screen.queryByRole("button", { name: /facebook/i })).toBeNull()
  })

  it("calls signIn('google', { callbackUrl }) when the Google button is clicked", async () => {
    searchParamValue = "/dashboard"
    const user = userEvent.setup()
    render(<SignInFormWithSocial enableGoogle enableFacebook />)

    await user.click(screen.getByRole("button", { name: /google/i }))

    expect(signInMock).toHaveBeenCalledWith("google", {
      callbackUrl: "/dashboard",
    })
  })

  it("calls signIn('facebook', { callbackUrl }) with the default callback of '/'", async () => {
    const user = userEvent.setup()
    render(<SignInFormWithSocial enableGoogle enableFacebook />)

    await user.click(screen.getByRole("button", { name: /facebook/i }))

    expect(signInMock).toHaveBeenCalledWith("facebook", { callbackUrl: "/" })
  })

  it("shows the social block when at least one provider is enabled", () => {
    render(<SignInFormWithSocial enableGoogle enableFacebook={false} />)
    // The reused presentational SocialLogin renders both branded buttons; the
    // block as a whole is gated on (enableGoogle || enableFacebook).
    expect(screen.getByRole("button", { name: /google/i })).toBeTruthy()
  })

  it("toasts the mapped message when session.error is a social OAuth error", () => {
    sessionState.data = { error: "different_provider" }
    render(<SignInFormWithSocial enableGoogle enableFacebook />)

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
    render(<SignInFormWithSocial enableGoogle enableFacebook />)
    expect(toastMock).not.toHaveBeenCalled()
  })

  it("ignores unrelated session errors (e.g. invalid_strapi_token)", () => {
    sessionState.data = { error: "invalid_strapi_token" }
    render(<SignInFormWithSocial enableGoogle enableFacebook />)
    expect(toastMock).not.toHaveBeenCalled()
  })
  describe("callbackUrl handling (D-14, T-02-10)", () => {
    async function submitCredentials(user: ReturnType<typeof userEvent.setup>) {
      await user.type(getInput("email"), "alice@example.com")
      await user.type(getInput("password"), "Password1")
      await user.click(screen.getByRole("button", { name: /submit/i }))
    }

    it.each([
      ["protocol-relative", "//evil.com"],
      ["backslash", "/\\evil.com"],
      ["absolute", "https://evil.com/x"],
      ["javascript scheme", "javascript:alert(1)"],
      ["control character", "/\n/evil.com"],
    ])(
      "sends a hostile %s callbackUrl to '/' for credentials sign-in and push",
      async (_label, hostile) => {
        searchParamValue = hostile
        signInMock.mockResolvedValue({ error: null, ok: true })
        const user = userEvent.setup()
        render(<SignInFormWithSocial />)

        await submitCredentials(user)

        await waitFor(() => expect(pushMock).toHaveBeenCalledTimes(1), {
          timeout: 2000,
        })
        expect(pushMock).toHaveBeenCalledWith("/")
        expect(signInMock).toHaveBeenCalledWith(
          "credentials",
          expect.objectContaining({ callbackUrl: "/" })
        )
      }
    )

    it("sends a hostile callbackUrl to '/' for the OAuth start", async () => {
      searchParamValue = "//evil.com"
      const user = userEvent.setup()
      render(<SignInFormWithSocial enableGoogle />)

      await user.click(screen.getByRole("button", { name: /google/i }))

      expect(signInMock).toHaveBeenCalledWith("google", { callbackUrl: "/" })
    })

    it("strips the locale before the next-intl router push but keeps it for signIn", async () => {
      searchParamValue = "/ar/shorts/x"
      signInMock.mockResolvedValue({ error: null, ok: true })
      const user = userEvent.setup()
      render(<SignInFormWithSocial />)

      await submitCredentials(user)

      await waitFor(() => expect(pushMock).toHaveBeenCalledTimes(1), {
        timeout: 2000,
      })
      // Pushing "/ar/shorts/x" would land on /ar/ar/shorts/x (doubled prefix).
      expect(pushMock).toHaveBeenCalledWith("/shorts/x")
      expect(signInMock).toHaveBeenCalledWith(
        "credentials",
        expect.objectContaining({ callbackUrl: "/ar/shorts/x" })
      )
    })

    it("keeps the prefixed path for the OAuth start (a full navigation)", async () => {
      searchParamValue = "/ar/shorts/x"
      const user = userEvent.setup()
      render(<SignInFormWithSocial enableFacebook />)

      await user.click(screen.getByRole("button", { name: /facebook/i }))

      expect(signInMock).toHaveBeenCalledWith("facebook", {
        callbackUrl: "/ar/shorts/x",
      })
    })
  })
})

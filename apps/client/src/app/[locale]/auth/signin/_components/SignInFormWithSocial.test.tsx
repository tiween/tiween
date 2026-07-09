/**
 * Tests for SignInFormWithSocial (Story 4.2 social login).
 *
 * Verifies the social buttons render only when their provider is enabled, and
 * that clicking one calls `signIn(provider, { callbackUrl })`. next-intl /
 * next-auth / navigation / toast are mocked so the form renders standalone.
 */
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { SignInFormWithSocial } from "./SignInFormWithSocial"

const { signInMock, toastMock, sessionState } = vi.hoisted(() => ({
  signInMock: vi.fn(),
  toastMock: vi.fn(),
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
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
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

describe("SignInFormWithSocial", () => {
  beforeEach(() => {
    signInMock.mockReset()
    toastMock.mockReset()
    sessionState.data = null
    searchParamValue = null
  })

  it("renders both social buttons when both providers are enabled", () => {
    render(<SignInFormWithSocial enableGoogle enableFacebook />)
    expect(screen.getByRole("button", { name: /google/i })).toBeTruthy()
    expect(screen.getByRole("button", { name: /facebook/i })).toBeTruthy()
  })

  it("hides social buttons when both providers are disabled", () => {
    render(
      <SignInFormWithSocial enableGoogle={false} enableFacebook={false} />
    )
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
})

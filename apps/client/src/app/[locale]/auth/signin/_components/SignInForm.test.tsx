/**
 * Tests for SignInForm callbackUrl handling (D-14, threat T-02-10).
 *
 * The credentials-only sign-in form reads `?callbackUrl=` — a user-controlled
 * redirect target — so a hostile value must resolve to "/" and a safe
 * locale-prefixed path must reach the next-intl router without its prefix.
 */
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { SignInForm } from "./SignInForm"

const { signInMock, pushMock } = vi.hoisted(() => ({
  signInMock: vi.fn(),
  pushMock: vi.fn(),
}))

// AppField/AppForm import general-helpers, which eagerly validates env.mjs and
// rejects NODE_ENV=test; stub the helpers so env is never imported.
vi.mock("@/lib/general-helpers", () => ({
  removeThisWhenYouNeedMe: () => {},
  safeJSONParse: () => ({}),
}))

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}))

let searchParamValue: string | null = null
vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: () => searchParamValue }),
}))

vi.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => signInMock(...args),
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
  useToast: () => ({ toast: vi.fn() }),
}))

function getInput(name: string): HTMLInputElement {
  const el = document.querySelector<HTMLInputElement>(`input[name="${name}"]`)
  if (!el) {
    throw new Error(`input[name="${name}"] not found`)
  }
  return el
}

async function submitCredentials() {
  const user = userEvent.setup()
  render(<SignInForm />)
  await user.type(getInput("email"), "alice@example.com")
  await user.type(getInput("password"), "Password1")
  await user.click(screen.getByRole("button", { name: /submit/i }))
  await waitFor(() => expect(pushMock).toHaveBeenCalledTimes(1), {
    timeout: 2000,
  })
}

describe("SignInForm callbackUrl", () => {
  beforeEach(() => {
    signInMock.mockReset()
    pushMock.mockReset()
    signInMock.mockResolvedValue({ error: null, ok: true })
    searchParamValue = null
  })

  it("defaults to '/'", async () => {
    await submitCredentials()
    expect(pushMock).toHaveBeenCalledWith("/")
    expect(signInMock).toHaveBeenCalledWith(
      "credentials",
      expect.objectContaining({ callbackUrl: "/" })
    )
  })

  it.each([
    ["protocol-relative", "//evil.com"],
    ["backslash", "/\\evil.com"],
    ["absolute", "https://evil.com/x"],
    ["javascript scheme", "javascript:alert(1)"],
    ["control character", "/\n/evil.com"],
  ])("sends a hostile %s callbackUrl to '/'", async (_label, hostile) => {
    searchParamValue = hostile
    await submitCredentials()
    expect(pushMock).toHaveBeenCalledWith("/")
    expect(signInMock).toHaveBeenCalledWith(
      "credentials",
      expect.objectContaining({ callbackUrl: "/" })
    )
  })

  it.each(["/fr//evil.com", "/ar/\\evil.com"])(
    "never pushes an off-site path when stripping the locale from %s",
    async (tricky) => {
      searchParamValue = tricky
      await submitCredentials()
      expect(pushMock).toHaveBeenCalledWith("/")
    }
  )

  it("strips the locale before the router push but keeps it for signIn", async () => {
    searchParamValue = "/ar/shorts/x"
    await submitCredentials()
    expect(pushMock).toHaveBeenCalledWith("/shorts/x")
    expect(signInMock).toHaveBeenCalledWith(
      "credentials",
      expect.objectContaining({ callbackUrl: "/ar/shorts/x" })
    )
  })
})

/**
 * Tests for the routed ProfileForm (Story 4.4).
 *
 * Verifies the self-scoped save payload (whitelisted fields, threaded avatar
 * id), inline name-required validation blocking submit, backend error-code
 * mapping to `profile.errors.*`, and the change-email sub-form (request payload
 * + "email sent" toast).
 *
 * next-intl / next-navigation / use-toast and the user mutations are mocked so
 * the form renders standalone; the real zodResolver schema runs.
 */
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ProfileForm } from "./ProfileForm"

const { updateMutate, uploadMutateAsync, requestEmailMutate, toastMock, pushMock } =
  vi.hoisted(() => ({
    updateMutate: vi.fn(),
    uploadMutateAsync: vi.fn(),
    requestEmailMutate: vi.fn(),
    toastMock: vi.fn(),
    pushMock: vi.fn(),
  }))

// AppField/AppForm import general-helpers, which eagerly validates env.mjs and
// rejects NODE_ENV=test. Stub the one helper they use so env is never imported.
vi.mock("@/lib/general-helpers", () => ({
  removeThisWhenYouNeedMe: () => {},
}))

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "fr",
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, back: vi.fn() }),
}))

vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}))

const profileData = {
  id: 7,
  username: "Grace",
  email: "grace@example.com",
  preferredLanguage: "fr" as const,
  defaultRegion: undefined,
  avatar: undefined,
}

vi.mock("@/hooks/useUser", () => ({
  useCurrentUser: () => ({ data: profileData }),
  useUserMutations: () => ({
    updateProfileMutation: { mutate: updateMutate, isPending: false },
    uploadAvatarMutation: { mutateAsync: uploadMutateAsync, isPending: false },
    requestEmailChangeMutation: { mutate: requestEmailMutate, isPending: false },
  }),
}))

const user = { id: 7, email: "grace@example.com", name: "Grace" }

function renderForm() {
  return render(<ProfileForm locale="fr" regions={[]} user={user} />)
}

function getInput(name: string): HTMLInputElement {
  const el = document.querySelector<HTMLInputElement>(`input[name="${name}"]`)
  if (!el) {
    throw new Error(`input[name="${name}"] not found`)
  }
  return el
}

async function save(u: ReturnType<typeof userEvent.setup>) {
  await u.click(screen.getByRole("button", { name: "save" }))
}

/** Options object handed to `updateProfileMutation.mutate(vars, options)`. */
function updateOptions(): {
  onSuccess: () => void
  onError: (e: unknown) => void
} {
  return updateMutate.mock.calls[0][1]
}

describe("routed ProfileForm", () => {
  beforeEach(() => {
    updateMutate.mockReset()
    uploadMutateAsync.mockReset()
    requestEmailMutate.mockReset()
    toastMock.mockReset()
    pushMock.mockReset()
  })

  it("saves only the whitelisted fields via PUT /users/me on a valid submit", async () => {
    const u = userEvent.setup()
    renderForm()

    await save(u)

    await waitFor(() => expect(updateMutate).toHaveBeenCalledTimes(1))
    expect(updateMutate.mock.calls[0][0]).toEqual({
      username: "Grace",
      preferredLanguage: "fr",
    })
  })

  it("threads the uploaded avatar id into the save payload", async () => {
    uploadMutateAsync.mockResolvedValue(55)
    const u = userEvent.setup()
    renderForm()

    const file = new File(["avatar"], "avatar.png", { type: "image/png" })
    const fileInput = document.querySelector<HTMLInputElement>(
      'input[type="file"]'
    )!
    await u.upload(fileInput, file)

    await save(u)

    await waitFor(() => expect(uploadMutateAsync).toHaveBeenCalledTimes(1))
    expect(uploadMutateAsync).toHaveBeenCalledWith({ file })
    await waitFor(() => expect(updateMutate).toHaveBeenCalledTimes(1))
    expect(updateMutate.mock.calls[0][0]).toEqual({
      username: "Grace",
      preferredLanguage: "fr",
      avatar: 55,
    })
  })

  it("blocks submit and does not save when the name is empty", async () => {
    const u = userEvent.setup()
    renderForm()

    await u.clear(getInput("name"))
    await save(u)

    await waitFor(() => expect(getInput("name").value).toBe(""))
    expect(updateMutate).not.toHaveBeenCalled()
  })

  it("shows a success toast on a successful save", async () => {
    const u = userEvent.setup()
    renderForm()

    await save(u)
    await waitFor(() => expect(updateMutate).toHaveBeenCalledTimes(1))

    updateOptions().onSuccess()

    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ description: "toast.saveSuccess" })
    )
  })

  it("maps a USERNAME_TAKEN save error to its translated key", async () => {
    const u = userEvent.setup()
    renderForm()

    await save(u)
    await waitFor(() => expect(updateMutate).toHaveBeenCalledTimes(1))

    // Feed the REAL error shape `fetchAPI` throws — `new Error(JSON.stringify(
    // appError))` — so the mapping is verified against the production envelope.
    updateOptions().onError(
      new Error(
        JSON.stringify({
          name: "ValidationError",
          message: "USERNAME_TAKEN",
          details: { code: "USERNAME_TAKEN" },
          status: 400,
        })
      )
    )

    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: "destructive",
        description: "errors.USERNAME_TAKEN",
      })
    )
  })

  it("requests an email change and toasts 'email sent' on success", async () => {
    const u = userEvent.setup()
    renderForm()

    // Reveal the change-email sub-form.
    await u.click(screen.getByRole("button", { name: "changeEmail.trigger" }))

    await u.type(getInput("email"), "new@example.com")
    await u.click(screen.getByRole("button", { name: "changeEmail.submit" }))

    await waitFor(() => expect(requestEmailMutate).toHaveBeenCalledTimes(1))
    expect(requestEmailMutate.mock.calls[0][0]).toEqual({
      email: "new@example.com",
    })

    // Drive the success callback the component passed to `mutate`.
    requestEmailMutate.mock.calls[0][1].onSuccess()
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ description: "changeEmail.emailSent" })
    )
  })

  it("maps an EMAIL_TAKEN change-email error to its translated key", async () => {
    const u = userEvent.setup()
    renderForm()

    await u.click(screen.getByRole("button", { name: "changeEmail.trigger" }))
    await u.type(getInput("email"), "taken@example.com")
    await u.click(screen.getByRole("button", { name: "changeEmail.submit" }))

    await waitFor(() => expect(requestEmailMutate).toHaveBeenCalledTimes(1))

    requestEmailMutate.mock.calls[0][1].onError(new Error("EMAIL_TAKEN"))
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: "destructive",
        description: "errors.EMAIL_TAKEN",
      })
    )
  })
})

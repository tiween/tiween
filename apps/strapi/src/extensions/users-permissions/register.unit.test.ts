/**
 * Unit tests for the Story 4.1 users-permissions register override (mocked
 * Strapi — no DB, no boot). Part of the must-pass unit gate.
 *
 * Covers the I/O matrix from the spec:
 *  - rejects invalid email / weak password / empty name with stable codes
 *  - delegates to the original controller only after validation passes
 *  - persists the entered name as `firstName` via the user service
 *  - sends a localized welcome email on success
 *  - registration still succeeds when the welcome email send throws
 */
import registerExtension from "./strapi-server"

interface MockCtx {
  request: { body: Record<string, unknown> }
  body?: unknown
}

interface Harness {
  register: (ctx: MockCtx) => Promise<unknown>
  originalRegister: jest.Mock
  userEdit: jest.Mock
  emailSend: jest.Mock
  logError: jest.Mock
}

function buildHarness(
  opts: { emailSend?: jest.Mock; originalRegister?: jest.Mock } = {}
): Harness {
  const userEdit = jest.fn(async () => undefined)
  const emailSend = opts.emailSend ?? jest.fn(async () => undefined)
  const logError = jest.fn()

  // The original register controller simulates the real one: it issues a JWT
  // and sets ctx.body = { jwt, user } with the sanitized user.
  const originalRegister =
    opts.originalRegister ??
    jest.fn(async (ctx: MockCtx) => {
      ctx.body = {
        jwt: "jwt-token",
        user: {
          id: 42,
          email: (ctx.request.body.email as string) ?? undefined,
          preferredLanguage: "fr",
        },
      }
    })

  const mockStrapi = {
    plugin: jest.fn(() => ({
      service: jest.fn(() => ({ edit: userEdit })),
    })),
    plugins: { email: { services: { email: { send: emailSend } } } },
    log: { error: logError },
  }

  ;(global as any).strapi = mockStrapi

  const plugin = {
    controllers: { auth: { register: originalRegister } },
  }

  const wrapped = registerExtension(plugin)

  return {
    register: wrapped.controllers.auth.register,
    originalRegister,
    userEdit,
    emailSend,
    logError,
  }
}

function makeCtx(body: Record<string, unknown>): MockCtx {
  return { request: { body: { ...body } } }
}

const validBody = {
  username: "alice@example.com",
  email: "alice@example.com",
  password: "Password1",
  firstName: "Alice",
}

/** Extract the per-field codes from a thrown Strapi ValidationError. */
function codesOf(err: unknown): string[] {
  const details = (err as { details?: { issues?: { message: string }[] } })
    .details
  return (details?.issues ?? []).map((i) => i.message)
}

describe("users-permissions register override (unit)", () => {
  afterEach(() => {
    delete (global as any).strapi
  })

  it("rejects an invalid email with INVALID_EMAIL and does not create an account", async () => {
    const h = buildHarness()
    const ctx = makeCtx({ ...validBody, email: "not-an-email" })

    await expect(h.register(ctx)).rejects.toMatchObject({
      details: { code: "VALIDATION_FAILED" },
    })

    let thrown: unknown
    try {
      await h.register(makeCtx({ ...validBody, email: "not-an-email" }))
    } catch (e) {
      thrown = e
    }
    expect(codesOf(thrown)).toContain("INVALID_EMAIL")
    expect(h.originalRegister).not.toHaveBeenCalled()
  })

  it("rejects a too-short password with PASSWORD_TOO_SHORT", async () => {
    const h = buildHarness()
    let thrown: unknown
    try {
      await h.register(makeCtx({ ...validBody, password: "Ab1" }))
    } catch (e) {
      thrown = e
    }
    expect(codesOf(thrown)).toContain("PASSWORD_TOO_SHORT")
    expect(h.originalRegister).not.toHaveBeenCalled()
  })

  it("rejects a password missing uppercase / lowercase / digit with the matching codes", async () => {
    const h = buildHarness()

    const noUpper = await h
      .register(makeCtx({ ...validBody, password: "password1" }))
      .catch((e) => e)
    expect(codesOf(noUpper)).toContain("PASSWORD_NO_UPPERCASE")

    const noLower = await h
      .register(makeCtx({ ...validBody, password: "PASSWORD1" }))
      .catch((e) => e)
    expect(codesOf(noLower)).toContain("PASSWORD_NO_LOWERCASE")

    const noDigit = await h
      .register(makeCtx({ ...validBody, password: "Passwords" }))
      .catch((e) => e)
    expect(codesOf(noDigit)).toContain("PASSWORD_NO_DIGIT")

    expect(h.originalRegister).not.toHaveBeenCalled()
  })

  it("rejects an empty / whitespace name with NAME_REQUIRED", async () => {
    const h = buildHarness()
    const thrown = await h
      .register(makeCtx({ ...validBody, firstName: "   " }))
      .catch((e) => e)
    expect(codesOf(thrown)).toContain("NAME_REQUIRED")
    expect(h.originalRegister).not.toHaveBeenCalled()
  })

  it("delegates to the original controller and persists firstName on success", async () => {
    const h = buildHarness()
    const ctx = makeCtx({ ...validBody, firstName: "  Alice  " })

    await h.register(ctx)

    expect(h.originalRegister).toHaveBeenCalledTimes(1)
    // Custom keys are stripped before delegating (original rejects unknown keys)
    expect(ctx.request.body.firstName).toBeUndefined()
    expect(ctx.request.body.name).toBeUndefined()
    // firstName persisted (trimmed) via the user service
    expect(h.userEdit).toHaveBeenCalledWith(42, { firstName: "Alice" })
    // response user reflects firstName; jwt preserved for auto-login
    expect(ctx.body).toMatchObject({
      jwt: "jwt-token",
      user: { id: 42, firstName: "Alice" },
    })
  })

  it("sends the French welcome email by default (no request locale)", async () => {
    const h = buildHarness()
    await h.register(makeCtx(validBody))

    expect(h.emailSend).toHaveBeenCalledTimes(1)
    const arg = h.emailSend.mock.calls[0][0]
    expect(arg.to).toBe("alice@example.com")
    // Assert the literal FR content (not buildWelcomeEmail("fr") — that would be
    // tautological). preferredLanguage defaults to fr; no request locale sent.
    expect(arg.subject).toBe("Bienvenue sur Tiween")
    expect(arg.html).toContain("Votre compte Tiween a bien été créé")
    expect(arg.html).toContain("Alice")
  })

  it("sends the English welcome email when the request locale is en", async () => {
    const h = buildHarness()
    await h.register(makeCtx({ ...validBody, locale: "en" }))

    expect(h.emailSend).toHaveBeenCalledTimes(1)
    const arg = h.emailSend.mock.calls[0][0]
    expect(arg.subject).toBe("Welcome to Tiween")
    expect(arg.html).toContain("Your Tiween account has been created")
  })

  it("sends the Arabic welcome email when the request locale is ar", async () => {
    const h = buildHarness()
    await h.register(makeCtx({ ...validBody, locale: "ar" }))

    expect(h.emailSend).toHaveBeenCalledTimes(1)
    const arg = h.emailSend.mock.calls[0][0]
    expect(arg.subject).toBe("مرحباً بك في تيوين")
    expect(arg.html).toContain("تم إنشاء حسابك في تيوين بنجاح")
  })

  it("resolves a region-variant locale (en-US → en)", async () => {
    const h = buildHarness()
    await h.register(makeCtx({ ...validBody, locale: "en-US" }))

    const arg = h.emailSend.mock.calls[0][0]
    expect(arg.subject).toBe("Welcome to Tiween")
  })

  it("falls back to French for an unsupported locale (de → fr)", async () => {
    const h = buildHarness()
    await h.register(makeCtx({ ...validBody, locale: "de" }))

    const arg = h.emailSend.mock.calls[0][0]
    expect(arg.subject).toBe("Bienvenue sur Tiween")
  })

  it("propagates a duplicate-email error and does not persist or email", async () => {
    const originalRegister = jest.fn(async () => {
      throw new Error("Email or Username are already taken")
    })
    const h = buildHarness({ originalRegister })

    await expect(h.register(makeCtx(validBody))).rejects.toThrow(
      /already taken/
    )

    expect(originalRegister).toHaveBeenCalledTimes(1)
    expect(h.userEdit).not.toHaveBeenCalled()
    expect(h.emailSend).not.toHaveBeenCalled()
  })

  it("rejects a non-string password with a stable code and does not delegate", async () => {
    const h = buildHarness()
    const thrown = await h
      .register(makeCtx({ ...validBody, password: 12345678 }))
      .catch((e) => e)

    const codes = codesOf(thrown)
    // A stable CODE, never Zod's English prose ("Expected string, received …").
    expect(codes).toContain("PASSWORD_REQUIRED")
    expect(codes.join(" ")).not.toMatch(/expected|received/i)
    expect(h.originalRegister).not.toHaveBeenCalled()
  })

  it("rejects an over-72-character password with PASSWORD_TOO_LONG and does not delegate", async () => {
    const h = buildHarness()
    // 73 chars, otherwise valid (upper + lower + digit).
    const tooLong = "A" + "a".repeat(70) + "1x"
    const thrown = await h
      .register(makeCtx({ ...validBody, password: tooLong }))
      .catch((e) => e)

    expect(codesOf(thrown)).toContain("PASSWORD_TOO_LONG")
    expect(h.originalRegister).not.toHaveBeenCalled()
  })

  it("still succeeds when the welcome email send throws (non-blocking)", async () => {
    const emailSend = jest.fn(async () => {
      throw new Error("brevo down")
    })
    const h = buildHarness({ emailSend })

    // Must not reject.
    await expect(h.register(makeCtx(validBody))).resolves.toBeUndefined()

    expect(h.originalRegister).toHaveBeenCalledTimes(1)
    expect(h.userEdit).toHaveBeenCalledTimes(1)
    expect(emailSend).toHaveBeenCalledTimes(1)
    expect(h.logError).toHaveBeenCalled()
  })
})

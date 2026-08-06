/**
 * Unit tests for the Story 4.3 users-permissions password-reset overrides
 * (mocked Strapi — no DB, no boot). Part of the must-pass unit gate.
 *
 * Covers the I/O matrix from the spec:
 *  - forgotPassword: no-leak `{ ok: true }` for unknown / blocked / send-fail;
 *    token + expiry persisted and localized email sent for a known account;
 *    CLIENT_RESET_PASSWORD_URL unset → warn, no email; TTL <=0/malformed →
 *    1h default, valid TTL honored.
 *  - resetPassword: expiry rejection (incl. exact `==` boundary) and
 *    activation-no-expiry passthrough; weak-password rejection; stock rejection
 *    → RESET_TOKEN_INVALID; passwordChangedAt stamped from the issued `iat`
 *    (and skipped, logged, when no numeric `iat`).
 *  - wrapped jwt.verify: stale token rejected, fresh-same-second passes, unset
 *    boundary passes, missing id/iat no-op, lookup-error fail-open.
 */
import resetExtension from "./strapi-server"

interface MockCtx {
  request: { body: Record<string, unknown> }
  body?: unknown
}

interface HarnessOpts {
  userByEmail?: Record<string, unknown> | null
  userByToken?: Record<string, unknown> | null
  userById?: Record<string, unknown> | null
  findOneImpl?: (args: { where: Record<string, unknown> }) => unknown
  emailSend?: jest.Mock
  originalResetPassword?: jest.Mock
  stampVerify?: jest.Mock
  baseVerify?: jest.Mock
  resetUserId?: number
}

function buildHarness(opts: HarnessOpts = {}) {
  const userEdit = jest.fn(async () => undefined)
  const emailSend = opts.emailSend ?? jest.fn(async () => undefined)
  const logError = jest.fn()
  const logWarn = jest.fn()
  const resetUserId = opts.resetUserId ?? 42

  const findOne =
    opts.findOneImpl != null
      ? jest.fn(async (args: { where: Record<string, unknown> }) =>
          opts.findOneImpl!(args)
        )
      : jest.fn(async ({ where }: { where: Record<string, unknown> }) => {
          if (where.email !== undefined) return opts.userByEmail ?? null
          if (where.resetPasswordToken !== undefined)
            return opts.userByToken ?? null
          if (where.id !== undefined) return opts.userById ?? null
          return null
        })

  // Stock reset controller: hashes, clears the token, issues a JWT → ctx.body.
  const originalResetPassword =
    opts.originalResetPassword ??
    jest.fn(async (ctx: MockCtx) => {
      ctx.body = { jwt: "fresh-jwt", user: { id: resetUserId } }
    })

  // `strapi.plugin(...).service("jwt").verify` used by the reset stamping path.
  const stampVerify =
    opts.stampVerify ?? jest.fn(() => ({ iat: 1000, id: resetUserId }))

  // The base verify the wrapped jwt factory decorates.
  const baseVerify =
    opts.baseVerify ?? jest.fn(async () => ({ id: 42, iat: 1000 }))

  const services: Record<string, unknown> = {
    user: { edit: userEdit },
    jwt: { verify: stampVerify, issue: jest.fn(() => "issued-jwt") },
  }

  const mockStrapi = {
    plugin: jest.fn(() => ({
      service: jest.fn((name: string) => services[name]),
    })),
    plugins: { email: { services: { email: { send: emailSend } } } },
    db: { query: jest.fn(() => ({ findOne })) },
    log: { error: logError, warn: logWarn, info: jest.fn() },
  }

  ;(global as any).strapi = mockStrapi

  // Mirror the REAL upstream shape (Story 4.7): `auth` is exported as a
  // FACTORY; handlers are read off the INSTANTIATED controller, as at boot.
  const plugin = {
    controllers: {
      auth: ({ strapi: _strapi }: { strapi: unknown }) => ({
        register: jest.fn(async () => undefined),
        callback: jest.fn(async () => undefined),
        forgotPassword: jest.fn(async () => undefined),
        resetPassword: originalResetPassword,
      }),
    },
    services: {
      jwt: jest.fn(() => ({ verify: baseVerify })),
    },
  }

  const wrapped = resetExtension(plugin as any)
  const wrappedAuth = wrapped.controllers.auth
  if (typeof wrappedAuth !== "function") {
    throw new Error("expected the extension to keep auth as a factory")
  }
  const instantiated = wrappedAuth({ strapi: mockStrapi })

  return {
    forgotPassword: instantiated.forgotPassword as (
      ctx: MockCtx
    ) => Promise<unknown>,
    resetPassword: instantiated.resetPassword as (
      ctx: MockCtx
    ) => Promise<unknown>,
    jwtFactory: wrapped.services.jwt,
    userEdit,
    emailSend,
    findOne,
    logError,
    logWarn,
    originalResetPassword,
    stampVerify,
    baseVerify,
  }
}

function makeCtx(body: Record<string, unknown>): MockCtx {
  return { request: { body: { ...body } } }
}

/** Extract the per-field codes from a thrown Strapi ValidationError. */
function codesOf(err: unknown): string[] {
  const details = (err as { details?: { issues?: { message: string }[] } })
    .details
  return (details?.issues ?? []).map((i) => i.message)
}

const RESET_URL = "https://tiween.localhost:1355/auth/reset-password"

describe("users-permissions forgotPassword override (unit)", () => {
  beforeEach(() => {
    process.env.CLIENT_RESET_PASSWORD_URL = RESET_URL
    delete process.env.RESET_TOKEN_TTL_MS
  })
  afterEach(() => {
    delete (global as any).strapi
    delete process.env.CLIENT_RESET_PASSWORD_URL
    delete process.env.RESET_TOKEN_TTL_MS
  })

  it("returns { ok: true } and sends no email for an unknown email (no leak)", async () => {
    const h = buildHarness({ userByEmail: null })
    const ctx = makeCtx({ email: "ghost@example.com" })

    await h.forgotPassword(ctx)

    expect(ctx.body).toEqual({ ok: true })
    expect(h.userEdit).not.toHaveBeenCalled()
    expect(h.emailSend).not.toHaveBeenCalled()
  })

  it("skips a blocked account silently — no token, no email, still { ok: true }", async () => {
    const h = buildHarness({
      userByEmail: { id: 5, email: "blocked@example.com", blocked: true },
    })
    const ctx = makeCtx({ email: "blocked@example.com" })

    await h.forgotPassword(ctx)

    expect(ctx.body).toEqual({ ok: true })
    expect(h.userEdit).not.toHaveBeenCalled()
    expect(h.emailSend).not.toHaveBeenCalled()
  })

  it("persists a token + expiry and sends a localized reset email for a known account", async () => {
    const before = Date.now()
    const h = buildHarness({
      userByEmail: {
        id: 7,
        email: "grace@example.com",
        blocked: false,
        preferredLanguage: "fr",
        firstName: "Grace",
      },
    })
    const ctx = makeCtx({ email: "grace@example.com" })

    await h.forgotPassword(ctx)

    expect(ctx.body).toEqual({ ok: true })
    expect(h.userEdit).toHaveBeenCalledTimes(1)
    const [id, patch] = h.userEdit.mock.calls[0]
    expect(id).toBe(7)
    expect(typeof patch.resetPasswordToken).toBe("string")
    expect(patch.resetPasswordToken).toHaveLength(128) // randomBytes(64) hex
    expect(patch.resetPasswordTokenExpiresAt).toBeInstanceOf(Date)
    // Default TTL = 1h.
    const ttl = patch.resetPasswordTokenExpiresAt.getTime() - before
    expect(ttl).toBeGreaterThanOrEqual(3_600_000 - 1000)
    expect(ttl).toBeLessThanOrEqual(3_600_000 + 5000)

    expect(h.emailSend).toHaveBeenCalledTimes(1)
    const arg = h.emailSend.mock.calls[0][0]
    expect(arg.to).toBe("grace@example.com")
    expect(arg.subject).toBe("Réinitialisation de votre mot de passe Tiween")
    // The href is HTML-escaped, so the query `&` renders as `&amp;`.
    expect(arg.html).toContain(
      `${RESET_URL}?code=${patch.resetPasswordToken}&amp;email=${encodeURIComponent("grace@example.com")}`
    )
  })

  it("still returns { ok: true } when the email send throws (non-blocking, logged)", async () => {
    const emailSend = jest.fn(async () => {
      throw new Error("brevo down")
    })
    const h = buildHarness({
      userByEmail: { id: 7, email: "grace@example.com", blocked: false },
      emailSend,
    })
    const ctx = makeCtx({ email: "grace@example.com" })

    await expect(h.forgotPassword(ctx)).resolves.toBeUndefined()

    expect(ctx.body).toEqual({ ok: true })
    expect(h.userEdit).toHaveBeenCalledTimes(1)
    expect(emailSend).toHaveBeenCalledTimes(1)
    expect(h.logError).toHaveBeenCalled()
  })

  it("warns and sends no email when CLIENT_RESET_PASSWORD_URL is unset (token still persisted)", async () => {
    delete process.env.CLIENT_RESET_PASSWORD_URL
    const h = buildHarness({
      userByEmail: { id: 7, email: "grace@example.com", blocked: false },
    })
    const ctx = makeCtx({ email: "grace@example.com" })

    await h.forgotPassword(ctx)

    expect(ctx.body).toEqual({ ok: true })
    expect(h.userEdit).toHaveBeenCalledTimes(1)
    expect(h.emailSend).not.toHaveBeenCalled()
    expect(h.logWarn).toHaveBeenCalled()
  })

  it("falls back to the 1h default for a non-positive / malformed TTL", async () => {
    for (const bad of ["0", "-5", "abc", ""]) {
      process.env.RESET_TOKEN_TTL_MS = bad
      const before = Date.now()
      const h = buildHarness({
        userByEmail: { id: 7, email: "g@example.com", blocked: false },
      })
      await h.forgotPassword(makeCtx({ email: "g@example.com" }))
      const patch = h.userEdit.mock.calls[0][1]
      const ttl = patch.resetPasswordTokenExpiresAt.getTime() - before
      expect(ttl).toBeGreaterThanOrEqual(3_600_000 - 1000)
      expect(ttl).toBeLessThanOrEqual(3_600_000 + 5000)
    }
  })

  it("honors a valid positive TTL", async () => {
    process.env.RESET_TOKEN_TTL_MS = "60000"
    const before = Date.now()
    const h = buildHarness({
      userByEmail: { id: 7, email: "g@example.com", blocked: false },
    })
    await h.forgotPassword(makeCtx({ email: "g@example.com" }))
    const patch = h.userEdit.mock.calls[0][1]
    const ttl = patch.resetPasswordTokenExpiresAt.getTime() - before
    expect(ttl).toBeGreaterThanOrEqual(60_000 - 1000)
    expect(ttl).toBeLessThanOrEqual(60_000 + 5000)
  })
})

describe("users-permissions resetPassword override (unit)", () => {
  afterEach(() => {
    delete (global as any).strapi
    jest.restoreAllMocks()
  })

  const validReset = {
    code: "tok-123",
    password: "Password1",
    passwordConfirmation: "Password1",
  }

  it("rejects an expired token with RESET_TOKEN_EXPIRED before delegating", async () => {
    const h = buildHarness({
      userByToken: {
        id: 9,
        resetPasswordTokenExpiresAt: new Date(Date.now() - 1000).toISOString(),
      },
    })

    const thrown = await h.resetPassword(makeCtx(validReset)).catch((e) => e)
    expect((thrown as { message?: string }).message).toBe("RESET_TOKEN_EXPIRED")
    expect(h.originalResetPassword).not.toHaveBeenCalled()
  })

  it("rejects at the exact expiry boundary (Date.now() === expiresAt)", async () => {
    const fixed = 1_700_000_000_000
    jest.spyOn(Date, "now").mockReturnValue(fixed)
    const h = buildHarness({
      userByToken: {
        id: 9,
        resetPasswordTokenExpiresAt: new Date(fixed).toISOString(),
      },
    })

    const thrown = await h.resetPassword(makeCtx(validReset)).catch((e) => e)
    expect((thrown as { message?: string }).message).toBe("RESET_TOKEN_EXPIRED")
    expect(h.originalResetPassword).not.toHaveBeenCalled()
  })

  it("passes an activation token that has NO expiry (activation flow unaffected)", async () => {
    const h = buildHarness({
      userByToken: { id: 9, resetPasswordTokenExpiresAt: null },
    })

    await h.resetPassword(makeCtx(validReset))

    expect(h.originalResetPassword).toHaveBeenCalledTimes(1)
  })

  it("rejects a weak password with the shared policy codes before delegating", async () => {
    const h = buildHarness({
      userByToken: { id: 9, resetPasswordTokenExpiresAt: null },
    })

    const thrown = await h
      .resetPassword(makeCtx({ ...validReset, password: "weak" }))
      .catch((e) => e)

    expect(codesOf(thrown)).toContain("PASSWORD_TOO_SHORT")
    expect(h.originalResetPassword).not.toHaveBeenCalled()
  })

  it("maps a stock rejection (unknown/used code) to RESET_TOKEN_INVALID", async () => {
    const originalResetPassword = jest.fn(async () => {
      throw new Error("Incorrect code provided")
    })
    const h = buildHarness({
      userByToken: null,
      originalResetPassword,
    })

    const thrown = await h.resetPassword(makeCtx(validReset)).catch((e) => e)
    expect((thrown as { message?: string }).message).toBe("RESET_TOKEN_INVALID")
  })

  it("stamps passwordChangedAt from the freshly issued JWT iat and clears the expiry", async () => {
    const h = buildHarness({
      userByToken: { id: 42, resetPasswordTokenExpiresAt: null },
      stampVerify: jest.fn(() => ({ iat: 1234, id: 42 })),
    })

    await h.resetPassword(makeCtx(validReset))

    expect(h.originalResetPassword).toHaveBeenCalledTimes(1)
    expect(h.userEdit).toHaveBeenCalledWith(42, {
      passwordChangedAt: new Date(1234 * 1000),
      resetPasswordTokenExpiresAt: null,
    })
  })

  it("skips (and logs) stamping when the issued JWT has no numeric iat — never self-revokes", async () => {
    const h = buildHarness({
      userByToken: { id: 42, resetPasswordTokenExpiresAt: null },
      stampVerify: jest.fn(() => ({ id: 42 })), // no iat
    })

    await h.resetPassword(makeCtx(validReset))

    expect(h.originalResetPassword).toHaveBeenCalledTimes(1)
    expect(h.userEdit).not.toHaveBeenCalled()
    expect(h.logError).toHaveBeenCalled()
  })

  it("DELEGATES a valid token still within its expiry window (happy path)", async () => {
    const h = buildHarness({
      userByToken: {
        id: 42,
        resetPasswordTokenExpiresAt: new Date(
          Date.now() + 3_600_000
        ).toISOString(),
      },
    })

    await h.resetPassword(makeCtx(validReset))

    // A future, non-null expiry must NOT be rejected — guards against a
    // "reject every token that has any expiry" regression the throw-only tests miss.
    expect(h.originalResetPassword).toHaveBeenCalledTimes(1)
  })

  it("rejects a blocked account's reset with RESET_TOKEN_INVALID before delegating", async () => {
    const h = buildHarness({
      userByToken: { id: 9, blocked: true, resetPasswordTokenExpiresAt: null },
    })

    const thrown = await h.resetPassword(makeCtx(validReset)).catch((e) => e)
    expect((thrown as { message?: string }).message).toBe("RESET_TOKEN_INVALID")
    expect(h.originalResetPassword).not.toHaveBeenCalled()
  })

  it("does NOT mislabel a non-token stock failure as RESET_TOKEN_INVALID (→ RESET_FAILED, logged)", async () => {
    const originalResetPassword = jest.fn(async () => {
      throw new Error("Database connection lost")
    })
    const h = buildHarness({
      userByToken: { id: 9, resetPasswordTokenExpiresAt: null },
      originalResetPassword,
    })

    const thrown = await h.resetPassword(makeCtx(validReset)).catch((e) => e)
    expect((thrown as { message?: string }).message).toBe("RESET_FAILED")
    expect(h.logError).toHaveBeenCalled()
  })
})

describe("users-permissions wrapped jwt.verify (session invalidation, unit)", () => {
  afterEach(() => {
    delete (global as any).strapi
  })

  function verifierFor(opts: HarnessOpts) {
    const h = buildHarness(opts)
    const service = h.jwtFactory({})
    return { verify: service.verify, findOne: h.findOne }
  }

  it("rejects a token whose iat predates passwordChangedAt (stale → throws)", async () => {
    const boundary = new Date(2_000_000 * 1000).toISOString() // boundarySec = 2_000_000
    const { verify } = verifierFor({
      baseVerify: jest.fn(async () => ({ id: 1, iat: 1_999_999 })),
      userById: { id: 1, passwordChangedAt: boundary },
    })

    await expect(verify("stale")).rejects.toThrow("Invalid token.")
  })

  it("passes a token issued in the SAME second as the boundary (iat === boundarySec)", async () => {
    const boundary = new Date(2_000_000 * 1000).toISOString()
    const { verify } = verifierFor({
      baseVerify: jest.fn(async () => ({ id: 1, iat: 2_000_000 })),
      userById: { id: 1, passwordChangedAt: boundary },
    })

    await expect(verify("fresh")).resolves.toMatchObject({ iat: 2_000_000 })
  })

  it("passes when passwordChangedAt is unset (un-reset user, no-op)", async () => {
    const { verify } = verifierFor({
      baseVerify: jest.fn(async () => ({ id: 1, iat: 100 })),
      userById: { id: 1, passwordChangedAt: null },
    })

    await expect(verify("tok")).resolves.toMatchObject({ id: 1, iat: 100 })
  })

  it("is a no-op when the payload lacks id or iat", async () => {
    const { verify, findOne } = verifierFor({
      baseVerify: jest.fn(async () => ({ id: 1 })), // no iat
    })

    await expect(verify("tok")).resolves.toMatchObject({ id: 1 })
    expect(findOne).not.toHaveBeenCalled()
  })

  it("fails open (passes) when the user lookup throws", async () => {
    const { verify } = verifierFor({
      baseVerify: jest.fn(async () => ({ id: 1, iat: 100 })),
      findOneImpl: () => {
        throw new Error("db down")
      },
    })

    await expect(verify("tok")).resolves.toMatchObject({ id: 1, iat: 100 })
  })

  it("fails open (passes) when passwordChangedAt is an unparseable value (no NaN fail-open trap)", async () => {
    const { verify } = verifierFor({
      baseVerify: jest.fn(async () => ({ id: 1, iat: 100 })),
      userById: { id: 1, passwordChangedAt: "not-a-date" },
    })

    // new Date("not-a-date").getTime() is NaN; the finite-guard must let the
    // token through rather than silently never-reject (iat < NaN is false anyway,
    // but the guard makes the intent explicit and robust).
    await expect(verify("tok")).resolves.toMatchObject({ id: 1, iat: 100 })
  })
})

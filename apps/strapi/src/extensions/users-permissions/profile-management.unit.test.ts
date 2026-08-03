/**
 * Unit tests for the Story 4.4 users-permissions profile-management overrides
 * (mocked Strapi — no DB, no boot). Part of the must-pass unit gate.
 *
 * Covers the I/O matrix from the spec:
 *  - user.updateMe: self-scoped write (ALWAYS `ctx.state.user.id`, never a body
 *    id); whitelist-only (forbidden `email`/`role`/`confirmed` stripped); empty
 *    name → NAME_REQUIRED; username unique violation → USERNAME_TAKEN;
 *    unauthenticated → 401.
 *  - auth.changeEmail: free address → staged token+expiry+pendingEmail + email
 *    sent to the NEW address + `{ ok: true }`; taken → EMAIL_TAKEN; same as
 *    current → EMAIL_UNCHANGED; invalid email → INVALID_EMAIL; send failure →
 *    still `{ ok: true }` (logged); CLIENT_EMAIL_CHANGE_URL unset → warn, no
 *    email, still staged.
 *  - auth.confirmEmailChange: valid → email=pendingEmail + staging cleared +
 *    `{ ok: true }`; expired (incl. exact `==` boundary) → TOKEN_EXPIRED;
 *    unknown/used/empty → TOKEN_INVALID; pending taken meanwhile → EMAIL_TAKEN.
 */
import profileExtension from "./strapi-server"

interface MockCtx {
  state?: { user?: Record<string, unknown>; auth?: unknown }
  request: { body: Record<string, unknown> }
  body?: unknown
  unauthorized: jest.Mock
}

interface HarnessOpts {
  userByEmail?: Record<string, unknown> | null
  userByToken?: Record<string, unknown> | null
  findOneImpl?: (args: { where: Record<string, unknown> }) => unknown
  emailSend?: jest.Mock
  userEdit?: jest.Mock
  seedRoutes?: unknown[]
}

function buildHarness(opts: HarnessOpts = {}) {
  const userEdit = opts.userEdit ?? jest.fn(async () => ({ id: 1 }))
  const emailSend = opts.emailSend ?? jest.fn(async () => undefined)
  const logError = jest.fn()
  const logWarn = jest.fn()

  const findOne =
    opts.findOneImpl != null
      ? jest.fn(async (args: { where: Record<string, unknown> }) =>
          opts.findOneImpl!(args)
        )
      : jest.fn(async ({ where }: { where: Record<string, unknown> }) => {
          if (where.emailChangeToken !== undefined)
            return opts.userByToken ?? null
          if (where.email !== undefined) return opts.userByEmail ?? null
          return null
        })

  const services: Record<string, unknown> = {
    user: { edit: userEdit },
  }

  const sanitizeOutput = jest.fn(async (user: Record<string, unknown>) => user)

  const mockStrapi = {
    plugin: jest.fn(() => ({
      service: jest.fn((name: string) => services[name]),
    })),
    plugins: { email: { services: { email: { send: emailSend } } } },
    db: { query: jest.fn(() => ({ findOne })) },
    getModel: jest.fn(() => ({})),
    contentAPI: { sanitize: { output: sanitizeOutput } },
    log: { error: logError, warn: logWarn, info: jest.fn() },
  }

  ;(global as any).strapi = mockStrapi

  const plugin = {
    controllers: {
      auth: {
        register: jest.fn(async () => undefined),
        callback: jest.fn(async () => undefined),
        forgotPassword: jest.fn(async () => undefined),
        resetPassword: jest.fn(async () => undefined),
      },
      user: {},
    },
    services: {
      jwt: jest.fn(() => ({ verify: jest.fn() })),
    },
    routes: {
      "content-api": { routes: [...(opts.seedRoutes ?? [])] as unknown[] },
    },
  }

  const wrapped = profileExtension(plugin as any)

  return {
    updateMe: wrapped.controllers.user!.updateMe!,
    changeEmail: wrapped.controllers.auth.changeEmail!,
    confirmEmailChange: wrapped.controllers.auth.confirmEmailChange!,
    routes: plugin.routes["content-api"].routes,
    userEdit,
    emailSend,
    findOne,
    logError,
    logWarn,
    sanitizeOutput,
  }
}

function makeCtx(
  body: Record<string, unknown>,
  user?: Record<string, unknown>
): MockCtx {
  return {
    state: user ? { user, auth: {} } : { auth: {} },
    request: { body: { ...body } },
    unauthorized: jest.fn(() => "UNAUTHORIZED"),
  }
}

/** Extract the per-field codes from a thrown Strapi ValidationError. */
function codesOf(err: unknown): string[] {
  const details = (err as { details?: { issues?: { message: string }[] } })
    .details
  return (details?.issues ?? []).map((i) => i.message)
}

const CHANGE_URL = "https://tiween.localhost:1355/auth/change-email"

describe("users-permissions user.updateMe (self-scoped, unit)", () => {
  afterEach(() => {
    delete (global as any).strapi
    jest.restoreAllMocks()
  })

  it("writes ONLY whitelisted fields to ctx.state.user.id and returns the sanitized user", async () => {
    const h = buildHarness({
      userEdit: jest.fn(async () => ({ id: 7, username: "grace" })),
    })
    const ctx = makeCtx(
      {
        username: "grace",
        preferredLanguage: "en",
        defaultRegion: "region-doc-1",
        avatar: 99,
      },
      { id: 7, email: "grace@example.com" }
    )

    await h.updateMe(ctx)

    expect(h.userEdit).toHaveBeenCalledTimes(1)
    expect(h.userEdit).toHaveBeenCalledWith(7, {
      username: "grace",
      preferredLanguage: "en",
      defaultRegion: "region-doc-1",
      avatar: 99,
    })
    expect(h.sanitizeOutput).toHaveBeenCalledTimes(1)
    expect(ctx.body).toEqual({ id: 7, username: "grace" })
  })

  it("strips forbidden fields (email/role/confirmed/blocked) — only the whitelist is written", async () => {
    const h = buildHarness()
    const ctx = makeCtx(
      {
        username: "grace",
        email: "attacker@example.com",
        role: 1,
        confirmed: true,
        blocked: false,
        password: "hacked",
        resetPasswordToken: "x",
        passwordChangedAt: "2020-01-01",
        pendingEmail: "evil@example.com",
      },
      { id: 7, email: "grace@example.com" }
    )

    await h.updateMe(ctx)

    expect(h.userEdit).toHaveBeenCalledWith(7, { username: "grace" })
    const patch = h.userEdit.mock.calls[0][1]
    expect(patch).not.toHaveProperty("email")
    expect(patch).not.toHaveProperty("role")
    expect(patch).not.toHaveProperty("confirmed")
    expect(patch).not.toHaveProperty("blocked")
    expect(patch).not.toHaveProperty("password")
    expect(patch).not.toHaveProperty("resetPasswordToken")
    expect(patch).not.toHaveProperty("passwordChangedAt")
    expect(patch).not.toHaveProperty("pendingEmail")
  })

  it("ignores any id in the body — always targets ctx.state.user.id (self-scope)", async () => {
    const h = buildHarness()
    const ctx = makeCtx(
      { id: 999, documentId: "other-doc", username: "grace" },
      { id: 7, email: "grace@example.com" }
    )

    await h.updateMe(ctx)

    expect(h.userEdit).toHaveBeenCalledWith(7, { username: "grace" })
  })

  it("persists emailNotificationsEnabled:false (and still strips forbidden fields)", async () => {
    const h = buildHarness()
    const ctx = makeCtx(
      {
        emailNotificationsEnabled: false,
        email: "attacker@example.com",
        role: 1,
        confirmed: true,
      },
      { id: 7, email: "grace@example.com" }
    )

    await h.updateMe(ctx)

    expect(h.userEdit).toHaveBeenCalledWith(7, {
      emailNotificationsEnabled: false,
    })
    const patch = h.userEdit.mock.calls[0][1]
    expect(patch).not.toHaveProperty("email")
    expect(patch).not.toHaveProperty("role")
    expect(patch).not.toHaveProperty("confirmed")
  })

  it("writes only the provided fields (a partial save never blanks untouched ones)", async () => {
    const h = buildHarness()
    const ctx = makeCtx(
      { preferredLanguage: "ar" },
      { id: 7, email: "grace@example.com" }
    )

    await h.updateMe(ctx)

    expect(h.userEdit).toHaveBeenCalledWith(7, { preferredLanguage: "ar" })
  })

  it("rejects an empty / whitespace name with NAME_REQUIRED and does not write", async () => {
    const h = buildHarness()
    const thrown = await h
      .updateMe(
        makeCtx({ username: "   " }, { id: 7, email: "grace@example.com" })
      )
      .catch((e) => e)

    expect(codesOf(thrown)).toContain("NAME_REQUIRED")
    expect(h.userEdit).not.toHaveBeenCalled()
  })

  it("maps a username unique-constraint violation to USERNAME_TAKEN", async () => {
    const h = buildHarness({
      userEdit: jest.fn(async () => {
        throw new Error("This attribute must be unique")
      }),
    })

    const thrown = await h
      .updateMe(
        makeCtx({ username: "taken" }, { id: 7, email: "grace@example.com" })
      )
      .catch((e) => e)

    expect((thrown as { message?: string }).message).toBe("USERNAME_TAKEN")
  })

  it("returns 401 when there is no authenticated user", async () => {
    const h = buildHarness()
    const ctx = makeCtx({ username: "grace" }) // no user on state

    const result = await h.updateMe(ctx)

    expect(ctx.unauthorized).toHaveBeenCalledTimes(1)
    expect(result).toBe("UNAUTHORIZED")
    expect(h.userEdit).not.toHaveBeenCalled()
  })
})

describe("users-permissions auth.changeEmail (unit)", () => {
  beforeEach(() => {
    process.env.CLIENT_EMAIL_CHANGE_URL = CHANGE_URL
    delete process.env.RESET_TOKEN_TTL_MS
  })
  afterEach(() => {
    delete (global as any).strapi
    delete process.env.CLIENT_EMAIL_CHANGE_URL
    delete process.env.RESET_TOKEN_TTL_MS
    jest.restoreAllMocks()
  })

  it("stages pendingEmail + token + expiry and emails the NEW address for a free email", async () => {
    const before = Date.now()
    const h = buildHarness({ userByEmail: null })
    const ctx = makeCtx(
      { email: "new@example.com" },
      {
        id: 7,
        email: "old@example.com",
        firstName: "Grace",
        preferredLanguage: "fr",
      }
    )

    await h.changeEmail(ctx)

    expect(ctx.body).toEqual({ ok: true })
    expect(h.userEdit).toHaveBeenCalledTimes(1)
    const [id, patch] = h.userEdit.mock.calls[0]
    expect(id).toBe(7)
    expect(patch.pendingEmail).toBe("new@example.com")
    expect(typeof patch.emailChangeToken).toBe("string")
    expect(patch.emailChangeToken).toHaveLength(128) // randomBytes(64) hex
    expect(patch.emailChangeTokenExpiresAt).toBeInstanceOf(Date)
    const ttl = patch.emailChangeTokenExpiresAt.getTime() - before
    expect(ttl).toBeGreaterThanOrEqual(3_600_000 - 1000)
    expect(ttl).toBeLessThanOrEqual(3_600_000 + 5000)

    // The confirmation email is sent to the NEW address, not the live one.
    expect(h.emailSend).toHaveBeenCalledTimes(1)
    const arg = h.emailSend.mock.calls[0][0]
    expect(arg.to).toBe("new@example.com")
    expect(arg.subject).toBe("Confirmez votre nouvelle adresse e-mail Tiween")
    expect(arg.html).toContain(
      `${CHANGE_URL}?code=${patch.emailChangeToken}&amp;email=${encodeURIComponent(
        "new@example.com"
      )}`
    )
  })

  it("rejects an email already registered to another account with EMAIL_TAKEN", async () => {
    const h = buildHarness({
      userByEmail: { id: 42, email: "new@example.com" },
    })
    const thrown = await h
      .changeEmail(
        makeCtx(
          { email: "new@example.com" },
          { id: 7, email: "old@example.com" }
        )
      )
      .catch((e) => e)

    expect((thrown as { message?: string }).message).toBe("EMAIL_TAKEN")
    expect(h.userEdit).not.toHaveBeenCalled()
    expect(h.emailSend).not.toHaveBeenCalled()
  })

  it("rejects an email equal to the current one with EMAIL_UNCHANGED (case-insensitive)", async () => {
    const h = buildHarness()
    const thrown = await h
      .changeEmail(
        makeCtx(
          { email: "OLD@example.com" },
          { id: 7, email: "old@example.com" }
        )
      )
      .catch((e) => e)

    expect((thrown as { message?: string }).message).toBe("EMAIL_UNCHANGED")
    expect(h.userEdit).not.toHaveBeenCalled()
  })

  it("rejects an invalid email with INVALID_EMAIL and stages nothing", async () => {
    const h = buildHarness()
    const thrown = await h
      .changeEmail(
        makeCtx({ email: "not-an-email" }, { id: 7, email: "old@example.com" })
      )
      .catch((e) => e)

    expect(codesOf(thrown)).toContain("INVALID_EMAIL")
    expect(h.userEdit).not.toHaveBeenCalled()
  })

  it("still returns { ok: true } (staged) when the confirmation email send throws", async () => {
    const emailSend = jest.fn(async () => {
      throw new Error("brevo down")
    })
    const h = buildHarness({ userByEmail: null, emailSend })
    const ctx = makeCtx(
      { email: "new@example.com" },
      { id: 7, email: "old@example.com" }
    )

    await expect(h.changeEmail(ctx)).resolves.toBeUndefined()

    expect(ctx.body).toEqual({ ok: true })
    expect(h.userEdit).toHaveBeenCalledTimes(1)
    expect(emailSend).toHaveBeenCalledTimes(1)
    expect(h.logError).toHaveBeenCalled()
  })

  it("warns and sends no email when CLIENT_EMAIL_CHANGE_URL is unset (token still staged)", async () => {
    delete process.env.CLIENT_EMAIL_CHANGE_URL
    const h = buildHarness({ userByEmail: null })
    const ctx = makeCtx(
      { email: "new@example.com" },
      { id: 7, email: "old@example.com" }
    )

    await h.changeEmail(ctx)

    expect(ctx.body).toEqual({ ok: true })
    expect(h.userEdit).toHaveBeenCalledTimes(1)
    expect(h.emailSend).not.toHaveBeenCalled()
    expect(h.logWarn).toHaveBeenCalled()
  })

  it("returns 401 when there is no authenticated user", async () => {
    const h = buildHarness()
    const ctx = makeCtx({ email: "new@example.com" })

    await h.changeEmail(ctx)

    expect(ctx.unauthorized).toHaveBeenCalledTimes(1)
    expect(h.userEdit).not.toHaveBeenCalled()
  })
})

describe("users-permissions auth.confirmEmailChange (unit)", () => {
  afterEach(() => {
    delete (global as any).strapi
    jest.restoreAllMocks()
  })

  it("swaps email=pendingEmail, clears staging fields, returns { ok: true }", async () => {
    const h = buildHarness({
      userByToken: {
        id: 7,
        email: "old@example.com",
        pendingEmail: "new@example.com",
        emailChangeTokenExpiresAt: new Date(
          Date.now() + 3_600_000
        ).toISOString(),
      },
      userByEmail: null, // pending address still free
    })

    await h.confirmEmailChange(makeCtx({ code: "tok-123" }))

    expect(h.userEdit).toHaveBeenCalledWith(7, {
      email: "new@example.com",
      pendingEmail: null,
      emailChangeToken: null,
      emailChangeTokenExpiresAt: null,
    })
  })

  it("returns { ok: true } on success", async () => {
    const h = buildHarness({
      userByToken: {
        id: 7,
        pendingEmail: "new@example.com",
        emailChangeTokenExpiresAt: new Date(
          Date.now() + 3_600_000
        ).toISOString(),
      },
      userByEmail: null,
    })
    const ctx = makeCtx({ code: "tok-123" })

    await h.confirmEmailChange(ctx)

    expect(ctx.body).toEqual({ ok: true })
  })

  it("fails CLOSED — a token with a missing/null expiry is rejected as EXPIRED", async () => {
    const h = buildHarness({
      userByToken: {
        id: 7,
        pendingEmail: "new@example.com",
        emailChangeTokenExpiresAt: null,
      },
      userByEmail: null,
    })

    const thrown = await h
      .confirmEmailChange(makeCtx({ code: "tok-123" }))
      .catch((e) => e)

    expect((thrown as { message?: string }).message).toBe(
      "EMAIL_CHANGE_TOKEN_EXPIRED"
    )
    expect(h.userEdit).not.toHaveBeenCalled()
  })

  it("rejects an expired token with EMAIL_CHANGE_TOKEN_EXPIRED before writing", async () => {
    const h = buildHarness({
      userByToken: {
        id: 7,
        pendingEmail: "new@example.com",
        emailChangeTokenExpiresAt: new Date(Date.now() - 1000).toISOString(),
      },
    })

    const thrown = await h
      .confirmEmailChange(makeCtx({ code: "tok-123" }))
      .catch((e) => e)

    expect((thrown as { message?: string }).message).toBe(
      "EMAIL_CHANGE_TOKEN_EXPIRED"
    )
    expect(h.userEdit).not.toHaveBeenCalled()
  })

  it("rejects at the exact expiry boundary (Date.now() === expiresAt)", async () => {
    const fixed = 1_700_000_000_000
    jest.spyOn(Date, "now").mockReturnValue(fixed)
    const h = buildHarness({
      userByToken: {
        id: 7,
        pendingEmail: "new@example.com",
        emailChangeTokenExpiresAt: new Date(fixed).toISOString(),
      },
    })

    const thrown = await h
      .confirmEmailChange(makeCtx({ code: "tok-123" }))
      .catch((e) => e)

    expect((thrown as { message?: string }).message).toBe(
      "EMAIL_CHANGE_TOKEN_EXPIRED"
    )
    expect(h.userEdit).not.toHaveBeenCalled()
  })

  it("rejects an unknown / used token with EMAIL_CHANGE_TOKEN_INVALID", async () => {
    const h = buildHarness({ userByToken: null })

    const thrown = await h
      .confirmEmailChange(makeCtx({ code: "ghost" }))
      .catch((e) => e)

    expect((thrown as { message?: string }).message).toBe(
      "EMAIL_CHANGE_TOKEN_INVALID"
    )
    expect(h.userEdit).not.toHaveBeenCalled()
  })

  it("rejects a missing code with EMAIL_CHANGE_TOKEN_INVALID", async () => {
    const h = buildHarness()

    const thrown = await h.confirmEmailChange(makeCtx({})).catch((e) => e)

    expect((thrown as { message?: string }).message).toBe(
      "EMAIL_CHANGE_TOKEN_INVALID"
    )
    expect(h.findOne).not.toHaveBeenCalled()
  })

  it("rejects when the pending address was registered by someone else meanwhile → EMAIL_TAKEN", async () => {
    const h = buildHarness({
      userByToken: {
        id: 7,
        pendingEmail: "new@example.com",
        emailChangeTokenExpiresAt: new Date(
          Date.now() + 3_600_000
        ).toISOString(),
      },
      userByEmail: { id: 42, email: "new@example.com" }, // a DIFFERENT user
    })

    const thrown = await h
      .confirmEmailChange(makeCtx({ code: "tok-123" }))
      .catch((e) => e)

    expect((thrown as { message?: string }).message).toBe("EMAIL_TAKEN")
    expect(h.userEdit).not.toHaveBeenCalled()
  })

  it("maps a unique-constraint violation on the final write (TOCTOU) to EMAIL_TAKEN, not a raw 500", async () => {
    const h = buildHarness({
      userByToken: {
        id: 7,
        pendingEmail: "new@example.com",
        emailChangeTokenExpiresAt: new Date(
          Date.now() + 3_600_000
        ).toISOString(),
      },
      userByEmail: null, // pre-check passes — pending address is free at check time
      // …but the DB unique constraint fires on the write: the address was claimed
      // in the window between the pre-check and this edit.
      userEdit: jest.fn(async () => {
        throw new Error("This attribute must be unique")
      }),
    })

    const thrown = await h
      .confirmEmailChange(makeCtx({ code: "tok-123" }))
      .catch((e) => e)

    expect((thrown as { message?: string }).message).toBe("EMAIL_TAKEN")
    expect(h.userEdit).toHaveBeenCalledTimes(1)
  })
})

describe("users-permissions Story 4.4 route registration (unit)", () => {
  afterEach(() => {
    delete (global as any).strapi
  })

  it("unshifts PUT /users/me to the FRONT and appends the two /auth/* routes", () => {
    const h = buildHarness()
    const routes = h.routes as Array<{
      method: string
      path: string
      handler: string
    }>

    // `me` must be first so it is matched before the stock `:id`.
    expect(routes[0]).toMatchObject({
      method: "PUT",
      path: "/users/me",
      handler: "user.updateMe",
    })
    expect(routes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          method: "POST",
          path: "/auth/change-email",
          handler: "auth.changeEmail",
        }),
        expect.objectContaining({
          method: "POST",
          path: "/auth/confirm-email-change",
          handler: "auth.confirmEmailChange",
        }),
      ])
    )
  })

  it("registers PUT /users/me BEFORE the stock PUT /users/:id (no `:id` shadowing)", () => {
    // Seed the stock param route so ordering is actually exercised — with an
    // empty array a regression to `push(me)` would still land `me` at index 0.
    const h = buildHarness({
      seedRoutes: [
        { method: "PUT", path: "/users/:id", handler: "user.update" },
      ],
    })
    const routes = h.routes as Array<{ method: string; path: string }>
    const meIdx = routes.findIndex(
      (r) => r.method === "PUT" && r.path === "/users/me"
    )
    const idIdx = routes.findIndex(
      (r) => r.method === "PUT" && r.path === "/users/:id"
    )

    expect(meIdx).toBeGreaterThanOrEqual(0)
    expect(idIdx).toBeGreaterThanOrEqual(0)
    expect(meIdx).toBeLessThan(idIdx)
  })
})

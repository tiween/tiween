/**
 * Unit tests for the Story 4.2 users-permissions social-login callback override
 * (mocked Strapi — no DB, no boot, mocked global `fetch`). Part of the must-pass
 * unit gate.
 *
 * Covers the I/O matrix from the spec:
 *  - new social user: firstName/avatarUrl persisted + localized welcome email
 *  - repeat social login: no duplicate, no field overwrite, no re-sent email
 *  - cross-provider link: signs into the SAME existing account, provider NOT
 *    clobbered, no welcome email
 *  - welcome-email failure is non-blocking (login still succeeds)
 *  - provider with no email is rejected (no linking, no account)
 *  - non-trusted / local providers delegate to the stock controller unchanged
 *  - fetchSocialProfile parses Google userinfo + Facebook graph shapes
 */
import socialExtension, {
  fetchSocialProfile,
  TRUSTED_SOCIAL_PROVIDERS,
} from "./strapi-server"

interface MockCallbackCtx {
  params: { provider?: string }
  query: Record<string, unknown>
  state?: { auth?: unknown }
  body?: unknown
}

interface PreUser {
  id: number
  email: string
  provider: string
}

const NEW_EMAIL = "grace@social.test"
const LINK_EMAIL = "linked@social.test"

const googleProfileJson = {
  email: NEW_EMAIL,
  email_verified: true,
  name: "Grace Hopper",
  picture: "https://cdn.example/avatar.png",
}

interface Harness {
  callback: (ctx: MockCallbackCtx) => Promise<unknown>
  originalCallback: jest.Mock
  userEdit: jest.Mock
  jwtIssue: jest.Mock
  emailSend: jest.Mock
  findOne: jest.Mock
  sanitizeOutput: jest.Mock
  logError: jest.Mock
  fetchMock: jest.Mock
}

function buildHarness(
  opts: {
    preExisting?: PreUser | null
    originalCallback?: jest.Mock
    emailSend?: jest.Mock
    profileJson?: unknown
    fetchOk?: boolean
  } = {}
): Harness {
  const preExisting = opts.preExisting ?? null
  const userEdit = jest.fn(async () => undefined)
  const jwtIssue = jest.fn(() => "linked-jwt")
  const emailSend = opts.emailSend ?? jest.fn(async () => undefined)
  const findOne = jest.fn(async () => preExisting)
  // Mirror the stock sanitizeUser: return a shaped copy of the user.
  const sanitizeOutput = jest.fn(async (user: Record<string, unknown>) => ({
    id: user.id,
    email: user.email,
    provider: user.provider,
  }))
  const logError = jest.fn()

  // Stock callback: on a brand-new social account it creates + sets ctx.body.
  const originalCallback =
    opts.originalCallback ??
    jest.fn(async (ctx: MockCallbackCtx) => {
      ctx.body = {
        jwt: "new-jwt",
        user: { id: 7, email: NEW_EMAIL, preferredLanguage: "fr" },
      }
    })

  const services: Record<string, unknown> = {
    user: { edit: userEdit },
    jwt: { issue: jwtIssue },
  }

  const mockStrapi = {
    plugin: jest.fn(() => ({
      service: jest.fn((name: string) => services[name]),
    })),
    plugins: { email: { services: { email: { send: emailSend } } } },
    db: { query: jest.fn(() => ({ findOne })) },
    getModel: jest.fn(() => ({})),
    contentAPI: { sanitize: { output: sanitizeOutput } },
    log: { error: logError, info: jest.fn() },
  }

  ;(global as any).strapi = mockStrapi

  const fetchMock = jest.fn(async () => ({
    ok: opts.fetchOk ?? true,
    json: async () => opts.profileJson ?? googleProfileJson,
  }))

  ;(global as any).fetch = fetchMock

  const plugin = {
    controllers: {
      auth: {
        register: jest.fn(async () => undefined),
        callback: originalCallback,
      },
    },
  }

  const wrapped = socialExtension(plugin)

  return {
    callback: wrapped.controllers.auth.callback,
    originalCallback,
    userEdit,
    jwtIssue,
    emailSend,
    findOne,
    sanitizeOutput,
    logError,
    fetchMock,
  }
}

function makeCtx(
  provider: string,
  query: Record<string, unknown> = { access_token: "tok" }
): MockCallbackCtx {
  return { params: { provider }, query, state: { auth: {} } }
}

describe("users-permissions social-login callback override (unit)", () => {
  afterEach(() => {
    delete (global as any).strapi

    delete (global as any).fetch
  })

  it("exposes the trusted providers set", () => {
    expect(TRUSTED_SOCIAL_PROVIDERS.has("google")).toBe(true)
    expect(TRUSTED_SOCIAL_PROVIDERS.has("facebook")).toBe(true)
    expect(TRUSTED_SOCIAL_PROVIDERS.has("local")).toBe(false)
  })

  it("new Google user: persists firstName+avatarUrl and sends a welcome email", async () => {
    const h = buildHarness({ preExisting: null })
    const ctx = makeCtx("google")

    await h.callback(ctx)

    expect(h.originalCallback).toHaveBeenCalledTimes(1)
    // Enrichment persisted via the user service.
    expect(h.userEdit).toHaveBeenCalledWith(7, {
      firstName: "Grace Hopper",
      avatarUrl: "https://cdn.example/avatar.png",
    })
    // Response reflects the enriched fields; JWT preserved for auto-login.
    expect(ctx.body).toMatchObject({
      jwt: "new-jwt",
      user: {
        id: 7,
        firstName: "Grace Hopper",
        avatarUrl: "https://cdn.example/avatar.png",
      },
    })
    // Welcome email queued (defaults to FR — no request locale for OAuth).
    expect(h.emailSend).toHaveBeenCalledTimes(1)
    const arg = h.emailSend.mock.calls[0][0]
    expect(arg.to).toBe(NEW_EMAIL)
    expect(arg.subject).toBe("Bienvenue sur Tiween")
    expect(arg.html).toContain("Grace Hopper")
  })

  it("repeat social login: no duplicate, no field overwrite, no re-sent email", async () => {
    // Same-provider repeat login: the stock controller returns the existing user.
    const existing: PreUser = {
      id: 7,
      email: NEW_EMAIL,
      provider: "google",
    }
    const originalCallback = jest.fn(async (ctx: MockCallbackCtx) => {
      ctx.body = { jwt: "repeat-jwt", user: { id: 7, email: NEW_EMAIL } }
    })
    const h = buildHarness({ preExisting: existing, originalCallback })

    const ctx = makeCtx("google")
    await h.callback(ctx)

    expect(h.originalCallback).toHaveBeenCalledTimes(1)
    // Pre-existing account → no enrichment edit, no welcome email.
    expect(h.userEdit).not.toHaveBeenCalled()
    expect(h.emailSend).not.toHaveBeenCalled()
    expect(ctx.body).toMatchObject({ jwt: "repeat-jwt", user: { id: 7 } })
  })

  it("cross-provider link: signs into the existing account, provider unchanged, no email", async () => {
    const existing: PreUser = {
      id: 99,
      email: LINK_EMAIL,
      provider: "local",
    }
    // Stock rejects a same-email/different-provider login.
    const originalCallback = jest.fn(async () => {
      throw new Error("Email is already taken")
    })
    const h = buildHarness({
      preExisting: existing,
      originalCallback,
      profileJson: {
        email: LINK_EMAIL,
        email_verified: true,
        name: "Ada",
        picture: "x",
      },
    })

    const ctx = makeCtx("google")
    await h.callback(ctx)

    // Linked: JWT issued for the EXISTING account.
    expect(h.jwtIssue).toHaveBeenCalledWith({ id: 99 })
    expect(ctx.body).toMatchObject({
      jwt: "linked-jwt",
      user: { id: 99, provider: "local" },
    })
    // Never overwrite the existing user's provider, never re-email.
    expect(h.userEdit).not.toHaveBeenCalled()
    expect(h.emailSend).not.toHaveBeenCalled()
  })

  it("does NOT link when the provider email is unverified (account-takeover guard)", async () => {
    const existing: PreUser = { id: 42, email: LINK_EMAIL, provider: "local" }
    const originalCallback = jest.fn(async () => {
      throw new Error("Email is already taken")
    })
    const h = buildHarness({
      preExisting: existing,
      originalCallback,
      // email present but NOT verified by the provider
      profileJson: { email: LINK_EMAIL, email_verified: false, name: "Ada" },
    })

    await expect(h.callback(makeCtx("google"))).rejects.toThrow(
      /already taken/i
    )
    // No JWT for the existing account — linking is refused for unverified email.
    expect(h.jwtIssue).not.toHaveBeenCalled()
    expect(h.userEdit).not.toHaveBeenCalled()
    expect(h.emailSend).not.toHaveBeenCalled()
  })

  it("does NOT let a BLOCKED account be linked/signed-in via the social path", async () => {
    // Admin-blocked user exists under a different provider; stock rejects the
    // cross-provider login, and the linking branch must honor the block.
    const blocked: PreUser & { blocked: boolean } = {
      id: 77,
      email: LINK_EMAIL,
      provider: "local",
      blocked: true,
    }
    const originalCallback = jest.fn(async () => {
      throw new Error("Email is already taken")
    })
    const h = buildHarness({
      preExisting: blocked,
      originalCallback,
      profileJson: { email: LINK_EMAIL, email_verified: true, name: "Ada" },
    })

    await expect(h.callback(makeCtx("google"))).rejects.toThrow(
      /already taken/i
    )
    expect(h.jwtIssue).not.toHaveBeenCalled()
    expect(h.emailSend).not.toHaveBeenCalled()
  })

  it("repeat login with a failed profile fetch does NOT overwrite data or re-send email", async () => {
    // Existing google user logs in again, but the provider profile fetch fails
    // (no email resolved). Enrichment must be skipped — no null overwrite, no email.
    const originalCallback = jest.fn(async (ctx: MockCallbackCtx) => {
      ctx.body = {
        jwt: "repeat-jwt",
        user: { id: 7, email: NEW_EMAIL, firstName: "Existing Name" },
      }
    })
    const h = buildHarness({
      preExisting: { id: 7, email: NEW_EMAIL, provider: "google" },
      originalCallback,
      fetchOk: false, // fetchSocialProfile → null email
    })

    const ctx = makeCtx("google")
    await h.callback(ctx)

    expect(h.originalCallback).toHaveBeenCalledTimes(1)
    // Repeat login still succeeds, but no enrichment and no welcome email.
    expect(h.userEdit).not.toHaveBeenCalled()
    expect(h.emailSend).not.toHaveBeenCalled()
    expect(ctx.body).toMatchObject({
      jwt: "repeat-jwt",
      user: { id: 7, firstName: "Existing Name" },
    })
  })

  it("welcome-email failure is non-blocking (new-user login still succeeds)", async () => {
    const emailSend = jest.fn(async () => {
      throw new Error("brevo down")
    })
    const h = buildHarness({ preExisting: null, emailSend })

    const ctx = makeCtx("google")
    await expect(h.callback(ctx)).resolves.toBeUndefined()

    expect(h.userEdit).toHaveBeenCalledTimes(1)
    expect(emailSend).toHaveBeenCalledTimes(1)
    expect(h.logError).toHaveBeenCalled()
    // Login response is intact.
    expect(ctx.body).toMatchObject({ jwt: "new-jwt", user: { id: 7 } })
  })

  it("rejects when the provider yields no email and no pre-existing account", async () => {
    const originalCallback = jest.fn(async () => {
      throw new Error("Email was not available.")
    })
    const h = buildHarness({
      preExisting: null,
      originalCallback,
      profileJson: { name: "No Email" },
    })

    await expect(h.callback(makeCtx("google"))).rejects.toThrow(
      /not available/i
    )
    expect(h.userEdit).not.toHaveBeenCalled()
    expect(h.emailSend).not.toHaveBeenCalled()
    expect(h.jwtIssue).not.toHaveBeenCalled()
  })

  it("non-trusted provider delegates to the stock controller unchanged", async () => {
    const originalCallback = jest.fn(async (ctx: MockCallbackCtx) => {
      ctx.body = { jwt: "local-jwt", user: { id: 1 } }
    })
    const h = buildHarness({ originalCallback })

    const ctx = makeCtx("local")
    await h.callback(ctx)

    expect(h.originalCallback).toHaveBeenCalledTimes(1)
    // No profile fetch, no email lookup, no enrichment for non-trusted paths.
    expect(h.fetchMock).not.toHaveBeenCalled()
    expect(h.findOne).not.toHaveBeenCalled()
    expect(h.userEdit).not.toHaveBeenCalled()
    expect(h.emailSend).not.toHaveBeenCalled()
    expect(ctx.body).toMatchObject({ jwt: "local-jwt", user: { id: 1 } })
  })

  it("re-throws a non-linking error even when a pre-existing account is found", async () => {
    const existing: PreUser = { id: 5, email: NEW_EMAIL, provider: "local" }
    const originalCallback = jest.fn(async () => {
      throw new Error("Your account has been blocked by an administrator")
    })
    const h = buildHarness({ preExisting: existing, originalCallback })

    await expect(h.callback(makeCtx("google"))).rejects.toThrow(/blocked/i)
    expect(h.jwtIssue).not.toHaveBeenCalled()
  })
})

describe("fetchSocialProfile (unit)", () => {
  afterEach(() => {
    delete (global as any).fetch

    delete (global as any).strapi
  })

  function mockFetch(ok: boolean, json: unknown): jest.Mock {
    const fetchMock = jest.fn(async () => ({ ok, json: async () => json }))

    ;(global as any).fetch = fetchMock
    ;(global as any).strapi = { log: { error: jest.fn() } }
    return fetchMock
  }

  it("parses the Google userinfo shape (Bearer token, verified flag → picture string)", async () => {
    const fetchMock = mockFetch(true, {
      email: "g@x.test",
      email_verified: true,
      name: "G User",
      picture: "https://g/pic.png",
    })

    const profile = await fetchSocialProfile("google", "tok-123")

    expect(profile).toEqual({
      email: "g@x.test",
      emailVerified: true,
      name: "G User",
      avatarUrl: "https://g/pic.png",
    })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain("googleapis.com/oauth2/v3/userinfo")
    expect(init.headers.Authorization).toBe("Bearer tok-123")
  })

  it("marks a Google email unverified when email_verified is absent/false", async () => {
    mockFetch(true, { email: "g@x.test", name: "G", picture: "p" })
    const profile = await fetchSocialProfile("google", "tok")
    expect(profile.emailVerified).toBe(false)
  })

  it("parses the Facebook graph shape (picture.data.url, always verified)", async () => {
    const fetchMock = mockFetch(true, {
      email: "f@x.test",
      name: "F User",
      picture: { data: { url: "https://f/pic.png" } },
    })

    const profile = await fetchSocialProfile("facebook", "tok-abc")

    expect(profile).toEqual({
      email: "f@x.test",
      emailVerified: true,
      name: "F User",
      avatarUrl: "https://f/pic.png",
    })
    const [url] = fetchMock.mock.calls[0]
    expect(url).toContain("graph.facebook.com/me")
    expect(url).toContain("access_token=tok-abc")
  })

  it("returns an empty (unverified) profile — never throws — on a non-ok response", async () => {
    mockFetch(false, {})
    const profile = await fetchSocialProfile("google", "tok")
    expect(profile).toEqual({
      email: null,
      emailVerified: false,
      name: null,
      avatarUrl: null,
    })
  })

  it("returns an empty profile — never throws — when fetch itself rejects", async () => {
    ;(global as any).fetch = jest.fn(async () => {
      throw new Error("network down")
    })
    ;(global as any).strapi = { log: { error: jest.fn() } }

    const profile = await fetchSocialProfile("google", "tok")
    expect(profile).toEqual({
      email: null,
      emailVerified: false,
      name: null,
      avatarUrl: null,
    })
  })

  it("returns an empty profile for an unrecognized provider (no fetch)", async () => {
    const fetchMock = mockFetch(true, {})
    const profile = await fetchSocialProfile("twitter", "tok")
    expect(profile).toEqual({
      email: null,
      emailVerified: false,
      name: null,
      avatarUrl: null,
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

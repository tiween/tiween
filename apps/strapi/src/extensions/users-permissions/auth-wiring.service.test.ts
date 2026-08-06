/**
 * Story 4.7 boot + behavior-activation verification (integration — boots a
 * real Strapi against SQLite via tests/helpers/strapi; opt-in, not part of
 * the default unit gate). Run it via the self-contained script, which first
 * refreshes dist/ with the transpile-tolerant build:
 *
 *   yarn test:integration
 *
 * Verifies, against a BOOTING instance (AC #4, #7):
 *  - Strapi boots with the extension applied — pre-4.7 the two appended
 *    `auth.changeEmail` / `auth.confirmEmailChange` routes hard-failed boot
 *    with "Handler not found", so `setupStrapi()` resolving at all is the
 *    boot-level regression guard;
 *  - each of the six overridden handlers actually EXECUTES at runtime, probed
 *    through effects only the OVERRIDE produces (the stock handlers never
 *    persist `firstName`, never stamp `resetPasswordTokenExpiresAt` /
 *    `passwordChangedAt`, never fetch the Google userinfo profile, and know
 *    nothing of `pendingEmail` / `emailChangeToken`).
 *
 * The welcome / reset / change-email SENDS go through the real email plugin;
 * in the test env the provider is unconfigured, so sends fail and MUST be
 * swallowed (non-blocking by design) — the 200s below also verify that.
 */
import request from "supertest"

import type { Core } from "@strapi/strapi"

import { cleanupStrapi, setupStrapi } from "../../../tests/helpers/strapi"

jest.setTimeout(180_000)

let strapi: Core.Strapi

const api = () => request(strapi.server.httpServer)

// Unique per-run suffix (computed once at module load) so re-running the
// suite against a persisted .tmp/test.db never collides with the users
// created by a previous run ("Email is already taken").
const RUN_SUFFIX = `${process.pid}-${Date.now()}`
const testEmail = (name: string) => `${name}-${RUN_SUFFIX}@story47.test`

const q = (uid: string) => (strapi as any).db.query(uid)

/** Enable a users-permissions content-api action for a role (test-only). */
async function enablePermission(
  roleType: "public" | "authenticated",
  action: string
): Promise<void> {
  const role = await q("plugin::users-permissions.role").findOne({
    where: { type: roleType },
  })
  if (!role) throw new Error(`role ${roleType} not found`)
  const existing = await q("plugin::users-permissions.permission").findOne({
    where: { action, role: role.id },
  })
  if (!existing) {
    await q("plugin::users-permissions.permission").create({
      data: { action, role: role.id },
    })
  }
}

beforeAll(async () => {
  strapi = await setupStrapi()
  // The three Story-4.4 routes are custom, so they carry no default grants.
  await enablePermission(
    "authenticated",
    "plugin::users-permissions.auth.changeEmail"
  )
  await enablePermission(
    "public",
    "plugin::users-permissions.auth.confirmEmailChange"
  )
})

afterAll(async () => {
  await cleanupStrapi()
})

describe("Story 4.7: auth overrides run at runtime (booted Strapi)", () => {
  it("boots with no 'Handler not found' — the appended /auth routes resolve", async () => {
    // Reaching here means load()+mount() succeeded (pre-4.7: hard boot fail).
    // Both appended routes must resolve to a handler: anything but 404/405.
    const change = await api().post("/api/auth/change-email").send({})
    expect(change.status).not.toBe(404)
    expect(change.status).not.toBe(405)

    const confirm = await api().post("/api/auth/confirm-email-change").send({})
    expect(confirm.status).not.toBe(404)
    expect(confirm.status).not.toBe(405)
  })

  it("register (4.1): validates with stable codes and persists firstName", async () => {
    // Override-only behavior 1: the project password policy (stock accepts
    // any >=6-char password; only the override rejects with a stable code).
    const weakEmail = testEmail("weak-pass")
    const weak = await api().post("/api/auth/local/register").send({
      username: weakEmail,
      email: weakEmail,
      password: "weakpass",
      firstName: "Weak",
    })
    expect(weak.status).toBe(400)
    expect(JSON.stringify(weak.body)).toContain("PASSWORD_NO_UPPERCASE")

    // Override-only behavior 2: firstName persistence + JWT preserved.
    const email = testEmail("ada-register")
    const res = await api().post("/api/auth/local/register").send({
      username: email,
      email,
      password: "Password1",
      firstName: "Ada",
      locale: "en",
    })
    expect(res.status).toBe(200)
    expect(res.body.jwt).toBeTruthy()
    expect(res.body.user?.firstName).toBe("Ada")

    const dbUser = await q("plugin::users-permissions.user").findOne({
      where: { email },
    })
    expect(dbUser).toBeTruthy()
    expect(dbUser.firstName).toBe("Ada")
  })

  it("social callback (4.2): the override executes (provider profile fetch runs)", async () => {
    // The override fetches the Google userinfo profile BEFORE delegating; the
    // stock controller never calls that endpoint this way. A spied global
    // fetch therefore discriminates override-ran from stock-ran.
    const realFetch = global.fetch
    const fetchSpy = jest.fn(async () => ({
      ok: false,
      json: async () => ({}),
    }))
    ;(global as any).fetch = fetchSpy
    try {
      const res = await api().get(
        "/api/auth/google/callback?access_token=not-a-real-token"
      )
      // Google grant is disabled in the pristine test store, so the DELEGATED
      // stock controller rejects — but only after our override ran.
      expect(res.status).toBeGreaterThanOrEqual(400)
      // Other machinery may also hit global fetch during the request — only
      // the Google userinfo call discriminates the override, so filter for it.
      const userinfoCalls = fetchSpy.mock.calls.filter((call) =>
        String(call[0] ?? "").includes("googleapis.com/oauth2/v3/userinfo")
      )
      expect(userinfoCalls).toHaveLength(1)
    } finally {
      ;(global as any).fetch = realFetch
    }
  })

  it("forgotPassword (4.3): mints a 128-hex token WITH expiry (stock sets none)", async () => {
    const email = testEmail("grace-forgot")
    await api().post("/api/auth/local/register").send({
      username: email,
      email,
      password: "Password1",
      firstName: "Grace",
    })

    const res = await api()
      .post("/api/auth/forgot-password")
      .send({ email, locale: "fr" })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })

    const user = await q("plugin::users-permissions.user").findOne({
      where: { email },
    })
    expect(user).toBeTruthy()
    expect(typeof user.resetPasswordToken).toBe("string")
    expect(user.resetPasswordToken).toHaveLength(128)
    // The EXPIRY is override-only: stock forgotPassword never stamps it.
    expect(user.resetPasswordTokenExpiresAt).toBeTruthy()
  })

  it("resetPassword (4.3): enforces the password policy, then stamps passwordChangedAt", async () => {
    const email = testEmail("resa-reset")
    await api().post("/api/auth/local/register").send({
      username: email,
      email,
      password: "Password1",
      firstName: "Resa",
    })
    await api().post("/api/auth/forgot-password").send({ email })
    const staged = await q("plugin::users-permissions.user").findOne({
      where: { email },
    })
    expect(staged).toBeTruthy()
    // Fail HERE if forgot-password silently no-opped (blocked user, send
    // failure…) instead of misattributing a null code to the policy branch.
    expect(staged.resetPasswordToken).toBeTruthy()
    const code = staged.resetPasswordToken

    // Override-only: policy rejection with a stable code (stock: >=6 chars).
    const weak = await api().post("/api/auth/reset-password").send({
      code,
      password: "weakpass",
      passwordConfirmation: "weakpass",
    })
    expect(weak.status).toBe(400)
    expect(JSON.stringify(weak.body)).toContain("PASSWORD_NO_UPPERCASE")

    const ok = await api().post("/api/auth/reset-password").send({
      code,
      password: "Password2",
      passwordConfirmation: "Password2",
    })
    expect(ok.status).toBe(200)
    expect(ok.body.jwt).toBeTruthy()

    const after = await q("plugin::users-permissions.user").findOne({
      where: { email },
    })
    expect(after).toBeTruthy()
    // Override-only: the session-invalidation boundary stamp.
    expect(after.passwordChangedAt).toBeTruthy()
    expect(after.resetPasswordToken).toBeNull()
  })

  it("changeEmail + confirmEmailChange (4.4): stages, then swaps the address", async () => {
    const email = testEmail("carol-change")
    const reg = await api().post("/api/auth/local/register").send({
      username: email,
      email,
      password: "Password1",
      firstName: "Carol",
    })
    expect(reg.status).toBe(200)
    const jwt = reg.body.jwt

    const newEmail = testEmail("carol-new")
    const change = await api()
      .post("/api/auth/change-email")
      .set("Authorization", `Bearer ${jwt}`)
      .send({ email: newEmail })
    expect(change.status).toBe(200)
    expect(change.body).toEqual({ ok: true })

    const staged = await q("plugin::users-permissions.user").findOne({
      where: { email },
    })
    expect(staged).toBeTruthy()
    expect(staged.pendingEmail).toBe(newEmail)
    expect(typeof staged.emailChangeToken).toBe("string")
    expect(staged.emailChangeToken).toHaveLength(128)
    expect(staged.emailChangeTokenExpiresAt).toBeTruthy()

    const confirm = await api()
      .post("/api/auth/confirm-email-change")
      .send({ code: staged.emailChangeToken })
    expect(confirm.status).toBe(200)
    expect(confirm.body).toEqual({ ok: true })

    const after = await q("plugin::users-permissions.user").findOne({
      where: { email: newEmail },
    })
    expect(after).toBeTruthy()
    expect(after.pendingEmail).toBeNull()
    expect(after.emailChangeToken).toBeNull()
    expect(after.emailChangeTokenExpiresAt).toBeNull()
  })
})

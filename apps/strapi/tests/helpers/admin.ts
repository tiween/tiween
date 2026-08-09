/**
 * Admin-API test helpers.
 *
 * `tests/helpers/auth.ts` mints users-permissions JWTs — that is the PUBLIC
 * API's auth system. The content-manager endpoints the admin panel (and this
 * plugin's planning surface) call live behind a different one: `admin::user`
 * plus, since Strapi 5.51, a session-backed access token validated by
 * `strapi.sessionManager('admin')`. A users-permissions JWT is simply not
 * accepted there, which is why this helper exists.
 *
 * Minting mirrors what `admin::auth`'s login controller does after it verifies
 * a password — issue a refresh token for a session, then exchange it for an
 * access token — so requests made with it authenticate through the real
 * `strategies/admin.js` path rather than around it.
 */
import type { Core } from "@strapi/strapi"

/** Role code every permission check short-circuits on. */
const SUPER_ADMIN_CODE = "strapi-super-admin"

export interface AdminSession {
  /** The created admin user row. */
  user: { id: number; email: string }
  /** Bearer token for `Authorization: Bearer …` against admin routes. */
  token: string
  /** Removes the user created for this session. */
  destroy: () => Promise<void>
}

let counter = 0

/**
 * Create a super-admin and a live session for it.
 *
 * Super-admin specifically: `permission.engine` grants that role everything
 * without consulting the permission tables, so the suite tests the CONTENT-MANAGER
 * behaviour rather than an RBAC fixture of its own making.
 */
export async function createAdminSession(
  strapi: Core.Strapi
): Promise<AdminSession> {
  const anyStrapi = strapi as any

  const role = await anyStrapi.db.query("admin::role").findOne({
    where: { code: SUPER_ADMIN_CODE },
  })

  if (!role) {
    throw new Error(
      `Super-admin role (${SUPER_ADMIN_CODE}) is missing — admin bootstrap did not run.`
    )
  }

  counter += 1
  const email = `integration-admin-${counter}-${Date.now()}@tiween.test`

  const user = await anyStrapi.service("admin::user").create({
    email,
    firstname: "Integration",
    lastname: "Admin",
    password: "Test-Password-1234",
    isActive: true,
    roles: [role.id],
  })

  const sessionManager = anyStrapi.sessionManager
  if (typeof sessionManager !== "function") {
    throw new Error(
      "strapi.sessionManager is unavailable — admin access tokens cannot be minted."
    )
  }

  const origin = sessionManager("admin")
  const { token: refreshToken } = await origin.generateRefreshToken(
    String(user.id),
    "integration-tests",
    { type: "session" }
  )
  const access = await origin.generateAccessToken(refreshToken)

  if (!("token" in access)) {
    throw new Error(
      `Admin access token could not be issued: ${JSON.stringify(access)}`
    )
  }

  return {
    user: { id: user.id, email: user.email },
    token: access.token,
    destroy: async () => {
      await anyStrapi.db.query("admin::user").delete({ where: { id: user.id } })
    },
  }
}

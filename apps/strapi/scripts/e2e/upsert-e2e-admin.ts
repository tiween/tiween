/**
 * E2E super-admin upsert (pure service, no Strapi boot).
 *
 * The dev bootstrap (`src/bootstrap/admin-user.ts`) is a no-op as soon as ANY
 * admin exists, so it cannot guarantee a known login for Playwright. This
 * service is an idempotent upsert of ONE dedicated account instead:
 *  - missing   -> create it (Super Admin, active, no registration token)
 *  - existing  -> reset its password, set isActive, unblock it, and make sure
 *                 the Super Admin role is attached (other roles are kept)
 * Other admin accounts are never read, changed or counted.
 *
 * Guarded so it can only ever touch the throwaway E2E database:
 *  - refused when NODE_ENV is production
 *  - refused unless E2E=true
 *  - refused unless the resolved DB connection points at the E2E database
 *    (local host, the E2E port, a database name ending in `_e2e`), checked on
 *    the connection string first because that is what `pg` actually uses
 *
 * The CLI wiring lives in `seed-admin.ts`; tests in
 * `upsert-e2e-admin.unit.test.ts`.
 */

export const E2E_DEFAULT_EMAIL = "e2e-admin@tiween.local"
export const E2E_DEFAULT_PASSWORD = "E2eAdmin123!"
export const E2E_DEFAULT_DB_NAME = "tiween_e2e"
export const E2E_DEFAULT_DB_PORT = 5439
/** The developer database's port: never a valid E2E target. */
export const DEV_DB_PORT = 5437

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"])

export type Env = Record<string, string | undefined>

/** The subset of a knex/pg connection config the guard inspects. */
export interface DbConnectionConfig {
  connectionString?: string
  host?: string
  port?: number | string
  database?: string
}

export interface AdminUserService {
  findOneByEmail(email: string, populate?: string[]): Promise<any>
  create(attributes: Record<string, unknown>): Promise<any>
  updateById(id: number, attributes: Record<string, unknown>): Promise<any>
}

export interface AdminRoleService {
  getSuperAdmin(): Promise<{ id: number } | null | undefined>
}

export interface Logger {
  info(message: string): void
}

export interface UpsertE2eAdminInput {
  userService: AdminUserService
  roleService: AdminRoleService
  env: Env
  dbConfig: DbConnectionConfig
  log?: Logger
}

export interface UpsertE2eAdminResult {
  action: "created" | "updated"
  id: number
  email: string
}

export class E2eGuardError extends Error {
  constructor(public readonly code: string) {
    super(code)
    this.name = "E2eGuardError"
  }
}

/** Where the connection really goes: the connection string wins (pg semantics). */
function resolveTarget(dbConfig: DbConnectionConfig): {
  host: string
  port: number
  database: string
} {
  if (dbConfig.connectionString) {
    let url: URL
    try {
      url = new URL(dbConfig.connectionString)
    } catch {
      throw new E2eGuardError("E2E_DB_URL_UNPARSEABLE")
    }
    return {
      host: url.hostname.replace(/^\[|\]$/g, ""),
      port: Number(url.port || 5432),
      database: decodeURIComponent(url.pathname.replace(/^\//, "")),
    }
  }
  return {
    host: String(dbConfig.host ?? ""),
    port: Number(dbConfig.port ?? 5432),
    database: String(dbConfig.database ?? ""),
  }
}

/**
 * Throws an `E2eGuardError` unless every guard passes. Exported so the CLI can
 * run it twice: on the raw env before booting Strapi, and on Strapi's resolved
 * database config afterwards.
 */
export function assertE2eTarget(env: Env, dbConfig: DbConnectionConfig): void {
  if (env.NODE_ENV === "production") {
    throw new E2eGuardError("E2E_REFUSED_IN_PRODUCTION")
  }
  if (env.E2E !== "true") {
    throw new E2eGuardError("E2E_FLAG_NOT_SET")
  }

  const expectedName = env.E2E_DATABASE_NAME || E2E_DEFAULT_DB_NAME
  const expectedPort = Number(env.E2E_DATABASE_PORT || E2E_DEFAULT_DB_PORT)
  if (!expectedName.endsWith("_e2e")) {
    throw new E2eGuardError("E2E_DB_NAME_MUST_END_WITH_E2E")
  }
  if (expectedPort === DEV_DB_PORT) {
    throw new E2eGuardError("E2E_DB_PORT_IS_DEV_PORT")
  }

  const target = resolveTarget(dbConfig)
  if (!LOCAL_HOSTS.has(target.host)) {
    throw new E2eGuardError("E2E_DB_HOST_NOT_LOCAL")
  }
  if (target.port !== expectedPort) {
    throw new E2eGuardError("E2E_DB_PORT_MISMATCH")
  }
  if (target.database !== expectedName) {
    throw new E2eGuardError("E2E_DB_NAME_MISMATCH")
  }
}

export function resolveE2eAdminCredentials(env: Env): {
  email: string
  password: string
} {
  return {
    email: (env.E2E_ADMIN_EMAIL || E2E_DEFAULT_EMAIL).toLowerCase(),
    password: env.E2E_ADMIN_PASSWORD || E2E_DEFAULT_PASSWORD,
  }
}

export async function upsertE2eAdmin({
  userService,
  roleService,
  env,
  dbConfig,
  log,
}: UpsertE2eAdminInput): Promise<UpsertE2eAdminResult> {
  assertE2eTarget(env, dbConfig)

  const superAdmin = await roleService.getSuperAdmin()
  if (!superAdmin) {
    throw new E2eGuardError("E2E_SUPER_ADMIN_ROLE_MISSING")
  }

  const { email, password } = resolveE2eAdminCredentials(env)
  const existing = await userService.findOneByEmail(email, ["roles"])

  if (!existing) {
    const created = await userService.create({
      email,
      password,
      firstname: "E2E",
      lastname: "Admin",
      isActive: true,
      blocked: false,
      // Without this the account counts as a pending invitation.
      registrationToken: null,
      roles: [superAdmin.id],
    })
    log?.info(`E2E admin created (${email}, id ${created.id})`)
    return { action: "created", id: created.id, email }
  }

  const roleIds: number[] = (existing.roles ?? []).map(
    (role: { id: number }) => role.id
  )
  if (!roleIds.includes(superAdmin.id)) roleIds.push(superAdmin.id)

  await userService.updateById(existing.id, {
    password,
    isActive: true,
    blocked: false,
    roles: roleIds,
  })
  log?.info(`E2E admin reset (${email}, id ${existing.id})`)
  return { action: "updated", id: existing.id, email }
}

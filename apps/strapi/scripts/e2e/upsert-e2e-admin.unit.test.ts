/**
 * `upsertE2eAdmin` (E2E stack, scripts/e2e).
 *
 * Load-bearing properties:
 *  1. it is an UPSERT of one account: other admins never block it (unlike the
 *     dev bootstrap, which bails as soon as any admin exists);
 *  2. a rerun resets the password and re-activates the account, and keeps the
 *     Super Admin role attached;
 *  3. it refuses before any service call unless the target is the E2E database
 *     and NODE_ENV is not production.
 */
import {
  assertE2eTarget,
  E2E_DEFAULT_EMAIL,
  E2E_DEFAULT_PASSWORD,
  E2eGuardError,
  upsertE2eAdmin,
} from "./upsert-e2e-admin"

const SUPER_ADMIN = { id: 1 }
const E2E_ENV = { E2E: "true", NODE_ENV: "development" }
const E2E_DB = {
  host: "127.0.0.1",
  port: 5439,
  database: "tiween_e2e",
}

function buildServices(options: {
  existing?: { id: number; roles?: Array<{ id: number }> } | null
  superAdmin?: { id: number } | null
  otherAdmins?: Array<{ id: number; email: string }>
}) {
  const {
    existing = null,
    superAdmin = SUPER_ADMIN,
    otherAdmins = [],
  } = options

  const userService = {
    // Behaves like admin::user: only the exact email matches.
    findOneByEmail: jest.fn(async (email: string) => {
      if (existing && email === E2E_DEFAULT_EMAIL) return existing
      if (existing && email === "custom@e2e.local") return existing
      return otherAdmins.find((admin) => admin.email === email) ?? null
    }),
    create: jest.fn(async () => ({ id: 42 })),
    updateById: jest.fn(async (id: number) => ({ id })),
    exists: jest.fn(async () => otherAdmins.length > 0 || Boolean(existing)),
  }
  const roleService = { getSuperAdmin: jest.fn(async () => superAdmin) }
  return { userService, roleService }
}

describe("upsertE2eAdmin", () => {
  it("creates the E2E super-admin when it is missing", async () => {
    const { userService, roleService } = buildServices({})

    const result = await upsertE2eAdmin({
      userService,
      roleService,
      env: E2E_ENV,
      dbConfig: E2E_DB,
    })

    expect(result).toEqual({
      action: "created",
      id: 42,
      email: E2E_DEFAULT_EMAIL,
    })
    expect(userService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: E2E_DEFAULT_EMAIL,
        password: E2E_DEFAULT_PASSWORD,
        isActive: true,
        blocked: false,
        registrationToken: null,
        roles: [SUPER_ADMIN.id],
      })
    )
    expect(userService.updateById).not.toHaveBeenCalled()
  })

  it("resets password and isActive, keeping Super Admin, when it exists", async () => {
    const { userService, roleService } = buildServices({
      existing: { id: 7, roles: [{ id: SUPER_ADMIN.id }, { id: 3 }] },
    })

    const result = await upsertE2eAdmin({
      userService,
      roleService,
      env: E2E_ENV,
      dbConfig: E2E_DB,
    })

    expect(result).toEqual({
      action: "updated",
      id: 7,
      email: E2E_DEFAULT_EMAIL,
    })
    expect(userService.updateById).toHaveBeenCalledWith(7, {
      password: E2E_DEFAULT_PASSWORD,
      isActive: true,
      blocked: false,
      roles: [SUPER_ADMIN.id, 3],
    })
    expect(userService.create).not.toHaveBeenCalled()
  })

  it("re-attaches the Super Admin role when the existing account lost it", async () => {
    const { userService, roleService } = buildServices({
      existing: { id: 7, roles: [{ id: 3 }] },
    })

    await upsertE2eAdmin({
      userService,
      roleService,
      env: E2E_ENV,
      dbConfig: E2E_DB,
    })

    expect(userService.updateById).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ roles: [3, SUPER_ADMIN.id] })
    )
  })

  it("still creates the E2E admin when OTHER admins exist", async () => {
    const { userService, roleService } = buildServices({
      otherAdmins: [{ id: 1, email: "admin@test.com" }],
    })

    const result = await upsertE2eAdmin({
      userService,
      roleService,
      env: E2E_ENV,
      dbConfig: E2E_DB,
    })

    expect(result.action).toBe("created")
    expect(userService.create).toHaveBeenCalledTimes(1)
    // The other admin is never touched.
    expect(userService.updateById).not.toHaveBeenCalled()
  })

  it("refuses when NODE_ENV is production, before any service call", async () => {
    const { userService, roleService } = buildServices({})

    await expect(
      upsertE2eAdmin({
        userService,
        roleService,
        env: { ...E2E_ENV, NODE_ENV: "production" },
        dbConfig: E2E_DB,
      })
    ).rejects.toThrow("E2E_REFUSED_IN_PRODUCTION")
    expect(roleService.getSuperAdmin).not.toHaveBeenCalled()
    expect(userService.findOneByEmail).not.toHaveBeenCalled()
  })

  it("refuses without the E2E=true flag", async () => {
    const { userService, roleService } = buildServices({})

    await expect(
      upsertE2eAdmin({
        userService,
        roleService,
        env: { NODE_ENV: "development" },
        dbConfig: E2E_DB,
      })
    ).rejects.toThrow("E2E_FLAG_NOT_SET")
    expect(userService.create).not.toHaveBeenCalled()
  })

  it.each([
    [
      "the dev database",
      { host: "0.0.0.0", port: 5437, database: "tiween" },
      "E2E_DB_PORT_MISMATCH",
    ],
    [
      "the right port but the dev database name",
      { host: "localhost", port: 5439, database: "tiween" },
      "E2E_DB_NAME_MISMATCH",
    ],
    [
      "a remote host",
      { host: "db.tiween.tn", port: 5439, database: "tiween_e2e" },
      "E2E_DB_HOST_NOT_LOCAL",
    ],
    [
      "a connection string to the dev database (it beats host fields)",
      {
        connectionString: "postgres://admin:x@localhost:5437/tiween",
        ...E2E_DB,
      },
      "E2E_DB_PORT_MISMATCH",
    ],
  ])("refuses when the DB is %s", async (_label, dbConfig, code) => {
    const { userService, roleService } = buildServices({})

    await expect(
      upsertE2eAdmin({ userService, roleService, env: E2E_ENV, dbConfig })
    ).rejects.toThrow(code)
    expect(userService.create).not.toHaveBeenCalled()
    expect(userService.updateById).not.toHaveBeenCalled()
  })

  it("refuses an E2E_DATABASE_NAME override that is not an *_e2e database", () => {
    expect(() =>
      assertE2eTarget(
        { ...E2E_ENV, E2E_DATABASE_NAME: "tiween" },
        { host: "localhost", port: 5439, database: "tiween" }
      )
    ).toThrow("E2E_DB_NAME_MUST_END_WITH_E2E")
  })

  it("refuses an E2E_DATABASE_PORT override pointing at the dev port", () => {
    expect(() =>
      assertE2eTarget(
        { ...E2E_ENV, E2E_DATABASE_PORT: "5437" },
        { host: "localhost", port: 5437, database: "tiween_e2e" }
      )
    ).toThrow("E2E_DB_PORT_IS_DEV_PORT")
  })

  it("accepts a connection string that targets the E2E database", () => {
    expect(() =>
      assertE2eTarget(E2E_ENV, {
        connectionString: "postgres://e2e:e2e@127.0.0.1:5439/tiween_e2e",
      })
    ).not.toThrow()
  })

  it("fails with a coded error when the Super Admin role is missing", async () => {
    const { userService, roleService } = buildServices({ superAdmin: null })

    const attempt = upsertE2eAdmin({
      userService,
      roleService,
      env: E2E_ENV,
      dbConfig: E2E_DB,
    })

    await expect(attempt).rejects.toBeInstanceOf(E2eGuardError)
    await expect(attempt).rejects.toThrow("E2E_SUPER_ADMIN_ROLE_MISSING")
    expect(userService.create).not.toHaveBeenCalled()
  })

  it("uses E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD over the defaults", async () => {
    const { userService, roleService } = buildServices({})

    const result = await upsertE2eAdmin({
      userService,
      roleService,
      env: {
        ...E2E_ENV,
        E2E_ADMIN_EMAIL: "Custom@E2E.local",
        E2E_ADMIN_PASSWORD: "Other123!pass",
      },
      dbConfig: E2E_DB,
    })

    expect(result.email).toBe("custom@e2e.local")
    expect(userService.findOneByEmail).toHaveBeenCalledWith(
      "custom@e2e.local",
      ["roles"]
    )
    expect(userService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "custom@e2e.local",
        password: "Other123!pass",
      })
    )
  })
})

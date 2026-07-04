import type { Core } from "@strapi/strapi"

/**
 * Seeds a development super-admin so a fresh database (e.g. after a
 * `docker compose down -v` reset) is immediately usable without manually
 * registering through the admin panel first-run screen.
 *
 * Safe by design:
 *  - No-op if ANY admin user already exists (never clobbers a real account).
 *  - Default-on ONLY on an allowlisted local NODE_ENV (development/test).
 *    Every other tier (production, staging, preview, CI, demo, or any
 *    unrecognized NODE_ENV) requires an explicit SEED_ADMIN=true opt-in, so
 *    a committed bootstrap can never auto-provision a known-password
 *    super-admin on an internet-reachable, non-local box.
 *  - Credentials come from env; falls back to dev defaults only on the
 *    allowlisted local environments.
 *
 * Env:
 *  - SEED_ADMIN            "true" to force-enable on any non-local tier
 *  - SEED_ADMIN_EMAIL      default: admin@test.com  (local dev/test only)
 *  - SEED_ADMIN_PASSWORD   default: Test123!        (local dev/test only)
 *  - SEED_ADMIN_FIRSTNAME  default: Admin
 *  - SEED_ADMIN_LASTNAME   default: User
 */
const LOCAL_SEED_ENVS = new Set(["development", "test"])

export async function ensureAdminUser({
  strapi,
}: {
  strapi: Core.Strapi
}): Promise<void> {
  const nodeEnv = process.env.NODE_ENV ?? "development"
  const isLocalEnv = LOCAL_SEED_ENVS.has(nodeEnv)
  const optedIn = process.env.SEED_ADMIN === "true"

  // Default-on ONLY on allowlisted local environments. Any other tier
  // (production, staging, preview, CI, demo, unknown) needs SEED_ADMIN=true —
  // this is what stops the committed default-password admin from auto-seeding
  // on an internet-reachable non-local box.
  if (!isLocalEnv && !optedIn) {
    return
  }

  try {
    const userService = strapi.service("admin::user")
    const roleService = strapi.service("admin::role")

    // Idempotency: bail if any admin already exists — never overwrite.
    const adminExists = await userService.exists()
    if (adminExists) {
      strapi.log.info("Admin user already exists, skipping admin seed")
      return
    }

    const superAdminRole = await roleService.getSuperAdmin()
    if (!superAdminRole) {
      strapi.log.warn(
        "Super-admin role not found, skipping admin seed (roles not yet initialized)"
      )
      return
    }

    const email = process.env.SEED_ADMIN_EMAIL ?? "admin@test.com"
    const password = process.env.SEED_ADMIN_PASSWORD ?? "Test123!"
    const firstname = process.env.SEED_ADMIN_FIRSTNAME ?? "Admin"
    const lastname = process.env.SEED_ADMIN_LASTNAME ?? "User"

    if (!isLocalEnv && !process.env.SEED_ADMIN_PASSWORD) {
      strapi.log.warn(
        `SEED_ADMIN is enabled on a non-local environment (${nodeEnv}) but SEED_ADMIN_PASSWORD is unset — skipping to avoid a default-password admin`
      )
      return
    }

    // admin::user.create hashes the password and merges default fields.
    const admin = await userService.create({
      email,
      password,
      firstname,
      lastname,
      isActive: true,
      roles: [superAdminRole.id],
    })

    strapi.log.info(`Seeded super-admin user (${email}, id: ${admin.id})`)
  } catch (error) {
    strapi.log.error("Failed to seed admin user:", error)
    // Non-fatal: a failed admin seed must not block application startup.
  }
}

/**
 * Auth test helpers.
 *
 * Seed a Users-Permissions user and issue a JWT for authenticated Supertest
 * requests. We rely on the existing users-permissions plugin (always present
 * in Strapi v5) rather than mocking the JWT layer — this keeps the auth
 * path the same as production.
 */
import type { Core } from "@strapi/strapi"

export interface SeededUser {
  id: number
  documentId: string
  email: string
  jwt: string
}

interface SeedUserOptions {
  email?: string
  password?: string
  role?: "authenticated" | "public"
}

export async function seedUserAndJwt(
  strapi: Core.Strapi,
  opts: SeedUserOptions = {}
): Promise<SeededUser> {
  const email = opts.email ?? `test-${Date.now()}@example.com`
  const password = opts.password ?? "Password123!"
  const roleName = opts.role ?? "authenticated"

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const role = await (strapi as any)
    .query("plugin::users-permissions.role")
    .findOne({ where: { type: roleName } })

  if (!role) {
    throw new Error(`Role "${roleName}" not found in Users-Permissions`)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = await (strapi as any)
    .plugin("users-permissions")
    .service("user")
    .add({
      email,
      username: email,
      password,
      confirmed: true,
      blocked: false,
      role: role.id,
      provider: "local",
    })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jwt: string = (strapi as any)
    .plugin("users-permissions")
    .service("jwt")
    .issue({ id: user.id })

  return {
    id: user.id,
    documentId: user.documentId,
    email,
    jwt,
  }
}

/**
 * e2e:seed-admin: boot Strapi programmatically (like scripts/seeds/*.ts) and
 * upsert the dedicated E2E super-admin. Normally run by `e2e:up` with the E2E
 * env from `scripts/e2e/env.sh`; see README.md next to this file.
 *
 * The target guard runs twice: on the raw env BEFORE Strapi boots (so a wrong
 * DATABASE_* never even opens a connection to the dev database), then on
 * Strapi's resolved database config inside `upsertE2eAdmin`.
 *
 * Exit code: 0 on success, 1 on a refused guard or any failure.
 */
import { createStrapi } from "@strapi/strapi"

import { assertE2eTarget, upsertE2eAdmin } from "./upsert-e2e-admin"

async function main(): Promise<number> {
  const env = process.env

  try {
    assertE2eTarget(env, {
      connectionString: env.DATABASE_URL,
      host: env.DATABASE_HOST,
      port: env.DATABASE_PORT,
      database: env.DATABASE_NAME,
    })
  } catch (error) {
    console.error(`e2e:seed-admin: ${(error as Error).message}`)
    return 1
  }

  let strapi: any
  try {
    strapi = await createStrapi({
      appDir: process.cwd(),
      distDir: process.cwd() + "/dist",
    }).load()

    const dbConfig = strapi.config.get("database.connection.connection") ?? {}
    const result = await upsertE2eAdmin({
      userService: strapi.service("admin::user"),
      roleService: strapi.service("admin::role"),
      env,
      dbConfig,
      log: { info: (message) => console.log(message) },
    })
    console.log(`e2e:seed-admin: ${result.action} ${result.email}`)
    return 0
  } catch (error) {
    console.error(`e2e:seed-admin: ${(error as Error).message}`)
    return 1
  } finally {
    if (strapi) await strapi.destroy()
  }
}

main().then((code) => {
  process.exitCode = code
  // Never hang on a handle Strapi left open.
  setTimeout(() => process.exit(code), 1000).unref()
})

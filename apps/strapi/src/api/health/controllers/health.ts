import type { Core } from "@strapi/strapi"

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Check overall system health including database.
   */
  async check(ctx) {
    const checks: Record<string, { status: string; message?: string }> = {}

    // Check database
    try {
      await strapi.db.query("plugin::users-permissions.role").findMany({
        limit: 1,
      })
      checks.database = { status: "ok" }
    } catch (error) {
      checks.database = {
        status: "error",
        message: error instanceof Error ? error.message : "Database error",
      }
    }

    // Determine overall status
    const allHealthy = Object.values(checks).every((c) => c.status === "ok")

    ctx.status = allHealthy ? 200 : 503
    ctx.body = {
      status: allHealthy ? "ok" : "degraded",
      checks,
      timestamp: new Date().toISOString(),
    }
  },
})

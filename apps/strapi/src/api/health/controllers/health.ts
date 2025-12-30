import type { Core } from "@strapi/strapi"

import { isRedisHealthy } from "../../../../config/redis"

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Check Redis connectivity.
   * Returns 200 OK if Redis is healthy, 503 Service Unavailable otherwise.
   */
  async redis(ctx) {
    try {
      const healthy = await isRedisHealthy()

      if (healthy) {
        ctx.body = {
          status: "ok",
          service: "redis",
          timestamp: new Date().toISOString(),
        }
      } else {
        ctx.status = 503
        ctx.body = {
          status: "error",
          service: "redis",
          message: "Redis connection failed",
          timestamp: new Date().toISOString(),
        }
      }
    } catch (error) {
      ctx.status = 503
      ctx.body = {
        status: "error",
        service: "redis",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      }
    }
  },

  /**
   * Check overall system health including database and Redis.
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

    // Check Redis
    try {
      const redisHealthy = await isRedisHealthy()
      checks.redis = redisHealthy
        ? { status: "ok" }
        : { status: "error", message: "Redis connection failed" }
    } catch (error) {
      checks.redis = {
        status: "error",
        message: error instanceof Error ? error.message : "Redis error",
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

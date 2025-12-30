import Redis from "ioredis"

/**
 * Redis configuration for Tiween Strapi instance.
 * Used for API response caching and session management.
 */
const redisConfig = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || "0", 10),
  maxRetriesPerRequest: 3,
  retryStrategy(times: number) {
    const delay = Math.min(times * 50, 2000)
    return delay
  },
  enableReadyCheck: true,
  lazyConnect: true,
}

// Create Redis client instance (lazy connection)
let redisClient: Redis | null = null

/**
 * Get Redis client instance.
 * Creates a new connection if one doesn't exist.
 */
export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(redisConfig)

    redisClient.on("error", (err) => {
      console.error("[Redis] Connection error:", err.message)
    })

    redisClient.on("connect", () => {
      console.log("[Redis] Connected successfully")
    })

    redisClient.on("ready", () => {
      console.log("[Redis] Ready to accept commands")
    })

    redisClient.on("close", () => {
      console.log("[Redis] Connection closed")
    })
  }

  return redisClient
}

/**
 * Check if Redis is connected and responding.
 */
export async function isRedisHealthy(): Promise<boolean> {
  try {
    const client = getRedisClient()
    await client.ping()
    return true
  } catch {
    return false
  }
}

/**
 * Close Redis connection gracefully.
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    await redisClient.quit()
    redisClient = null
  }
}

export default redisConfig

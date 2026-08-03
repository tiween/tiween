/**
 * Simple in-memory rate limiter for API routes.
 * For production with multiple instances, consider upgrading to Upstash Redis.
 *
 * @example
 * const limiter = rateLimit({ interval: 60_000, maxRequests: 5 })
 *
 * // In API route:
 * const ip = getClientIp(request)
 * const { success, remaining, reset } = limiter.check(ip)
 * if (!success) {
 *   return Response.json({ error: 'RATE_LIMIT_EXCEEDED' }, {
 *     status: 429,
 *     headers: { 'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)) }
 *   })
 * }
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

interface RateLimitConfig {
  /** Time window in milliseconds */
  interval: number
  /** Maximum requests allowed per interval */
  maxRequests: number
}

interface RateLimitResult {
  success: boolean
  remaining: number
  reset: number
}

export function rateLimit(config: RateLimitConfig) {
  const { interval, maxRequests } = config
  const requests = new Map<string, RateLimitEntry>()

  // Cleanup old entries periodically
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of requests) {
      if (entry.resetAt < now) {
        requests.delete(key)
      }
    }
  }, interval)

  return {
    check(identifier: string): RateLimitResult {
      const now = Date.now()
      const entry = requests.get(identifier)

      // If no entry or entry expired, create new
      if (!entry || entry.resetAt < now) {
        const resetAt = now + interval
        requests.set(identifier, { count: 1, resetAt })
        return { success: true, remaining: maxRequests - 1, reset: resetAt }
      }

      // Increment count
      entry.count++

      // Check if over limit
      if (entry.count > maxRequests) {
        return { success: false, remaining: 0, reset: entry.resetAt }
      }

      return {
        success: true,
        remaining: maxRequests - entry.count,
        reset: entry.resetAt,
      }
    },
  }
}

/**
 * Extract client IP from request headers
 */
export function getClientIp(request: Request): string {
  // Try various headers in order of preference
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(",")[0]?.trim() || "unknown"
  }

  const realIp = request.headers.get("x-real-ip")
  if (realIp) {
    return realIp.trim()
  }

  // Fallback for local development
  return "127.0.0.1"
}

// Pre-configured limiters for common use cases
export const playSubmissionLimiter = rateLimit({
  interval: 60 * 60 * 1000, // 1 hour
  maxRequests: 5, // 5 submissions per hour
})

/**
 * Public venue-registration submissions (Story 7.1): 5 per 15 minutes per IP.
 * Tighter than the play limiter because each accepted submission provisions a
 * user account plus a venue record.
 *
 * MUST stay a module-level instance: a limiter created per request would reset
 * its counter map every call and bound nothing.
 */
export const venueRegistrationLimiter = rateLimit({
  interval: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
})

export const personCreationLimiter = rateLimit({
  interval: 60 * 60 * 1000, // 1 hour
  maxRequests: 20, // 20 person creations per hour
})

export const personSearchLimiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  maxRequests: 60, // 60 searches per minute
})

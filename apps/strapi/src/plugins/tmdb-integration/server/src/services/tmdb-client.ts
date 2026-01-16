import { TMDB } from "tmdb-ts"

import type { Core } from "@strapi/strapi"

interface RateLimiter {
  tokens: number
  lastRefill: number
  maxTokens: number
  refillRate: number
  windowMs: number
}

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

/**
 * TMDB Client Service
 *
 * Wraps tmdb-ts with rate limiting and response caching.
 * Rate limit: 40 requests per 10 seconds (TMDB API limit)
 */
const tmdbClientService = ({ strapi }: { strapi: Core.Strapi }) => {
  let client: TMDB | null = null
  const cache = new Map<string, CacheEntry<unknown>>()

  const rateLimiter: RateLimiter = {
    tokens: 40,
    lastRefill: Date.now(),
    maxTokens: 40,
    refillRate: 40,
    windowMs: 10000,
  }

  /**
   * Initialize the TMDB client with API key from environment
   */
  const getClient = (): TMDB => {
    if (client) return client

    const apiKey = process.env.TMDB_API_KEY
    if (!apiKey) {
      throw new Error(
        "TMDB_API_KEY environment variable is not set. Cannot initialize TMDB client."
      )
    }

    client = new TMDB(apiKey)
    return client
  }

  /**
   * Token bucket rate limiter
   * Refills tokens over time and blocks when exhausted
   */
  const acquireToken = async (): Promise<void> => {
    const now = Date.now()
    const elapsed = now - rateLimiter.lastRefill

    // Refill tokens based on elapsed time
    if (elapsed >= rateLimiter.windowMs) {
      rateLimiter.tokens = rateLimiter.maxTokens
      rateLimiter.lastRefill = now
    } else {
      const tokensToAdd = Math.floor(
        (elapsed / rateLimiter.windowMs) * rateLimiter.refillRate
      )
      if (tokensToAdd > 0) {
        rateLimiter.tokens = Math.min(
          rateLimiter.maxTokens,
          rateLimiter.tokens + tokensToAdd
        )
        rateLimiter.lastRefill = now
      }
    }

    // Wait if no tokens available
    if (rateLimiter.tokens <= 0) {
      const waitTime = rateLimiter.windowMs - elapsed
      strapi.log.debug(
        `[tmdb-client] Rate limit reached. Waiting ${waitTime}ms...`
      )
      await new Promise((resolve) => setTimeout(resolve, waitTime))
      rateLimiter.tokens = rateLimiter.maxTokens
      rateLimiter.lastRefill = Date.now()
    }

    rateLimiter.tokens--
  }

  /**
   * Get cached response or execute request
   */
  const getCached = <T>(
    key: string,
    ttlSeconds: number,
    fetcher: () => Promise<T>
  ): Promise<T> => {
    const cached = cache.get(key) as CacheEntry<T> | undefined
    const now = Date.now()

    if (cached && cached.expiresAt > now) {
      strapi.log.debug(`[tmdb-client] Cache hit: ${key}`)
      return Promise.resolve(cached.data)
    }

    return fetcher().then((data) => {
      cache.set(key, {
        data,
        expiresAt: now + ttlSeconds * 1000,
      })
      return data
    })
  }

  /**
   * Clear expired cache entries (call periodically)
   */
  const clearExpiredCache = (): void => {
    const now = Date.now()
    for (const [key, entry] of cache.entries()) {
      if (entry.expiresAt <= now) {
        cache.delete(key)
      }
    }
  }

  /**
   * Execute a rate-limited TMDB API request with caching
   */
  const execute = async <T>(
    cacheKey: string,
    ttlSeconds: number,
    request: (client: TMDB) => Promise<T>
  ): Promise<T> => {
    return getCached(cacheKey, ttlSeconds, async () => {
      await acquireToken()
      const tmdb = getClient()
      return request(tmdb)
    })
  }

  return {
    getClient,
    execute,
    clearExpiredCache,
    // Expose for testing
    _rateLimiter: rateLimiter,
    _cache: cache,
  }
}

export default tmdbClientService

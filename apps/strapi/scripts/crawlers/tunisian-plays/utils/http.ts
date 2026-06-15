/**
 * HTTP client with rate limiting and retry logic
 */

import * as http from "node:http"
import * as https from "node:https"

const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
]

interface HttpClientOptions {
  /** Minimum delay between requests in ms */
  minDelay?: number
  /** Maximum delay between requests in ms */
  maxDelay?: number
  /** Number of retry attempts */
  retries?: number
  /** Timeout in ms */
  timeout?: number
  /** Enable verbose logging */
  verbose?: boolean
}

interface FetchResult {
  status: number
  headers: Record<string, string>
  body: string
}

export class HttpClient {
  private lastRequestTime = 0
  private requestCount = 0
  private readonly minDelay: number
  private readonly maxDelay: number
  private readonly retries: number
  private readonly timeout: number
  private readonly verbose: boolean

  constructor(options: HttpClientOptions = {}) {
    this.minDelay = options.minDelay ?? 2000
    this.maxDelay = options.maxDelay ?? 5000
    this.retries = options.retries ?? 3
    this.timeout = options.timeout ?? 30000
    this.verbose = options.verbose ?? false
  }

  /**
   * Get a random user agent
   */
  private getRandomUserAgent(): string {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
  }

  /**
   * Get a random delay between min and max
   */
  private getRandomDelay(): number {
    return (
      Math.floor(Math.random() * (this.maxDelay - this.minDelay + 1)) +
      this.minDelay
    )
  }

  /**
   * Wait for rate limiting
   */
  private async waitForRateLimit(): Promise<void> {
    const now = Date.now()
    const elapsed = now - this.lastRequestTime
    const delay = this.getRandomDelay()

    if (elapsed < delay) {
      const waitTime = delay - elapsed
      if (this.verbose) {
        console.log(`  [HTTP] Rate limiting: waiting ${waitTime}ms`)
      }
      await new Promise((resolve) => setTimeout(resolve, waitTime))
    }

    this.lastRequestTime = Date.now()
  }

  /**
   * Fetch a URL with retry logic
   */
  async fetch(url: string): Promise<FetchResult> {
    await this.waitForRateLimit()

    let lastError: Error | undefined

    for (let attempt = 1; attempt <= this.retries; attempt++) {
      try {
        this.requestCount++
        if (this.verbose) {
          console.log(
            `  [HTTP] Request #${this.requestCount}: ${url} (attempt ${attempt}/${this.retries})`
          )
        }

        const result = await this.doFetch(url)

        if (this.verbose) {
          console.log(
            `  [HTTP] Response: ${result.status} (${result.body.length} bytes)`
          )
        }

        return result
      } catch (error) {
        lastError = error as Error
        if (this.verbose) {
          console.log(`  [HTTP] Error: ${lastError.message}`)
        }

        if (attempt < this.retries) {
          // Exponential backoff
          const backoff = Math.min(1000 * Math.pow(2, attempt), 10000)
          if (this.verbose) {
            console.log(`  [HTTP] Retrying in ${backoff}ms...`)
          }
          await new Promise((resolve) => setTimeout(resolve, backoff))
        }
      }
    }

    throw lastError || new Error(`Failed to fetch ${url}`)
  }

  /**
   * Internal fetch implementation
   */
  private doFetch(url: string): Promise<FetchResult> {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url)
      const protocol = parsedUrl.protocol === "https:" ? https : http

      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === "https:" ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: "GET",
        headers: {
          "User-Agent": this.getRandomUserAgent(),
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "fr-FR,fr;q=0.9,ar;q=0.8,en;q=0.7",
          "Accept-Encoding": "identity",
          Connection: "keep-alive",
          "Cache-Control": "no-cache",
        },
        timeout: this.timeout,
      }

      const req = protocol.request(options, (res) => {
        // Handle redirects
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          const redirectUrl = new URL(res.headers.location, url).toString()
          if (this.verbose) {
            console.log(
              `  [HTTP] Redirect: ${res.statusCode} -> ${redirectUrl}`
            )
          }
          this.doFetch(redirectUrl).then(resolve).catch(reject)
          return
        }

        const chunks: Buffer[] = []

        res.on("data", (chunk: Buffer) => {
          chunks.push(chunk)
        })

        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf-8")
          const headers: Record<string, string> = {}
          for (const [key, value] of Object.entries(res.headers)) {
            if (typeof value === "string") {
              headers[key] = value
            } else if (Array.isArray(value)) {
              headers[key] = value.join(", ")
            }
          }
          resolve({
            status: res.statusCode || 0,
            headers,
            body,
          })
        })

        res.on("error", reject)
      })

      req.on("error", reject)
      req.on("timeout", () => {
        req.destroy()
        reject(new Error(`Request timeout: ${url}`))
      })

      req.end()
    })
  }

  /**
   * Fetch an image and return as buffer
   */
  async fetchImage(url: string): Promise<Buffer> {
    await this.waitForRateLimit()

    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url)
      const protocol = parsedUrl.protocol === "https:" ? https : http

      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === "https:" ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: "GET",
        headers: {
          "User-Agent": this.getRandomUserAgent(),
          Accept: "image/*",
        },
        timeout: this.timeout,
      }

      const req = protocol.request(options, (res) => {
        // Handle redirects
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          const redirectUrl = new URL(res.headers.location, url).toString()
          this.fetchImage(redirectUrl).then(resolve).catch(reject)
          return
        }

        const chunks: Buffer[] = []

        res.on("data", (chunk: Buffer) => {
          chunks.push(chunk)
        })

        res.on("end", () => {
          resolve(Buffer.concat(chunks))
        })

        res.on("error", reject)
      })

      req.on("error", reject)
      req.on("timeout", () => {
        req.destroy()
        reject(new Error(`Image request timeout: ${url}`))
      })

      req.end()
    })
  }

  /**
   * Get request statistics
   */
  getStats(): { requestCount: number } {
    return { requestCount: this.requestCount }
  }
}

/**
 * Create a default HTTP client instance
 */
export function createHttpClient(options?: HttpClientOptions): HttpClient {
  return new HttpClient(options)
}

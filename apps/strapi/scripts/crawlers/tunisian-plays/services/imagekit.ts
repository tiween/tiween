/**
 * ImageKit integration for poster uploads
 */

import ImageKit from "imagekit"

import type { ImageKitConfig, ImageUploadResult } from "../types.js"
import type { HttpClient } from "../utils/http.js"

import { createHttpClient } from "../utils/http.js"

const TRIAGE_FOLDER = "/crawled/plays/triage"

export class ImageKitService {
  private client: ImageKit
  private httpClient: HttpClient
  private verbose: boolean

  constructor(config: ImageKitConfig, verbose: boolean = false) {
    this.client = new ImageKit({
      publicKey: config.publicKey,
      privateKey: config.privateKey,
      urlEndpoint: config.urlEndpoint,
    })
    this.httpClient = createHttpClient({ verbose })
    this.verbose = verbose
  }

  /**
   * Upload a poster image from a URL
   */
  async uploadPoster(
    sourceUrl: string,
    playSlug: string,
    sourceName: string
  ): Promise<ImageUploadResult> {
    try {
      if (this.verbose) {
        console.log(`  [ImageKit] Downloading image: ${sourceUrl}`)
      }

      // Download the image
      const imageBuffer = await this.httpClient.fetchImage(sourceUrl)

      if (imageBuffer.length === 0) {
        return {
          success: false,
          error: "Downloaded image is empty",
        }
      }

      // Determine file extension from URL or default to jpg
      const ext = this.getExtensionFromUrl(sourceUrl) || "jpg"
      const fileName = `${playSlug}-poster.${ext}`

      if (this.verbose) {
        console.log(
          `  [ImageKit] Uploading: ${fileName} (${imageBuffer.length} bytes)`
        )
      }

      // Upload to ImageKit
      // Note: customMetadata requires fields to be pre-defined in ImageKit dashboard
      // Using tags instead for flexibility
      const result = await this.client.upload({
        file: imageBuffer,
        fileName,
        folder: TRIAGE_FOLDER,
        tags: [
          "crawled",
          "play",
          "pending-review",
          sourceName,
          `slug:${playSlug}`,
        ],
      })

      if (this.verbose) {
        console.log(`  [ImageKit] Upload successful: ${result.url}`)
      }

      return {
        success: true,
        fileId: result.fileId,
        url: result.url,
        thumbnailUrl: result.thumbnailUrl,
      }
    } catch (error) {
      let message = "Unknown error"
      if (error instanceof Error) {
        message = error.message
      } else if (typeof error === "object" && error !== null) {
        // ImageKit SDK may throw non-Error objects with message/help properties
        const errObj = error as Record<string, unknown>
        message = String(
          errObj.message ||
            errObj.help ||
            errObj.reason ||
            JSON.stringify(error)
        )
      }
      if (this.verbose) {
        console.log(`  [ImageKit] Upload failed: ${message}`)
        if (typeof error === "object" && error !== null) {
          console.log(
            `  [ImageKit] Full error:`,
            JSON.stringify(error, null, 2)
          )
        }
      }
      return {
        success: false,
        error: message,
      }
    }
  }

  /**
   * Get file extension from URL
   */
  private getExtensionFromUrl(url: string): string | null {
    try {
      const pathname = new URL(url).pathname
      const match = pathname.match(/\.([a-zA-Z0-9]+)$/)
      if (match) {
        const ext = match[1].toLowerCase()
        // Only return valid image extensions
        if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) {
          return ext === "jpeg" ? "jpg" : ext
        }
      }
      return null
    } catch {
      return null
    }
  }

  /**
   * List files in triage folder
   */
  async listTriageFiles(limit: number = 100): Promise<ImageKit.FileObject[]> {
    try {
      const result = await this.client.listFiles({
        path: TRIAGE_FOLDER,
        limit,
      })
      return result
    } catch (error) {
      console.error("Failed to list triage files:", error)
      return []
    }
  }

  /**
   * Delete a file by ID
   */
  async deleteFile(fileId: string): Promise<boolean> {
    try {
      await this.client.deleteFile(fileId)
      return true
    } catch (error) {
      console.error(`Failed to delete file ${fileId}:`, error)
      return false
    }
  }
}

/**
 * Get ImageKit configuration from environment
 */
export function getImageKitConfig(): ImageKitConfig | null {
  const publicKey = process.env.IMAGEKIT_PUBLIC_KEY
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY
  const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT

  if (!publicKey || !privateKey || !urlEndpoint) {
    return null
  }

  return { publicKey, privateKey, urlEndpoint }
}

/**
 * Validate ImageKit configuration
 */
export function validateImageKitConfig(): {
  valid: boolean
  missing: string[]
} {
  const missing: string[] = []

  if (!process.env.IMAGEKIT_PUBLIC_KEY) {
    missing.push("IMAGEKIT_PUBLIC_KEY")
  }
  if (!process.env.IMAGEKIT_PRIVATE_KEY) {
    missing.push("IMAGEKIT_PRIVATE_KEY")
  }
  if (!process.env.IMAGEKIT_URL_ENDPOINT) {
    missing.push("IMAGEKIT_URL_ENDPOINT")
  }

  return {
    valid: missing.length === 0,
    missing,
  }
}

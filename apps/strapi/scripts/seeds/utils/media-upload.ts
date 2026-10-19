/**
 * Media helper for the short-film import (plan 01-10, D-11 / D-12).
 *
 * Images are NEVER hotlinked: each source is downloaded once and uploaded
 * through the Strapi upload service, so it lands on the configured provider
 * (ImageKit in a real environment). Uploads are idempotent by file name.
 *
 * The downloader is injected into the importer, so tests never touch the
 * network and the CLI binds the real SSRF-safe downloader to the data file's
 * allowlist.
 */
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import type { Core } from "@strapi/strapi"

/** Hostnames the importer may download from before the data file adds its own. */
export const DEFAULT_MEDIA_HOSTS: readonly string[] = [
  "i.ytimg.com",
  "img.youtube.com",
  "i.vimeocdn.com",
  "artify.tn",
  "www.artify.tn",
]

export interface DownloadedImage {
  buffer: Buffer
  /** MIME type, e.g. `image/png`. */
  mime: string
  /** File extension including the dot, e.g. `.png`. */
  ext: string
}

/** Fetches one image URL. The real implementation is `downloadImage`. */
export type ImageDownloader = (url: string) => Promise<DownloadedImage>

export interface ImageSource {
  /** File name without extension, e.g. `my-film-backdrop` (lowercase ASCII). */
  name: string
  url: string
  alt?: string
}

const UPLOAD_FILE_UID = "plugin::upload.file"

/** Stems are built from validated slugs; anything else is a programming error. */
const STEM_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * Upload `source` once and return the `plugin::upload.file` row id.
 *
 * Idempotency: a file whose name is `<name>.<ext>` is reused, so a second run
 * downloads and uploads nothing.
 */
export async function findOrUploadImage(
  strapi: Core.Strapi,
  source: ImageSource,
  deps: { download: ImageDownloader }
): Promise<number> {
  if (!STEM_PATTERN.test(source.name)) {
    throw new Error("INVALID_MEDIA_NAME")
  }

  const existing = (await strapi.db.query(UPLOAD_FILE_UID).findOne({
    where: { name: { $startsWith: `${source.name}.` } },
  })) as { id: number } | null
  if (existing) return existing.id

  const image = await deps.download(source.url)
  const fileName = `${source.name}${image.ext}`

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "tiween-media-"))
  const filepath = path.join(tmpDir, fileName)
  try {
    await fs.writeFile(filepath, image.buffer)
    const uploaded = (await strapi
      .plugin("upload")
      .service("upload")
      .upload({
        data: {
          fileInfo: {
            name: fileName,
            alternativeText: source.alt ?? null,
          },
        },
        files: {
          filepath,
          originalFilename: fileName,
          mimetype: image.mime,
          size: image.buffer.length,
        },
      })) as Array<{ id: number }>
    return uploaded[0].id
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}

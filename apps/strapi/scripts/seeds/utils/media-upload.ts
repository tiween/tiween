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
import net from "node:net"
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

/* -------------------------------------------------------------------------- */
/* SSRF-safe download (T-01-30)                                               */
/* -------------------------------------------------------------------------- */

/** A download refused or failed; `code` is the stable, machine-readable reason. */
export class MediaDownloadError extends Error {
  readonly code: string

  constructor(code: string) {
    super(code)
    this.name = "MediaDownloadError"
    this.code = code
  }
}

export interface DownloadOptions {
  /** Exact hostnames that may be fetched (also checked on every redirect). */
  allowedHosts: readonly string[]
  /** Hard cap on the body, enforced while streaming. Default 10 MB. */
  maxBytes?: number
  /** Budget for the whole download including redirects. Default 15 s. */
  timeoutMs?: number
  /** Injected in tests; defaults to the global `fetch`. */
  fetchImpl?: typeof fetch
}

const DEFAULT_MAX_BYTES = 10 * 1024 * 1024
const DEFAULT_TIMEOUT_MS = 15_000
const MAX_REDIRECTS = 3
const REDIRECT_STATUSES: readonly number[] = [301, 302, 303, 307, 308]

/**
 * Parse and vet one URL: https only, no credentials or custom port, no IP
 * literal (any form the WHATWG parser normalises to one), and an exact match
 * against the hostname allowlist.
 */
function vetUrl(raw: string, allowed: ReadonlySet<string>): URL {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new MediaDownloadError("INVALID_URL")
  }
  if (url.protocol !== "https:") throw new MediaDownloadError("HTTPS_REQUIRED")
  if (url.username !== "" || url.password !== "" || url.port !== "") {
    throw new MediaDownloadError("URL_PARTS_NOT_ALLOWED")
  }

  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "")
  if (net.isIP(host) !== 0) throw new MediaDownloadError("IP_HOST_FORBIDDEN")
  if (!allowed.has(host)) throw new MediaDownloadError("HOST_NOT_ALLOWED")
  return url
}

/** The image type a buffer really is, from its signature; `null` otherwise. */
function sniffImage(buffer: Buffer): { mime: string; ext: string } | null {
  const startsWith = (...bytes: number[]) =>
    bytes.every((byte, index) => buffer[index] === byte)
  const ascii = (start: number, end: number) =>
    buffer.subarray(start, end).toString("latin1")

  if (startsWith(0xff, 0xd8, 0xff)) return { mime: "image/jpeg", ext: ".jpg" }
  if (startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) {
    return { mime: "image/png", ext: ".png" }
  }
  if (ascii(0, 6) === "GIF87a" || ascii(0, 6) === "GIF89a") {
    return { mime: "image/gif", ext: ".gif" }
  }
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") {
    return { mime: "image/webp", ext: ".webp" }
  }
  if (ascii(4, 8) === "ftyp" && ["avif", "avis"].includes(ascii(8, 12))) {
    return { mime: "image/avif", ext: ".avif" }
  }
  return null
}

/** Read a body into a buffer, refusing to hold more than `maxBytes`. */
async function readCapped(
  response: Response,
  maxBytes: number
): Promise<Buffer> {
  if (!response.body) {
    const whole = Buffer.from(await response.arrayBuffer())
    if (whole.length > maxBytes) throw new MediaDownloadError("IMAGE_TOO_LARGE")
    return whole
  }

  const reader = response.body.getReader()
  const chunks: Buffer[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.length
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined)
      throw new MediaDownloadError("IMAGE_TOO_LARGE")
    }
    chunks.push(Buffer.from(value))
  }
  return Buffer.concat(chunks)
}

/**
 * Download one image safely.
 *
 * https only; the exact hostname must be allowlisted; IP literals are refused;
 * redirects are NOT followed by `fetch` (`redirect: "manual"`): each hop is read
 * and re-vetted, at most three; the content-type must be `image/*` AND the bytes
 * must carry a jpeg/png/gif/webp/avif signature (svg is refused: active
 * content); the body is capped while streaming; the whole call has a timeout.
 */
export async function downloadImage(
  url: string,
  options: DownloadOptions
): Promise<DownloadedImage> {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const fetchImpl = options.fetchImpl ?? fetch
  const allowed = new Set(
    options.allowedHosts.map((host) => host.toLowerCase())
  )

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const discard = (response: Response) =>
    response.body?.cancel().catch(() => undefined)

  try {
    let current = vetUrl(url, allowed)

    for (let hop = 0; ; hop += 1) {
      let response: Response
      try {
        response = await fetchImpl(current.toString(), {
          redirect: "manual",
          signal: controller.signal,
          headers: { accept: "image/*" },
        })
      } catch {
        throw new MediaDownloadError(
          controller.signal.aborted ? "DOWNLOAD_TIMEOUT" : "DOWNLOAD_FAILED"
        )
      }

      if (REDIRECT_STATUSES.includes(response.status)) {
        const location = response.headers.get("location")
        await discard(response)
        if (!location) throw new MediaDownloadError("REDIRECT_WITHOUT_LOCATION")
        if (hop >= MAX_REDIRECTS)
          throw new MediaDownloadError("TOO_MANY_REDIRECTS")
        let next: string
        try {
          next = new URL(location, current).toString()
        } catch {
          throw new MediaDownloadError("INVALID_URL")
        }
        current = vetUrl(next, allowed)
        continue
      }

      if (!response.ok) {
        await discard(response)
        throw new MediaDownloadError("HTTP_ERROR")
      }

      const contentType = (response.headers.get("content-type") ?? "")
        .split(";")[0]
        .trim()
        .toLowerCase()
      if (!contentType.startsWith("image/")) {
        await discard(response)
        throw new MediaDownloadError("NOT_AN_IMAGE")
      }
      const declared = Number(response.headers.get("content-length"))
      if (Number.isFinite(declared) && declared > maxBytes) {
        await discard(response)
        throw new MediaDownloadError("IMAGE_TOO_LARGE")
      }

      let buffer: Buffer
      try {
        buffer = await readCapped(response, maxBytes)
      } catch (error) {
        if (error instanceof MediaDownloadError) throw error
        throw new MediaDownloadError(
          controller.signal.aborted ? "DOWNLOAD_TIMEOUT" : "DOWNLOAD_FAILED"
        )
      }

      const kind = sniffImage(buffer)
      if (!kind) throw new MediaDownloadError("NOT_AN_IMAGE")
      return { buffer, mime: kind.mime, ext: kind.ext }
    }
  } finally {
    clearTimeout(timer)
  }
}

/* -------------------------------------------------------------------------- */
/* YouTube thumbnails (D-12)                                                  */
/* -------------------------------------------------------------------------- */

const YOUTUBE_HOSTS: ReadonlySet<string> = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
])
const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/

/**
 * The thumbnail URLs of a YouTube video, best first: `maxresdefault` (not every
 * video has one, research A11) then `hqdefault`. Empty for any other URL.
 * Vimeo has no derivable thumbnail URL, so a Vimeo film names its backdrop in
 * the data file instead.
 */
export function youtubeThumbnailCandidates(videoUrl: string): string[] {
  let url: URL
  try {
    url = new URL(videoUrl)
  } catch {
    return []
  }
  const host = url.hostname.toLowerCase()
  if (!YOUTUBE_HOSTS.has(host)) return []

  let id: string | null = null
  if (host === "youtu.be") {
    id = url.pathname.split("/")[1] ?? null
  } else if (url.pathname === "/watch") {
    id = url.searchParams.get("v")
  } else {
    const [, kind, candidate] = url.pathname.split("/")
    if (kind === "embed" || kind === "shorts") id = candidate ?? null
  }
  if (!id || !YOUTUBE_ID_PATTERN.test(id)) return []

  return [
    `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
    `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
  ]
}

/* -------------------------------------------------------------------------- */
/* Upload provider guard (T-01-31)                                            */
/* -------------------------------------------------------------------------- */

const IMAGEKIT_PROVIDER = "strapi-provider-upload-imagekit"

/**
 * Fail closed unless uploads go to ImageKit. Without credentials Strapi
 * silently falls back to the local disk provider, which in a real environment
 * would publish films whose images live on an ephemeral container disk.
 * `allowLocal` (`--allow-local-uploads`) is for dev and staging only and is
 * refused when NODE_ENV is production.
 */
export function assertUploadProvider(
  strapi: Core.Strapi,
  options: { allowLocal: boolean }
): void {
  const provider = (
    strapi.config.get("plugin::upload") as { provider?: string } | undefined
  )?.provider

  if (options.allowLocal && process.env.NODE_ENV === "production") {
    throw new Error(
      provider === IMAGEKIT_PROVIDER
        ? "ALLOW_LOCAL_UPLOADS_REFUSED_IN_PRODUCTION"
        : "UPLOAD_PROVIDER_NOT_IMAGEKIT"
    )
  }
  if (provider === IMAGEKIT_PROVIDER || options.allowLocal) return
  throw new Error("UPLOAD_PROVIDER_NOT_IMAGEKIT")
}

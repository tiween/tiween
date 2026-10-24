/**
 * Media helper for the short-film import (plan 01-10, D-11 / D-12).
 *
 * Images are NEVER hotlinked: each source is downloaded once and uploaded
 * through the Strapi upload service, so it lands on the configured provider
 * (ImageKit in a real environment). Uploads are idempotent by file name and can
 * be filed under a Media Library folder chain, created on demand, which the
 * ImageKit provider mirrors in the stored path.
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
  /**
   * Media Library folder names, root first (e.g. `["Short films", "Posters"]`).
   * Missing folders are created. Omit to upload at the Media Library root.
   */
  folder?: readonly string[]
}

const UPLOAD_FILE_UID = "plugin::upload.file"
const UPLOAD_FOLDER_UID = "plugin::upload.folder"

/** Stems are built from validated slugs; anything else is a programming error. */
const STEM_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/* -------------------------------------------------------------------------- */
/* Upload failures                                                            */
/* -------------------------------------------------------------------------- */

/**
 * The upload provider (or the upload service in front of it) refused a file.
 *
 * Unlike a `MediaDownloadError`, which only costs one film an image, this means
 * the destination is not accepting files at all (bad credentials, quota, an
 * outage). The importer therefore fails the film instead of publishing it
 * without media. `message` carries the film image and the provider's answer.
 */
export class MediaUploadError extends Error {
  readonly code = "UPLOAD_FAILED"

  constructor(name: string, cause: unknown) {
    super(`UPLOAD_FAILED: ${name} (${describeUploadFailure(cause)})`)
    this.name = "MediaUploadError"
  }
}

/** Provider answers are short; anything longer is a body we should not echo. */
const MAX_DETAIL_LENGTH = 160

/** Strip anything shaped like an ImageKit key before text is logged or reported. */
function scrubSecrets(text: string): string {
  return text
    .replace(/\b(?:private|public)_[A-Za-z0-9+/=]{8,}/g, "[redacted-key]")
    .slice(0, MAX_DETAIL_LENGTH)
}

/**
 * A safe, one-line account of why an upload failed.
 *
 * The ImageKit provider only logs "Unable to upload file." and rejects with the
 * SDK's error, whose useful part is hidden: a plain object without `message` for
 * an upload (HTTP status on a non-enumerable `$ResponseMetadata`), or the raw
 * axios error for a network failure, whose `config.auth` holds the private key.
 * Only allow-listed fields are read here (status, string `code`, string
 * `message`), never the object itself, so no credential can reach a log or the
 * report.
 */
export function describeUploadFailure(error: unknown): string {
  if (typeof error === "string") return scrubSecrets(error) || "no detail"
  if (!error || typeof error !== "object") return "no detail"

  const { $ResponseMetadata, statusCode, status, response, code, message } =
    error as {
      $ResponseMetadata?: { statusCode?: unknown }
      statusCode?: unknown
      status?: unknown
      response?: { status?: unknown }
      code?: unknown
      message?: unknown
    }

  const parts: string[] = []
  const httpStatus = [
    $ResponseMetadata?.statusCode,
    statusCode,
    status,
    response?.status,
  ].find((value): value is number => typeof value === "number")
  if (httpStatus !== undefined) {
    parts.push(`HTTP ${httpStatus}`)
    if (httpStatus === 401 || httpStatus === 403) {
      parts.push("check the upload provider credentials and account status")
    }
  }
  if (typeof code === "string" && code !== "") parts.push(scrubSecrets(code))
  if (typeof message === "string" && message !== "") {
    parts.push(scrubSecrets(message))
  }
  return parts.join(", ") || "no detail from the provider"
}

/** The slice of `process` the guard needs; a fake emitter stands in for tests. */
export interface RejectionEmitter {
  on(event: "unhandledRejection", listener: (reason: unknown) => void): unknown
  off(event: "unhandledRejection", listener: (reason: unknown) => void): unknown
}

/**
 * Run `task` without letting a rejection nobody awaits kill the process; each
 * one is handed to `onUnobserved` (as a safe one-line description) instead.
 *
 * Why this is needed: `@strapi/upload` (5.51) starts the provider upload of an
 * image, then awaits thumbnail and responsive-format generation, and only then
 * awaits all uploads together. A provider that rejects inside that window
 * (ImageKit answers a refused upload in a fraction of the time sharp needs to
 * resize a 1280x720 image) leaves a promise nobody observes yet, and Node turns
 * that into a process crash that no `try/catch` around the upload can intercept.
 * The same failure still reaches the caller through the upload promise, so the
 * film lands in the report's `failed` list; the duplicate is only recorded.
 */
export async function guardUnobservedRejections<T>(
  task: () => Promise<T>,
  onUnobserved: (detail: string) => void,
  emitter: RejectionEmitter = process
): Promise<T> {
  const listener = (reason: unknown) => {
    onUnobserved(describeUploadFailure(reason))
  }
  emitter.on("unhandledRejection", listener)
  try {
    return await task()
  } finally {
    // The event is emitted once the microtask queue drains, so give one that is
    // still pending a turn to arrive before the listener goes away.
    await new Promise<void>((resolve) => setImmediate(resolve))
    emitter.off("unhandledRejection", listener)
  }
}

/** Folder names come from code constants; anything else is a programming error. */
function validateFolderNames(names: readonly unknown[]): string[] {
  if (
    !Array.isArray(names) ||
    names.length === 0 ||
    names.some((name) => typeof name !== "string" || name.trim() === "")
  ) {
    throw new Error("INVALID_MEDIA_FOLDER")
  }
  return (names as string[]).map((name) => name.trim())
}

/**
 * Find or create the Media Library folder chain `names` (root first) and return
 * the leaf folder id. Idempotent: an existing folder is matched by name and
 * parent (root folders have `parent: null`, as Strapi itself queries them) and
 * only missing ones are created through the upload plugin's folder service.
 */
export async function ensureUploadFolderPath(
  strapi: Core.Strapi,
  names: readonly string[]
): Promise<number> {
  const trimmed = validateFolderNames(names)

  let parentId: number | null = null
  for (const name of trimmed) {
    const existing = (await strapi.db.query(UPLOAD_FOLDER_UID).findOne({
      where: { name, parent: parentId },
    })) as { id: number } | null
    const folder: { id: number } =
      existing ??
      ((await strapi
        .plugin("upload")
        .service("folder")
        .create({ name, parent: parentId })) as { id: number })
    parentId = folder.id
  }
  return parentId as number
}

/**
 * Upload `source` once and return the `plugin::upload.file` row id.
 *
 * Idempotency: a file whose name is `<name>.<ext>` is reused where it is (it is
 * not moved to `source.folder`, so it never moves in ImageKit either), so a
 * second run downloads and uploads nothing.
 *
 * With `source.folder` the file is filed under that Media Library folder, which
 * the ImageKit provider mirrors in the stored path.
 *
 * Throws what the downloader throws (`MediaDownloadError`) or, when the upload
 * service or the folder service refuses, a `MediaUploadError`.
 */
export async function findOrUploadImage(
  strapi: Core.Strapi,
  source: ImageSource,
  deps: { download: ImageDownloader }
): Promise<number> {
  if (!STEM_PATTERN.test(source.name)) {
    throw new Error("INVALID_MEDIA_NAME")
  }
  if (source.folder !== undefined) validateFolderNames(source.folder)

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
    let uploaded: Array<{ id: number }>
    try {
      const folderId =
        source.folder === undefined
          ? undefined
          : await ensureUploadFolderPath(strapi, source.folder)
      uploaded = (await strapi
        .plugin("upload")
        .service("upload")
        .upload({
          data: {
            fileInfo: {
              name: fileName,
              alternativeText: source.alt ?? null,
              ...(folderId === undefined ? {} : { folder: folderId }),
            },
          },
          files: {
            filepath,
            originalFilename: fileName,
            mimetype: image.mime,
            size: image.buffer.length,
          },
        })) as Array<{ id: number }>
    } catch (error) {
      // Never let the raw provider error travel: see describeUploadFailure.
      throw new MediaUploadError(source.name, error)
    }
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

const IMAGEKIT_PROVIDER = "@tiween/strapi-provider-upload-imagekit"

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

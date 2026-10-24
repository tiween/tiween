"use strict"

/**
 * ImageKit upload provider for Strapi v5.
 *
 * Mirrors the Strapi Media Library folder tree under an environment root:
 *
 *   /{rootFolder}/{envFolder}/{slugified folder names...}/{hash}{ext}
 *
 * Files outside any Media Library folder go to /{rootFolder}/{envFolder}/unsorted/.
 * Placement is decided at upload time only: moving or renaming a Media Library
 * folder afterwards does not move files already stored in ImageKit.
 *
 * Security: the ImageKit private key travels in every request, and SDK/axios
 * errors can carry the request config. Nothing raised or logged by this module
 * is built from an original error object, only from a scrubbed message.
 */

const ImageKit = require("imagekit")

const DEFAULT_ROOT = "tiween"
const UNSORTED = "unsorted"
const MAX_SEGMENT_LENGTH = 64
const MAX_MESSAGE_LENGTH = 160
const KEY_SHAPED = /\b(?:private|public)_[A-Za-z0-9+/=]{8,}/g

/**
 * Slugify a Media Library folder name into an ImageKit-safe path segment:
 * lowercase ASCII letters, digits and single hyphens. May return "".
 */
function folderSegment(name) {
  if (typeof name !== "string") return ""
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SEGMENT_LENGTH)
    .replace(/-+$/g, "")
}

function readStream(stream) {
  return new Promise((resolve, reject) => {
    const chunks = []
    stream.on("data", (chunk) =>
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    )
    stream.on("end", () => resolve(Buffer.concat(chunks)))
    stream.on("error", (error) => reject(error))
  })
}

function firstNumber(...values) {
  return values.find((value) => typeof value === "number")
}

/**
 * Root and environment path parts. Pure so that the root/env layout lives in
 * one place (a sibling folder can be added next to the env folder later).
 */
function buildBasePath({ rootFolder, envFolder, nodeEnv }) {
  const rootParts =
    typeof rootFolder === "string"
      ? rootFolder
          .split("/")
          .map(folderSegment)
          .filter((part) => part !== "")
      : []
  if (rootParts.length === 0) rootParts.push(DEFAULT_ROOT)
  const configuredEnv = folderSegment(envFolder)
  const env =
    configuredEnv || (nodeEnv === "production" ? "production" : "development")
  return `/${[...rootParts, env].join("/")}`
}

function defaultFindFolders(pathIds) {
  return globalThis.strapi.db.query("plugin::upload.folder").findMany({
    where: { pathId: { $in: pathIds } },
    select: ["pathId", "name"],
  })
}

function createImageKitProvider({
  config = {},
  client,
  findFolders,
  log,
  nodeEnv = process.env.NODE_ENV,
} = {}) {
  const sdk =
    client ||
    new ImageKit({
      publicKey: config.publicKey,
      privateKey: config.privateKey,
      urlEndpoint: config.urlEndpoint,
    })
  const lookupFolders = findFolders || defaultFindFolders
  // Read at call time: strapi.destroy() deletes the global before late answers land.
  const logger = () => log || globalThis.strapi?.log || console

  const basePath = buildBasePath({
    rootFolder: config.rootFolder,
    envFolder: config.envFolder,
    nodeEnv,
  })
  const unsortedPath = `${basePath}/${UNSORTED}`

  function scrub(message) {
    let text = message
    for (const key of [config.privateKey, config.publicKey]) {
      if (typeof key === "string" && key !== "") {
        text = text.split(key).join("[redacted-key]")
      }
    }
    return text
      .replace(KEY_SHAPED, "[redacted-key]")
      .slice(0, MAX_MESSAGE_LENGTH)
  }

  /** Reads only status numbers, a string code and a scrubbed string message. */
  function describe(error) {
    let statusCode
    let code
    let message = ""
    try {
      statusCode = firstNumber(
        error?.$ResponseMetadata?.statusCode,
        error?.statusCode,
        error?.status,
        error?.response?.status
      )
      if (typeof error?.code === "string") code = error.code
      if (typeof error?.message === "string") message = scrub(error.message)
    } catch {
      // Hostile or exotic error object: keep whatever was read so far.
    }
    return { statusCode, code, message }
  }

  function safeError(operation, error) {
    const { statusCode, code, message } = describe(error)
    const result = new Error(
      `ImageKit ${operation} failed${message ? `: ${message}` : ""}`
    )
    result.name = "ImageKitProviderError"
    if (statusCode !== undefined) result.statusCode = statusCode
    if (code !== undefined) result.code = code
    return result
  }

  /** Folder promise for a folderPath such as "/1/3". Never rejects. */
  async function resolveFolderPath(folderPath) {
    if (
      typeof folderPath !== "string" ||
      folderPath === "" ||
      folderPath === "/"
    )
      return unsortedPath
    const parts = folderPath.split("/").filter((part) => part !== "")
    if (parts.length === 0) return unsortedPath
    if (!parts.every((part) => /^\d+$/.test(part))) {
      logger().warn("ImageKit upload: unexpected folderPath, using unsorted")
      return unsortedPath
    }
    const ids = parts.map(Number)
    try {
      const rows = await lookupFolders(ids)
      const names = new Map(
        (rows || []).map((row) => [Number(row.pathId), row.name])
      )
      const segments = ids.map(
        (id) => folderSegment(names.get(id)) || `folder-${id}`
      )
      return `${basePath}/${segments.join("/")}`
    } catch (error) {
      logger().warn(
        `ImageKit upload: folder lookup failed, using unsorted (${scrub(String(error?.message ?? "unknown error"))})`
      )
      return unsortedPath
    }
  }

  /**
   * Placement is decided synchronously at method entry. Files without their own
   * folderPath (thumbnail, formats) fall back to unsorted until parent
   * inheritance is added.
   */
  function placementFor(file) {
    return typeof file?.folderPath === "string"
      ? resolveFolderPath(file.folderPath)
      : Promise.resolve(unsortedPath)
  }

  async function store(operation, file, buffer, folder, overwriteFile) {
    const fileName = `${file.hash}${file.ext}`
    let response
    try {
      response = await sdk.upload({
        file: buffer,
        fileName,
        folder,
        useUniqueFileName: false,
        overwriteFile,
      })
    } catch (error) {
      const safe = safeError(operation, error)
      logger().error(`${safe.message} (${fileName})`)
      throw safe
    }
    file.url = response.url
    file.provider_metadata = {
      fileId: response.fileId,
      filePath: response.filePath,
    }
    delete file.buffer
    logger().info(`ImageKit file stored: ${response.filePath}`)
  }

  async function upload(file) {
    const folderPromise = placementFor(file)
    if (!Buffer.isBuffer(file.buffer)) {
      throw new Error("Missing file buffer")
    }
    await store("upload", file, file.buffer, await folderPromise, false)
  }

  async function uploadStream(file) {
    const folderPromise = placementFor(file)
    if (!file.stream) {
      throw new Error("Missing file stream")
    }
    let buffer
    try {
      buffer = await readStream(file.stream)
    } catch (error) {
      const safe = safeError("uploadStream", error)
      logger().error(`${safe.message} (${file.hash}${file.ext})`)
      throw safe
    }
    await store("uploadStream", file, buffer, await folderPromise, false)
  }

  async function deleteFile(file) {
    const fileId = file?.provider_metadata?.fileId
    if (!fileId) {
      logger().warn("ImageKit delete: file id not found, skipping")
      return
    }
    try {
      await sdk.deleteFile(fileId)
      logger().info(`ImageKit file deleted: ${fileId}`)
    } catch (error) {
      const safe = safeError("delete", error)
      if (safe.statusCode === 404) {
        logger().warn(`ImageKit delete: file not found, continuing (${fileId})`)
        return
      }
      logger().error(`${safe.message} (${fileId})`)
      throw safe
    }
  }

  return { upload, uploadStream, delete: deleteFile }
}

module.exports = {
  init: (config) => createImageKitProvider({ config }),
  createImageKitProvider,
  folderSegment,
}
